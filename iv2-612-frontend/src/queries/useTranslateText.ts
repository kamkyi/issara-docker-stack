import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, type SupportedLanguage } from "$src/i18n/config";
import { translateText } from "$src/services/translationService";

// Translations are effectively immutable for a given (text, target) pair, so keep them
// fresh for a long time. The app-wide PersistQueryClientProvider + IndexedDB persister
// (see src/main.tsx) then persists these across reloads for free.
const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

/**
 * Translate a single dynamic/server string into the active i18next language.
 * Returns the original text as a fallback while loading and on error.
 */
export function useTranslateText(text: string | null | undefined) {
	const { i18n } = useTranslation();
	const target: SupportedLanguage = normalizeLanguage(i18n.language);
	const source = text ?? "";
	const enabled = target !== "en" && source.trim() !== "";

	const query = useQuery({
		queryKey: ["translate", target, source],
		queryFn: () => translateText(source, target),
		enabled,
		staleTime: ONE_WEEK,
		gcTime: ONE_WEEK,
		retry: 1,
	});

	return {
		text: enabled ? (query.data ?? source) : source,
		isLoading: query.isLoading && enabled,
		isError: query.isError,
	};
}
