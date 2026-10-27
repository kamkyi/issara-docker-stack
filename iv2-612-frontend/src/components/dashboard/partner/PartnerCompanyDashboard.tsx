import { DownloadIcon } from "@radix-ui/react-icons";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import DashboardHero from "$src/components/dashboard/DashboardHero";
import KpiCards from "$src/components/dashboard/KpiCards";
import KpiClosuresByMonthQualityChart from "$src/components/dashboard/KpiClosuresByMonthQualityChart";
import LiveStatusBar from "$src/components/dashboard/LiveStatusBar";
import PerformanceMetrics from "$src/components/dashboard/PerformanceMetrics";
import HrddAccordionSection from "$src/components/dashboard/partner/HrddAccordionSection";
import OpenEscalatedCasesTable, {
	useOpenEscalatedCases,
} from "$src/components/dashboard/partner/OpenEscalatedCasesTable";
import PolicyCommitmentsBox from "$src/components/dashboard/partner/PolicyCommitmentsBox";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import YellowInfoBox from "$src/components/ui/YellowInfoBox";
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

const HRDD_COMPONENT_TITLES = {
	component1: "HRDD Component 1. Embed Policy Commitments",
	component2: "HRDD Component 2. Identify & Assess Adverse Impacts",
	component3: "HRDD Component 3. Cease, Prevent & Mitigate Impacts",
	component4: "HRDD Component 4. Track Implementation & Results",
	component5: "HRDD Component 5. Communicate Progress & Impacts",
	component6: "HRDD Component 6. Provide for or Cooperate in Remediation",
} as const;

