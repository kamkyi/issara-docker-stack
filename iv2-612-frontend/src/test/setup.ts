import "@testing-library/jest-dom";
import i18n from "$src/i18n";
import en from "$src/i18n/locales/en.json";
import ja from "$src/i18n/locales/ja.json";
import km from "$src/i18n/locales/km.json";
import my from "$src/i18n/locales/my.json";
import ne from "$src/i18n/locales/ne.json";
import th from "$src/i18n/locales/th.json";
import vi from "$src/i18n/locales/vi.json";

// Production loads translations from cascade-backend at runtime
// (src/i18n/index.ts uses i18next-http-backend), but tests run with no
// backend listening. Preload the same resources i18next-http-backend would
// have fetched, straight from the committed locale files, so t()/getFixedT()
// work synchronously without a network round trip.
const resources: Record<string, Record<string, unknown>> = {
	en,
	ja,
	km,
	my,
	ne,
	th,
	vi,
};
for (const [lng, translation] of Object.entries(resources)) {
	i18n.addResourceBundle(lng, "translation", translation, true, true);
}
