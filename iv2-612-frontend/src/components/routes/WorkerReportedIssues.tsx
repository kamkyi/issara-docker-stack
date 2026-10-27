import { Box, Flex, Select, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import laborMockData from "$src/assets/mock/labor-data.json";
import recruitmentMockData from "$src/assets/mock/recruitment-data.json";
import wagesMockData from "$src/assets/mock/wages-data.json";
import CollapsibleDataTable, {
	type CollapsibleColumn,
	type CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import {
	type SupplierKPI,
	type SupplierKPIParams,
	useSupplierKPIs,
} from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { useKPICategories, useKPIs } from "$src/queries/kpis";
import { dbService } from "$src/services/db-service";
import { useViewModeStore } from "$src/store/viewModeStore";
import type { KPI } from "$src/types/components";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { CLOSED_QUALITY_LEGENDS, kpiUtils } from "$src/utils/kpiUtils";
import {
	STABLE_OPEN_KPIS,
	STABLE_POOR_CLOSED_ID,
} from "$src/utils/refreshMockKPIDates";
import {
	buildIndicatorColumns,
	buildTopMetrics,
	buildWorkerViolationsColumns,
	isForcedLaborRisk,
	type KpiTableRow,
	type MainKpiCategory,
	normalizeMainCategory,
	normalizeSupplierKpiRows,
	renderKpiExpandedContent,
	STATUS_CLOSED,
	STATUS_OPEN,
	WORKER_VIOLATION_STATUS_LEGENDS,
	WorkerReportedTopMetrics,
	withoutLksgColumn,
} from "$src/utils/workerReportedKpiTable";

const STABLE_REMEDIATION_QUALITIES = ["Fair", "Good", "Excellent"];

// This page is the company grievance mechanism for a SINGLE supplier. Real
// users are scoped by their own supplierId; demo/mock users see this one.
const MOCK_SUPPLIER_ID = 227;
const MOCK_SUPPLIER_NAME = "Sunshine Seafood";

function buildStableMockKPIs(kpis: any[]): any[] {
	const today = moment();
	return kpis.map((kpi) => {
		const openSpec = STABLE_OPEN_KPIS.get(Number(kpi.id));
		if (openSpec !== undefined) {
			return {
				...kpi,
				opened_at: today
					.clone()
					.subtract(openSpec.offset, "days")
					.format("YYYY-MM-DD"),
				closed_at: null,
				status: openSpec.status,
				status_name: openSpec.status === 1 ? "No Progress" : "Some Progress",
				closed_quality: null,
			};
		}
		const id = Number(kpi.id);
		const closedDaysAgo = (id % 40) + 5;
		const openedDaysAgo = closedDaysAgo + (id % 90) + 30;
		const closed_quality =
			id === STABLE_POOR_CLOSED_ID
				? "Poor"
				: STABLE_REMEDIATION_QUALITIES[
						id % STABLE_REMEDIATION_QUALITIES.length
					];
		return {
			...kpi,
			opened_at: today
				.clone()
				.subtract(openedDaysAgo, "days")
				.format("YYYY-MM-DD"),
			closed_at: today
				.clone()
				.subtract(closedDaysAgo, "days")
				.format("YYYY-MM-DD"),
			status: 3,
			status_name: "Closed",
			closed_quality,
		};
	});
}

type KpiCategory = {
	id: number;
	name: string;
	issue_category: number;
};

type WorkerFeedbackKpiSubmission = {
	id: string;
	submittedAt: string;
	supplierId: number | null;
	partnerId: number | null;
	role: string | null;
	formData: {
		employeeFeedback?: string;
		feedbackDescription?: string;
		summary?: string;
		workersAffected?: number | string;
		selectedKpis?: Record<number, number[]>;
		case_status?: { id: number; name: string };
		interactionDate?: Date | string;
		next_steps?: string;
		final_remarks?: string;
		safeguard_remarks?: string;
		risk_assessment?: string;
		other_services_support?: string;
		staff?: { username?: string };
		[key: string]: unknown;
	};
};

const KPI_CATEGORY_OPTIONS: Array<"All" | MainKpiCategory> = [
	"All",
	"Labor",
	"Recruitment",
	"Wages",
];

const getRelevantDate = (row: KpiTableRow) =>
	row.closed_at || row.opened_at || null;

const sortOpenRows = (rows: KpiTableRow[]) =>
	[...rows].sort(
		(a, b) =>
			new Date(b.opened_at || "").getTime() -
			new Date(a.opened_at || "").getTime(),
	);

const sortClosedRows = (rows: KpiTableRow[]) =>
	[...rows].sort(
		(a, b) =>
			new Date(b.closed_at || b.opened_at || "").getTime() -
			new Date(a.closed_at || a.opened_at || "").getTime(),
	);

const formatDateInputValue = (date?: string | null) => {
	if (!date) return "";
	return moment(date).format("YYYY-MM-DD");
};

const hasWorkerFeedbackKpiSignal = (
	submission: WorkerFeedbackKpiSubmission,
): boolean => {
	const hasSelectedKpis =
		submission.formData.selectedKpis &&
		Object.values(submission.formData.selectedKpis).some(
			(ids) => Array.isArray(ids) && ids.length > 0,
		);
	const hasFeedbackSummary = Boolean(
		submission.formData.employeeFeedback ||
			submission.formData.feedbackDescription ||
			submission.formData.summary,
	);

	return Boolean(hasSelectedKpis && hasFeedbackSummary);
};

function useWorkerFeedbackKpiSubmissions() {
	return useQuery({
		queryKey: ["workerFeedbackFormSubmissions"],
		queryFn: async () => {
			try {
				const dbData = await dbService.getSharedData(
					"workerFeedbackFormSubmissions",
				);
				return Array.isArray(dbData)
					? (dbData as WorkerFeedbackKpiSubmission[])
					: [];
			} catch {
				return [] as WorkerFeedbackKpiSubmission[];
			}
		},
		staleTime: 1000 * 30,
	});
}

export default function WorkerReportedIssues() {
	const { t } = useTranslation();
	const categoryFilterId = useId();
	const startDateId = useId();
	const endDateId = useId();
	const [selectedMainCategory, setSelectedMainCategory] = useState<
		"All" | MainKpiCategory
	>("All");
	const [startDate, setStartDate] = useState(
		moment().subtract(1, "year").format("YYYY-MM-DD"),
	);
	const [endDate, setEndDate] = useState(moment().format("YYYY-MM-DD"));
	const { isSupplier, supplierId } = getUserIdentifiers();
	const { viewMode } = useViewModeStore();
	const isSupplierContext = isSupplier || viewMode === "supplier-view";
	const shouldUseMockData = useMockData();
	const supplierKPIParams: SupplierKPIParams = {
		has_cases: true,
		show_closed: true,
		...(supplierId ? { suppliers: [supplierId] } : {}),
	};
	const {
		data: supplierKPIData = { results: [], count: 0 },
		error: supplierKpiError,
		isError: isSupplierKpiError,
		isLoading: loadingSupplierKPIs,
		refetch: refetchSupplierKpis,
	} = useSupplierKPIs(supplierKPIParams);
	const { data: workerFeedbackSubmissions = [] } =
		useWorkerFeedbackKpiSubmissions();
	const { data: kpiCategoriesRaw } = useKPICategories();
	// useKPIs supplies the ILO/LkSG indicator arrays merged in
	// normalizeSupplierKpiRows, so the indicator columns would render blank if we
	// painted before it resolved.
	const { data: kpisRaw = [], isLoading: loadingKpis } = useKPIs();

	const issueCategoryMap = useMemo(() => {
		const map = new Map<number, string>();
		if (Array.isArray(kpiCategoriesRaw)) {
			(kpiCategoriesRaw as KpiCategory[]).forEach((cat) => {
				map.set(cat.id, cat.name);
			});
		}
		return map;
	}, [kpiCategoriesRaw]);

	const kpiMap = useMemo(() => {
		const map = new Map<number, KPI>();
		(kpisRaw as KPI[]).forEach((kpi) => {
			map.set(kpi.id, kpi);
		});
		return map;
	}, [kpisRaw]);

	const normalizedKpiRows = useMemo<KpiTableRow[]>(() => {
		const apiRows = (supplierKPIData.results || []) as SupplierKPI[];
		const mockRows = [
			...buildStableMockKPIs(laborMockData.supplierKPIs as any[]),
			...buildStableMockKPIs(recruitmentMockData.supplierKPIs as any[]),
			...buildStableMockKPIs(wagesMockData.supplierKPIs as any[]),
		]
			// Always pin the mock feed to one supplier: staff/test users carry a
			// synthetic supplierId (17792) that no mock row uses, so filtering by
			// the user's own id would empty the page. The curated always-open
			// demo cases sit on other mock supplier ids, so admit those too and
			// present everything under the single supplier this page represents.
			.filter(
				(kpi) =>
					Number(kpi.supplier) === MOCK_SUPPLIER_ID ||
					STABLE_OPEN_KPIS.has(Number(kpi.id)),
			)
			.map((kpi) => ({
				...kpi,
				supplier_name: MOCK_SUPPLIER_NAME,
			})) as SupplierKPI[];
		const sourceRows = shouldUseMockData ? mockRows : apiRows;

		return normalizeSupplierKpiRows(sourceRows, kpiMap);
	}, [shouldUseMockData, supplierKPIData.results, kpiMap]);

	const submissionKpiRows = useMemo<KpiTableRow[]>(() => {
		const effectiveSupplierId = supplierId
			? Number(supplierId)
			: shouldUseMockData
				? MOCK_SUPPLIER_ID
				: null;

		return (workerFeedbackSubmissions || []).flatMap((submission) => {
			if (!hasWorkerFeedbackKpiSignal(submission)) {
				return [];
			}

			// Single-supplier page: drop feedback logged against other suppliers.
			if (
				effectiveSupplierId !== null &&
				submission.supplierId &&
				Number(submission.supplierId) !== effectiveSupplierId
			) {
				return [];
			}

			const selectedCategoryIds = Object.keys(
				submission.formData.selectedKpis || {},
			)
				.map((value) => Number(value))
				.filter((value) => Number.isFinite(value));

			const categories = Array.from(
				new Set(
					selectedCategoryIds
						.map((categoryId) => issueCategoryMap.get(categoryId))
						.map((categoryName) => normalizeMainCategory(categoryName))
						.filter(Boolean),
				),
			) as MainKpiCategory[];

			if (categories.length === 0) return [];

			const isClosed = submission.formData.case_status?.id === 2;
			const openedAtRaw =
				typeof submission.formData.interactionDate === "string"
					? submission.formData.interactionDate
					: submission.formData.interactionDate
						? new Date(submission.formData.interactionDate).toISOString()
						: submission.submittedAt;
			const openedAt = new Date(openedAtRaw).toISOString();
			const description =
				submission.formData.employeeFeedback ||
				submission.formData.feedbackDescription ||
				submission.formData.summary ||
				t("workerReportedIssues.values.workerFeedbackSubmission");

			const affectedWorkers = Number(submission.formData.workersAffected || 0);

			return categories.map((category, index) => {
				const statusId = isClosed ? 3 : 1;
				const rowId = `${submission.id}-${category}-${index}`;
				const daysActive = kpiUtils.getDaysActive(openedAt);

				return {
					id: rowId,
					display_id: rowId,
					supplier_name: shouldUseMockData
						? MOCK_SUPPLIER_NAME
						: submission.supplierId
							? t("workerReportedIssues.values.supplierWithId", {
									id: submission.supplierId,
								})
							: t("workerReportedIssues.values.supplierFallback"),
					category,
					original_category: category,
					description,
					level: "-",
					status: statusId,
					status_name: isClosed
						? t("workerReportedIssues.values.statusClosed")
						: t("workerReportedIssues.values.statusOpen"),
					opened_at: openedAt,
					closed_at: isClosed ? submission.submittedAt : undefined,
					days_active: daysActive,
					affected_workers: Number.isFinite(affectedWorkers)
						? affectedWorkers
						: 0,
					remediation_sp_recommendation: [],
					closed_quality: isClosed
						? t("workerReportedIssues.values.closedViaWorkerFeedback")
						: undefined,
					source: "Worker Feedback Form",
					notes:
						submission.formData.next_steps ||
						submission.formData.final_remarks ||
						submission.formData.safeguard_remarks ||
						submission.formData.risk_assessment ||
						submission.formData.other_services_support ||
						"",
					expandedContent: () => (
						<Box style={{ padding: 8 }}>
							<div className="text-lg font-semibold mb-3">
								{t("workerReportedIssues.details.workerFeedbackTitle")}
							</div>
							<div className="grid gap-4 md:grid-cols-2 text-sm">
								<div className="space-y-2">
									<div>
										<strong>{t("workerReportedIssues.details.source")}:</strong>{" "}
										{t("workerReportedIssues.sources.workerFeedback")}
									</div>
									<div>
										<strong>
											{t("workerReportedIssues.details.category")}:
										</strong>{" "}
										{t(`workerReportedIssues.categories.${category}`)}
									</div>
									<div>
										<strong>{t("workerReportedIssues.details.opened")}:</strong>{" "}
										{moment(openedAt).format("YYYY-MM-DD")}
									</div>
									{submission.formData.staff?.username && (
										<div>
											<strong>
												{t("workerReportedIssues.details.hrOfficer")}:
											</strong>{" "}
											{submission.formData.staff.username}
										</div>
									)}
								</div>
								<div className="space-y-2">
									<div>
										<strong>{t("workerReportedIssues.details.status")}:</strong>{" "}
										{isClosed
											? t("workerReportedIssues.values.statusClosed")
											: t("workerReportedIssues.values.statusOpen")}
									</div>
									<div>
										<strong>
											{t("workerReportedIssues.details.affectedWorkers")}:
										</strong>{" "}
										{affectedWorkers || 0}
									</div>
									{submission.formData.case_status?.name && (
										<div>
											<strong>
												{t("workerReportedIssues.details.caseStatus")}:
											</strong>{" "}
											{submission.formData.case_status.name}
										</div>
									)}
								</div>
							</div>
							<div className="mt-4 text-sm">
								<strong>
									{t("workerReportedIssues.details.description")}:
								</strong>
								<p className="mt-1 whitespace-pre-wrap">{description}</p>
							</div>
						</Box>
					),
				} as KpiTableRow;
			});
		});
	}, [
		workerFeedbackSubmissions,
		issueCategoryMap,
		t,
		supplierId,
		shouldUseMockData,
	]);

	const allKpiRows = useMemo(
		() => [...normalizedKpiRows, ...submissionKpiRows],
		[normalizedKpiRows, submissionKpiRows],
	);

	const dateBounds = useMemo(() => {
		const timestamps = allKpiRows
			.map((row) => getRelevantDate(row))
			.filter(Boolean)
			.map((date) => new Date(date as string).getTime())
			.filter((value) => Number.isFinite(value))
			.sort((a, b) => a - b);

		if (timestamps.length === 0) {
			return { max: "", min: "" };
		}

		return {
			min: formatDateInputValue(new Date(timestamps[0]).toISOString()),
			max: formatDateInputValue(
				new Date(timestamps[timestamps.length - 1]).toISOString(),
			),
		};
	}, [allKpiRows]);

	const effectiveStartDate = startDate || dateBounds.min;
	const effectiveEndDate = endDate || dateBounds.max;

	const dateFilteredKpiRows = useMemo(() => {
		if (!effectiveStartDate && !effectiveEndDate) {
			return allKpiRows;
		}

		const startTs = effectiveStartDate
			? new Date(`${effectiveStartDate}T00:00:00`).getTime()
			: Number.NEGATIVE_INFINITY;
		const endTs = effectiveEndDate
			? new Date(`${effectiveEndDate}T23:59:59.999`).getTime()
			: Number.POSITIVE_INFINITY;

		return allKpiRows.filter((row) => {
			const isOpen = STATUS_OPEN.has(Number(row.status));
			if (isOpen) {
				const openTs = row.opened_at ? new Date(row.opened_at).getTime() : 0;
				return openTs <= endTs;
			}
			const rawDate = row.closed_at || row.opened_at;
			if (!rawDate) return false;
			const rowTs = new Date(rawDate).getTime();
			return rowTs >= startTs && rowTs <= endTs;
		});
	}, [allKpiRows, effectiveEndDate, effectiveStartDate]);

	const filteredKpiRows = useMemo(
		() =>
			selectedMainCategory === "All"
				? dateFilteredKpiRows
				: dateFilteredKpiRows.filter(
						(row) => row.category === selectedMainCategory,
					),
		[dateFilteredKpiRows, selectedMainCategory],
	);

	const earlyWarningOpenRows = useMemo(
		() =>
			sortOpenRows(
				filteredKpiRows.filter(
					(row) =>
						!isForcedLaborRisk(row) && STATUS_OPEN.has(Number(row.status)),
				),
			),
		[filteredKpiRows],
	);

	const earlyWarningClosedRows = useMemo(
		() =>
			sortClosedRows(
				filteredKpiRows.filter(
					(row) =>
						!isForcedLaborRisk(row) && STATUS_CLOSED.has(Number(row.status)),
				),
			),
		[filteredKpiRows],
	);

	const forcedLaborOpenRows = useMemo(
		() =>
			sortOpenRows(
				filteredKpiRows.filter(
					(row) =>
						isForcedLaborRisk(row) && STATUS_OPEN.has(Number(row.status)),
				),
			),
		[filteredKpiRows],
	);

	const forcedLaborClosedRows = useMemo(
		() =>
			sortClosedRows(
				filteredKpiRows.filter(
					(row) =>
						isForcedLaborRisk(row) && STATUS_CLOSED.has(Number(row.status)),
				),
			),
		[filteredKpiRows],
	);

	// Combined open rows feed the Critical (60+ days) count, which spans both
	// risk categories. The closed rows are only ever needed per-category, so
	// there is no combined equivalent.
	const openKpiRows = useMemo(
		() => [...earlyWarningOpenRows, ...forcedLaborOpenRows],
		[earlyWarningOpenRows, forcedLaborOpenRows],
	);

	const topMetrics = useMemo(
		() =>
			buildTopMetrics({
				openKpiRows,
				earlyWarningOpenRows,
				earlyWarningClosedRows,
				forcedLaborOpenRows,
				forcedLaborClosedRows,
			}),
		[
			openKpiRows,
			earlyWarningOpenRows,
			earlyWarningClosedRows,
			forcedLaborOpenRows,
			forcedLaborClosedRows,
		],
	);

	const renderExpanded = (row: CollapsibleRowData, isClosed = false) =>
		renderKpiExpandedContent({
			row,
			isClosed,
			isSupplierContext,
			t,
			variant: isClosed ? "card" : "metaBar",
		});

	const openKpiColumns = useMemo<CollapsibleColumn[]>(
		() => buildWorkerViolationsColumns(t),
		[t],
	);

	// Early Warning holds Level 2 rows, none of which are mapped to an LkSG
	// indicator, so that column is always blank there. Forced Labor keeps it.
	const earlyWarningOpenColumns = useMemo<CollapsibleColumn[]>(
		() => withoutLksgColumn(openKpiColumns),
		[openKpiColumns],
	);

	const closedKpiColumns = useMemo<CollapsibleColumn[]>(
		() => [
			{
				id: "display_id",
				label: t("workerReportedIssues.columns.id"),
				minWidth: 110,
				sortable: true,
			},
			{
				id: "supplier_name",
				label: t("workerReportedIssues.columns.supplier"),
				minWidth: 170,
				sortable: true,
			},
			{
				id: "category",
				label: t("workerReportedIssues.columns.category"),
				minWidth: 120,
				sortable: true,
				format: (value) =>
					t(`workerReportedIssues.categories.${String(value)}`, {
						defaultValue: String(value || ""),
					}),
			},
			{
				id: "description",
				label: t("workerReportedIssues.columns.description"),
				minWidth: 260,
				format: (value) => {
					const text = String(value || "");
					const translated = t(text, { defaultValue: text });
					return translated.length > 80
						? `${translated.slice(0, 80)}...`
						: translated;
				},
			},
			{
				id: "remediation_sp_recommendation",
				label: t("workerReportedIssues.columns.recommendationForSp"),
				minWidth: 170,
				format: (value) => {
					const hasRecommendations = Array.isArray(value)
						? value.length > 0
						: Boolean(value);
					return hasRecommendations ? t("workerReportedIssues.values.yes") : "";
				},
			},
			...buildIndicatorColumns(t),
			{
				id: "opened_at",
				label: t("workerReportedIssues.columns.opened"),
				minWidth: 120,
				sortable: true,
				format: (value) => (value ? moment(value).format("YYYY-MM-DD") : ""),
			},
			{
				id: "closed_at",
				label: t("workerReportedIssues.columns.closed"),
				minWidth: 120,
				sortable: true,
				format: (value) => (value ? moment(value).format("YYYY-MM-DD") : ""),
			},
			{
				id: "closed_quality",
				label: t("workerReportedIssues.columns.remediationOutcome"),
				minWidth: 170,
				format: (value) => {
					const quality = String(value || "").toLowerCase();
					let color = "#9CA3AF";
					if (quality.includes("poor")) color = "#EF4444";
					else if (quality.includes("fair")) color = "#F97316";
					else if (quality.includes("good")) color = "#EAB308";
					else if (quality.includes("excellent")) color = "#22C55E";
					const qualityLabel = String(value || "");
					return (
						<div
							className="h-3 w-3 rounded-full"
							style={{ background: color }}
							title={t(qualityLabel, { defaultValue: qualityLabel })}
						/>
					);
				},
			},
		],
		[t],
	);

	const earlyWarningClosedColumns = useMemo<CollapsibleColumn[]>(
		() => withoutLksgColumn(closedKpiColumns),
		[closedKpiColumns],
	);

	// Placed after every hook so hook order stays stable across renders. This
	// page filters client-side, so this is the only loading state it needs.
	if (!shouldUseMockData && (loadingSupplierKPIs || loadingKpis)) {
		return (
			<GuestLayout>
				<LoadingSpinner
					fullHeight
					subtitle={t("workerReportedIssues.loading.subtitle", {
						defaultValue: "Fetching worker-reported issues and KPI details",
					})}
					title={t("workerReportedIssues.loading.title", {
						defaultValue: "Loading worker-reported issues…",
					})}
				/>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<Box className="mx-auto container px-6 py-8">
				<Flex align="start" className="gap-4" justify="between" wrap="wrap">
					<Box>
						<h1 className="mb-1.5 uppercase heading-display">
							{t("workerReportedIssues.pageTitle")}
						</h1>
						<Text className="block text-[#56666C]">
							{t("workerReportedIssues.subtitle")}
						</Text>
					</Box>
					<Flex align="center" className="gap-2" wrap="wrap">
						<Box>
							<Text
								as="label"
								className="mb-1 block text-sm font-medium text-[#004A60]"
								htmlFor={startDateId}
							>
								{t("workerReportedIssues.filters.startDate")}
							</Text>
							<input
								className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#148696] focus:ring-2 focus:ring-[#148696]/20"
								id={startDateId}
								max={moment().format("YYYY-MM-DD")}
								onChange={(event) => setStartDate(event.target.value)}
								type="date"
								value={effectiveStartDate}
							/>
						</Box>
						<Text className="mt-6 text-gray-400">-</Text>
						<Box>
							<Text
								as="label"
								className="mb-1 block text-sm font-medium text-[#004A60]"
								htmlFor={endDateId}
							>
								{t("workerReportedIssues.filters.endDate")}
							</Text>
							<input
								className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none transition focus:border-[#148696] focus:ring-2 focus:ring-[#148696]/20"
								id={endDateId}
								max={moment().format("YYYY-MM-DD")}
								min={effectiveStartDate || undefined}
								onChange={(event) => setEndDate(event.target.value)}
								type="date"
								value={effectiveEndDate}
							/>
						</Box>
						<Box>
							<Text
								as="label"
								className="mb-1 block text-sm font-medium text-[#004A60]"
								htmlFor={categoryFilterId}
							>
								{t("workerReportedIssues.filters.issueCategory")}
							</Text>
							<Select.Root
								onValueChange={(value) =>
									setSelectedMainCategory(value as "All" | MainKpiCategory)
								}
								value={selectedMainCategory}
							>
								<Select.Trigger id={categoryFilterId} />
								<Select.Content>
									{KPI_CATEGORY_OPTIONS.map((categoryOption) => (
										<Select.Item key={categoryOption} value={categoryOption}>
											{t(`workerReportedIssues.categories.${categoryOption}`)}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
						</Box>
					</Flex>
				</Flex>

				<div className="my-6">
					<WorkerReportedTopMetrics metrics={topMetrics} t={t} />
				</div>

				<Box mt="8">
					<h2 className="mb-1.5 uppercase heading-display">
						{t("workerReportedIssues.sections.earlyWarning.title", {
							defaultValue: "EARLY WARNING RISK",
						})}
					</h2>
					<Text className="block text-[#56666C]">
						{t("workerReportedIssues.sections.earlyWarning.subtitle", {
							defaultValue:
								"Detecting and remediating worker-reported issues and concerns before they escalate",
						})}
					</Text>

					<Box mt="4">
						<CollapsibleDataTable
							columnSearchEnabled={true}
							columns={earlyWarningOpenColumns}
							dense={false}
							emptyMessage={t("workerReportedIssues.tables.openEmpty", {
								defaultValue: "No open worker-reported violations found",
							})}
							errorMessage={
								!shouldUseMockData && isSupplierKpiError
									? supplierKpiError instanceof Error
										? supplierKpiError.message
										: t("workerReportedIssues.tables.loadError", {
												defaultValue:
													"Worker-reported violations could not be loaded.",
											})
									: null
							}
							expandAllButton={true}
							isLoading={!shouldUseMockData && loadingSupplierKPIs}
							onRetry={() => {
								void refetchSupplierKpis();
							}}
							pageSize={10}
							renderExpandedContent={renderExpanded}
							rows={earlyWarningOpenRows}
							statusLegends={[...WORKER_VIOLATION_STATUS_LEGENDS]}
							title={t("workerReportedIssues.tables.openTitle", {
								count: earlyWarningOpenRows.length,
							})}
							totalCount={earlyWarningOpenRows.length}
						/>
					</Box>

					<Box mt="6">
						<CollapsibleDataTable
							columnSearchEnabled={true}
							columns={earlyWarningClosedColumns}
							dense={false}
							expandAllButton={true}
							pageSize={10}
							renderExpandedContent={(row) => renderExpanded(row, true)}
							rows={earlyWarningClosedRows}
							statusLegends={[...CLOSED_QUALITY_LEGENDS]}
							title={t("workerReportedIssues.tables.closedTitle", {
								count: earlyWarningClosedRows.length,
							})}
							totalCount={earlyWarningClosedRows.length}
						/>
					</Box>
				</Box>

				<Box mt="9">
					<h2 className="mb-1.5 uppercase heading-display">
						{t("workerReportedIssues.sections.forcedLabor.title", {
							defaultValue: "FORCED LABOR RISK",
						})}
					</h2>
					<Text className="block text-[#56666C]">
						{t("workerReportedIssues.sections.forcedLabor.subtitle", {
							defaultValue:
								"Worker-reported labor issues with indications of the presence of one or more of ILO's 11 indicators of forced labor",
						})}
					</Text>

					<Box mt="4">
						<CollapsibleDataTable
							columnSearchEnabled={true}
							columns={openKpiColumns}
							dense={false}
							emptyMessage={t("workerReportedIssues.tables.openEmpty", {
								defaultValue: "No open worker-reported violations found",
							})}
							errorMessage={
								!shouldUseMockData && isSupplierKpiError
									? supplierKpiError instanceof Error
										? supplierKpiError.message
										: t("workerReportedIssues.tables.loadError", {
												defaultValue:
													"Worker-reported violations could not be loaded.",
											})
									: null
							}
							expandAllButton={true}
							isLoading={!shouldUseMockData && loadingSupplierKPIs}
							onRetry={() => {
								void refetchSupplierKpis();
							}}
							pageSize={10}
							renderExpandedContent={renderExpanded}
							rows={forcedLaborOpenRows}
							statusLegends={[...WORKER_VIOLATION_STATUS_LEGENDS]}
							title={t("workerReportedIssues.tables.openTitle", {
								count: forcedLaborOpenRows.length,
							})}
							totalCount={forcedLaborOpenRows.length}
						/>
					</Box>

					<Box mt="6">
						<CollapsibleDataTable
							columnSearchEnabled={true}
							columns={closedKpiColumns}
							dense={false}
							expandAllButton={true}
							pageSize={10}
							renderExpandedContent={(row) => renderExpanded(row, true)}
							rows={forcedLaborClosedRows}
							statusLegends={[...CLOSED_QUALITY_LEGENDS]}
							title={t("workerReportedIssues.tables.closedTitle", {
								count: forcedLaborClosedRows.length,
							})}
							totalCount={forcedLaborClosedRows.length}
						/>
					</Box>
				</Box>
			</Box>
		</GuestLayout>
	);
}
