import { api } from "$src/api/axios";
import i18n from "$src/i18n";
import type { SupportedLanguage } from "$src/i18n/config";

/**
 * Backs the i18n editor (`/dev-translations`). Translations live in
 * cascade-backend's `translations` table (see i18nLocalesService.ts there),
 * so saves go live for every visitor without a redeploy.
 */

type LocaleTree = Record<string, unknown>;
export type LocaleData = Record<SupportedLanguage, LocaleTree>;

const CASCADE_I18N_LOCALES_URL = `${(
	import.meta.env.VITE_APP_CASCADE_API_URL as string
)?.replace(/\/+$/, "")}/i18n-locales`;

export type LocaleMetadata = {
	updated_by: string | null;
	updated_at: string;
};
export type LocaleMetadataMap = Record<
	SupportedLanguage,
	Record<string, LocaleMetadata>
>;

export async function loadLocales(): Promise<{
	locales: LocaleData;
	metadata: LocaleMetadataMap;
}> {
	const { data } = await api.get<{
		data: { locales: LocaleData; metadata: LocaleMetadataMap };
	}>(CASCADE_I18N_LOCALES_URL);
	return data.data;
}

export async function saveLocale(
	lang: SupportedLanguage,
	data: LocaleTree,
): Promise<void> {
	await api.put(`${CASCADE_I18N_LOCALES_URL}/${lang}`, { data });
	// Hot-update the editor's own running i18next instance so the save is
	// visible immediately without a reload.
	i18n.addResourceBundle(lang, "translation", data, true, true);
}