export default function PartnerCompanyDashboard() {
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

	// Tracks whether the in-flight fetch was triggered by a user date change, so
	// the "Applying the selected date range" overlay only appears for that — not
	// for background refetches (window focus / remount).
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
		setStartDate(defaultStart);
		setEndDate(defaultEnd);
	};

	const { role } = useAuthData();

	// Dashboard data: use mock by default, use prod API via hook when not using mock
	const useMock = useMockData();
	const ids = getUserIdentifiers();
	const viewMode = useViewModeStore((state) => state.viewMode);

	// Scope by a single supplier ONLY in supplier context. A global partner in
	// the default buyer-view still resolves an incidental `supplierId` (the
	// gd-link user id, not a real supplier with graded closed cases); passing it
	// would wrongly narrow the dashboard/chart to that empty supplier and zero
	// out everything. In buyer-view we scope by partner only. Mirrors the
	// `isSupplierContext` resolution in PolicyCommitmentsBox.
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
	// Component-4 quality chart. Live data comes from the same /ilm/kpi-closures
	// payload the internal dashboard uses, so both surfaces report identical case
	// and worker counts for a given scope and date range. This SP-facing view
	// falls back to mock data in mock mode and for Issara accounts previewing it
	// (management / staff / test user), who have no partner scope of their own;
	// the internal dashboard always reads live data.
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

	// Same open + escalated set that feeds the Component-6 table, so the KPI
	// card and the table always agree. `supplierCount` matches the card's
	// "Suppliers with Escalated Cases" semantics.
	const { rows: escalatedRows, supplierCount: escalatedSupplierCount } =
		useOpenEscalatedCases();

	// Distinct supplier names behind the "Suppliers with Escalated Cases" count,
	// surfaced as a hover tooltip on the KPI card so the number is explainable.
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

	// ── KPI cards from filtered kpiByMonth ──────────────────────────────────
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
		// HRDD Component 2 — "Suppliers with Escalated Cases": distinct suppliers
		// with an open escalated KPI. Provided as a single number by cascade-api;
		// fall back to the legacy per-month activeEscalations when absent (mock).
		// With live data, prefer the frontend-derived count so the card matches
		// the Component-6 table exactly; fall back to the cascade-api aggregate /
		// mock series when live KPI data is unavailable.
		const suppliersWithEscalatedCases = useMock
			? ((dashboardData as any)?.main_stats?.suppliers_with_escalated_cases as
					| number
					| undefined)
			: escalatedSupplierCount;
		const fieldworkActivities = (dashboardData as any)?.fieldwork_activities;
		const supplierStrengtheningCount = Array.isArray(fieldworkActivities)
			? fieldworkActivities.length
			: ((dashboardData as any)?.supplier_strengthening_activities_count ?? 0);
		// If prod API provided time-series KPIs (kpiByMonth), prefer that
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
			// Prefer the dedicated suppliers-with-escalated-cases count; fall back to
			// the latest month's active escalations when the field is absent (mock).
			// Percentages still use the full series to avoid misleading ratios when
			// multiple months contain escalations.
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

		// Fallback: use aggregated data from API when available
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
			scrollRef.current.scrollBy({ left: e.deltaY, behavior: "smooth" });
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, { passive: false });
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
				subtitle="Fetching dashboard metrics and engagement activity data"
				title="Loading supply chain dashboard..."
			/>
		);
	}

	const isRefetching =
		!useMock && isDashboardFetching && !!prodDashboard && isApplyingDateRange;

	return (
		<div aria-busy={isRefetching} id={dashboardPdfRootId}>
			{false && role === "org-test-user" && (
				<YellowInfoBox
					expanded={
						<p className="mb-2">
							{t("companyDashboard.testerInfo.bodyBeforeFeedback")}{" "}
							<strong>{t("companyDashboard.testerInfo.feedbackTab")}</strong>{" "}
							{t("companyDashboard.testerInfo.bodyAfterFeedback")}
						</p>
					}
					summary={<span>{t("companyDashboard.testerInfo.summary")}</span>}
				/>
			)}

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
								Updating dashboard…
							</span>
							<span className="text-xs text-gray-500 leading-tight mt-0.5">
								Applying the selected date range
							</span>
						</div>
					</div>
				</output>
			)}

			{/* HERO SECTION */}
			<DashboardHero
				endDate={endDate}
				formatDate={formatDate}
				handleReset={handleReset}
				setEndDate={setEndDate}
				setStartDate={setStartDate}
				startDate={startDate}
			/>

			<div
				className={
					isRefetching
						? "pb-24 md:pb-32 print:pb-0 opacity-50 pointer-events-none transition-opacity duration-200"
						: "pb-24 md:pb-32 print:pb-0 transition-opacity duration-200"
				}
			>
				{/* No print-section-break: this first section shares page 1 with the
				    print-only report header rendered by DashboardHero. */}
				<HrddAccordionSection
					defaultExpanded
					title={t("companyDashboard.hrdd.component1", {
						defaultValue: HRDD_COMPONENT_TITLES.component1,
					})}
				>
					<div className="container mx-auto px-4">
						<PolicyCommitmentsBox />
					</div>
				</HrddAccordionSection>

				<HrddAccordionSection
					printSectionBreak
					title={t("companyDashboard.hrdd.component2", {
						defaultValue: HRDD_COMPONENT_TITLES.component2,
					})}
				>
					<div className="container mx-auto px-4">
						<div className="overflow-x-auto lg:overflow-x-visible mb-6">
							<KpiCards
								escalatedSupplierNames={escalatedSupplierNames}
								kpiValues={kpiValues}
							/>
						</div>
						{viewMode !== "ra-view" && (
							<>
								<h3 className="heading-display mb-4">
									{t("companyDashboard.liveStatus.title")}
								</h3>
								<div className="flex flex-col gap-6">
									<LiveStatusBar
										summary={(dashboardData as any)?.worker_voice_summary_tier1}
										title={t("companyDashboard.liveStatus.tier1")}
									/>
									<LiveStatusBar
										summary={
											(dashboardData as any)?.worker_voice_summary_tier23
										}
										title={t("companyDashboard.liveStatus.tier23")}
									/>
								</div>
							</>
						)}
					</div>
				</HrddAccordionSection>

				<HrddAccordionSection
					printSectionBreak
					title={t("companyDashboard.hrdd.component3", {
						defaultValue: HRDD_COMPONENT_TITLES.component3,
					})}
				>
					<div className="container mx-auto px-4">
						<PerformanceMetrics
							{...((dashboardData as any)?.performance_metrics || {})}
						/>
					</div>
				</HrddAccordionSection>

				<HrddAccordionSection
					title={t("companyDashboard.hrdd.component4", {
						defaultValue: HRDD_COMPONENT_TITLES.component4,
					})}
				>
					<KpiClosuresByMonthQualityChart
						data={kpiClosuresByMonthQuality}
						isError={isKpiClosuresError}
						isLoading={isKpiClosuresLoading}
						showDescription={true}
					/>
				</HrddAccordionSection>

				{/* This section holds only the existing print action. */}
				<HrddAccordionSection
					noPrint
					title={t("companyDashboard.hrdd.component5", {
						defaultValue: HRDD_COMPONENT_TITLES.component5,
					})}
				>
					<div className="container mx-auto px-4 no-print">
						<CascadeButton
							buttonText={t("companyDashboard.hero.exportPdf")}
							className="no-print"
							handleOnClick={() => {
								window.print();
							}}
							iconRight={<DownloadIcon />}
							size="2"
						/>
					</div>
				</HrddAccordionSection>

				<HrddAccordionSection
					printSectionBreak
					title={t("companyDashboard.hrdd.component6", {
						defaultValue: HRDD_COMPONENT_TITLES.component6,
					})}
				>
					<div className="container mx-auto px-4">
						<OpenEscalatedCasesTable />
					</div>
				</HrddAccordionSection>
			</div>
		</div>
	);
}
