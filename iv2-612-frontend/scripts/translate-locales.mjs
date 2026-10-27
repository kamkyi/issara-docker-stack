#!/usr/bin/env node
/**
 * Fill missing/empty locale keys from en.json using the Google Translate v2 REST API.
 *
 * - Source of truth: src/i18n/locales/en.json
 * - For every leaf key present in en but MISSING or EMPTY in a target locale, the English
 *   string is translated and written into the target. Existing target values are never
 *   overwritten (fill-gaps behaviour), so hand-made translations are preserved.
 * - i18next `{{var}}` interpolation placeholders are shielded with sentinels so Google
 *   never mangles them.
 *
 * Usage:
 *   GOOGLE_TRANSLATE_API_KEY=xxx node scripts/translate-locales.mjs [flags] [lang ...]
 *
 * Flags:
 *   --dry     Preview gaps without calling the API or writing files.
 *   --force   Ignore existing target values and re-translate every key (full regeneration).
 *   --auto    Build-safe mode for pre-hooks: if the key is missing or there are no gaps,
 *             print a notice and exit 0 (never fail the build).
 *   --check   CI sync check: exit 1 (listing gaps) if any locale is missing/empty keys vs
 *             en.json; exit 0 if all in sync. Never calls the API — no key required.
 *
 * The key is read from the shell env (NOT a VITE_ var) so it never enters the client bundle.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "src", "i18n", "locales");

const SOURCE_LANG = "en";
const ALL_TARGETS = ["ja", "km", "my", "ne", "th", "vi"];

const API_URL = "https://translation.googleapis.com/language/translate/v2";
const MAX_BATCH = 100; // strings per request (Google allows up to 128 `q` params)

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const FORCE = args.includes("--force");
const AUTO = args.includes("--auto");
const CHECK = args.includes("--check");
const requestedLangs = args.filter((a) => !a.startsWith("--"));
const targets = requestedLangs.length ? requestedLangs : ALL_TARGETS;

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

/**
 * Enforce the API-key requirement for modes that actually call Google. Called only on direct
 * execution (not on import), so tests can import the mask helpers without a key or a process
 * exit. `--dry` and `--check` never hit the API, so they are exempt.
 */
function requireApiKeyOrExit() {
	if (API_KEY || DRY_RUN || CHECK) return;
	if (AUTO) {
		console.log(
			"[i18n:auto] GOOGLE_TRANSLATE_API_KEY not set — skipping locale prefill (using committed JSONs).",
		);
		process.exit(0);
	}
	console.error(
		"Error: GOOGLE_TRANSLATE_API_KEY is not set. Export it or pass --dry to preview gaps.",
	);
	process.exit(1);
}

const readJson = (lang) =>
	JSON.parse(readFileSync(join(LOCALES_DIR, `${lang}.json`), "utf8"));

/** Collect [path, englishString] for every leaf missing/empty in the target tree. */
function collectGaps(enNode, targetNode, path = []) {
	const gaps = [];
	for (const [key, value] of Object.entries(enNode)) {
		const nextPath = [...path, key];
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const targetChild =
				targetNode && typeof targetNode[key] === "object"
					? targetNode[key]
					: undefined;
			gaps.push(...collectGaps(value, targetChild, nextPath));
		} else if (typeof value === "string") {
			const existing = targetNode ? targetNode[key] : undefined;
			const missing =
				FORCE || typeof existing !== "string" || existing.trim() === "";
			if (missing && value.trim() !== "") gaps.push([nextPath, value]);
		}
	}
	return gaps;
}

function setDeep(obj, path, value) {
	let node = obj;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
		node = node[key];
	}
	node[path[path.length - 1]] = value;
}

// Unicode "zero" code points for the decimal digit scripts our target locales use,
// so an index digit transliterated by Google (e.g. Devanagari ० / Thai ๐ / Burmese ၀)
// can be normalized back to its numeric value on restore.
const DIGIT_ZEROS = [0x30, 0x0660, 0x06f0, 0x0966, 0x09e6, 0x0e50, 0x17e0, 0x1040, 0xff10];
export const digitsToInt = (run) =>
	[...run].reduce((n, ch) => {
		const cp = ch.codePointAt(0);
		const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9) ?? 0x30;
		return n * 10 + (cp - zero);
	}, 0);

