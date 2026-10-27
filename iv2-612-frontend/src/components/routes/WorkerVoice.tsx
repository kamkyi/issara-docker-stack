import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { motion, type Variants } from "framer-motion";
import type React from "react";
import { useMemo } from "react";
import { statusColorPalette } from "$src/assets/mock/common-data";
import { WorkerVoiceCallChart } from "$src/components/home/WorkerVoiceChart";
import {
	FilterBar,
	type FilterBarFilters,
	type FilterBarOption,
} from "$src/components/ui/FilterBar";
import { InfoTip } from "$src/components/ui/InfoTip";
import { useHotlineOperators } from "$src/hooks/useHotlineOperators";
import { useWorkerVoice } from "$src/hooks/useWorkerVoice";
import type { WorkerVoiceMonthlyItem } from "$src/hooks/useWorkerVoiceMonthly";
import { useWorkerVoiceMonthly } from "$src/hooks/useWorkerVoiceMonthly";
import { useErMetricsCount } from "$src/queries/useErMetricsCount";
import { DEFAULT_FROM_DATE, getDefaultToDate } from "$src/utils/dateDefaults";

// import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";

// ─── Animation variants ────────────────────────────────────────────────────

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.12 } },
};

function formatMonthLabel(isoDate: string): string {
	const [year, month] = isoDate.split("-");
	return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
		"en-US",
		{ month: "short", year: "numeric" },
	);
}

function formatFlexibleMonthLabel(value: string): string {
	if (/^\d{4}-\d{2}$/.test(value)) {
		const [year, month] = value.split("-");
		return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
			"en-US",
			{ month: "short", year: "numeric" },
		);
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return formatMonthLabel(value);
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}

function calculatePercentChange(current: number, previous: number): number {
	if (
		!Number.isFinite(current) ||
		!Number.isFinite(previous) ||
		previous === 0
	) {
		return 0;
	}
	return ((current - previous) / previous) * 100;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
	const positive = value >= 0;
	const zero = value === 0;
	return (
		<Flex align="center" gap="1" mt="1">
			<span
				className={`text-sm font-semibold ${positive ? "text-emerald-500" : "text-red-500"}`}
			>
				{positive ? "↑" : zero ? "→" : "↓"} {Math.abs(value).toFixed(1)}%
			</span>
			<Text className="text-[#8A979C] text-xs">vs. previous period</Text>
		</Flex>
	);
}

function ReachKpiCard({
	label,
	value,
	trend,
	className = "",
	tooltip,
}: {
	label: string;
	value: number;
	trend?: number;
	className?: string;
	tooltip?: React.ReactNode;
}) {
	return (
		<motion.div
			className={`bg-white border border-[#D2D2D2] rounded-md shadow-sm p-m flex flex-col gap-1 ${className}`}
			variants={fadeUp}
		>
			<Text className="text-[#56666C] text-sm tracking-wider">
				{label}
				{tooltip}
			</Text>
			<p className="text-5xl text-[#148696]  my-2 font-black">
				{value.toLocaleString()}
			</p>
			{typeof trend === "number" && <TrendBadge value={trend} />}
		</motion.div>
	);
}

