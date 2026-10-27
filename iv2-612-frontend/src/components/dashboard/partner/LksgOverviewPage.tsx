import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardHero from "$src/components/dashboard/DashboardHero";
import KpiCards from "$src/components/dashboard/KpiCards";
import KpiClosuresByMonthQualityChart from "$src/components/dashboard/KpiClosuresByMonthQualityChart";
import LiveStatusBar from "$src/components/dashboard/LiveStatusBar";
import LksgTreemapSection from "$src/components/dashboard/LksgTreemapSection";
import PerformanceMetrics from "$src/components/dashboard/PerformanceMetrics";
import HrddAccordionSection from "$src/components/dashboard/partner/HrddAccordionSection";
import { LksgRiskManagementSection } from "$src/components/dashboard/partner/LksgRiskManagementSection";
import OpenEscalatedCasesTable, {
	useOpenEscalatedCases,
} from "$src/components/dashboard/partner/OpenEscalatedCasesTable";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import "react-datepicker/dist/react-datepicker.css";

import companyDashboardData from "$src/assets/mock/company-dashboard.json";
import {
	buildKpiClosuresQualityData,
	getMockKpiClosuresQualityData,
} from "$src/queries/kpiClosuresQuality";
import { useKpiClosures } from "$src/queries/useKpiClosures";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { isInternalRole } from "$src/utils/storedRole";

const LKSG_SECTION_TITLES = {
	section4: "LkSG SECTION 4. RISK MANAGEMENT",
	section5: "LkSG SECTION 5. RISK ANALYSIS",
	section6: "LkSG SECTION 6. PREVENTIVE MEASURES",
	section7: "LkSG SECTION 7. REMEDIAL ACTION",
	section8: "LkSG SECTION 8. COMPLAINTS PROCEDURE",
} as const;

