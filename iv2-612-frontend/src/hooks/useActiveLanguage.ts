import { useTranslation } from "react-i18next";
import { normalizeLanguage, type SupportedLanguage } from "$src/i18n/config";

export const useActiveLanguage = (): SupportedLanguage => {
	const { i18n } = useTranslation();
	return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
};
