import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import {
	DEFAULT_LANGUAGE,
	normalizeLanguage,
	SUPPORTED_LANGUAGES,
} from "./config";

// Translations are served live by cascade-backend (DB-backed) instead of
// being bundled at build time, so editor saves go live without a redeploy.
const CASCADE_API_URL = (
	import.meta.env.VITE_APP_CASCADE_API_URL as string
)?.replace(/\/+$/, "");

const savedLanguage = normalizeLanguage(localStorage.getItem("i18nextLng"));

// i18n.init(...) returns a promise that resolves once the initial language's
// resources have loaded — await this before rendering to avoid a flash of
// untranslated keys.
export const i18nReady = i18n
	.use(HttpBackend)
	.use(initReactI18next)
	.init({
		lng: savedLanguage,
		fallbackLng: DEFAULT_LANGUAGE,
		supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
		nonExplicitSupportedLngs: true,
		ns: ["translation"],
		defaultNS: "translation",
		backend: {
			loadPath: `${CASCADE_API_URL}/translations/{{lng}}`,
		},
		react: {
			useSuspense: false,
		},
		debug: process.env.NODE_ENV === "development",

		interpolation: {
			escapeValue: false, // React already escapes values
		},
	});

// Save language changes to localStorage
i18n.on("languageChanged", (lng) => {
	localStorage.setItem("i18nextLng", lng);
});

export default i18n;
