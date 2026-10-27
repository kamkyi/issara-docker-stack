import { api } from "$src/api/axios";
import type { SupportedLanguage } from "$src/i18n/config";

/**
 * Backs the "Solutions" tab of the translations editor (`/dev-translations`).
 * Unlike the flat `translations` table (i18nLocalesService.ts), Solution
 * title/description translations are auto-populated server-side via Google
 * Translate on every solution create/update (see cascade-backend's
 * solutionTranslationService.ts) and can be manually overridden here — once
 * overridden, the backend never re-translates that field/language again.
 */

export type TranslatableSolutionField = "title" | "description";

export interface SolutionTranslationRow {
	id: number;
	solution_id: number;
	lang: SupportedLanguage;
	field: TranslatableSolutionField;
	value: string;
	source: "machine" | "manual";
	source_hash: string | null;
	updated_by: string | null;
	createdAt: string;
	updatedAt: string;
}

const CASCADE_SOLUTIONS_URL = `${(
	import.meta.env.VITE_APP_CASCADE_API_URL as string
)?.replace(/\/+$/, "")}/solutions`;

export async function listSolutionTranslations(
	solutionId: number,
): Promise<SolutionTranslationRow[]> {
	const { data } = await api.get<{ data: SolutionTranslationRow[] }>(
		`${CASCADE_SOLUTIONS_URL}/${solutionId}/translations`,
	);
	return data.data;
}

export async function setSolutionTranslation(
	solutionId: number,
	lang: Exclude<SupportedLanguage, "en">,
	field: TranslatableSolutionField,
	value: string,
): Promise<void> {
	await api.put(
		`${CASCADE_SOLUTIONS_URL}/${solutionId}/translations/${lang}/${field}`,
		{ value },
	);
}

export async function retranslateSolution(solutionId: number): Promise<void> {
	await api.post(
		`${CASCADE_SOLUTIONS_URL}/${solutionId}/translations/retranslate`,
	);
}

export async function backfillAllSolutionTranslations(): Promise<void> {
	await api.post(`${CASCADE_SOLUTIONS_URL}/translations/backfill`);
}
