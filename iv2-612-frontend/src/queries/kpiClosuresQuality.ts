import mockKpiClosuresQuality from "$src/assets/mock/kpi-closures-by-month-quality.json";
import type { KpiClosuresData } from "$src/queries/useKpiClosures";

export type KpiClosureQualityKey = "poor" | "fair" | "good" | "excellent";

export interface KpiClosureQualityTotal {
	label: string;
	kpis: number;
	affectedWorkers: number;
	remediationUsd: number;
}

export type KpiClosureMonthlyQuality =
	KpiClosuresData["monthlyQuality"][number];

export interface KpiClosuresByMonthQualityData {
	monthlyQuality: KpiClosureMonthlyQuality[];
	totalsByQuality: Record<KpiClosureQualityKey, KpiClosureQualityTotal>;
	grandTotal: {
		kpis: number;
		affectedWorkers: number;
		remediationUsd: number;
	};
	qualityOrder: KpiClosureQualityKey[];
}

const QUALITY_KEYS: KpiClosureQualityKey[] = [
	"poor",
	"fair",
	"good",
	"excellent",
];

const QUALITY_LABELS: Record<KpiClosureQualityKey, string> = {
	poor: "Poor",
	fair: "Fair",
	good: "Good",
	excellent: "Excellent",
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const EMPTY_KPI_CLOSURES_BY_MONTH_QUALITY: KpiClosuresByMonthQualityData =
	{
		monthlyQuality: [],
		totalsByQuality: QUALITY_KEYS.reduce(
			(acc, key) => {
				acc[key] = {
					label: QUALITY_LABELS[key],
					kpis: 0,
					affectedWorkers: 0,
					remediationUsd: 0,
				};
				return acc;
			},
			{} as Record<KpiClosureQualityKey, KpiClosureQualityTotal>,
		),
		grandTotal: { kpis: 0, affectedWorkers: 0, remediationUsd: 0 },
		qualityOrder: QUALITY_KEYS,
	};

/**
 * Builds the quality-chart payload from the `monthlyQuality` rows returned by
 * the `/ilm/kpi-closures` endpoint. Every surface that shows this chart derives
 * it from those rows, so the case/worker totals always reconcile with the
 * "Closed KPIs Over Time" figures computed from the same closed-KPI set.
 */
export function buildKpiClosuresQualityData(
	monthlyQuality?: KpiClosureMonthlyQuality[] | null,
): KpiClosuresByMonthQualityData {
	const rows = monthlyQuality ?? [];

	const totalsByQuality = QUALITY_KEYS.reduce(
		(acc, key) => {
			acc[key] = {
				label: QUALITY_LABELS[key],
				kpis: rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0),
				affectedWorkers: rows.reduce(
					(sum, row) =>
						sum +
						Number(row[`${key}Workers` as keyof KpiClosureMonthlyQuality] ?? 0),
					0,
				),
				remediationUsd: round2(
					rows.reduce(
						(sum, row) =>
							sum +
							Number(
								row[`${key}RemediationUsd` as keyof KpiClosureMonthlyQuality] ??
									0,
							),
						0,
					),
				),
			};
			return acc;
		},
		{} as Record<KpiClosureQualityKey, KpiClosureQualityTotal>,
	);

	const grandTotal = QUALITY_KEYS.reduce(
		(acc, key) => ({
			kpis: acc.kpis + totalsByQuality[key].kpis,
			affectedWorkers:
				acc.affectedWorkers + totalsByQuality[key].affectedWorkers,
			remediationUsd: round2(
				acc.remediationUsd + totalsByQuality[key].remediationUsd,
			),
		}),
		{ kpis: 0, affectedWorkers: 0, remediationUsd: 0 },
	);

	return {
		monthlyQuality: rows,
		totalsByQuality,
		grandTotal,
		qualityOrder: QUALITY_KEYS,
	};
}

const monthRange = (month: string) => {
	const start = new Date(`${month}-01T00:00:00Z`);
	const end = new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59),
	);
	return { start, end };
};

/**
 * Mock counterpart of `buildKpiClosuresQualityData`, filtered to the requested
 * date range. Used by the partner (SP) dashboard when mock mode is on or when
 * an Issara staff/management/test account is previewing it — the internal
 * dashboard always reads live data.
 */
export function getMockKpiClosuresQualityData(
	startTime?: string,
	endTime?: string,
): KpiClosuresByMonthQualityData {
	const start = startTime ? new Date(`${startTime}T00:00:00Z`) : null;
	const end = endTime ? new Date(`${endTime}T23:59:59Z`) : null;
	const hasValidStart = start != null && Number.isFinite(start.getTime());
	const hasValidEnd = end != null && Number.isFinite(end.getTime());

	const rows = (
		mockKpiClosuresQuality as { monthlyQuality: KpiClosureMonthlyQuality[] }
	).monthlyQuality.filter((row) => {
		const range = monthRange(row.month);
		if (hasValidStart && start != null && range.end < start) return false;
		if (hasValidEnd && end != null && range.start > end) return false;
		return true;
	});

	return buildKpiClosuresQualityData(rows);
}
