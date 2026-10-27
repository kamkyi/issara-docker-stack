import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { levelColorPalette } from "$src/assets/mock/common-data";
import workerVoiceOverviewMock from "$src/assets/mock/worker-voice-overview.json";
import type { SocialResponsibilityFilters } from "$src/hooks/useSocialResponsibility";
import {
	type KpiMonthlyLevelEntry,
	useKpiMonthlyCountsByLevel,
} from "$src/hooks/useSupplyChain";
import { useMockData } from "$src/utils/config";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";

const LEVEL_COLORS: Record<string, string> = {
	level1: levelColorPalette.level1,
	level2: levelColorPalette.level2,
	level3: levelColorPalette.level3,
	level4: levelColorPalette.level4,
};

// Tooltip and supplier breakdown are handled below via echarts formatter

interface WorkerVoiceOverviewProps {
	filters?: SocialResponsibilityFilters;
	useSupplierTerminology?: boolean;
	emptyMessage?: string;
}

const WorkerVoiceOverview = ({
	filters,
	useSupplierTerminology = false,
	emptyMessage,
}: WorkerVoiceOverviewProps) => {
	const { t } = useTranslation();

	const levelLabels = useMemo(() => {
		if (useSupplierTerminology) {
			return {
				level1: t(
					"socialResponsibility.workerVoiceOverviewChart.levels.level1",
					{
						defaultValue: "Level 1 (Engagement)",
					},
				),
				level2: t(
					"socialResponsibility.workerVoiceOverviewChart.levels.level2",
					{
						defaultValue: "Level 2 (Early Warning)",
					},
				),
				level3: t(
					"socialResponsibility.workerVoiceOverviewChart.levels.level3_supplier",
					{
						defaultValue: "Level 3 (Labor Violation)",
					},
				),
				level4: t(
					"socialResponsibility.workerVoiceOverviewChart.levels.level4_supplier",
					{
						defaultValue: "Level 4 (Zero-tolerance Violation)",
					},
				),
			};
		}
		return {
			level1: t("socialResponsibility.workerVoiceOverviewChart.levels.level1", {
				defaultValue: "Level 1 (Engagement)",
			}),
			level2: t("socialResponsibility.workerVoiceOverviewChart.levels.level2", {
				defaultValue: "Level 2 (Early Warning)",
			}),
			level3: t(
				"socialResponsibility.workerVoiceOverviewChart.levels.level3_forced",
				{
					defaultValue: "Level 3 (Forced Labor Risk)",
				},
			),
			level4: t(
				"socialResponsibility.workerVoiceOverviewChart.levels.level4_forced_urgent",
				{
					defaultValue: "Level 4 (Forced Labor Risk - Urgent)",
				},
			),
		};
	}, [useSupplierTerminology, t]);
	const supplierIds = (filters?.supplierId as number[] | undefined) ?? [];
	const { isTestUser } = getUserIdentifiers();
	const shouldUseMockData = useMockData() || isTestUser;

	const { data: rawData = [], isLoading } = useKpiMonthlyCountsByLevel(
		supplierIds.length > 0
			? {
					suppliers: supplierIds,
					opened_at_range_after: filters?.startDate ?? undefined,
					opened_at_range_before: filters?.endDate ?? undefined,
					country: filters?.country ?? undefined,
					industry: filters?.industry ?? undefined,
				}
			: undefined,
		{ enabled: !shouldUseMockData },
	);

	// Use mock data if flag is enabled, otherwise use API data
	const dataSource = shouldUseMockData
		? (workerVoiceOverviewMock as KpiMonthlyLevelEntry[])
		: rawData;

	const sortedDataSource = useMemo(
		() =>
			[...dataSource].sort((left, right) =>
				left.month.localeCompare(right.month),
			),
		[dataSource],
	);

	// Format month labels as "Jan 2024"
	const chartData = useMemo(() => {
		return sortedDataSource.map((entry) => {
			const [year, month] = entry.month.split("-");
			const date = new Date(Number(year), Number(month) - 1, 1);
			return {
				...entry,
				monthLabel: date.toLocaleDateString("en-US", {
					month: "short",
					year: "numeric",
				}),
			};
		});
	}, [sortedDataSource]);

	const echartsOption = useMemo(() => {
		const categories = chartData.map((c) => c.monthLabel);
		return {
			tooltip: {
				trigger: "axis",
				axisPointer: { type: "shadow" },
				formatter: (params: any) => {
					if (!params || !params.length) return "";
					const label = params[0].name;
					const lines = params.map((p: any) => {
						return `${p.marker} ${p.seriesName}: <b>${p.value}</b>`;
					});
					return `${label}<br/>${lines.join("<br/>")}`;
				},
			},
			legend: {
				bottom: 8,
				left: "center",
				data: [
					levelLabels.level1,
					levelLabels.level2,
					levelLabels.level3,
					levelLabels.level4,
				],
				itemWidth: 18,
				itemHeight: 12,
			},
			grid: { left: 20, right: 20, bottom: 60, top: 20 },
			xAxis: { type: "category", data: categories, axisLabel: { rotate: 0 } },
			yAxis: { type: "value", axisLabel: { formatter: "{value}" } },
			series: [
				{
					name: levelLabels.level1,
					type: "bar",
					stack: "levels",
					data: chartData.map((d) => d.level1 ?? 0),
					itemStyle: { color: LEVEL_COLORS.level1 },
				},
				{
					name: levelLabels.level2,
					type: "bar",
					stack: "levels",
					data: chartData.map((d) => d.level2 ?? 0),
					itemStyle: { color: LEVEL_COLORS.level2 },
				},
				{
					name: levelLabels.level3,
					type: "bar",
					stack: "levels",
					data: chartData.map((d) => d.level3 ?? 0),
					itemStyle: { color: LEVEL_COLORS.level3 },
				},
				{
					name: levelLabels.level4,
					type: "bar",
					stack: "levels",
					data: chartData.map((d) => d.level4 ?? 0),
					itemStyle: { color: LEVEL_COLORS.level4 },
				},
			],
		} as const;
	}, [chartData, levelLabels]);

	if (!shouldUseMockData && isLoading) {
		return (
			<div className="flex items-center justify-center py-16 text-gray-500">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#148696]" />
					<p className="mt-3 text-sm">Loading worker voice data...</p>
				</div>
			</div>
		);
	}

	if (!shouldUseMockData && supplierIds.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-gray-400">
				<p className="text-sm">
					No supplier selected. Please select a supplier to view data.
				</p>
			</div>
		);
	}

	if (chartData.length === 0) {
		return (
			<div className="flex items-center justify-center py-12 text-gray-400">
				<p className="text-sm">
					{emptyMessage ??
						t("socialResponsibility.emptyStates.noData", {
							defaultValue: "No KPI data found.",
						})}
				</p>
			</div>
		);
	}

	return (
		<div className="w-full">
			<div className="mb-3">
				<p className="text-xs text-gray-500">
					{t("socialResponsibility.workerVoiceOverviewChart.description", {
						count: chartData.length,
						defaultValue: `Showing KPI cases over time grouped by severity level, ${chartData.length} months of data.`,
					})}
				</p>
			</div>
			<div style={{ height: 350 }}>
				<ReactECharts
					option={echartsOption}
					style={{ height: 350, width: "100%" }}
				/>
			</div>
		</div>
	);
};

export default WorkerVoiceOverview;
