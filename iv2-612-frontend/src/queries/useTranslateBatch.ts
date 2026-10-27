import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	DEFAULT_LANGUAGE,
	normalizeLanguage,
	type SupportedLanguage,
} from "$src/i18n/config";
import { translateBatch } from "$src/services/translationService";

interface TranslateBatchResult {
	translations: Record<string, string>;
	isLoading: boolean;
	isError: boolean;
}

export function useTranslateBatch(
	texts: Array<string | null | undefined>,
): TranslateBatchResult {
	const { i18n } = useTranslation();
	const target: SupportedLanguage = normalizeLanguage(i18n.language);

	const uniqueTexts = useMemo(() => {
		const seen = new Set<string>();
		const ordered: string[] = [];

		for (const text of texts) {
			if (typeof text !== "string") continue;
			const trimmed = text.trim();
			if (!trimmed || seen.has(text)) continue;
			seen.add(text);
			ordered.push(text);
		}

		return ordered;
	}, [texts]);

	const enabled = uniqueTexts.length > 0;

	const query = useQuery({
		queryKey: ["translate-batch", target, uniqueTexts],
		queryFn: async () => {
			const resolved: Record<string, string> = {};
			const needsMachineTranslation: string[] = [];

			for (const text of uniqueTexts) {
				const trimmed = text.trim();
				const lower = trimmed.toLowerCase();
				const cap =
					trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
				const storeDict =
					(i18n.store?.data?.[target]?.translation as any) ?? {};

				const directVal =
					storeDict[text] ??
					storeDict[trimmed] ??
					storeDict[cap] ??
					storeDict[lower];
				const resource =
					typeof directVal === "string" && directVal.trim() !== ""
						? directVal
						: (i18n.getResource(target, "translation", text) ??
							i18n.getResource(target, "translation", cap) ??
							i18n.getResource(target, "translation", lower));

				if (typeof resource === "string" && resource.trim() !== "") {
					resolved[text] = resource;
				} else if (target === DEFAULT_LANGUAGE) {
					resolved[text] = storeDict[text] ?? storeDict[cap] ?? text;
				} else {
					needsMachineTranslation.push(text);
				}
			}

			if (needsMachineTranslation.length > 0 && target !== DEFAULT_LANGUAGE) {
				const translated = await translateBatch(
					needsMachineTranslation,
					target,
				);
				needsMachineTranslation.forEach((text, index) => {
					resolved[text] = translated[index] ?? text;
				});
			}

			return resolved;
		},
		enabled,
		staleTime: 0,
		retry: 1,
	});

	return {
		translations: query.data ?? {},
		isLoading: query.isLoading && enabled,
		isError: query.isError,
	};
}
