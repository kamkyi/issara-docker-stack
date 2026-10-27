import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import KpiClosuresByMonthQualityChart from "$src/components/dashboard/KpiClosuresByMonthQualityChart";
import { FilterBar, type FilterBarFilters } from "$src/components/ui/FilterBar";
import { useRecruitmentMetrics } from "$src/hooks/useSocialResponsibility";
import { useSupplyChains } from "$src/hooks/useSupplyChain";
import { buildKpiClosuresQualityData } from "$src/queries/kpiClosuresQuality";
import { useErMetricsCount } from "$src/queries/useErMetricsCount";
import { useKpiClosures } from "$src/queries/useKpiClosures";
// import { useKpiTimelineData } from "$src/queries/useKpiTimelineData";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
// import { statusColorPalette } from "../../assets/mock/common-data";
import styles from "../../routes/our-workplace.module.css";

// ─── Stat card ─────────────────────────────────────────────────────────────

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

// Period-over-period trend badge — mirrors the Worker Voice tab styling.
function TrendBadge({
	value,
	className = "",
}: {
	value: number;
	className?: string;
}) {
	const positive = value > 0;
	const zero = value === 0;
	// Clamp extreme swings (tiny previous-period base) so the badge stays readable.
	const abs = Math.abs(value);
	const display = abs >= 1000 ? ">999%" : `${abs.toFixed(1)}%`;
	return (
		<div className={`flex items-center gap-1 font-semibold ${className}`}>
			<span
				className={positive || zero ? "text-emerald-600" : "text-[#FB8379]"}
			>
				{positive ? "↑" : zero ? "→" : "↓"} {display}
			</span>
			<span className="text-[#8A979C] font-normal">vs. previous period</span>
		</div>
	);
}

// Builds the HTML for a rich chart tooltip: a month heading, one row per segment
// (colored dot, label, count, affected workers), and a total line.
function buildChartTooltip(
	title: string,
	rows: { label: string; color: string; count: number; workers: number }[],
): string {
	const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
	const totalWorkers = rows.reduce((sum, r) => sum + r.workers, 0);
	const rowHtml = rows
		.map(
			(r) => `
			<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
				<span style="width:8px;height:8px;border-radius:9999px;background:${r.color};display:inline-block;"></span>
				<span style="color:#4a5568;flex:1;">${r.label}</span>
				<span style="font-weight:600;color:#1a202c;">${r.count.toLocaleString()}</span>
				<span style="color:#718096;margin-left:8px;">${r.workers.toLocaleString()} workers</span>
			</div>`,
		)
		.join("");
	return `
		<div style="font-family:'DM Sans',sans-serif;padding:8px 10px;min-width:240px;">
			<div style="font-weight:700;color:#1a202c;margin-bottom:2px;">${title}</div>
			${rowHtml}
			<div style="display:flex;justify-content:space-between;border-top:1px solid #edf2f7;margin-top:6px;padding-top:4px;font-weight:600;color:#1a202c;">
				<span>Total</span>
				<span>${totalCount.toLocaleString()} KPIs · ${totalWorkers.toLocaleString()} workers</span>
			</div>
		</div>`;
}

interface StatCardProps {
	label: string;
	value: number | string;
	prefix?: string;
	pctChange?: number | null;
	subLabel?: string;
	accentColor?: string;
}

function StatCard({
	label,
	value,
	prefix = "",
	pctChange,
	subLabel,
	accentColor = "#148696",
}: StatCardProps) {
	return (
		<div className={`${styles.chartCard} hover:shadow-md flex flex-col gap-2`}>
			<p className="text-md font-medium text-[#8A979C] tracking-wide leading-tight">
				{label}
			</p>
			<p
				className="text-5xl font-black tracking-tight"
				style={{ color: accentColor }}
			>
				{prefix}
				{typeof value === "number" ? value.toLocaleString() : value}
			</p>
			{pctChange != null && <TrendBadge value={pctChange} />}
			{subLabel && (
				<p className="text-xs text-[#8A979C] border-t border-[#D2D2D2] pt-2 mt-auto">
					{subLabel}
				</p>
			)}
		</div>
	);
}

