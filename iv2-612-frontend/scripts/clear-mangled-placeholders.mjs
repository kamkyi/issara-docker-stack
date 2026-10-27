#!/usr/bin/env node
/**
 * One-off repair: clear locale values whose i18next `{{var}}` placeholders were
 * mangled (dropped) by the old translate-locales sentinel bug. Emptying a value
 * lets `translate-locales.mjs` (now fixed) re-fill it in normal gap-fill mode,
 * so hand-tuned translations for unaffected keys are preserved.
 *
 * Usage: node scripts/clear-mangled-placeholders.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "src", "i18n", "locales");
const TARGETS = ["ja", "km", "my", "ne", "th", "vi"];

const readJson = (lang) =>
	JSON.parse(readFileSync(join(LOCALES_DIR, `${lang}.json`), "utf8"));

const en = readJson("en");

/** Collect placeholders `{{...}}` present in an English string. */
const placeholdersOf = (s) => s.match(/\{\{[^}]+\}\}/g) ?? [];

/** Walk en + target in lockstep; empty any target leaf missing an en placeholder. */
function repair(enNode, tgtNode) {
	let cleared = 0;
	for (const [key, value] of Object.entries(enNode)) {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			if (tgtNode && typeof tgtNode[key] === "object") {
				cleared += repair(value, tgtNode[key]);
			}
		} else if (typeof value === "string") {
			const phs = placeholdersOf(value);
			if (phs.length === 0) continue;
			const tv = tgtNode ? tgtNode[key] : undefined;
			if (typeof tv !== "string") continue;
			if (phs.some((ph) => !tv.includes(ph))) {
				tgtNode[key] = ""; // gap-fill will re-translate
				cleared += 1;
			}
		}
	}
	return cleared;
}

let total = 0;
for (const lang of TARGETS) {
	const tgt = readJson(lang);
	const cleared = repair(en, tgt);
	writeFileSync(
		join(LOCALES_DIR, `${lang}.json`),
		`${JSON.stringify(tgt, null, "\t")}\n`,
		"utf8",
	);
	console.log(`${lang}: cleared ${cleared} mangled key(s)`);
	total += cleared;
}
console.log(`Done. Cleared ${total} key(s) across ${TARGETS.length} locales.`);
