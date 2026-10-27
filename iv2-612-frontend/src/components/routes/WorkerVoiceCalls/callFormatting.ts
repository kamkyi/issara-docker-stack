/**
 * Shared value formatting for the "View Worker Voice" table and its detail
 * panel, so a blank field and a date read the same way in both.
 */
import type { RiskLevel } from "$src/services/workerVoiceCaseService";

/** Stands in for a field the officer left blank. */
export const EMPTY_VALUE = "—";

/** How a worker identification risk level is coloured wherever it is shown. */
export const RISK_COLORS: Record<RiskLevel, "red" | "amber" | "green"> = {
	HIGH: "red",
	MEDIUM: "amber",
	LOW: "green",
	EARLY_WARNING: "amber",
	FORCED_LABOR: "red",
};

/**
 * The translation key each stored value reads back as.
 *
 * Written out rather than lowercasing the value: `EARLY_WARNING` would key on
 * `early_warning`, and every other key in the catalogue is camelCase.
 */
export const RISK_LABEL_KEYS: Record<RiskLevel, string> = {
	LOW: "workerVoiceForm.options.risk.low",
	MEDIUM: "workerVoiceForm.options.risk.medium",
	HIGH: "workerVoiceForm.options.risk.high",
	EARLY_WARNING: "workerVoiceForm.options.risk.earlyWarning",
	FORCED_LABOR: "workerVoiceForm.options.risk.forcedLabor",
};

/**
 * The forced-labor risk of the *issue*, which is a different question from the
 * worker's personal risk level above.
 *
 * It is read off the levels of the KPIs picked on step 4, following the rule
 * agreed with the product owner:
 *
 *   - any Level 3 or Level 4 KPI -> forced labor risk;
 *   - otherwise any Level 2 KPI  -> early warning risk;
 *   - otherwise                  -> blank.
 *
 * So a call takes the most severe KPI on it: Level 2 alongside a Level 3 reads
 * as forced labor, never as an early warning. A call tagged with nothing the
 * rule names -- no KPI at all, or only a level outside it -- is left blank
 * rather than defaulted to early warning, because nothing has been classified.
 *
 * Levels 3 and 4 are the same split the supplier tables draw
 * (`isForcedLaborRisk`), written out rather than tested as `level >= 3` so the
 * two match exactly. `KPI_LEVEL_CHOICES` allows Levels 1 and 5 and the
 * catalogue holds neither; the rule does not say what they would mean, so they
 * classify as nothing rather than being guessed into the softer band.
 */
export type KpiRiskLevel = "EARLY_WARNING" | "FORCED_LABOR";

/** The levels the existing convention counts as a forced-labor risk. */
const FORCED_LABOR_KPI_LEVELS = [3, 4];

/** The levels that classify as an early warning when no severer one is present. */
const EARLY_WARNING_KPI_LEVELS = [2];

export const KPI_RISK_LEVELS: KpiRiskLevel[] = [
	"FORCED_LABOR",
	"EARLY_WARNING",
];

export const KPI_RISK_COLORS: Record<KpiRiskLevel, "red" | "amber"> = {
	FORCED_LABOR: "red",
	EARLY_WARNING: "amber",
};

export const KPI_RISK_LABEL_KEYS: Record<KpiRiskLevel, string> = {
	EARLY_WARNING: "workerVoiceForm.options.kpiRisk.earlyWarning",
	FORCED_LABOR: "workerVoiceForm.options.kpiRisk.forcedLabor",
};

export const kpiRiskLevel = (
	levels: number[] | null | undefined,
): KpiRiskLevel | null => {
	const known = (levels ?? []).filter((level) => Number.isFinite(level));
	if (known.some((level) => FORCED_LABOR_KPI_LEVELS.includes(level))) {
		return "FORCED_LABOR";
	}
	if (known.some((level) => EARLY_WARNING_KPI_LEVELS.includes(level))) {
		return "EARLY_WARNING";
	}
	return null;
};

/**
 * `cases` stores dates as `YYYY-MM-DD`. Handing that straight to `new Date()`
 * reads it as UTC midnight, which renders as the previous day for anyone west
 * of UTC, so the parts are read out and rebuilt in local time instead.
 */
export const formatCallDate = (
	value: string | null | undefined,
	language: string,
): string => {
	if (!value) {
		return EMPTY_VALUE;
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (!match) {
		return value;
	}
	const date = new Date(
		Number(match[1]),
		Number(match[2]) - 1,
		Number(match[3]),
	);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleDateString(language, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

/** Any blank, whitespace-only or missing value becomes the placeholder. */
export const orEmpty = (
	value: string | number | boolean | null | undefined,
): string => {
	if (value === null || value === undefined) {
		return EMPTY_VALUE;
	}
	const text = String(value).trim();
	return text === "" ? EMPTY_VALUE : text;
};