// ─── Sub-stat row used inside KPI closures card ────────────────────────────

interface SubStatRowProps {
	title: string;
	workers: number;
	closedKpis: number;
	pctChange?: number | null;
}

function SubStatRow({
	title,
	workers,
	closedKpis,
	pctChange,
}: SubStatRowProps) {
	return (
		<div className="flex items-center justify-between py-2 px-m">
			<div>
				<p className="text-xs font-semibold text-[#004A60]">{title}</p>
				<p className="text-4xl font-black text-[#148696] leading-tight">
					{workers.toLocaleString()}
				</p>
				<p className="text-xs text-[#8A979C]">
					Total Closed KPIs: {closedKpis.toLocaleString()}
				</p>
			</div>
			{pctChange != null && (
				<TrendBadge className="text-sm" value={pctChange} />
			)}
		</div>
	);
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
	return <h2 className="heading-display mb-4 pb-1 uppercase">{children}</h2>;
}

// ─── Remediation Overview Section ──────────────────────────────────────────

interface RemediationOverviewSectionProps {
	workersRemediated: number;
	recruitmentFeeCases: number;
	feesDetected: number;
	workersRemediatedPct?: number | null;
	recruitmentFeesPct?: number | null;
	feesDetectedPct?: number | null;
}

function RemediationOverviewSection({
	workersRemediated,
	recruitmentFeeCases,
	feesDetected,
	workersRemediatedPct,
	recruitmentFeesPct,
	feesDetectedPct,
}: RemediationOverviewSectionProps) {
	return (
		<section>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-l mb-8">
				<StatCard
					accentColor="#148696"
					label="Workers with Labor Issues Identified and Remediated"
					pctChange={workersRemediatedPct}
					value={workersRemediated}
				/>
				<StatCard
					accentColor="#148696"
					label="Remediation for Recruitment Fees & Cases"
					pctChange={recruitmentFeesPct}
					prefix="$"
					value={recruitmentFeeCases}
				/>
				<StatCard
					accentColor="#148696"
					label="Remediation-related Fees Detected & Intercepted"
					pctChange={feesDetectedPct}
					prefix="$"
					value={feesDetected}
				/>
			</div>
		</section>
	);
}

// ─── KPI Closures Section ───────────────────────────────────────────────────

interface KpiClosuresSectionProps {
	totalWorkers: number;
	totalPct?: number | null;
	totalClosedKpis: number;
	supplyChainWorkers: number;
	supplyChainKpis: number;
	supplyChainPct?: number | null;
	nonSupplyChainWorkers: number;
	nonSupplyChainKpis: number;
	nonSupplyChainPct?: number | null;
	monthlyKpiData: {
		month: string;
		supplyChain: number;
		nonSupplyChain: number;
		supplyChainWorkers: number;
		nonSupplyChainWorkers: number;
	}[];
}

