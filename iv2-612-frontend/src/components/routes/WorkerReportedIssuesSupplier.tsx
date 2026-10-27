import { GridFilterAltIcon } from "@mui/x-data-grid";
import { Box, Flex, Select, Text } from "@radix-ui/themes";
import { useIsFetching, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import moment from "moment";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import laborMockData from "$src/assets/mock/labor-data.json";
import recruitmentMockData from "$src/assets/mock/recruitment-data.json";
import wagesMockData from "$src/assets/mock/wages-data.json";
import CascadeButton from "$src/components/button/button";
import CompanyDashboardDateRange from "$src/components/inputs/CompanyDashboardDateRange";
import Selector from "$src/components/inputs/selector";
import CollapsibleDataTable, {
	type CollapsibleColumn,
	type CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import FilterColumn, {
	type FilterSection,
} from "$src/components/tables/FilterColumn";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import RemediationNotesSummary from "$src/components/ui/RemediationNotesSummary";
import { useCascadeIndustries } from "$src/hooks/useCommonData";
import {
	type SupplierKPI,
	type SupplierKPIParams,
	useSupplierKPIs,
	useSupplyChains,
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
	hasIloIndicators,
	type IndicatorTag,
	isForcedLaborRisk,
	renderKpiExpandedContent,
	toSpRecommendations,
	WORKER_VIOLATION_STATUS_LEGENDS,
	WorkerReportedTopMetrics,
	withoutLksgColumn,
} from "$src/utils/workerReportedKpiTable";

const STABLE_REMEDIATION_QUALITIES = ["Fair", "Good", "Excellent"];

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

type MainKpiCategory = "Labor" | "Recruitment" | "Wages";

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

type KpiTableRow = CollapsibleRowData & {
	id: string | number;
	display_id?: string | number;
	supplier_name: string;
	category: MainKpiCategory;
	description: string;
	level: string | number;
	opened_at?: string;
	closed_at?: string;
	days_active?: number;
	affected_workers?: number;
	remediation_sp_recommendation?: string | string[] | null;
	status: number;
	status_name?: string;
	original_category?: string;
	source?: string;
	closed_quality?: string;
	closed_notes?: string;
	remediation_notes?: string;
	remediation_action?: string;
	remediation_validation?: string;
	remediation_results?: string;
	kpi?: number;
	supplier?: number;
	resource_id?: number;
	notes?: string;
	ilo_indicators?: IndicatorTag[];
	lksg_indicators?: IndicatorTag[];
};

function useDebounce<T>(value: T, delay = 150): T {
	const [debounced, setDebounced] = useState<T>(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

const getSupplierStatus = (supplier: any): string | undefined =>
	supplier?.status || supplier?.SupplierSupplyChain?.status;

const getSupplierLabel = (supplier: any): string => {
	const name = supplier?.name || supplier?.supplier_name || "Unknown Supplier";
	return getSupplierStatus(supplier) === "inactive"
		? `${name} (inactive)`
		: name;
};

const KPI_CATEGORY_OPTIONS: Array<"All" | MainKpiCategory> = [
	"All",
	"Labor",
	"Recruitment",
	"Wages",
];

// Match the GuestNavbar dropdown language (GuestNabar.tsx:375, 445): pill
// trigger and menu links in #00516A, hovering to the cream/teal pair, with the
// selected item taking the same #A6DFDD active treatment as the current nav
// item. Scaled down one step because this sits in a filter header, not the nav.
const SUPPLIER_STATUS_TRIGGER_CLASS =
	"!inline-flex !cursor-pointer !items-center !justify-center !gap-1 !rounded-lg !border !border-[#D2D2D2] !bg-white !px-3 !py-1 !text-xs !font-semibold !text-[#004A60] !shadow-2xs !transition-all !duration-200 hover:!border-[#148696] hover:!bg-[#FFF8DE] hover:!text-[#004A60] focus:!outline-none focus-visible:!ring-2 focus-visible:!ring-[#148696] data-[state=open]:!border-[#148696] data-[state=open]:!bg-[#A6DFDD] data-[state=open]:!font-bold data-[state=open]:!text-[#004A60]";

const SUPPLIER_STATUS_ITEM_CLASS =
	"!flex !cursor-pointer !items-center !gap-2 !rounded-lg !px-3 !py-2 !text-xs !text-[#00516A] !transition-all !duration-200 hover:!bg-[#FFF8DE] hover:!font-bold hover:!text-[#004A60] data-[state=checked]:!bg-[#A6DFDD] data-[state=checked]:!font-bold data-[state=checked]:!text-[#004A60] [&_.rt-SelectItemIndicator]:!hidden";

const STATUS_OPEN = new Set([1, 2]);
// Match the HRDD "Labor Cases Closed by Quality" chart, which counts only the
// "Closed" status (id 3) via CLOSED_STATUS_NAMES=("Closed",). Status 4 ("old
// unresolved") is intentionally excluded so both screens agree.
const STATUS_CLOSED = new Set([3]);

const getRelevantDate = (row: KpiTableRow) =>
	row.closed_at || row.opened_at || null;

const formatDateInputValue = (date?: string | null) => {
	if (!date) return "";
	return moment(date).format("YYYY-MM-DD");
};

const formatApiDate = (value?: string | null): string => {
	if (!value) return "N/A";
	if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
		return value.slice(0, 10);
	}
	return format(new Date(value), "yyyy-MM-dd");
};

const dedupeKpisById = <T extends { id?: string | number }>(rows: T[]): T[] => {
	const uniqueIds = new Set<string>();

	return rows.filter((row) => {
		if (row.id === null || row.id === undefined || row.id === "") {
			return false;
		}

		const uniqueKey = String(row.id);
		if (uniqueIds.has(uniqueKey)) {
			return false;
		}

		uniqueIds.add(uniqueKey);
		return true;
	});
};

const normalizeMainCategory = (
	category?: string | null,
	metaCategory?: string | null,
): MainKpiCategory | null => {
	if (metaCategory) {
		const normMeta = metaCategory.trim();
		if (
			normMeta === "Recruitment" ||
			normMeta === "Wages" ||
			normMeta === "Labor"
		) {
			return normMeta;
		}
	}
	if (!category) return null;
	const normalized = category.trim().toLowerCase();
	if (normalized.includes("recruit")) return "Recruitment";
	if (normalized.includes("wage") || normalized.includes("payment")) {
		return "Wages";
	}
	return "Labor";
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

export default function WorkerReportedIssuesSupplier() {
	const { t } = useTranslation();
	const categoryFilterId = useId();
	const supplyChainSelectorId = useId();
	const industriesSelectorId = useId();
	const subIndustriesSelectorId = useId();
	const countrySelectorId = useId();
	const supplierStatusSelectorId = useId();

	const [filters, setFilters] = useState({
		supplyChains: [] as number[],
		industries: [] as number[],
		subIndustries: [] as number[],
		startTime: moment().subtract(1, "year").format("YYYY-MM-DD"),
		endTime: moment(new Date()).format("YYYY-MM-DD"),
	});
	const [selectedSupplyChain, setSelectedSupplyChain] = useState<number | null>(
		null,
	);
	const [userSelectedSuppliers, setUserSelectedSuppliers] = useState<
		number[] | null
	>(null);
	const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
	const [selectedSubIndustry, setSelectedSubIndustry] = useState<number | null>(
		null,
	);
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedMainCategory, setSelectedMainCategory] = useState<
		"All" | MainKpiCategory
	>("All");
	const [supplierStatusFilter, setSupplierStatusFilter] = useState<
		"active" | "inactive" | "all"
	>("active");
	const debouncedFilters = useDebounce(filters);
	const debouncedUserSelectedSuppliers = useDebounce(userSelectedSuppliers);
	const { isSupplier, supplierId, partnerId, isGlobalPartner, isTestUser } =
		getUserIdentifiers();
	const { viewMode } = useViewModeStore();
	const isSupplierContext = isSupplier || viewMode === "supplier-view";
	const shouldUseMockData = useMockData();
	const { data: apiSupplyChains = [], isLoading: loadingSupplyChains } =
		useSupplyChains(
			isGlobalPartner ? { partnerId: partnerId || undefined } : undefined,
		);
	const supplyChains = shouldUseMockData
		? (laborMockData.supplyChains as any[])
		: (apiSupplyChains as any[]);

	const partnerIdFromUser = shouldUseMockData || isTestUser ? 28 : partnerId;

	// Default auto-select the first available supply chain
	useEffect(() => {
		if (selectedSupplyChain === null && supplyChains.length > 0) {
			const candidateChains = partnerIdFromUser
				? supplyChains.filter(
						(sc: any) =>
							sc.strategic_partner === partnerIdFromUser ||
							sc.strategic_partner_id === partnerIdFromUser ||
							sc.partner_id === partnerIdFromUser,
					)
				: supplyChains;
			const defaultChain = candidateChains[0] || supplyChains[0];
			if (defaultChain?.id) {
				setSelectedSupplyChain(defaultChain.id);
				setFilters((prev) => ({
					...prev,
					supplyChains: [defaultChain.id],
				}));
			}
		}
	}, [supplyChains, partnerIdFromUser, selectedSupplyChain]);

	let suppliers: any[] = [];
	if (isSupplier && supplierId) {
		suppliers = [
			{ id: supplierId, supplier: supplierId, supplier_name: "Supplier" },
		];
	} else if (selectedSupplyChain) {
		const selectedSupplyChainData = supplyChains.find(
			(sc: any) => sc.id === selectedSupplyChain,
		);
		suppliers = selectedSupplyChainData?.suppliers || [];
	} else if (supplyChains.length > 0) {
		let candidateChains = supplyChains;
		if (partnerIdFromUser) {
			candidateChains = supplyChains.filter(
				(sc: any) =>
					sc.strategic_partner === partnerIdFromUser ||
					sc.strategic_partner_id === partnerIdFromUser ||
					sc.partner_id === partnerIdFromUser,
			);
		}
		candidateChains.forEach((sc: any) => {
			if (Array.isArray(sc.suppliers)) {
				suppliers = suppliers.concat(sc.suppliers);
			}
		});
	}

	const uniqueSupplierIds = new Set();
	// Supplier scoping (active/inactive supply-chain links only) is already
	// enforced by the backend (legacyLaborService.getSupplyChains), so no extra
	// status filter is needed here — the shape differs across data sources anyway.
	suppliers = suppliers.filter((s: any) => {
		const id = s.id || s.supplier;
		if (!id || uniqueSupplierIds.has(id)) return false;
		uniqueSupplierIds.add(id);
		return true;
	});

	// Active/Inactive/All supplier filter (defaults to active). Missing status is
	// treated as active so mock/legacy rows aren't dropped. Never applied to a
	// supplier viewing their own single-supplier scope.
	if (!isSupplier && supplierStatusFilter !== "all") {
		suppliers = suppliers.filter(
			(s: any) => (getSupplierStatus(s) || "active") === supplierStatusFilter,
		);
	}

	const availableSuppliers = useMemo(
		() => suppliers,
		[selectedSupplyChain, supplyChains, supplierStatusFilter],
	);
	const uniqueCountries = useMemo(() => {
		const countries = new Set<string>();
		availableSuppliers.forEach((s: any) => {
			const c =
				s.country_name || (typeof s.country === "string" ? s.country : null);
			if (c) countries.add(c);
		});
		return Array.from(countries).sort();
	}, [availableSuppliers]);

	const countryFilteredAllSupplierIds = useMemo(() => {
		if (selectedCountries.length === 0)
			return availableSuppliers.map((s: any) => s.id || s.supplier);
		return availableSuppliers
			.filter((s: any) => {
				const c =
					s.country_name || (typeof s.country === "string" ? s.country : null);
				return c && selectedCountries.includes(c);
			})
			.map((s: any) => s.id || s.supplier);
	}, [availableSuppliers, selectedCountries]);

	const supplierIds = useMemo(() => {
		if (isSupplier && supplierId) {
			return [supplierId];
		}
		const base =
			userSelectedSuppliers ??
			availableSuppliers.map((s: any) => s.id || s.supplier);
		if (selectedCountries.length === 0) return base;
		const countrySet = new Set(countryFilteredAllSupplierIds);
		return base.filter((id: number) => countrySet.has(id));
	}, [
		isSupplier,
		supplierId,
		userSelectedSuppliers,
		availableSuppliers,
		selectedCountries,
		countryFilteredAllSupplierIds,
	]);

	const debouncedSupplierIds = useMemo(() => {
		if (isSupplier && supplierId) {
			return [supplierId];
		}
		const base =
			debouncedUserSelectedSuppliers ??
			availableSuppliers.map((s: any) => s.id || s.supplier);
		if (selectedCountries.length === 0) return base;
		const countrySet = new Set(countryFilteredAllSupplierIds);
		return base.filter((id: number) => countrySet.has(id));
	}, [
		isSupplier,
		supplierId,
		debouncedUserSelectedSuppliers,
		availableSuppliers,
		selectedCountries,
		countryFilteredAllSupplierIds,
	]);

	const { data: industriesResponse = {} } = useCascadeIndustries();
	const industries = (industriesResponse as any)?.data?.industries || [];
	const subIndustries: any[] = [];
	const selectedIndustryName = useMemo(
		() =>
			industries.find((industry: any) => industry.id === selectedIndustry)
				?.name,
		[selectedIndustry, industries],
	);

	const supplierSections: FilterSection[] = [
		{
			title: "",
			options:
				availableSuppliers?.map((supplier: any) => ({
					id: supplier?.id || supplier?.supplier,
					label: getSupplierLabel(supplier),
					value: supplier?.id || supplier?.supplier,
				})) || [],
			selectedIds: supplierIds,
			onChange: (selectedIds: (string | number)[]) => {
				setUserSelectedSuppliers(selectedIds as number[]);
			},
		},
	];

	const supplierScopeReady =
		shouldUseMockData || (isSupplier && !!supplierId) || !loadingSupplyChains;

	const supplierKPIParams: SupplierKPIParams = {
		has_cases: true,
		show_closed: true,
		// Send `suppliers` even when the set is empty. An empty set is a genuine
		// "no supplier matches the filters" result (e.g. status = Inactive when no
		// supplier is inactive); omitting the param made the API fall through to
		// its unfiltered branch and return every supplier's KPIs. Only omit it
		// while the supply chains — and therefore the supplier list — are still
		// loading, where empty really does mean "not known yet".
		...(supplierScopeReady ? { suppliers: debouncedSupplierIds } : {}),
		opened_at_range_after: debouncedFilters.startTime || undefined,
		opened_at_range_before: debouncedFilters.endTime || undefined,
		industry: selectedIndustryName,
	};
	const {
		data: supplierKPIData = { results: [], count: 0 },
		error: supplierKpiError,
		isError: isSupplierKpiError,
		// keepPreviousData means isLoading is true only on the very first fetch;
		// later filter changes surface as isFetching instead (see isRefetching).
		isLoading: loadingSupplierKPIs,
		refetch: refetchSupplierKpis,
	} = useSupplierKPIs(supplierKPIParams);
	const fetchingCount = useIsFetching({ queryKey: ["supplierKPIs"] });
	const isRefetching = !shouldUseMockData && fetchingCount > 0;
	const { data: workerFeedbackSubmissions = [] } =
		useWorkerFeedbackKpiSubmissions();
	const { data: kpiCategoriesRaw } = useKPICategories();
	const { data: kpisRaw = [] } = useKPIs();

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
		] as SupplierKPI[];
		const sourceRows = shouldUseMockData
			? mockRows.filter((kpi) => {
					// Mirrors the API path: an empty set matches no supplier.
					const matchesSupplier = debouncedSupplierIds.includes(
						Number(kpi.supplier),
					);
					const openedAt = kpi.opened_at
						? new Date(kpi.opened_at).getTime()
						: 0;
					const startTs = new Date(debouncedFilters.startTime).getTime();
					const endTs = new Date(
						`${debouncedFilters.endTime}T23:59:59.999`,
					).getTime();
					const matchesDate =
						!openedAt || (openedAt >= startTs && openedAt <= endTs);
					return matchesSupplier && matchesDate;
				})
			: apiRows;

		const uniqueRows = dedupeKpisById(sourceRows.filter((kpi) => !kpi.hide));

		return uniqueRows
			.map((kpi) => {
				// `kpi` is the SupplierKpi case id on cascade-api's
				// /legacy-labor/supplierkpis, so it must not be used as the catalogue key.
				// Prefer the explicit catalogue id; fall back to `kpi` for Django's
				// /supplierkpis, where `kpi` already is the catalogue id.
				const catalogueId = kpi.kpi_catalogue_id ?? kpi.kpi;
				const localizedKpi =
					typeof catalogueId === "number" ? kpiMap.get(catalogueId) : undefined;
				const category = normalizeMainCategory(
					kpi.category,
					(kpi as any).meta_category,
				);
				if (!category) return null;

				const daysActive = kpi.opened_at
					? kpiUtils.getDaysActive(kpi.opened_at)
					: 0;
				return {
					...kpi,
					id: kpi.id,
					display_id: kpi.kpi ?? kpi.id,
					resource_id: kpi.id,
					category,
					original_category: localizedKpi?.kpi_category?.name || kpi.category,
					description: localizedKpi?.description || kpi.description,
					status: Number(kpi.status),
					days_active: daysActive,
					affected_workers: kpi.affected_workers || 0,
					// Stable English identifier; canShowGrievanceForm matches on this
					// keyword. Translate at render time via translateSource().
					source: "Social Responsibility KPI",
					level: kpi.level ?? "-",
					// Prefer indicators nested on the supplier KPI row; fall back to
					// the master KPI (kpiMap), which cascade-api GET /kpi exposes.
					ilo_indicators:
						(kpi as { ilo_indicators?: IndicatorTag[] }).ilo_indicators ??
						(localizedKpi?.ilo_indicators as IndicatorTag[] | undefined) ??
						[],
					lksg_indicators:
						(kpi as { lksg_indicators?: IndicatorTag[] }).lksg_indicators ??
						(localizedKpi?.lksg_indicators as IndicatorTag[] | undefined) ??
						[],
					closed_notes: kpi.closed_notes,
					remediation_notes: kpi.remediation_notes,
					remediation_action: kpi.remediation_action,
					remediation_validation: kpi.remediation_validation,
					remediation_results: kpi.remediation_results,
					notes: kpi.remediation_notes || kpi.closed_notes,
				} as KpiTableRow;
			})
			.filter(Boolean) as KpiTableRow[];
	}, [
		shouldUseMockData,
		supplierKPIData.results,
		debouncedSupplierIds,
		debouncedFilters.startTime,
		debouncedFilters.endTime,
		t,
	]);

	const submissionKpiRows = useMemo<KpiTableRow[]>(() => {
		return (workerFeedbackSubmissions || []).flatMap((submission) => {
			if (!hasWorkerFeedbackKpiSignal(submission)) {
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
					supplier: submission.supplierId || undefined,
					supplier_name: submission.supplierId
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
	}, [workerFeedbackSubmissions, issueCategoryMap, t]);

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

	const effectiveStartDate = debouncedFilters.startTime || dateBounds.min;
	const effectiveEndDate = debouncedFilters.endTime || dateBounds.max;

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

	const fullyFilteredKpiRows = useMemo(() => {
		// Empty supplier set => nothing matches. Previously this returned every row,
		// which made the metric cards disagree with an empty supplier filter.
		if (debouncedSupplierIds.length === 0) {
			return supplierScopeReady ? [] : filteredKpiRows;
		}
		const supplierSet = new Set(debouncedSupplierIds.map((id) => Number(id)));
		return filteredKpiRows.filter((row) => {
			const supplierFromRow = Number((row as any).supplier);
			if (
				Number.isFinite(supplierFromRow) &&
				supplierSet.has(supplierFromRow)
			) {
				return true;
			}
			const supplierFromResource = Number((row as any).resource_id);
			return Number.isFinite(supplierFromResource)
				? supplierSet.has(supplierFromResource)
				: true;
		});
	}, [filteredKpiRows, debouncedSupplierIds, supplierScopeReady]);

	const openKpiRows = useMemo(
		() =>
			fullyFilteredKpiRows
				.filter((row) => STATUS_OPEN.has(Number(row.status)))
				.sort(
					(a, b) =>
						new Date(b.opened_at || "").getTime() -
						new Date(a.opened_at || "").getTime(),
				),
		[fullyFilteredKpiRows],
	);

	const closedKpiRows = useMemo(
		() =>
			fullyFilteredKpiRows
				.filter((row) => STATUS_CLOSED.has(Number(row.status)))
				.sort(
					(a, b) =>
						new Date(b.closed_at || b.opened_at || "").getTime() -
						new Date(a.closed_at || a.opened_at || "").getTime(),
				),
		[fullyFilteredKpiRows],
	);

	// Split each open/closed set into early-warning (Level 2 / level-less) vs
	// forced-labor (Levels 3 & 4, or any ILO-indicator-tagged) risk. Summary
	// cards keep using the combined openKpiRows/closedKpiRows above.
	const earlyWarningOpenRows = useMemo(
		() => openKpiRows.filter((row) => !isForcedLaborRisk(row)),
		[openKpiRows],
	);
	const forcedLaborOpenRows = useMemo(
		() => openKpiRows.filter((row) => isForcedLaborRisk(row)),
		[openKpiRows],
	);
	const earlyWarningClosedRows = useMemo(
		() => closedKpiRows.filter((row) => !isForcedLaborRisk(row)),
		[closedKpiRows],
	);
	const forcedLaborClosedRows = useMemo(
		() => closedKpiRows.filter((row) => isForcedLaborRisk(row)),
		[closedKpiRows],
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

	const getDaysActive = (openedAt?: string): number =>
		openedAt ? kpiUtils.getDaysActive(openedAt) : 0;

	const getStatusColor = (daysActive: number, statusId: number): string =>
		kpiUtils.getStatusColor(daysActive, statusId);

	const getStatusString = (daysActive: number, statusId: number): string =>
		kpiUtils.getStatusString(daysActive, statusId);

	const getResultsText = (row: CollapsibleRowData): string => {
		const rowData = row as Record<string, unknown>;
		const candidates = [
			rowData.remediation_results,
			rowData.results,
			rowData.remediation_result,
		];

		for (const value of candidates) {
			if (typeof value === "string" && value.trim().length > 0) {
				return value.trim();
			}
		}

		return "";
	};

	const renderIloIndicatorChips = (row: CollapsibleRowData) => {
		if (!hasIloIndicators(row as KpiTableRow)) return null;
		return (
			<div className="mt-4 text-sm">
				<strong>
					{t("workerReportedIssues.details.iloIndicators", {
						defaultValue: "ILO forced-labor indicators",
					})}
					:
				</strong>
				<div className="mt-1 flex flex-wrap gap-1.5">
					{(row as KpiTableRow).ilo_indicators?.map((indicator) => (
						<span
							className="break-words rounded-full bg-[#FDE7D6] px-2.5 py-0.5 text-xs font-medium text-[#c77724]"
							key={indicator.id}
							title={indicator.description || indicator.name}
						>
							{indicator.name}
						</span>
					))}
				</div>
			</div>
		);
	};

	const renderLksgIndicatorChips = (row: CollapsibleRowData) => {
		const indicators = (row as KpiTableRow).lksg_indicators;
		if (!Array.isArray(indicators) || indicators.length === 0) return null;
		return (
			<div className="mt-4 text-sm">
				<strong>
					{t("workerReportedIssues.details.lksgIndicators", {
						defaultValue: "LkSG indicators",
					})}
					:
				</strong>
				<div className="mt-1 flex flex-wrap gap-1.5">
					{indicators.map((indicator) => (
						<span
							className="break-words rounded-full bg-[#DCEAF3] px-2.5 py-0.5 text-xs font-medium text-[#004A60]"
							key={indicator.id}
							title={indicator.description || indicator.name}
						>
							{indicator.name}
						</span>
					))}
				</div>
			</div>
		);
	};

	const renderOpenKpiExpandedContent = (row: CollapsibleRowData) =>
		renderKpiExpandedContent({
			row,
			isSupplierContext,
			t,
		});

	const renderClosedKpiExpandedContent = (row: CollapsibleRowData) => {
		const recommendations = toSpRecommendations(
			row.remediation_sp_recommendation,
		);
		const resultsText = getResultsText(row);

		return (
			<Box style={{ padding: 8 }}>
				<div className="text-lg font-bold mb-3">
					Closed Labor Violation Details
				</div>
				<div className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-[1.4fr_1fr]">
					<div className="space-y-2">
						<div>
							<strong>KPI ID:</strong> {row.id}
						</div>
						<div>
							<strong>Supplier:</strong> {row.supplier_name || "N/A"}
						</div>
						<div>
							<strong>Category:</strong>{" "}
							{row.original_category || row.category || "N/A"}
						</div>
						<div>
							<strong>Opened:</strong> {formatApiDate(row.opened_at)}
						</div>
						<div>
							<strong>Closed:</strong> {formatApiDate(row.closed_at)}
						</div>
						<div>
							<strong>Status:</strong> {row.status_name || "Closed"}
						</div>
						<div className="pt-2">
							<strong>Description:</strong>
							<p className="mt-1 whitespace-pre-wrap">
								{row.description || "N/A"}
							</p>
						</div>
					</div>
					<div className="min-w-0 space-y-2 overflow-hidden">
						<div>
							<strong>Affected Workers:</strong>{" "}
							{kpiUtils.getAffectedWorkersRangeForSupplier(
								row.affected_workers as number | null | undefined,
							)}
						</div>
						<div>
							<strong>Remediation Outcome:</strong>{" "}
							{row.closed_quality || "N/A"}
						</div>
						{renderIloIndicatorChips(row)}
						{renderLksgIndicatorChips(row)}
					</div>
				</div>
				{!isSupplierContext && (
					<RemediationNotesSummary
						action={row.remediation_action}
						issues={row.remediation_notes}
						result={resultsText}
						spRecommendations={recommendations}
						workerValidation={row.remediation_validation}
					/>
				)}
			</Box>
		);
	};

	const openKpiColumns = useMemo<CollapsibleColumn[]>(
		() => buildWorkerViolationsColumns(t),
		[t],
	);

	const closedKpiColumns = useMemo<CollapsibleColumn[]>(
		() => [
			{ id: "id", label: "ID", minWidth: 80, sortable: true },
			{ id: "supplier_name", label: "Supplier", minWidth: 200, sortable: true },
			{ id: "category", label: "Category", minWidth: 80, sortable: true },
			{ id: "description", label: "Description", minWidth: 300 },
			{
				id: "remediation_sp_recommendation",
				label: "Recommendation for SP",
				minWidth: 150,
				format: (value) => {
					const hasRecommendations = Array.isArray(value)
						? value.length > 0
						: Boolean(value);
					return hasRecommendations ? "Yes" : "";
				},
			},
			...buildIndicatorColumns(t),
			{
				id: "opened_at",
				label: "Opened",
				minWidth: 120,
				sortable: true,
				format: (value) => (value ? format(new Date(value), "yyyy-MM-dd") : ""),
			},
			{
				id: "closed_at",
				label: "Closed",
				minWidth: 120,
				sortable: true,
				format: (value) => (value ? format(new Date(value), "yyyy-MM-dd") : ""),
			},
			{
				id: "closed_quality",
				label: "Remediation Outcome",
				minWidth: 120,
				format: (value) => {
					const quality = String(value || "").toLowerCase();
					let color = "#9CA3AF";
					if (quality === "poor") color = "#EF4444";
					else if (quality === "fair") color = "#F97316";
					else if (quality === "good") color = "#EAB308";
					else if (quality === "excellent") color = "#22C55E";
					return (
						<div
							className="h-3 w-3 rounded-full"
							style={{ background: color }}
							title={String(value || "")}
						/>
					);
				},
			},
		],
		[t],
	);

	// Early Warning is Level 2 by definition, and no Level 2 KPI is mapped to an
	// LkSG indicator, so that column is always blank here. The Forced Labor
	// tables (Levels 3 & 4) keep it.
	const earlyWarningOpenColumns = useMemo<CollapsibleColumn[]>(
		() => withoutLksgColumn(openKpiColumns),
		[openKpiColumns],
	);
	const earlyWarningClosedColumns = useMemo<CollapsibleColumn[]>(
		() => withoutLksgColumn(closedKpiColumns),
		[closedKpiColumns],
	);

	const buildOpenTableRows = (rows: KpiTableRow[]): CollapsibleRowData[] =>
		rows.map((row) => {
			const daysActive = getDaysActive(row.opened_at);
			const statusText = getStatusString(daysActive, Number(row.status));
			const color = getStatusColor(daysActive, Number(row.status));
			return {
				...row,
				id: row.display_id ?? row.id,
				status_text: statusText,
				status_display: (
					<div
						className="w-3 h-3 rounded-full"
						style={{ background: color }}
						title={statusText}
					/>
				),
			};
		});

	const buildClosedTableRows = (rows: KpiTableRow[]): CollapsibleRowData[] =>
		rows.map((row) => ({
			...row,
			id: row.display_id ?? row.id,
			category: row.original_category || row.category,
		}));

	const earlyWarningOpenTableRows = useMemo(
		() => buildOpenTableRows(earlyWarningOpenRows),
		[earlyWarningOpenRows],
	);
	const forcedLaborOpenTableRows = useMemo(
		() => buildOpenTableRows(forcedLaborOpenRows),
		[forcedLaborOpenRows],
	);
	const earlyWarningClosedTableRows = useMemo(
		() => buildClosedTableRows(earlyWarningClosedRows),
		[earlyWarningClosedRows],
	);
	const forcedLaborClosedTableRows = useMemo(
		() => buildClosedTableRows(forcedLaborClosedRows),
		[forcedLaborClosedRows],
	);

	// Placed after every hook so hook order stays stable across renders. Only the
	// first fetch reaches here — refetches keep the previous data on screen and
	// are signalled by isRefetching instead.
	if (!shouldUseMockData && loadingSupplierKPIs) {
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
			{/* Page-level overlay while a filter change is in flight. Sits above the
			    sticky navbar (z-50) so the whole page reads as busy, and swallows
			    clicks so filters can't be re-fired mid-fetch. */}
			{isRefetching && (
				<div
					aria-busy="true"
					aria-live="polite"
					className="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-[2px]"
				>
					<div className="rounded-lg bg-white px-8 py-6 shadow-lg">
						<LoadingSpinner
							subtitle={t("workerReportedIssues.loading.subtitle", {
								defaultValue: "Fetching worker-reported issues and KPI details",
							})}
							title={t("workerReportedIssues.loading.updating", {
								defaultValue: "Updating Data…",
							})}
						/>
					</div>
				</div>
			)}
			<Box className="mx-auto container py-8">
				<div className="flex items-center gap-4 flex-wrap text-sm mb-1">
					{!isSupplier && (
						<div className="flex items-center gap-2 border-r pe-2">
							<GridFilterAltIcon className="w-5 h-5 text-[#148696]" />
							<span className="font-semibold">Filters</span>
						</div>
					)}

					<div
						className={`flex grow items-center my-2 ${!isSupplier ? "justify-between" : ""}`}
					>
						{!isSupplier && (
							<div className="flex gap-4 items-center flex-wrap">
								<Selector
									allLabel="Supply Chain"
									id={supplyChainSelectorId}
									onChange={(value) => {
										setSelectedSupplyChain(value as number);
										const selectedSupplyChainData = supplyChains.find(
											(sc: any) => sc.id === value,
										);
										const allSupplierIds =
											selectedSupplyChainData?.suppliers?.map(
												(s: any) => s.id || s.supplier,
											) || [];
										setFilters((prev) => ({
											...prev,
											supplyChains: value ? [value as number] : [],
										}));
										setUserSelectedSuppliers(value ? allSupplierIds : []);
									}}
									options={
										partnerIdFromUser
											? supplyChains
													.filter(
														(sc: any) =>
															sc.strategic_partner === partnerIdFromUser ||
															sc.strategic_partner_id === partnerIdFromUser ||
															sc.partner_id === partnerIdFromUser,
													)
													.map((sc: any) => ({
														value: sc.id,
														label: sc.name,
													}))
											: supplyChains.map((sc: any) => ({
													value: sc.id,
													label: sc.name,
												}))
									}
									value={selectedSupplyChain || undefined}
									variant="nav"
								/>

								<Selector
									allLabel="Industries"
									id={industriesSelectorId}
									onChange={(value) => {
										setSelectedIndustry(value as number);
										setFilters((prev) => ({
											...prev,
											industries: value ? [value as number] : [],
										}));
									}}
									options={industries?.map((industry: any) => ({
										value: industry?.id,
										label: industry.name,
									}))}
									value={selectedIndustry ?? undefined}
									variant="nav"
								/>

								<Selector
									allLabel="Sub-Industries"
									id={subIndustriesSelectorId}
									onChange={(value) => {
										setSelectedSubIndustry(value as number);
										setFilters((prev) => ({
											...prev,
											subIndustries: value ? [value as number] : [],
										}));
									}}
									options={subIndustries?.map((subIndustry: any) => ({
										value: subIndustry?.id,
										label: subIndustry.name,
									}))}
									value={selectedSubIndustry ?? undefined}
									variant="nav"
								/>

								{uniqueCountries.length > 0 && (
									<Selector
										allLabel="Country"
										id={countrySelectorId}
										onChange={(value) => {
											setSelectedCountries(value ? [value as string] : []);
										}}
										options={uniqueCountries.map((c) => ({
											value: c,
											label: c,
										}))}
										value={
											selectedCountries.length === 1
												? selectedCountries[0]
												: undefined
										}
										variant="nav"
									/>
								)}

								<CascadeButton
									buttonText="Clear Filters"
									handleOnClick={() => {
										const currentSupplierIds = availableSuppliers.map(
											(s: any) => s.id || s.supplier,
										);
										setFilters({
											supplyChains: selectedSupplyChain
												? [selectedSupplyChain]
												: [],
											industries: [],
											subIndustries: [],
											startTime: moment()
												.subtract(1, "year")
												.format("YYYY-MM-DD"),
											endTime: moment(new Date()).format("YYYY-MM-DD"),
										});
										setUserSelectedSuppliers(currentSupplierIds);
										setSelectedIndustry(null);
										setSelectedSubIndustry(null);
										setSelectedCountries([]);
										setSelectedMainCategory("All");
										setSupplierStatusFilter("active");
									}}
									size="2"
								/>
							</div>
						)}

						<div className="z-40">
							<CompanyDashboardDateRange
								endTime={filters.endTime}
								formatDate={(date) => format(date, "yyyy MMM dd")}
								onChange={({ startTime, endTime }) => {
									setFilters((prev) => ({
										...prev,
										startTime,
										endTime,
									}));
								}}
								startTime={filters.startTime}
							/>
							<p className="mt-1 text-xs text-gray-500">
								Data starts from 2023
							</p>
						</div>
					</div>
				</div>

				<Flex align="start" className="gap-4" justify="between" wrap="wrap">
					<Box>
						<h1 className="mb-1.5 uppercase heading-display">
							{t("workerReportedIssues.pageTitle")}
						</h1>
						<Text className="block text-base text-[#56666C]">
							{t("workerReportedIssues.subtitle")}
						</Text>
					</Box>
					<Flex align="center" className="gap-2" wrap="wrap">
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

				<div className="grid grid-cols-4 gap-4 mt-4">
					{!isSupplier && (
						<div className="col-span-1 md:col-span-1">
							<div className="lg:sticky lg:top-6">
								<FilterColumn
									headerContent={
										<Select.Root
											onValueChange={(value) => {
												setSupplierStatusFilter(
													value as "active" | "inactive" | "all",
												);
												// Re-derive the supplier set from the filtered list so
												// a previously-selected out-of-scope supplier is dropped.
												setUserSelectedSuppliers(null);
											}}
											size="1"
											value={supplierStatusFilter}
										>
											<Select.Trigger
												aria-label={t(
													"workerReportedIssues.filters.supplierStatus",
													{
														defaultValue: "Supplier Status",
													},
												)}
												className={SUPPLIER_STATUS_TRIGGER_CLASS}
												id={supplierStatusSelectorId}
											/>
											<Select.Content className="!rounded-xl !border !border-[#D2D2D2] !bg-white !p-1.5 !shadow-xl">
												<Select.Item
													className={SUPPLIER_STATUS_ITEM_CLASS}
													value="active"
												>
													{t(
														"workerReportedIssues.filters.supplierStatusActive",
														{ defaultValue: "Active" },
													)}
												</Select.Item>
												<Select.Item
													className={SUPPLIER_STATUS_ITEM_CLASS}
													value="inactive"
												>
													{t(
														"workerReportedIssues.filters.supplierStatusInactive",
														{ defaultValue: "Inactive" },
													)}
												</Select.Item>
												<Select.Item
													className={SUPPLIER_STATUS_ITEM_CLASS}
													value="all"
												>
													{t("workerReportedIssues.filters.supplierStatusAll", {
														defaultValue: "All",
													})}
												</Select.Item>
											</Select.Content>
										</Select.Root>
									}
									sections={supplierSections}
									title="Suppliers"
								/>
							</div>
						</div>
					)}
					<div
						className={isSupplier ? "col-span-4" : "col-span-3 md:col-span-3"}
					>
						<div className="mb-6">
							<WorkerReportedTopMetrics metrics={topMetrics} t={t} />
						</div>
					</div>
					<div className={"col-span-4"}>
						<p className="mb-6 text-[#111827]">
							{t("workerReportedIssues.tableDescription", {
								defaultValue:
									"Worker reported labor violations below are organized into the 5 main KPI I categories. These map to and expand upon internationally recognized types of labor violations and potential workplace and recruitment issues.",
							})}
						</p>
						<Box>
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
									renderExpandedContent={renderOpenKpiExpandedContent}
									rows={earlyWarningOpenTableRows}
									statusLegends={[...WORKER_VIOLATION_STATUS_LEGENDS]}
									title={t("workerReportedIssues.tables.openTitle", {
										count: earlyWarningOpenTableRows.length,
									})}
									totalCount={earlyWarningOpenTableRows.length}
								/>
							</Box>

							<Box mt="6">
								<CollapsibleDataTable
									columnSearchEnabled={true}
									columns={earlyWarningClosedColumns}
									dense={false}
									expandAllButton={true}
									pageSize={10}
									renderExpandedContent={renderClosedKpiExpandedContent}
									rows={earlyWarningClosedTableRows}
									statusLegends={[...CLOSED_QUALITY_LEGENDS]}
									title={t("workerReportedIssues.tables.closedTitle", {
										count: earlyWarningClosedTableRows.length,
									})}
									totalCount={earlyWarningClosedTableRows.length}
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
									renderExpandedContent={renderOpenKpiExpandedContent}
									rows={forcedLaborOpenTableRows}
									statusLegends={[...WORKER_VIOLATION_STATUS_LEGENDS]}
									title={t("workerReportedIssues.tables.openTitle", {
										count: forcedLaborOpenTableRows.length,
									})}
									totalCount={forcedLaborOpenTableRows.length}
								/>
							</Box>

							<Box mt="6">
								<CollapsibleDataTable
									columnSearchEnabled={true}
									columns={closedKpiColumns}
									dense={false}
									expandAllButton={true}
									pageSize={10}
									renderExpandedContent={renderClosedKpiExpandedContent}
									rows={forcedLaborClosedTableRows}
									statusLegends={[...CLOSED_QUALITY_LEGENDS]}
									title={t("workerReportedIssues.tables.closedTitle", {
										count: forcedLaborClosedTableRows.length,
									})}
									totalCount={forcedLaborClosedTableRows.length}
								/>
							</Box>
						</Box>
					</div>
				</div>
			</Box>
		</GuestLayout>
	);
}
