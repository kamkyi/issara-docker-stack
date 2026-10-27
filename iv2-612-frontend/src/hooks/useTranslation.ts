import { useTranslation as useI18nTranslation } from "react-i18next";

// Custom hook that extends react-i18next's useTranslation with additional utilities
export const useTranslation = (namespace?: string) => {
	const { t, i18n } = useI18nTranslation(namespace);

	// Helper functions for common translation patterns
	const tCommon = (key: string, options?: any) => t(`common.${key}`, options);
	const tNav = (key: string, options?: any) => t(`navigation.${key}`, options);
	const tForm = (key: string, options?: any) => t(`forms.${key}`, options);
	const tValidation = (key: string, options?: any) =>
		t(`validation.${key}`, options);
	const tMessage = (key: string, options?: any) =>
		t(`messages.${key}`, options);

	// Language utilities
	const currentLanguage = i18n.language;
	const isRTL = ["ar", "he", "fa"].includes(currentLanguage); // Add RTL languages if needed

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
	};

	// Format helpers
	const formatNumber = (num: number) => {
		return new Intl.NumberFormat(currentLanguage).format(num);
	};

	const formatDate = (
		date: Date | string,
		options?: Intl.DateTimeFormatOptions,
	) => {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return new Intl.DateTimeFormat(currentLanguage, options).format(dateObj);
	};

	const formatCurrency = (amount: number, currency = "USD") => {
		return new Intl.NumberFormat(currentLanguage, {
			style: "currency",
			currency,
		}).format(amount);
	};

	return {
		t,
		i18n,
		tCommon,
		tNav,
		tForm,
		tValidation,
		tMessage,
		currentLanguage,
		isRTL,
		changeLanguage,
		formatNumber,
		formatDate,
		formatCurrency,
	};
};

export default useTranslation;