function KpiClosuresSection({
	totalWorkers,
	totalPct,
	totalClosedKpis,
	supplyChainWorkers,
	supplyChainKpis,
	supplyChainPct,
	nonSupplyChainWorkers,
	nonSupplyChainKpis,
	nonSupplyChainPct,
	monthlyKpiData,
}: KpiClosuresSectionProps) {
	return (
		<section>
			<SectionTitle>KPI Closures</SectionTitle>
			<div className="grid grid-cols-1 md:grid-cols-6 gap-l mb-8">
				{/* Left: total + breakdown */}
				<div className="md:col-span-2 flex flex-col gap-l">
					<div className={`${styles.chartCard}`}>
						<p className="text-xs font-medium text-[#8A979C] uppercase tracking-wide">
							Total Affected Workers
						</p>
						<p className="text-6xl text-center font-black text-[#148696]">
							{totalWorkers.toLocaleString()}
						</p>
						<p className="text-md text-center text-[#8A979C]">
							Total Closed KPIs: {totalClosedKpis.toLocaleString()}
						</p>
						{totalPct != null && (
							<TrendBadge className="justify-center text-sm" value={totalPct} />
						)}
					</div>
					<div className={`${styles.chartCard}`}>
						<p className="text-xs font-medium text-[#8A979C] uppercase tracking-wide">
							Total Affected Workers Breakdown
						</p>
						<SubStatRow
							closedKpis={supplyChainKpis}
							pctChange={supplyChainPct}
							title="Issara Supply Chain"
							workers={supplyChainWorkers}
						/>
						<hr className="my-2 opacity-10" />
						<SubStatRow
							closedKpis={nonSupplyChainKpis}
							pctChange={nonSupplyChainPct}
							title="Non-Supply Chain"
							workers={nonSupplyChainWorkers}
						/>
					</div>
				</div>
				{/* Right: Closed KPIs Over Time chart */}
				<div className={`${styles.chartCard} md:col-span-4 hover:shadow-md`}>
					<div className="mb-3 flex justify-between items-center">
						<p className={`${styles.chartFooterText} font-semibold`}>
							Closed KPIs Over Time
						</p>
						<span className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full font-medium">
							Monthly
						</span>
					</div>
					<ReactApexChart
						height={300}
						options={{
							chart: {
								type: "bar",
								stacked: true,
								toolbar: { show: false },
							},
							plotOptions: {
								bar: { borderRadius: 4, columnWidth: "65%" },
							},
							xaxis: {
								categories: monthlyKpiData.map((d) => d.month),
								labels: {
									style: {
										fontFamily: "DM Sans",
										colors: ["#718096"],
										fontSize: "11px",
									},
								},
							},
							yaxis: {
								labels: {
									style: { fontFamily: "DM Sans", colors: ["#718096"] },
								},
								title: {
									text: "Closed KPIs",
									style: { fontFamily: "DM Sans", fontWeight: 500 },
								},
							},
							colors: ["#148696", "#F472B6"],
							legend: {
								show: true,
								position: "bottom",
								fontFamily: "DM Sans",
								labels: { colors: ["#148696", "#F472B6"] },
							},
							tooltip: {
								shared: true,
								intersect: false,
								custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
									const d = monthlyKpiData[dataPointIndex];
									if (!d) return "";
									return buildChartTooltip(d.month, [
										{
											label: "Supply Chain",
											color: "#148696",
											count: d.supplyChain,
											workers: d.supplyChainWorkers,
										},
										{
											label: "Non-Supply Chain",
											color: "#F472B6",
											count: d.nonSupplyChain,
											workers: d.nonSupplyChainWorkers,
										},
									]);
								},
							},
						}}
						series={[
							{
								name: "Supply Chain",
								data: monthlyKpiData.map((d) => d.supplyChain),
							},
							{
								name: "Non-Supply Chain",
								data: monthlyKpiData.map((d) => d.nonSupplyChain),
							},
						]}
						type="bar"
					/>
				</div>
			</div>
		</section>
	);
}

// ─── KPIs Time Range + Avg Closure Section ─────────────────────────────────

// interface KpisTimeRangeSectionProps {
// 	timeToClosureData: { name: string; value: number }[];
// 	avgClosureTime: number;
// 	avgClosureTimePct?: number | null;
// 	supplyChainAvgDays: number;
// 	supplyChainClosedKpis: number;
// 	supplyChainPct?: number | null;
// 	nonSupplyChainAvgDays: number;
// 	nonSupplyChainClosedKpis: number;
// 	nonSupplyChainPct?: number | null;
// 	supplierTimelineFilters: {
// 		supplier?: string | string[];
// 		startTime: string;
// 		endTime: string;
// 	};
// 	timelinessData: any[];
// }

// function KpisTimeRangeSection({
// 	timeToClosureData,
// 	avgClosureTime,
// 	avgClosureTimePct,
// 	supplyChainAvgDays,
// 	supplyChainClosedKpis,
// 	supplyChainPct,
// 	nonSupplyChainAvgDays,
// 	nonSupplyChainClosedKpis,
// 	nonSupplyChainPct,
// 	timelinessData,
// }: KpisTimeRangeSectionProps) {
// 	const positive = avgClosureTimePct != null && avgClosureTimePct >= 0;
// 	const scPositive = supplyChainPct != null && supplyChainPct >= 0;
// 	const nscPositive = nonSupplyChainPct != null && nonSupplyChainPct >= 0;

