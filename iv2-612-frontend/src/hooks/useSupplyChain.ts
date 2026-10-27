// src/hooks/useSupplyChain.ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

const API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;
const STAGING_CMS_URL = import.meta.env.VITE_API_BASE_URL;

// Helper to check if user is org-test-user
const isOrgTestUser = () => {
	try {
		const authStorage = localStorage.getItem("auth-storage");
		if (authStorage) {
			const parsed = JSON.parse(authStorage);
			return parsed?.state?.role === "org-test-user";
		}
	} catch (e) {
		console.error("Error parsing auth storage:", e);
	}
	return false;
};

// Helper to get the appropriate base URL
const getBaseUrl = () => {
	return isOrgTestUser() ? STAGING_CMS_URL : API_URL;
};

// Types
export interface SupplierKPI {
	id: number;
	kpi?: number;
	// Explicit SupplierKpi primary key from cascade-api's /legacy-labor/supplierkpis,
	// where `id` is the latest update id rather than the KPI. Absent on Django's
	// /supplierkpis (there `id` already is the SupplierKpi id). See resource_id
	// in normalizeSupplierKpiRows.
	supplier_kpi_id?: number;
	// True Kpi catalogue id, used to look up the catalogue (description,
	// category, ILO/LkSG indicators). On cascade-api's /legacy-labor/supplierkpis
	// `kpi` is the SupplierKpi case id, not the catalogue id, so the two must not
	// be conflated. Absent on Django's /supplierkpis, where `kpi` already is the
	// catalogue id.
	kpi_catalogue_id?: number;
	supplier?: number;
	supplier_name: string;
	description: string;
	grouping_name?: string;
	category: string;
	level: number;
	opened_at: string;
	closed_at?: string;
	status: number;
	status_name: string;
	affected_workers?: number;
	call_count?: number;
	source_recruiter_count?: number;
	destination_recruiter_count?: number;
	remediation_notes?: string;
	remediation_action?: string;
	remediation_validation?: string;
	remediation_results?: string;
	// Scalar TextField on both SupplierKpi and SupplierKpiUpdate; some payloads
	// have historically carried an array. Normalize with toSpRecommendations.
	remediation_sp_recommendation?: string | string[] | null;
	closed_notes?: string;
	closed_quality?: string;
	total_update_count?: number;
	hide?: boolean;
	// Forced-labor tagging inherited from the parent Kpi. Present only once the
	// backend nests these on the supplierkpis payload (see KpiSerializer). Kept
	// optional so the page degrades gracefully to the level proxy until then.
	ilo_indicators?: IndicatorTag[];
	lksg_indicators?: IndicatorTag[];
}

export interface IndicatorTag {
	id: number;
	name: string;
	description?: string | null;
}

export interface Supplier {
	id: number;
	name: string;
}

export interface StrategicPartner {
	id: number;
	name: string;
}

export interface SupplyChain {
	id: number;
	name: string;
}

export interface SupplierKPISummary {
	name: string;
	value: number;
}

export interface SupplierKPISummaryParams {
	suppliers?: number[];
	opened_at_range_after?: string;
	opened_at_range_before?: string;
	has_cases?: boolean;
	industry?: string;
}

export interface SupplierKPIParams {
	suppliers?: number[];
	opened_at_range_after?: string;
	opened_at_range_before?: string;
	has_cases?: boolean;
	kpi__kpi_category?: string;
	kpi__kpi_category__in?: string;
	show_closed?: boolean;
	ordering?: string;
	industry?: string;
}

export interface SupplierKPIResponse {
	results: SupplierKPI[];
	count: number;
}

export interface SupplierKPIOpenClosedSummary {
	category: string;
	Open: number;
	Closed: number;
}