/**
 * Replace {{var}} with a sentinel Google won't translate; return {masked, restore}.
 *
 * The sentinel is `@@PH<i>@@`. The `PH` Latin anchor survives translation in every
 * target script; the `@@` guards are treated as optional on restore because Google
 * sometimes strips one/both, and the index digit is matched across Unicode digit
 * scripts (Google may transliterate it, e.g. `0` → Devanagari `०`) then normalized
 * back to a number. This replaces the old ` <n> `-with-spaces sentinel whose restore
 * silently dropped placeholders (see IV2 i18n bug).
 */
export function maskPlaceholders(text) {
	const tokens = [];
	const masked = text.replace(/\{\{[^}]+\}\}/g, (match) => {
		const token = `@@PH${tokens.length}@@`;
		tokens.push(match);
		return token;
	});
	const restore = (translated) =>
		translated.replace(
			/@{0,2}\s*P\s*H\s*(\p{Nd}+)\s*@{0,2}/giu,
			(_, i) => tokens[digitsToInt(i)] ?? "",
		);
	return { masked, restore };
}

async function translateBatch(texts, target) {
	const res = await fetch(`${API_URL}?key=${API_KEY}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			q: texts,
			source: SOURCE_LANG,
			target,
			format: "text",
		}),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Google Translate ${res.status}: ${body}`);
	}
	const data = await res.json();
	return data.data.translations.map((t) => t.translatedText);
}

async function run() {
	const en = readJson(SOURCE_LANG);
	let totalFilled = 0;

	for (const lang of targets) {
		const target = readJson(lang);
		const gaps = collectGaps(en, target);
		if (gaps.length === 0) {
			console.log(`${lang}: up to date (0 gaps)`);
			continue;
		}
		console.log(`${lang}: ${gaps.length} missing key(s)${DRY_RUN ? " (dry run)" : ""}`);
		if (DRY_RUN) {
			for (const [path] of gaps.slice(0, 20)) console.log(`   • ${path.join(".")}`);
			if (gaps.length > 20) console.log(`   … and ${gaps.length - 20} more`);
			continue;
		}

		const masks = gaps.map(([, text]) => maskPlaceholders(text));
		for (let i = 0; i < gaps.length; i += MAX_BATCH) {
			const chunk = masks.slice(i, i + MAX_BATCH);
			const translated = await translateBatch(
				chunk.map((m) => m.masked),
				lang,
			);
			translated.forEach((out, j) => {
				const idx = i + j;
				setDeep(target, gaps[idx][0], chunk[j].restore(out));
			});
			console.log(`   translated ${Math.min(i + MAX_BATCH, gaps.length)}/${gaps.length}`);
		}

		writeFileSync(
			join(LOCALES_DIR, `${lang}.json`),
			`${JSON.stringify(target, null, "\t")}\n`,
			"utf8",
		);
		totalFilled += gaps.length;
		console.log(`   ✓ wrote ${lang}.json`);
	}

	console.log(DRY_RUN ? "Dry run complete." : `Done. Filled ${totalFilled} key(s).`);
}

/**
 * CI-safe sync check: fail (exit 1) if any target locale is missing/empty keys relative to
 * en.json. Never calls the API, so it needs no key and is deterministic. Run via `--check`.
 */
function check() {
	const en = readJson(SOURCE_LANG);
	let hasGaps = false;

	for (const lang of targets) {
		const target = readJson(lang);
		const gaps = collectGaps(en, target);
		if (gaps.length === 0) {
			console.log(`${lang}: in sync (0 gaps)`);
			continue;
		}
		hasGaps = true;
		console.error(`${lang}: ${gaps.length} missing/empty key(s)`);
		for (const [path] of gaps.slice(0, 20)) console.error(`   • ${path.join(".")}`);
		if (gaps.length > 20) console.error(`   … and ${gaps.length - 20} more`);
	}

	if (hasGaps) {
		console.error(
			"\ni18n locales are out of sync with en.json. Run `npm run i18n:fill` (with GOOGLE_TRANSLATE_API_KEY set) and commit the updated locale JSONs.",
		);
		process.exit(1);
	}
	console.log("\nAll locales in sync with en.json.");
}

// Only run when invoked directly as a script; importing this module (e.g. from tests) is a no-op.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	if (CHECK) {
		check();
	} else {
		requireApiKeyOrExit();
		run().catch((err) => {
			console.error(err);
			process.exit(1);
		});
	}
}