// 	return (
// 		<>
// 			<section>
// 				<div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
// 					{/* Left: area chart */}
// 					<div className={`${styles.chartCard} md:col-span-3 hover:shadow-md`}>
// 						<div className="mb-3 flex justify-between items-center">
// 							<p className={`${styles.chartFooterText} font-semibold text-lg`}>
// 								KPIs Closure by Time Range
// 							</p>
// 							<span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
// 								Distribution
// 							</span>
// 						</div>
// 						<TimeToCaseClosureChart
// 							avgClosureTime={avgClosureTime}
// 							color="#148696"
// 							data={timeToClosureData}
// 							gradientColor="#4ede8f"
// 						/>
// 					</div>

// 					{/* Right: avg time cards */}
// 					<div className="md:col-span-2 flex flex-col gap-4">
// 						{/* Average Time to Case Closure */}
// 						<div className={`${styles.chartCard} hover:shadow-md flex-1`}>
// 							<p className="text-xs font-medium text-[#8A979C] uppercase tracking-wide mb-1">
// 								Average Time to Case Closure
// 							</p>
// 							<p className="text-5xl font-black text-[#148696] leading-none">
// 								{avgClosureTime.toFixed(0)}{" "}
// 								<span className="text-2xl font-semibold text-[#8A979C]">
// 									days
// 								</span>
// 							</p>
// 							{avgClosureTimePct != null && (
// 								<div className="flex items-center gap-1 text-xs font-semibold mt-2">
// 									{positive ? (
// 										<ArrowUpIcon className="text-emerald-500" />
// 									) : (
// 										<ArrowDownIcon className="text-red-500" />
// 									)}
// 									<span
// 										className={positive ? "text-emerald-600" : "text-red-500"}
// 									>
// 										{Math.abs(avgClosureTimePct).toFixed(1)}%
// 									</span>
// 									<span className="text-[#8A979C] font-normal">
// 										vs. previous year
// 									</span>
// 								</div>
// 							)}
// 						</div>

// 						{/* Breakdown */}
// 						<div className={`${styles.chartCard} hover:shadow-md flex-1`}>
// 							<p className="text-xs font-medium text-[#8A979C] uppercase tracking-wide mb-3">
// 								Average Time Range Breakdown
// 							</p>
// 							<div className="flex flex-col gap-2">
// 								<div className="flex items-center justify-between">
// 									<div>
// 										<p className="text-xs font-semibold text-[#004A60]">
// 											Issara Supply Chain
// 										</p>
// 										<p className="text-3xl font-black text-[#56666C]">
// 											{supplyChainAvgDays}{" "}
// 											<span className="text-base font-medium text-[#8A979C]">
// 												d
// 											</span>
// 										</p>
// 										<p className="text-xs text-[#8A979C]">
// 											Total Closed Cases:{" "}
// 											{supplyChainClosedKpis.toLocaleString()}
// 										</p>
// 									</div>
// 									{supplyChainPct != null && (
// 										<div className="flex items-center gap-0.5 text-xs font-semibold">
// 											{scPositive ? (
// 												<ArrowUpIcon className="text-emerald-500 w-3 h-3" />
// 											) : (
// 												<ArrowDownIcon className="text-red-500 w-3 h-3" />
// 											)}
// 											<span
// 												className={
// 													scPositive ? "text-emerald-600" : "text-red-500"
// 												}
// 											>
// 												{Math.abs(supplyChainPct).toFixed(1)}%
// 											</span>
// 										</div>
// 									)}
// 								</div>
// 								<div className="flex items-center justify-between border-t border-[#D2D2D2] pt-2">
// 									<div>
// 										<p className="text-xs font-semibold text-[#004A60]">
// 											Non-Supply Chain
// 										</p>
// 										<p className="text-3xl font-black text-[#56666C]">
// 											{nonSupplyChainAvgDays}{" "}
// 											<span className="text-base font-medium text-[#8A979C]">
// 												d
// 											</span>
// 										</p>
// 										<p className="text-xs text-[#8A979C]">
// 											Total Closed Cases:{" "}
// 											{nonSupplyChainClosedKpis.toLocaleString()}
// 										</p>
// 									</div>
// 									{nonSupplyChainPct != null && (
// 										<div className="flex items-center gap-0.5 text-xs font-semibold">
// 											{nscPositive ? (
// 												<ArrowUpIcon className="text-emerald-500 w-3 h-3" />
// 											) : (
// 												<ArrowDownIcon className="text-red-500 w-3 h-3" />
// 											)}
// 											<span
// 												className={
// 													nscPositive ? "text-emerald-600" : "text-red-500"
// 												}
// 											>
// 												{Math.abs(nonSupplyChainPct).toFixed(1)}%
// 											</span>
// 										</div>
// 									)}
// 								</div>
// 							</div>
// 						</div>
// 					</div>
// 				</div>
// 			</section>