export const useSupplierKPIs = (params?: SupplierKPIParams) =>
	useQuery({
		queryKey: ["supplierKPIs", params],
		// An empty `suppliers` array is a real "no suppliers match" result, not a
		// not-ready-yet signal — queryFn sends the `0` sentinel for it so the API
		// returns nothing. Callers that aren't ready omit `suppliers` entirely.
		enabled: !!params,
		placeholderData: keepPreviousData,
		queryFn: async () => {
			const baseUrl = getBaseUrl();
			const searchParams = new URLSearchParams();

			if (params?.suppliers) {
				searchParams.append(
					"suppliers",
					params.suppliers.length > 0 ? params.suppliers.join(",") : "0",
				);
			}
			if (params?.opened_at_range_after) {
				searchParams.append(
					"opened_at_range_after",
					params.opened_at_range_after,
				);
			}
			if (params?.opened_at_range_before) {
				searchParams.append(
					"opened_at_range_before",
					params.opened_at_range_before,
				);
			}
			if (params?.has_cases !== undefined) {
				searchParams.append("has_cases", params.has_cases.toString());
			}
			if (params?.kpi__kpi_category) {
				searchParams.append("kpi__kpi_category", params.kpi__kpi_category);
			}
			if (params?.kpi__kpi_category__in) {
				searchParams.append(
					"kpi__kpi_category__in",
					params.kpi__kpi_category__in,
				);
			}
			if (params?.show_closed !== undefined) {
				searchParams.append("show_closed", params.show_closed.toString());
			}
			if (params?.ordering) {
				searchParams.append("ordering", params.ordering);
			}
			if (params?.industry) {
				searchParams.append("industry", params.industry);
			}

			const queryString = searchParams.toString();
			// Use /supplierkpis for staging CMS, /legacy-labor/supplierkpis for regular API
			const endpoint = isOrgTestUser()
				? "/supplierkpis"
				: "/legacy-labor/supplierkpis";
			const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

			const { data } = await api.get(url);

			return {
				results: data.results as SupplierKPI[],
				count: data.count as number,
			} as SupplierKPIResponse;
		},
		// Always revalidate on mount, matching every other query in this file.
		// Caching the results made the page serve rows fetched before a backend
		// change with no network request at all, so a stale payload (e.g. one
		// missing kpi_catalogue_id) kept rendering after the fix shipped.
		// placeholderData: keepPreviousData still avoids a flicker on refetch.
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: false,
	});