function GenderStatCard({
	gender,
	count,
	trend,
}: {
	gender: string;
	count: number;
	trend: number;
}) {
	const positive = trend >= 0;
	return (
		<div className="flex flex-col gap-0.5">
			<p className="text-5xl text-[#148696] font-black">
				{count.toLocaleString()}
			</p>
			<Text className="text-[#8A979C] text-sm font-medium">{gender}</Text>
			<Flex align="center" gap="1">
				<span
					className={`text-xs font-semibold ${positive ? "text-emerald-500" : "text-red-500"}`}
				>
					{positive ? "↑" : "↓"} {Math.abs(trend).toFixed(0)}%
				</span>
				<Text className="text-[#8A979C] text-[11px]">vs. previous period</Text>
			</Flex>
		</div>
	);
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center py-24 text-[#8A979C]">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#148696]" />
				<p className="mt-3 text-sm">Loading worker voice data…</p>
			</div>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-[#8A979C] gap-m">
			<ChatBubbleIcon className="w-10 h-10 opacity-30" />
			<p className="text-sm">No data found for the selected filters.</p>
		</div>
	);
}

function SectionCard({
	title,
	children,
	className = "",
}: {
	title: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={`rounded-md overflow-hidden ${className}`}
			variants={fadeUp}
		>
			{title && (
				<div className="py-m border-b border-[#D2D2D2]">
					<h2 className="heading-display">{title}</h2>
				</div>
			)}
			<div className="">{children}</div>
		</motion.div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────

interface WorkerVoiceProps {
	filters?: FilterBarFilters;
	onFiltersChange?: (filters: FilterBarFilters) => void;
	defaultFrom?: string;
	defaultTo?: string;
}

export default function WorkerVoice({
	filters,
	onFiltersChange,
	defaultFrom,
	defaultTo,
}: WorkerVoiceProps) {
	const from = filters?.from?.trim() || defaultFrom || DEFAULT_FROM_DATE;
	const to = filters?.to?.trim() || defaultTo || getDefaultToDate();
	const searchTerm = filters?.search ?? "";
	const supplierFilter =
		(filters?.suppliers ?? []).length > 0
			? (filters?.suppliers ?? []).join(",")
			: undefined;
	const countryFilter =
		(filters?.countries ?? []).length > 0
			? (filters?.countries ?? []).join(",")
			: undefined;
	const industryFilter =
		(filters?.industries ?? []).length > 0
			? (filters?.industries ?? []).join(",")
			: undefined;
	const operatorFilter =
		(filters?.operators ?? []).length > 0
			? (filters?.operators ?? []).join(",")
			: undefined;

	const { data: apiResponse, isLoading } = useWorkerVoiceMonthly(from, to, {
		supplierId: supplierFilter,
		country: countryFilter,
		industry: industryFilter,
		operator: operatorFilter,
	});
	const { data: workerVoiceResponse, isLoading: isWorkerVoiceLoading } =
		useWorkerVoice(from, to, {
			supplierId: supplierFilter,
			country: countryFilter,
			industry: industryFilter,
			operator: operatorFilter,
		});

	// ─── Previous equal-length window (for period-over-period trends) ────────
	// Immediately preceding, non-overlapping window of the same duration.
	const { previousFrom, previousTo } = useMemo(() => {
		const startMs = new Date(from).getTime();
		const endMs = new Date(to).getTime();
		if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
			return { previousFrom: from, previousTo: to };
		}
		const oneDayMs = 24 * 60 * 60 * 1000;
		const durationMs = endMs - startMs;
		const prevEndMs = startMs - oneDayMs;
		const prevStartMs = prevEndMs - durationMs;
		const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
		return { previousFrom: toIso(prevStartMs), previousTo: toIso(prevEndMs) };
	}, [from, to]);

	const { data: previousWorkerVoiceResponse } = useWorkerVoice(
		previousFrom,
		previousTo,
		{
			supplierId: supplierFilter,
			country: countryFilter,
			industry: industryFilter,
			operator: operatorFilter,
		},
	);

	// ─── Section 1 (Reach & Impact) — date-only data ────────────────────────
	// The top-of-page KPI cards and the nationality/country chart respond to the
	// date range only; the Section 2 filters (supplier/country/industry/operator)
	// must not affect them. These fetches deliberately omit those filters.
	const { data: sectionOneVoiceResponse } = useWorkerVoice(from, to, {});
	const { data: sectionOnePrevVoiceResponse } = useWorkerVoice(
		previousFrom,
		previousTo,
		{},
	);
	const { data: sectionOneMonthlyResponse } = useWorkerVoiceMonthly(
		from,
		to,
		{},
	);
	const { data: sectionOnePrevMonthlyResponse } = useWorkerVoiceMonthly(
		previousFrom,
		previousTo,
		{},
	);

	const sumMonthlyGrandTotal = (
		resp: { data?: Array<{ data?: Array<{ count: number }> }> } | undefined,
	) => {
		const items = Array.isArray(resp?.data) ? resp.data : [];
		return items.reduce(
			(sum, item) =>
				sum +
				(Array.isArray(item.data) ? item.data : []).reduce(
					(s, d) => s + Number(d.count ?? 0),
					0,
				),
			0,
		);
	};

	// Card "Calls and Messages from Workers" (date-only).
	const sectionOneGrandTotal = useMemo(
		() => sumMonthlyGrandTotal(sectionOneMonthlyResponse),
		[sectionOneMonthlyResponse],
	);
	const sectionOneGrandTotalTrend = useMemo(
		() =>
			calculatePercentChange(
				sectionOneGrandTotal,
				sumMonthlyGrandTotal(sectionOnePrevMonthlyResponse),
			),
		[sectionOneGrandTotal, sectionOnePrevMonthlyResponse],
	);

	// Card "24/7 Hotline Call Metrics" (date-only).
	const sectionOneTotalCalls =
		sectionOneVoiceResponse?.data?.totalInteractions ?? 0;
	const sectionOneTotalCallsTrend = calculatePercentChange(
		sectionOneTotalCalls,
		sectionOnePrevVoiceResponse?.data?.totalInteractions ?? 0,
	);

	// Average monthly calls for the previous window, from the case-based monthly
	// breakdown (so it respects supplier/country/industry filters).
	const previousAvgMonthlyCalls = useMemo(() => {
		const breakdown = Array.isArray(
			previousWorkerVoiceResponse?.data?.monthlyBreakdown,
		)
			? previousWorkerVoiceResponse.data.monthlyBreakdown
			: [];
		if (breakdown.length === 0) return 0;
		const sum = breakdown.reduce((s, m) => s + (m.total ?? 0), 0);
		return Math.round(sum / breakdown.length);
	}, [previousWorkerVoiceResponse]);

	// Global stats (workers with access, demographics) — no supplier filter
	// const { data: workplaceData } = useWorkplaceStats();

	const rawItems: WorkerVoiceMonthlyItem[] = useMemo(() => {
		const payload = apiResponse?.data;
		const candidates = [
			payload,
			(payload as { data?: unknown })?.data,
			apiResponse,
			(apiResponse as { data?: unknown })?.data,
		];

		const source = candidates.find((candidate) => Array.isArray(candidate));
		if (!Array.isArray(source)) return [];

		return source?.map((item: any) => ({
			month: typeof item?.month === "string" ? item.month : "Unknown",
			data: Array.isArray(item?.data)
				? item.data
						?.map((entry: any) => ({
							key: String(entry?.key ?? "Unknown"),
							count: Number(entry?.count ?? 0),
						}))
						.filter((entry: { key: string; count: number }) =>
							Number.isFinite(entry.count),
						)
				: [],
		}));
	}, [apiResponse]);

	// Filter by search term against category keys
	const items = useMemo(() => {
		const term = searchTerm.toLowerCase();
		if (!term) return rawItems;
		return rawItems?.map((item) => ({
			...item,
			data: (Array.isArray(item.data) ? item.data : []).filter((d) =>
				d.key.toLowerCase().includes(term),
			),
		}));
	}, [rawItems, searchTerm]);

	const sortedItems = useMemo(
		() => [...items].sort((a, b) => a.month.localeCompare(b.month)),
		[items],
	);

	// ─── Reach & Impact derived data ────────────────────────────────────────

	const monthlyTotals = useMemo(
		() =>
			sortedItems?.map((item) => ({
				month: formatMonthLabel(item.month),
				total: (Array.isArray(item.data) ? item.data : []).reduce(
					(s, d) => s + d.count,
					0,
				),
			})),
		[sortedItems],
	);

	const sectionOneMonthlyTotals = useMemo(() => {
		if (workerVoiceResponse) {
			const breakdown = Array.isArray(
				workerVoiceResponse?.data?.monthlyBreakdown,
			)
				? workerVoiceResponse.data.monthlyBreakdown
				: [];
			return breakdown?.map((item) => ({
				month: formatFlexibleMonthLabel(item.month),
				total: item.total ?? 0,
			}));
		}

		return monthlyTotals;
	}, [workerVoiceResponse, monthlyTotals]);

	// Sum of the "Total Call Counts by Month" chart — surfaced as a KPI scorecard.
	const totalCallCountsByMonth = useMemo(
		() =>
			(Array.isArray(sectionOneMonthlyTotals)
				? sectionOneMonthlyTotals
				: []
			).reduce((sum, m) => sum + (m.total ?? 0), 0),
		[sectionOneMonthlyTotals],
	);

	// Same total for the previous equal-length window (filtered), for the card trend.
	const previousTotalCallCounts = useMemo(() => {
		const breakdown = Array.isArray(
			previousWorkerVoiceResponse?.data?.monthlyBreakdown,
		)
			? previousWorkerVoiceResponse.data.monthlyBreakdown
			: [];
		return breakdown.reduce((sum, m) => sum + (m.total ?? 0), 0);
	}, [previousWorkerVoiceResponse]);

	const totalCallCountsByMonthTrend = calculatePercentChange(
		totalCallCountsByMonth,
		previousTotalCallCounts,
	);

	// First-time callers (cases reporting they contacted Issara for the first time).
	const firstTimeContactingIssara =
		workerVoiceResponse?.data?.firstTimeContactingIssara ?? 0;
	const firstTimeContactingIssaraTrend = calculatePercentChange(
		firstTimeContactingIssara,
		previousWorkerVoiceResponse?.data?.firstTimeContactingIssara ?? 0,
	);

	// First-time counts keyed by the same formatted month label used on the
	// chart's x-axis, so the tooltip can show each month's value.
	const firstTimeByMonthLabel = useMemo(() => {
		const breakdown = Array.isArray(
			workerVoiceResponse?.data?.firstTimeMonthlyBreakdown,
		)
			? workerVoiceResponse.data.firstTimeMonthlyBreakdown
			: [];
		const map: Record<string, number> = {};
		for (const item of breakdown) {
			map[formatFlexibleMonthLabel(item.month)] = item.total ?? 0;
		}
		return map;
	}, [workerVoiceResponse]);

	// 3-month rolling average of monthly calls — drives the trend sparkline beside
	// "Total Average Monthly Calls" so it shows the average trend rather than
	// duplicating the raw monthly counts. Falls back to raw totals if the API
	// hasn't supplied the rolling-average series.
	const sectionOneRollingAverage = useMemo(() => {
		const rolling = Array.isArray(
			workerVoiceResponse?.data?.monthlyRollingAverage,
		)
			? workerVoiceResponse.data.monthlyRollingAverage
			: [];
		if (rolling.length > 0) {
			return rolling.map((item) => ({
				month: formatFlexibleMonthLabel(item.month),
				average: item.average ?? 0,
			}));
		}
		const totals = Array.isArray(sectionOneMonthlyTotals)
			? sectionOneMonthlyTotals
			: [];
		return totals.map((m) => ({ month: m.month, average: m.total ?? 0 }));
	}, [workerVoiceResponse, sectionOneMonthlyTotals]);

	// ─── Worker Calls Breakdown derived data ─────────────────────────────────

	// Average monthly calls from the case-based monthly breakdown so it responds
	// to supplier/country/industry filters (Worker Calls Breakdown section).
	const avgMonthlyCalls = useMemo(() => {
		const series = Array.isArray(sectionOneMonthlyTotals)
			? sectionOneMonthlyTotals
			: [];
		if (series.length === 0) return 0;
		const sum = series.reduce((s, m) => s + (m.total ?? 0), 0);
		return Math.round(sum / series.length);
	}, [sectionOneMonthlyTotals]);

	const genderData = useMemo(() => {
		const demo = Array.isArray(workerVoiceResponse?.data?.casesByGender)
			? workerVoiceResponse.data.casesByGender
			: [];
		const previousDemo = Array.isArray(
			previousWorkerVoiceResponse?.data?.casesByGender,
		)
			? previousWorkerVoiceResponse.data.casesByGender
			: [];

		const getCount = (entries: any[], target: string) =>
			Number(
				entries.find((d: any) => d.gender?.toLowerCase() === target)?.count ??
					0,
			);

		// Period-over-period change vs the same gender in the previous window.
		const build = (label: string, target: string) => {
			const count = getCount(demo, target);
			const previousCount = getCount(previousDemo, target);
			return {
				gender: label,
				count,
				trend: calculatePercentChange(count, previousCount),
			};
		};

		return [
			build("Men", "male"),
			build("Women", "female"),
			build("Unknown", "unknown"),
		];
	}, [workerVoiceResponse, previousWorkerVoiceResponse]);

	const nationalityPieData = useMemo(() => {
		const demo = Array.isArray(
			(workerVoiceResponse as any)?.data?.nationalityByCallCount,
		)
			? (workerVoiceResponse as any).data.nationalityByCallCount
			: [];
		return demo.length > 0 ? demo : [];
	}, [workerVoiceResponse]);

	// ─── ECharts options ─────────────────────────────────────────────────────

	const areaChartOption = useMemo(
		() => ({
			tooltip: {
				trigger: "axis" as const,
				axisPointer: { type: "cross" as const },
				formatter: (params: any[]) => {
					if (!params?.length) return "";
					return (
						`${params[0].name}<br/>${params[0].marker} Total calls count: <b>${params[0].value}</b>` +
						`<br/>First time contacting Issara: <b>${(firstTimeByMonthLabel[params[0].name] ?? 0).toLocaleString()}</b>`
					);
				},
			},
			legend: {
				bottom: 0,
				data: ["Total calls count"],
				textStyle: { fontSize: 12 },
			},
			grid: { left: 16, right: 16, bottom: 40, top: 16, containLabel: true },
			xAxis: {
				type: "category" as const,
				data: sectionOneMonthlyTotals?.map((m) => m.month),
				axisLabel: { rotate: 30, fontSize: 10 },
				boundaryGap: false,
			},
			yAxis: { type: "value" as const, splitLine: { show: true } },
			series: [
				{
					name: "Total calls count",
					type: "line",
					smooth: true,
					symbol: "circle",
					symbolSize: 6,
					areaStyle: {
						color: {
							type: "linear",
							x: 0,
							y: 0,
							x2: 0,
							y2: 1,
							colorStops: [
								{ offset: 0, color: "rgba(20,134,150,0.35)" },
								{ offset: 1, color: "rgba(20,134,150,0)" },
							],
						},
					},
					lineStyle: { color: "#148696", width: 2 },
					itemStyle: { color: "#148696" },
					data: sectionOneMonthlyTotals?.map((m) => m.total),
				},
			],
		}),
		[sectionOneMonthlyTotals, firstTimeByMonthLabel],
	);

	const sparklineOption = useMemo(
		() => ({
			tooltip: {
				trigger: "axis" as const,
				axisPointer: { type: "line" as const, lineStyle: { color: "#148696" } },
				confine: true,
				formatter: (params: any[]) => {
					if (!params?.length) return "";
					const p = params[0];
					return `${p.axisValue}<br/>${p.marker} 3-mo avg: <b>${Number(p.value ?? 0).toLocaleString()}</b>`;
				},
			},
			grid: { left: 0, right: 0, top: 4, bottom: 0 },
			xAxis: {
				type: "category" as const,
				show: false,
				boundaryGap: false,
				data: sectionOneRollingAverage?.map((m) => m.month),
			},
			yAxis: { type: "value" as const, show: false },
			series: [
				{
					type: "line",
					smooth: true,
					showSymbol: false,
					emphasis: { showSymbol: true },
					symbolSize: 6,
					itemStyle: { color: "#148696" },
					lineStyle: { color: "#148696", width: 1.5 },
					areaStyle: { color: "rgba(20,134,150,0.1)" },
					data: sectionOneRollingAverage?.map((m) => m.average),
				},
			],
		}),
		[sectionOneRollingAverage],
	);

	const nationalityPieOption = useMemo(
		() => ({
			tooltip: {
				trigger: "item" as const,
				formatter: "{b}<br/>Total Calls Count: {c} ({d}%)",
			},
			legend: {
				orient: "vertical" as const,
				right: 0,
				top: "center",
				textStyle: { fontSize: 11 },
				itemWidth: 10,
				itemHeight: 10,
			},
			series: [
				{
					type: "pie",
					radius: ["40%", "72%"],
					center: ["40%", "50%"],
					avoidLabelOverlap: true,
					label: {
						show: true,
						formatter: "{d}%",
						fontSize: 11,
						position: "inside",
					},
					emphasis: {
						label: { show: true, fontSize: 12, fontWeight: "bold" as const },
						itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
					},
					data: nationalityPieData?.map((d, idx) => ({
						name: d.nationality,
						value: d.count,
						itemStyle: { color: statusColorPalette[idx * 2] },
					})),
				},
			],
		}),
		[nationalityPieData],
	);

	const isDataLoading = isLoading || isWorkerVoiceLoading;
	// The "Workers Connected" card and the WV summary are not bound to the
	// monthly call dataset, so the tab should not be considered empty just
	// because the selected date range has no monthly call records.
	const hasWorkerVoiceSummary =
		(workerVoiceResponse?.data?.workersWithAccess ?? 0) > 0 ||
		(workerVoiceResponse?.data?.totalInteractions ?? 0) > 0;
	const isEmpty =
		!isDataLoading && sortedItems.length === 0 && !hasWorkerVoiceSummary;
	const { data: erMetricsCounts } = useErMetricsCount({
		startTimestamp: from,
		endTimestamp: to,
	});

	const { data: previousErMetricsCounts } = useErMetricsCount({
		startTimestamp: previousFrom,
		endTimestamp: previousTo,
	});

	const workersConnected = erMetricsCounts?.workers_voice_channels ?? 0;
	const workersConnectedTrend = calculatePercentChange(
		workersConnected,
		previousErMetricsCounts?.workers_voice_channels ?? 0,
	);

	// const totalCallsTrend = calculatePercentChange(
	// 	workerVoiceResponse?.data?.totalInteractions ?? 0,
	// 	previousWorkerVoiceResponse?.data?.totalInteractions ?? 0,
	// );

	const avgMonthlyCallsTrend = calculatePercentChange(
		avgMonthlyCalls,
		previousAvgMonthlyCalls,
	);

	// Shared filter element bound to the single parent `filters` state. Rendered
	// twice (Section 1 date-only header, Section 2 full row); because both write
	// back through `onFiltersChange`, edits in either stay in sync everywhere.
	const handleFiltersChange = (next: FilterBarFilters) => {
		onFiltersChange?.(next);
	};

	// Full supplier list for the Worker Calls Breakdown filter. Sourced from the
	// paginated supplier dropdown endpoint rather than the map markers, so
	// suppliers without map coordinates are still selectable. Auto-fetches every
	// page so the dropdown isn't capped at the first 100.
	// The Supplier dropdown uses server-side type-ahead search (FilterBar's
	// supplierServerSearch), so the full supplier list is no longer pre-loaded.

	const { data: hotlineOperatorsResponse } = useHotlineOperators();
	const operatorOptions = useMemo<FilterBarOption[]>(() => {
		const operators = hotlineOperatorsResponse?.data ?? [];
		return operators
			.map((op) => ({ value: String(op.id), label: op.name }))
			.filter((opt) => opt.value && opt.label);
	}, [hotlineOperatorsResponse]);

	return (
		<>
			{/* ─── Body ──────────────────────────────────────────────────────── */}
			{isDataLoading ? (
				<LoadingState />
			) : isEmpty ? (
				<EmptyState />
			) : (
				<motion.div
					animate="visible"
					// className="container"
					initial="hidden"
					variants={stagger}
				>
					{/* Grand total banner */}
					{/* <motion.div
						className="bg-[rgba(20,134,150,0.1)] border border-[#148696]/20 rounded-md px-6 py-4 mt-6 flex items-center justify-between"
						variants={fadeUp}
					>
						<Text className="text-[#004A60] font-bold">
							Total worker voice reports in period:
						</Text>
						<Heading className="font-heading text-[#148696]" size="7">
							{grandTotal.toLocaleString()}
						</Heading>
					</motion.div> */}

					{/* ═══════════════════════════════════════════════════════════
						    SECTION 1 — Reach & Impact of Worker Voice Mechanisms
						    ══════════════════════════════════════════════════════════ */}
					<SectionCard title="">
						{/* Section header: title (left) + date-only filter (right) */}
						<div className="flex flex-wrap items-center justify-between gap-m py-m border-b border-[#D2D2D2] mb-l">
							<h2 className="heading-display">
								Reach &amp; Impact of Worker Voice Mechanisms
							</h2>
							<FilterBar
								className="p-0! bg-transparent!"
								defaultFrom={defaultFrom}
								defaultTo={defaultTo}
								filters={filters ?? {}}
								onChange={handleFiltersChange}
								showCountry={false}
								showDateRange
								showIndustry={false}
								showSupplier={false}
							/>
						</div>

						{/* 3 KPI cards in a row */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-l mb-l">
							<ReachKpiCard
								label="Workers with Access to Worker Voice Channels"
								tooltip={
									<InfoTip title="Workers with Access to Worker Voice Channels">
										<p>This metric counts:</p>
										<ol className="mt-3 list-decimal space-y-2 pl-5">
											<li>
												<strong>First-time contact:</strong> jobseekers/workers
												who send a message for the first time through Messenger,
												WhatsApp, Viber, Line, Telegram, Zalo, or other official
												Worker Voice communication channels.
											</li>
											<li>
												<strong>New followers:</strong> jobseekers/workers who
												newly follow our official digital channels, including
												Facebook, TikTok, YouTube, or other official Worker
												Voice social media platforms.
											</li>
											<li>
												<strong>Engagement through promotional content:</strong>{" "}
												interactions (e.g. engagement with posts or videos,
												comments, shares) generated through promotional content
												prepared and uploaded by Issara-hired social media
												influencers, where the engagement is from jobseekers or
												workers, reflected in Issara WV channel metrics.
											</li>
											<li>
												<strong>Golden Dreams registrations/users:</strong> all
												new Golden Dreams registrations are included in the
												monthly metrics.
											</li>
											<li>
												<strong>Hotline calls:</strong> first-time callers,
												jobseekers or workers, recorded in ILM as first-time
												callers.
											</li>
											<li>
												<strong>CSO data:</strong> number of people reached for
												the first time by CSO partners/sub-grantees (each
												activity is entered in the ILM system).
											</li>
											<li>
												<strong>
													Worker Voice roll-out at new supplier sites:
												</strong>{" "}
												the totality of workers at a site where WV roll-out is
												done for the first time.
											</li>
											<li>Workers reached during community outreach.</li>
											<li>Workers reached during OLI.</li>
											<li>New mobilizers trained.</li>
											<li>
												Pre-departure orientation (total number of workers
												joining the session).
											</li>
											<li>
												Workers reached during housing, if meeting them for the
												first time.
											</li>
										</ol>
									</InfoTip>
								}
								trend={workersConnectedTrend}
								value={workersConnected}
							/>
							<ReachKpiCard
								label="Calls and Messages from Workers"
								trend={sectionOneGrandTotalTrend}
								value={sectionOneGrandTotal}
							/>
							<ReachKpiCard
								label="24/7 Hotline Call Metrics"
								trend={sectionOneTotalCallsTrend}
								value={sectionOneTotalCalls}
							/>
						</div>

						{/* Full-width: nationality stacked bar */}
						<WorkerVoiceCallChart from={from} to={to} />
					</SectionCard>

					{/* ═══════════════════════════════════════════════════════════
					    SECTION 2 — 24/7 Hotline Call Metrics Breakdown
					    ══════════════════════════════════════════════════════════ */}
					<SectionCard title="24/7 Hotline Call Metrics Breakdown">
						{/* Full filter row — two-way synced with the Section 1 date filter */}
						<FilterBar
							className="mb-l"
							defaultFrom={defaultFrom}
							defaultTo={defaultTo}
							filters={filters ?? {}}
							onChange={handleFiltersChange}
							operatorOptions={operatorOptions}
							showCountry
							showDateRange
							showIndustry
							showOperator
							showSupplier
							supplierServerSearch
						/>

						{/* Two stacked KPI cards (left) + Total Call Counts by Month chart */}
						<div className="grid grid-cols-1 lg:grid-cols-4 gap-l mb-l items-stretch">
							{/* Two stacked KPI cards — narrower column, combined height matches the chart */}
							<div className="lg:col-span-1 flex flex-col gap-l">
								<ReachKpiCard
									className="flex-1 justify-center"
									label="Total Calls"
									trend={totalCallCountsByMonthTrend}
									value={totalCallCountsByMonth}
								/>
								<ReachKpiCard
									className="flex-1 justify-center"
									label="First Time Contacting Issara"
									trend={firstTimeContactingIssaraTrend}
									value={firstTimeContactingIssara}
								/>
							</div>

							{/* Chart — spans 3/4 */}
							<div className="lg:col-span-3 bg-white shadow-sm rounded-md p-m border border-[#D2D2D2]">
								<Text className="text-md text-[#56666C] tracking-wider mb-m block">
									Total Call Counts by Month
								</Text>
								<ReactECharts
									option={areaChartOption}
									style={{ height: 340, width: "100%" }}
								/>
							</div>
						</div>

						<div className="bg-white grid grid-cols-1 lg:grid-cols-2 gap-l">
							{/* Left: avg monthly + gender */}
							<div className="flex flex-col gap-2">
								{/* Average monthly */}
								<div className="p-8">
									<Text className="text-md text-[#56666C] tracking-wider mb-s block">
										Total Average Monthly Calls
									</Text>
									<Flex align="end" gap="4" mt="2">
										<div>
											<p className="text-5xl text-[#148696] font-black">
												{avgMonthlyCalls.toLocaleString()}
											</p>
											<TrendBadge value={avgMonthlyCallsTrend} />
										</div>
										{/* Sparkline */}
										{sectionOneRollingAverage.length > 1 && (
											<div className="flex-1 h-14">
												<ReactECharts
													option={sparklineOption}
													style={{ height: 56, width: "100%" }}
												/>
											</div>
										)}
									</Flex>
								</div>

								{/* Gender breakdown */}
								<div className="border-t border-[#D2D2D2] pt-l px-xl">
									<Text className="text-md text-[#56666C] tracking-wider mb-m block">
										Breakdown by Gender
									</Text>
									<div className="grid grid-cols-3 gap-m">
										{genderData?.map((g) => (
											<GenderStatCard
												count={g.count}
												gender={g.gender}
												key={g.gender}
												trend={g.trend}
											/>
										))}
									</div>
								</div>
							</div>

							{/* Right: nationality donut */}
							<div className="border-t border-[#D2D2D2] pt-l px-xl">
								<Flex align="center" gap="2" mb="3">
									<Text className="text-md text-[#56666C]">
										Breakdown by Nationality
									</Text>
								</Flex>
								<ReactECharts
									option={nationalityPieOption}
									style={{ height: 280, width: "100%" }}
								/>
							</div>
						</div>
					</SectionCard>
				</motion.div>
			)}
		</>
	);
}