// 			{/* Timeliness & Remediation Quality (reused) */}
// 			<section>
// 				<SectionTitle>Timeliness & Quality of Remediation</SectionTitle>
// 				<Box mb="8">
// 					<div className={styles.chartCard}>
// 						<TimelinessRemediationChart
// 							data={timelinessData}
// 							onCategoryChange={(v) => void v}
// 							onDateRangeChange={(v) => void v}
// 						/>
// 					</div>
// 				</Box>
// 			</section>
// 		</>
// 	);
// }

// ─── Main Page Component ────────────────────────────────────────────────────

interface DrivingEthicalSupplyChainsProps {
	filters?: FilterBarFilters;
	onFiltersChange?: (filters: FilterBarFilters) => void;
	defaultFrom?: string;
	defaultTo?: string;
}

function formatMonthLabel(monthKey: string) {
	const [year, month] = monthKey.split("-");
	if (!year || !month) return monthKey;
	const parsed = new Date(`${year}-${month}-01T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return monthKey;
	return parsed.toLocaleString("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	});
}

export default function DrivingEthicalSupplyChains({
	filters,
	onFiltersChange,
	defaultFrom,
	defaultTo,
}: DrivingEthicalSupplyChainsProps) {
	const { supplierId, partnerId, isSupplier, isGlobalPartner, isTestUser } =
		getUserIdentifiers();

	const { data: supplyChains = [] } = useSupplyChains();
	const supplierIds = useMemo(() => {
		if (isSupplier && supplierId) return [supplierId];
		if (isGlobalPartner) return [];
		if (isTestUser && isSupplier) return supplierId ? [supplierId] : [];
		return [];
	}, [
		isSupplier,
		isGlobalPartner,
		isTestUser,
		supplierId,
		partnerId,
		supplyChains,
	]);

	const selectedSupplierIds =
		filters?.suppliers?.map((value) => Number(value)).filter(Number.isFinite) ??
		[];
	const effectiveSupplierIds =
		selectedSupplierIds.length > 0 ? selectedSupplierIds : supplierIds;
	const effectivePartnerId = partnerId;
	// isGlobalPartner && partnerId && effectiveSupplierIds.length === 0
	// 	? partnerId
	// 	: null;
	const selectedCountries = (filters?.countries ?? []).filter(Boolean);
	const selectedIndustries = (filters?.industries ?? []).filter(Boolean);
	const selectedSubIndustries = (filters?.subIndustries ?? []).filter(Boolean);
	const countryFilter =
		selectedCountries.length > 0 ? selectedCountries.join(",") : undefined;
	const industryFilter =
		selectedIndustries.length > 0 ? selectedIndustries.join(",") : undefined;
	const subIndustryFilter =
		selectedSubIndustries.length > 0
			? selectedSubIndustries.join(",")
			: undefined;
	const startDate = filters?.from?.trim() || undefined;
	const endDate = filters?.to?.trim() || undefined;

	const queryParams = {
		supplierId: effectiveSupplierIds.length > 0 ? effectiveSupplierIds : null,
		partnerId: effectivePartnerId,
		country: countryFilter,
		industry: industryFilter,
		subIndustry: subIndustryFilter,
		startTime: startDate,
		endTime: endDate,
	};

	const { data, isLoading, error } = useWorkplaceStats(queryParams);

	// KPI Closures section: all figures come from actual closed KPI updates
	// (closed_at-keyed), with a real supply-chain vs non-supply-chain split.
	const { data: kpiClosures } = useKpiClosures(filters);

	// Immediately preceding, non-overlapping window of the same duration — for the
	// period-over-period trend badges (mirrors the Worker Voice tab).
	const { previousFrom, previousTo } = useMemo(() => {
		if (!startDate || !endDate) {
			return { previousFrom: startDate, previousTo: endDate };
		}
		const startMs = new Date(startDate).getTime();
		const endMs = new Date(endDate).getTime();
		if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
			return { previousFrom: startDate, previousTo: endDate };
		}
		const oneDayMs = 24 * 60 * 60 * 1000;
		const durationMs = endMs - startMs;
		const prevEndMs = startMs - oneDayMs;
		const prevStartMs = prevEndMs - durationMs;
		const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
		return { previousFrom: toIso(prevStartMs), previousTo: toIso(prevEndMs) };
	}, [startDate, endDate]);

	const { data: previousKpiClosures } = useKpiClosures({
		...filters,
		from: previousFrom,
		to: previousTo,
	});

	// const { data: kpiTimelineData } = useKpiTimelineData(
	// 	effectiveSupplierIds.length > 0 ||
	// 		effectivePartnerId ||
	// 		countryFilter ||
	// 		industryFilter
	// 		? {
	// 			supplierId:
	// 				effectiveSupplierIds.length > 0 ? effectiveSupplierIds : undefined,
	// 			partnerId: effectivePartnerId,
	// 			country: countryFilter,
	// 			industry: industryFilter,
	// 		}
	// 		: undefined,
	// );

	// KPI Closures figures — sourced entirely from the closed-KPI endpoint
	// (closed_at-keyed, real supply-chain split). Falls back to zeros while the
	// query is loading.
	const totalWorkers = kpiClosures?.totalAffectedWorkers ?? 0;
	const totalClosedKpis = kpiClosures?.totalClosedKpis ?? 0;
	const supplyChainWorkers = kpiClosures?.supplyChain.workers ?? 0;
	const nonSupplyChainWorkers = kpiClosures?.nonSupplyChain.workers ?? 0;
	const supplyChainKpis = kpiClosures?.supplyChain.closedKpis ?? 0;
	const nonSupplyChainKpis = kpiClosures?.nonSupplyChain.closedKpis ?? 0;

	// Period-over-period trends (vs the immediately preceding equal-length window),
	// computed on the affected-workers figures.
	const totalPct = calculatePercentChange(
		totalWorkers,
		previousKpiClosures?.totalAffectedWorkers ?? 0,
	);
	const scPct = calculatePercentChange(
		supplyChainWorkers,
		previousKpiClosures?.supplyChain.workers ?? 0,
	);
	const nonScPct = calculatePercentChange(
		nonSupplyChainWorkers,
		previousKpiClosures?.nonSupplyChain.workers ?? 0,
	);

	// Monthly KPI data for "Closed KPIs Over Time" chart
	const monthlyKpiData = useMemo(
		() =>
			(kpiClosures?.monthly ?? []).map((m) => ({
				month: formatMonthLabel(m.month),
				supplyChain: m.supplyChain,
				nonSupplyChain: m.nonSupplyChain,
				supplyChainWorkers: m.supplyChainWorkers,
				nonSupplyChainWorkers: m.nonSupplyChainWorkers,
			})),
		[kpiClosures],
	);

	// Time to closure buckets for TimeToCaseClosureChart
	// const timeToClosureData = useMemo(() => {
	// 	const buckets = [
	// 		{ name: "<1 day", value: 0 },
	// 		{ name: "1-7 days", value: 0 },
	// 		{ name: "8-30 days", value: 0 },
	// 		{ name: "31-90 days", value: 0 },
	// 		{ name: ">90 days", value: 0 },
	// 	];
	// 	if (normalizedDetailedKpis.length > 0) {
	// 		normalizedDetailedKpis.forEach((kpi) => {
	// 			const days = kpi.daysToClose;
	// 			if (days < 1) buckets[0].value += 1;
	// 			else if (days <= 7) buckets[1].value += 1;
	// 			else if (days <= 30) buckets[2].value += 1;
	// 			else if (days <= 90) buckets[3].value += 1;
	// 			else buckets[4].value += 1;
	// 		});
	// 		return buckets.filter((b) => b.value > 0);
	// 	}
	// 	(
	// 		(data?.time_to_case_closure?.monthly ?? []) as Array<{
	// 			avg_closure_time: number;
	// 			closed_cases: number;
	// 		}>
	// 	).forEach((item) => {
	// 		const days = item.avg_closure_time;
	// 		if (days < 1) buckets[0].value += item.closed_cases;
	// 		else if (days <= 7) buckets[1].value += item.closed_cases;
	// 		else if (days <= 30) buckets[2].value += item.closed_cases;
	// 		else if (days <= 90) buckets[3].value += item.closed_cases;
	// 		else buckets[4].value += item.closed_cases;
	// 	});
	// 	return buckets.filter((b) => b.value > 0);
	// }, [data, normalizedDetailedKpis]);

	// Avg closure time split (approx — supply chain cases tend to take longer)
	// const scAvgDays = Math.round(mainStats.avgClosureTime * 1.25);
	// const nscAvgDays = Math.round(mainStats.avgClosureTime * 0.92);

	// Make the selected [from, to] window fully inclusive. The ER-metrics
	// endpoint filters `created_at > start AND created_at <= end`, and every
	// record is stamped at 00:00:00. A start pinned to the from-date's midnight
	// would therefore drop records dated exactly on the from-date (e.g. a
	// first-of-month data point), making cascade read lower than the legacy
	// dashboard. Shift the start one second earlier so the from-date is
	// included, and extend the end to the end of the to-date. The default
	// window also runs through "now" so current-year data isn't silently
	// excluded.
	const supplierTimelineFilters = {
		supplier: effectiveSupplierIds.map(String),
		startTime: startDate
			? new Date(
					new Date(`${startDate}T00:00:00Z`).getTime() - 1000,
				).toISOString()
			: "2018-01-01T00:00:00Z",
		endTime: endDate ? `${endDate}T23:59:59Z` : new Date().toISOString(),
	};

	const { data: erMetricsCounts } = useErMetricsCount({
		startTimestamp: supplierTimelineFilters.startTime,
		endTimestamp: supplierTimelineFilters.endTime,
	});

	// Previous-window ER metrics (same inclusive shift, preceding window) for trends.
	const { data: previousErMetricsCounts } = useErMetricsCount({
		startTimestamp: previousFrom
			? new Date(
					new Date(`${previousFrom}T00:00:00Z`).getTime() - 1000,
				).toISOString()
			: "2018-01-01T00:00:00Z",
		endTimestamp: previousTo
			? `${previousTo}T23:59:59Z`
			: new Date().toISOString(),
	});

	// "Workers with Labor Issues Identified and Remediated" must use the same
	// data fetching as the CASCADE landing page (recruitment-metrics, which
	// derives the count from SupplierKpiUpdate.affected_workers) rather than the
	// ER-metrics aggregate, so the figure matches the landing page.
	const { data: recruitmentMetricsResponse } = useRecruitmentMetrics({
		from: startDate,
		to: endDate,
	});
	const recruitmentMetrics = recruitmentMetricsResponse?.data;

	const { data: previousRecruitmentMetricsResponse } = useRecruitmentMetrics({
		from: previousFrom,
		to: previousTo,
	});
	const previousRecruitmentMetrics = previousRecruitmentMetricsResponse?.data;
	// ── Render ────────────────────────────────────────────────────────────

	// The quality chart is derived from the same /ilm/kpi-closures payload that
	// feeds the "KPI Closures" cards above, so the case/worker totals reconcile.
	const qualityChartData = buildKpiClosuresQualityData(
		kpiClosures?.monthlyQuality,
	);

	if (isLoading) return <div className="p-xl text-center">Loading...</div>;

	if (error || !data)
		return (
			<div className="p-xl text-center text-red-500">Failed to load data.</div>
		);

	return (
		<>
			{/* Hero — date-only filter drives the Remediation Overview cards */}
			<div className="mx-auto mb-8 flex flex-wrap items-center justify-between gap-m">
				<h2 className="heading-display leading-tight uppercase">
					Remediation Overview
				</h2>
				<FilterBar
					className="p-0! bg-transparent!"
					defaultFrom={defaultFrom}
					defaultTo={defaultTo}
					filters={filters ?? {}}
					onChange={onFiltersChange ?? (() => {})}
					showCountry={false}
					showDateRange
					showIndustry={false}
					showSupplier={false}
				/>
			</div>
			<div className={`${styles.containerPadding}`}>
				<div>
					<RemediationOverviewSection
						feesDetected={
							erMetricsCounts?.recruitment_related_fees_detected_and_intercepted ??
							0
						}
						feesDetectedPct={calculatePercentChange(
							erMetricsCounts?.recruitment_related_fees_detected_and_intercepted ??
								0,
							previousErMetricsCounts?.recruitment_related_fees_detected_and_intercepted ??
								0,
						)}
						recruitmentFeeCases={
							recruitmentMetrics?.remediation_for_recruitment_fees_and_cases ??
							0
						}
						recruitmentFeesPct={calculatePercentChange(
							recruitmentMetrics?.remediation_for_recruitment_fees_and_cases ??
								0,
							previousRecruitmentMetrics?.remediation_for_recruitment_fees_and_cases ??
								0,
						)}
						workersRemediated={
							recruitmentMetrics?.workers_receiving_remediation ?? 0
						}
						workersRemediatedPct={calculatePercentChange(
							recruitmentMetrics?.workers_receiving_remediation ?? 0,
							previousRecruitmentMetrics?.workers_receiving_remediation ?? 0,
						)}
					/>

					{/* Full filter — drives the KPI Closures + Quality charts below */}
					<FilterBar
						className="mb-l"
						defaultFrom={defaultFrom}
						defaultTo={defaultTo}
						filters={filters ?? {}}
						onChange={onFiltersChange ?? (() => {})}
						showCountry={false}
						showDateRange
						showIndustry
						showSubIndustry
						showSupplier
						supplierServerSearch
					/>

					<KpiClosuresSection
						monthlyKpiData={monthlyKpiData}
						nonSupplyChainKpis={nonSupplyChainKpis}
						nonSupplyChainPct={nonScPct}
						nonSupplyChainWorkers={nonSupplyChainWorkers}
						supplyChainKpis={supplyChainKpis}
						supplyChainPct={scPct}
						supplyChainWorkers={supplyChainWorkers}
						totalClosedKpis={totalClosedKpis}
						totalPct={totalPct}
						totalWorkers={totalWorkers}
					/>

					<KpiClosuresByMonthQualityChart data={qualityChartData} fullWidth />

					{/* <KpisTimeRangeSection
						avgClosureTime={mainStats.avgClosureTime}
						avgClosureTimePct={26.7}
						nonSupplyChainAvgDays={nscAvgDays}
						nonSupplyChainClosedKpis={nonSupplyChainKpis}
						nonSupplyChainPct={-13.2}
						supplierTimelineFilters={supplierTimelineFilters}
						supplyChainAvgDays={scAvgDays}
						supplyChainClosedKpis={supplyChainKpis}
						supplyChainPct={53.3}
						timelinessData={kpiTimelineData ?? []}
						timeToClosureData={timeToClosureData}
					/> */}
				</div>
			</div>
		</>
	);
}