export const useStrategicPartners = () =>
	useQuery({
		queryKey: ["strategicPartners"],
		queryFn: async () => {
			const { data } = await api.get(
				`${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/strategic-partners`,
			);
			return data as StrategicPartner[];
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export const useRecruiters = () =>
	useQuery({
		queryKey: ["recruiters"],
		queryFn: async () => {
			const { data } = await api.get(`${API_URL}/recruiters/`);
			return data.results;
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export const useSupplyChains = (
	params?: { partnerId?: number },
	options?: { enabled?: boolean },
) =>
	useQuery({
		enabled: options?.enabled ?? true,
		queryKey: ["supplyChains", params],
		queryFn: async () => {
			const baseUrl = getBaseUrl();
			const searchParams = new URLSearchParams();
			if (params?.partnerId) {
				searchParams.append("partnerId", params.partnerId.toString());
			}

			// Use /supplychains for staging CMS, /legacy-labor/supplychains for regular API
			const endpoint = isOrgTestUser()
				? "/supplychains/?client_version=3.0"
				: "/legacy-labor/supplychains";

			const queryString = searchParams.toString();
			const url = `${baseUrl}${endpoint}${queryString ? (endpoint.includes("?") ? `&${queryString}` : `?${queryString}`) : ""}`;

			const { data } = await api.get(url);
			// Staging CMS returns array directly, regular API wraps in results
			return Array.isArray(data) ? data : data.results;
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export const useSupplierKPISummary = (params?: SupplierKPISummaryParams) =>
	useQuery({
		queryKey: ["supplierKPISummary", params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();

			if (params?.suppliers) {
				searchParams.append(
					"suppliers",
					params.suppliers.length > 0 ? params.suppliers.join(",") : "0",
				);
			}
			if (params?.opened_at_range_after) {
				searchParams.append(
					"opened_at_range_after",
					params.opened_at_range_after,
				);
			}

			if (params?.opened_at_range_before) {
				searchParams.append(
					"opened_at_range_before",
					params.opened_at_range_before,
				);
			}

			if (params?.has_cases !== undefined) {
				searchParams.append("has_cases", params.has_cases.toString());
			}
			if (params?.industry) {
				searchParams.append("industry", params.industry);
			}

			const queryString = searchParams.toString();
			const url = `${import.meta.env.VITE_APP_API_URL}/supplierkpis/summary/${queryString ? `?${queryString}` : ""}`;

			const { data } = await api.get(url);
			return data as SupplierKPISummary[];
		},
		enabled: !!params, // Only run query if params are provided
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export const useSupplierKPIOpenClosedSummary = (
	params?: SupplierKPISummaryParams,
) =>
	useQuery({
		queryKey: ["supplierKPIOpenClosedSummary", params],
		queryFn: async () => {
			const baseUrl = getBaseUrl();
			const searchParams = new URLSearchParams();

			if (params?.suppliers) {
				searchParams.append(
					"suppliers",
					params.suppliers.length > 0 ? params.suppliers.join(",") : "0",
				);
			}
			if (params?.opened_at_range_after) {
				searchParams.append(
					"opened_at_range_after",
					params.opened_at_range_after,
				);
			}
			if (params?.opened_at_range_before) {
				searchParams.append(
					"opened_at_range_before",
					params.opened_at_range_before,
				);
			}
			if (params?.has_cases !== undefined) {
				searchParams.append("has_cases", params.has_cases.toString());
			}
			if (params?.industry) {
				searchParams.append("industry", params.industry);
			}

			const queryString = searchParams.toString();
			// Use /supplierkpis/open-closed-summary for staging CMS, /legacy-labor/supplierkpis/open-closed-summary for regular API
			const endpoint = isOrgTestUser()
				? "/supplierkpis/open-closed-summary"
				: "/legacy-labor/supplierkpis/open-closed-summary";
			const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;

			const { data } = await api.get(url);

			// Handle cases where Cascade returns the array directly
			const arrData = Array.isArray(data) ? data : data.results || [];
			return arrData as {
				closed_cases: number;
				open_cases: number;
				name: string;
			}[];
		},
		enabled: !!params, // Only run query if params are provided
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export const useSupplierKPICategoryList = () =>
	useQuery({
		queryKey: ["kpiCategories"],
		queryFn: async () => {
			const { data } = await api.get(`${API_URL}/kpicategories/`);
			return data.results as SupplierKPI[];
		},
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

export interface KpiMonthlyLevelEntry {
	month: string;
	level1: number;
	level2: number;
	level3: number;
	level4: number;
	suppliers: {
		supplier_id: number;
		supplier_name: string;
		level: string;
		count: number;
	}[];
}

export const useKpiMonthlyCountsByLevel = (
	params?: {
		suppliers?: number[];
		opened_at_range_after?: string;
		opened_at_range_before?: string;
		country?: string;
		industry?: string;
	},
	options?: { enabled?: boolean },
) =>
	useQuery({
		queryKey: ["kpiMonthlyCountsByLevel", params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params?.suppliers && params.suppliers.length > 0) {
				searchParams.append("suppliers", params.suppliers.join(","));
			}
			if (params?.opened_at_range_after) {
				searchParams.append(
					"opened_at_range_after",
					params.opened_at_range_after,
				);
			}
			if (params?.opened_at_range_before) {
				searchParams.append(
					"opened_at_range_before",
					params.opened_at_range_before,
				);
			}
			if (params?.country) {
				searchParams.append("country", params.country);
			}
			if (params?.industry) {
				searchParams.append("industry", params.industry);
			}
			const endpoint = isOrgTestUser()
				? "/supplierkpis/monthly-counts"
				: "/legacy-labor/supplierkpis/monthly-counts";
			const baseUrl = getBaseUrl();
			const queryString = searchParams.toString();
			const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;
			const { data } = await api.get(url);
			return (
				Array.isArray(data) ? data : data.results || []
			) as KpiMonthlyLevelEntry[];
		},
		enabled:
			options?.enabled !== undefined
				? options.enabled
				: !!(params?.suppliers && params.suppliers.length > 0),
		staleTime: 0,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});