export default function LksgOverviewPage() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const dashboardPdfRootId = useId();
	const { t, i18n } = useTranslation();

	// Date filter state — default: past 12 months
	const defaultEnd = new Date();
	const defaultStart = new Date(
		defaultEnd.getFullYear() - 1,
		defaultEnd.getMonth(),
		defaultEnd.getDate(),
	);
	const [startDate, setStartDateState] = useState<Date>(defaultStart);
	const [endDate, setEndDateState] = useState<Date>(defaultEnd);

	const [isApplyingDateRange, setIsApplyingDateRange] = useState(false);

	const setStartDate = (d: Date) => {
		setIsApplyingDateRange(true);
		setStartDateState(d);
	};
	const setEndDate = (d: Date) => {
		setIsApplyingDateRange(true);
		setEndDateState(d);
	};

	const formatDate = (d: Date) =>
		d.toLocaleDateString(i18n.language, {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

	const handleReset = () => {
		setStartDateState(defaultStart);
		setEndDateState(defaultEnd);
		setIsApplyingDateRange(true);
	};

	const { role } = useAuthData();

	const useMock = useMockData();
	const ids = getUserIdentifiers();
	const viewMode = useViewModeStore((state) => state.viewMode);

	const isSupplierContext = ids.isSupplier || viewMode === "supplier-view";
	const scopedSupplierId = isSupplierContext
		? ids.supplierId || undefined
		: undefined;

	const formatISODate = (d: Date) => d.toISOString().split("T")[0];

	const { data: prodDashboard, isFetching: isDashboardFetching } =
		useWorkplaceStats({
			supplierId: scopedSupplierId,
			partnerId: ids.partnerId || undefined,
			startTime: formatISODate(startDate),
			endTime: formatISODate(endDate),
		});

	// Component-7 quality chart
	const useMockKpiClosures = useMock || isInternalRole(role || "");
	const {
		data: kpiClosures,
		isError: isKpiClosuresError,
		isLoading: isKpiClosuresLoading,
	} = useKpiClosures({
		suppliers: scopedSupplierId ? [String(scopedSupplierId)] : undefined,
		strategicPartners: ids.partnerId ? [String(ids.partnerId)] : undefined,
		from: formatISODate(startDate),
		to: formatISODate(endDate),
		enabled: !useMockKpiClosures,
	});
	const kpiClosuresByMonthQuality = useMockKpiClosures
		? getMockKpiClosuresQualityData(
				formatISODate(startDate),
				formatISODate(endDate),
			)
		: buildKpiClosuresQualityData(kpiClosures?.monthlyQuality);

	const dashboardData = useMock ? companyDashboardData : prodDashboard || null;

	// Escalated cases — shared between KPI cards and Section 7 table
	const { rows: escalatedRows, supplierCount: escalatedSupplierCount } =
		useOpenEscalatedCases();

	const escalatedSupplierNames = useMemo(() => {
		const seen = new Set<string>();
		const names: string[] = [];
		escalatedRows.forEach((row) => {
			const key =
				row.supplier != null ? String(row.supplier) : row.supplier_name;
			if (key && !seen.has(key) && row.supplier_name) {
				seen.add(key);
				names.push(row.supplier_name);
			}
		});
		return names.sort((a, b) => a.localeCompare(b));
	}, [escalatedRows]);

	// KPI cards from filtered kpiByMonth
	const filteredKpi = useMemo(() => {
		return (dashboardData?.kpiByMonth || []).filter(
			(item: { date: string }) => {
				const d = new Date(item.date);
				return d >= startDate && d <= endDate;
			},
		);
	}, [startDate, endDate, dashboardData]);

	const kpiValues = useMemo(() => {
		const summary = (dashboardData as any)?.worker_voice_summary;
		const suppliersWithEscalatedCases = useMock
			? ((dashboardData as any)?.main_stats?.suppliers_with_escalated_cases as
					| number
					| undefined)
			: escalatedSupplierCount;
		const fieldworkActivities = (dashboardData as any)?.fieldwork_activities;
		const supplierStrengtheningCount = Array.isArray(fieldworkActivities)
			? fieldworkActivities.length
			: ((dashboardData as any)?.supplier_strengthening_activities_count ?? 0);

		const kpi = filteredKpi as Array<{
			date: string;
			activeEscalations: number;
			resolvedWithoutEscalation: number;
			workerVoiceCoverage: number;
			supplierStrengthening: number;
		}>;
		if (kpi && kpi.length > 0) {
			const totalResolved = kpi.reduce(
				(s, r) => s + r.resolvedWithoutEscalation,
				0,
			);
			const totalActiveEscalations = kpi.reduce(
				(s, r) => s + (r.activeEscalations || 0),
				0,
			);

			const latest = kpi[kpi.length - 1];
			const activeEscalations =
				suppliersWithEscalatedCases ?? latest?.activeEscalations ?? 0;
			const workerVoiceCoverage = latest?.workerVoiceCoverage ?? 0;
			const supplierStrengthening =
				supplierStrengtheningCount ?? latest?.supplierStrengthening ?? 0;
			const totalCases = totalResolved + totalActiveEscalations;
			const resolvedPct =
				totalCases > 0 ? Math.round((totalResolved / totalCases) * 100) : 0;
			return {
				activeEscalations,
				totalResolved,
				resolvedPct,
				workerVoiceCoverage,
				supplierStrengthening,
			};
		}

		const workerVoiceCoverage = summary?.total_workers_with_access ?? 0;
		const supplierStrengthening = supplierStrengtheningCount;
		return {
			activeEscalations: suppliersWithEscalatedCases ?? 0,
			totalResolved: 0,
			resolvedPct: 0,
			workerVoiceCoverage,
			supplierStrengthening,
		};
	}, [filteredKpi, dashboardData, useMock, escalatedSupplierCount]);

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, {
				passive: false,
			});
			return () => current.removeEventListener("wheel", handleWheel);
		}
	}, []);

	// Clear the date-range flag once the triggered fetch settles.
	useEffect(() => {
		if (!isDashboardFetching && isApplyingDateRange) {
			setIsApplyingDateRange(false);
		}
	}, [isDashboardFetching, isApplyingDateRange]);

	if (!useMock && isDashboardFetching && !prodDashboard) {
		return (
			<LoadingSpinner
				fullHeight
				subtitle={t("lksgOverview.states.loadingSubtitle", {
					defaultValue: "Fetching LkSG dashboard metrics and data",
				})}
				title={t("lksgOverview.states.loading", {
					defaultValue: "Loading LkSG Overview...",
				})}
			/>
		);
	}

	const isRefetching =
		!useMock && isDashboardFetching && !!prodDashboard && isApplyingDateRange;

	return (
		<div aria-busy={isRefetching} id={dashboardPdfRootId}>
			{isRefetching && (
				<output
					aria-live="polite"
					className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
				>
					<div className="flex items-center gap-4 rounded-2xl bg-white/95 backdrop-blur px-6 py-4 shadow-xl border border-gray-200 pointer-events-auto">
						<div
							className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
							style={{ width: 28, height: 28 }}
						/>
						<div className="flex flex-col">
							<span className="text-sm font-medium text-gray-900 leading-tight">
								{t("lksgOverview.states.updating", {
									defaultValue: "Updating dashboard…",
								})}
							</span>
							<span className="text-xs text-gray-500 leading-tight mt-0.5">
								{t("lksgOverview.states.applyingDateRange", {
									defaultValue: "Applying the selected date range",
								})}
							</span>
						</div>
					</div>
				</output>
			)}

			{/* HERO SECTION — reuse DashboardHero with LkSG-specific overrides */}
			<DashboardHero
				endDate={endDate}
				formatDate={formatDate}
				handleReset={handleReset}
				setEndDate={setEndDate}
				setStartDate={setStartDate}
				startDate={startDate}
				subtitleOverride={t("lksgOverview.hero.subtitle", {
					defaultValue:
						"Due diligence obligations of LkSG, supported by real-time worker voice and remediation partnerships",
				})}
				titleOverride={t("lksgOverview.hero.title", {
					defaultValue: "German Supply Chain Act (LkSG) Overview",
				})}
			/>

			<div
				className={
					isRefetching
						? "pb-24 md:pb-32 print:pb-0 opacity-50 pointer-events-none transition-opacity duration-200"
						: "pb-24 md:pb-32 print:pb-0 transition-opacity duration-200"
				}
			>
				{/* ─── LkSG SECTION 4. RISK MANAGEMENT ─────────────── */}
				<HrddAccordionSection
					defaultExpanded
					title={t("lksgOverview.sections.section4", {
						defaultValue: LKSG_SECTION_TITLES.section4,
					})}
				>
					<LksgRiskManagementSection />
				</HrddAccordionSection>

				{/* ─── LkSG SECTION 5. RISK ANALYSIS ───────────────── */}
				<HrddAccordionSection
					printSectionBreak
					title={t("lksgOverview.sections.section5", {
						defaultValue: LKSG_SECTION_TITLES.section5,
					})}
				>
					<div className="container mx-auto px-4">
						{/* Topline KPI metric boxes (from HRDD Component 2) */}
						<div className="overflow-x-auto lg:overflow-x-visible mb-6">
							<KpiCards
								escalatedSupplierNames={escalatedSupplierNames}
								kpiValues={kpiValues}
							/>
						</div>

						{/* LkSG Treemap with open/closed toggle */}
						<LksgTreemapSection
							filters={{
								supplierId: scopedSupplierId,
								partnerId: ids.partnerId || undefined,
								startTime: formatISODate(startDate),
								endTime: formatISODate(endDate),
							}}
						/>
					</div>
				</HrddAccordionSection>

				{/* ─── LkSG SECTION 6. PREVENTIVE MEASURES ─────────── */}
				<HrddAccordionSection
					printSectionBreak
					title={t("lksgOverview.sections.section6", {
						defaultValue: LKSG_SECTION_TITLES.section6,
					})}
				>
					<div className="container mx-auto px-4">
						<PerformanceMetrics
							{...((dashboardData as any)?.performance_metrics || {})}
						/>
					</div>
				</HrddAccordionSection>

				{/* ─── LkSG SECTION 7. REMEDIAL ACTION ─────────────── */}
				<HrddAccordionSection
					title={t("lksgOverview.sections.section7", {
						defaultValue: LKSG_SECTION_TITLES.section7,
					})}
				>
					{/* Intro text */}
					<div className="container mx-auto px-4 mb-6">
						<p className="text-sm text-[#56666C]">
							{t("lksgOverview.sections.section7Intro", {
								defaultValue:
									"The details of open and closed worker-reported violations in direct and indirect supplier sites can be found in the Worker Reported Issues page of the Social Responsibility section",
							})}
						</p>
					</div>

					{/* KPI Closures by Month Quality Chart (HRDD Component 4) — no container wrapper, same as HRDD */}
					<KpiClosuresByMonthQualityChart
						data={kpiClosuresByMonthQuality}
						isError={isKpiClosuresError}
						isLoading={isKpiClosuresLoading}
						showDescription={true}
					/>

					{/* Open & Escalated Cases Table (HRDD Component 6) */}
					<div className="container mx-auto px-4">
						<OpenEscalatedCasesTable />
					</div>
				</HrddAccordionSection>

				{/* ─── LkSG SECTION 8. COMPLAINTS PROCEDURE ────────── */}
				<HrddAccordionSection
					printSectionBreak
					title={t("lksgOverview.sections.section8", {
						defaultValue: LKSG_SECTION_TITLES.section8,
					})}
				>
					<div className="container mx-auto px-4">
						<h3 className="heading-display mb-4">
							{t("companyDashboard.liveStatus.title")}
						</h3>
						<div className="flex flex-col gap-6">
							<LiveStatusBar
								summary={(dashboardData as any)?.worker_voice_summary_tier1}
								title={t("companyDashboard.liveStatus.tier1")}
							/>
							<LiveStatusBar
								summary={(dashboardData as any)?.worker_voice_summary_tier23}
								title={t("companyDashboard.liveStatus.tier23")}
							/>
						</div>
					</div>
				</HrddAccordionSection>
			</div>
		</div>
	);
}
