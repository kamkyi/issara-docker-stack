import { api } from "$src/api/axios";
import type { SupportedLanguage } from "$src/i18n/config";
import { DEFAULT_LANGUAGE } from "$src/i18n/config";

/**
 * Runtime translation of dynamic/server content (NOT static UI strings — those stay in
 * react-i18next). Calls the cascade-api proxy (`POST /api/v1/translate`) so the Google
 * Translate API key is never shipped in the client bundle. The endpoint is protected with
 * WorkOS auth, so we use the shared axios `api` instance which attaches the bearer token.
 *
 * The proxy accepts `{ q: string[], target }` and returns `{ translations: string[] }`
 * in the same order.
 */

const TRANSLATE_ENDPOINT = `${(
	import.meta.env.VITE_APP_CASCADE_API_URL as string
)?.replace(/\/+$/, "")}/translate`;

export async function translateBatch(
	texts: string[],
	target: SupportedLanguage,
): Promise<string[]> {
	// No-op for the source language or when there is nothing to translate.
	if (target === DEFAULT_LANGUAGE || texts.length === 0) return texts;

	const nonEmpty = texts.some((t) => t.trim() !== "");
	if (!nonEmpty) return texts;

	const { data } = await api.post<{ translations?: string[] }>(
		TRANSLATE_ENDPOINT,
		{ q: texts, target },
	);

	if (
		!Array.isArray(data.translations) ||
		data.translations.length !== texts.length
	) {
		throw new Error("Translate proxy returned an unexpected payload");
	}
	return data.translations;
}

export async function translateText(
	text: string,
	target: SupportedLanguage,
): Promise<string> {
	const [out] = await translateBatch([text], target);
	return out ?? text;
}
