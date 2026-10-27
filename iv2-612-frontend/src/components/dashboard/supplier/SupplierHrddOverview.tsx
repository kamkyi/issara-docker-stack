import { DownloadIcon } from "@radix-ui/react-icons";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import DashboardHero from "$src/components/dashboard/DashboardHero";
import KpiCards from "$src/components/dashboard/KpiCards";
import KpiClosuresByMonthQualityChart from "$src/components/dashboard/KpiClosuresByMonthQualityChart";
import PerformanceMetrics from "$src/components/dashboard/PerformanceMetrics";
import HrddAccordionSection from "$src/components/dashboard/partner/HrddAccordionSection";
import OpenEscalatedCasesTable, {
	useOpenEscalatedCases,
} from "$src/components/dashboard/partner/OpenEscalatedCasesTable";
import PolicyCommitmentsBox from "$src/components/dashboard/partner/PolicyCommitmentsBox";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import useAuthData from "$src/store/store.auth";
import "react-datepicker/dist/react-datepicker.css";

import supplierDashboardData from "$src/assets/mock/supplier-dashboard.json";
import {
	buildKpiClosuresQualityData,
	getMockKpiClosuresQualityData,
} from "$src/queries/kpiClosuresQuality";
import { useKpiClosures } from "$src/queries/useKpiClosures";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import { isIssaraManagement } from "$src/utils/account";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";

const HRDD_COMPONENT_TITLES = {
	component1: "HRDD Component 1. Embed Policy Commitments",
	component2: "HRDD Component 2. Identify & Assess Adverse Impacts",
	component3: "HRDD Component 3. Cease, Prevent & Mitigate Impacts",
	component4: "HRDD Component 4. Track Implementation & Results",
	component5: "HRDD Component 5. Communicate Progress & Impacts",
	component6: "HRDD Component 6. Provide for or Cooperate in Remediation",
} as const;

/**
 * Supplier-facing HRDD Overview — the same six HRDD components the Strategic
 * Partner dashboard (PartnerCompanyDashboard) presents, scoped to the single
 * logged-in supplier. Two sections differ from the SP page because a supplier
 * is one company rather than a supply chain:
 *   - the escalations KPI counts open escalated CASES, not distinct suppliers
 *     (which would always be 0 or 1 here)
 *   - the "Worker Voice Coverage: Live Status Monitor" tier bars describe a
 *     multi-supplier chain and are omitted entirely
 */
export default function SupplierHrddOverview() {
	const dashboardPdfRootId = useId();
	const { t, i18n } = useTranslation();

	// Date filter state — default: past 12 months (mirrors the SP dashboard).
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
	const useMock = useMockData();
	const ids = getUserIdentifiers();

	// Always supplier-scoped: this page is only reachable in supplier context,
	// so there is no partner branch to resolve.
	const scopedSupplierId = ids.supplierId || undefined;

	const formatISODate = (d: Date) => d.toISOString().split("T")[0];

	const { data: prodDashboard, isFetching: isDashboardFetching } =
		useWorkplaceStats({
			supplierId: scopedSupplierId,
			startTime: formatISODate(startDate),
			endTime: formatISODate(endDate),
		});

	// Component-4 quality chart. Live data comes from the same /ilm/kpi-closures
	// payload the internal dashboard uses. Falls back to mock in mock mode and
	// for Issara accounts previewing this view, who have no supplier scope.
	const useMockKpiClosures = useMock || isIssaraManagement(role || "");
	const {
		data: kpiClosures,
		isError: isKpiClosuresError,
		isLoading: isKpiClosuresLoading,
	} = useKpiClosures({
		suppliers: scopedSupplierId ? [String(scopedSupplierId)] : undefined,
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

	// Mock mode uses the supplier-scoped fixture: company-dashboard.json aggregates
	// a whole supply chain, so its figures are an order of magnitude too large for
	// a page that describes a single factory.
	const dashboardData = useMock ? supplierDashboardData : prodDashboard || null;

	// Same open + escalated set that feeds the Component-6 table, so the KPI
	// card and the table always agree. For a single supplier the meaningful
	// figure is the case count, not the distinct-supplier count.
	const { caseCount: escalatedCaseCount } = useOpenEscalatedCases();

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
			// Open escalated cases for this supplier; fall back to the latest
			// month's series value when live KPI data is unavailable (mock).
			const activeEscalations =
				escalatedCaseCount || latest?.activeEscalations || 0;
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

		return {
			activeEscalations: escalatedCaseCount,
			totalResolved: 0,
			resolvedPct: 0,
			workerVoiceCoverage: summary?.total_workers_with_access ?? 0,
			supplierStrengthening: supplierStrengtheningCount,
		};
	}, [filteredKpi, dashboardData, escalatedCaseCount]);

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
				title="Loading HRDD overview..."
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
					title={t("hrddOverview.components.component1", {
						defaultValue: HRDD_COMPONENT_TITLES.component1,
					})}
				>
					<div className="container mx-auto px-4">
						<PolicyCommitmentsBox />
					</div>
				</HrddAccordionSection>

				{/* No live status monitor: the tier bars describe a multi-supplier
				    supply chain and are not meaningful for a single supplier. */}
				<HrddAccordionSection
					printSectionBreak
					title={t("hrddOverview.components.component2", {
						defaultValue: HRDD_COMPONENT_TITLES.component2,
					})}
				>
					<div className="container mx-auto px-4">
						<div className="overflow-x-auto lg:overflow-x-visible mb-6">
							<KpiCards
								escalationsDescription={t(
									"hrddOverview.kpis.activeEscalations.descriptionSupplier",
									{
										defaultValue: t(
											"companyDashboard.kpis.activeEscalations.descriptionSupplier",
											{ defaultValue: "Open Cases Escalated to Buyers" },
										),
									},
								)}
								kpiValues={kpiValues}
							/>
						</div>
					</div>
				</HrddAccordionSection>

				<HrddAccordionSection
					printSectionBreak
					title={t("hrddOverview.components.component3", {
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
					title={t("hrddOverview.components.component4", {
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
					title={t("hrddOverview.components.component5", {
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
					title={t("hrddOverview.components.component6", {
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
