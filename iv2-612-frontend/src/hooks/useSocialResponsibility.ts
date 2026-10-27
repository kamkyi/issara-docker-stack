import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";

const API_BASE_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/social-responsibility`;

// Types
export interface CaseByCategory {
	category: string;
	open_cases: number;
	closed_cases: number;
}

export interface RemediationQuality {
	poor: number;
	fair: number;
	good: number;
	very_good: number;
	excellent: number;
}

export interface Demographics {
	gender: DemographicsData[];
	ethnicity: DemographicsData[];
	nationality: DemographicsData[];
}

interface DemographicsData {
	name: string;
	value: number;
}

interface ClosureTimeMonthly {
	month: string;
	closed_cases: number;
	avg_closure_time: number;
}

interface ClosureTime {
	monthly: ClosureTimeMonthly[];
}

interface MainStats {
	worker_count: number;
	case_count: number;
	response_count: number;
}

interface CaseByIssueCategory {
	category: string;
	count: number;
}

export interface CaseOverview {
	id: number;
	name: string;
	openCases: number;
	closedCases: number;
	affectedWorkers: number;
}

export interface ViolationRemediationQuality {
	poor: number;
	fair: number;
	good: number;
	excellent: number;
}

export interface TopViolation {
	name: string;
	count: number;
	remediation_quality: ViolationRemediationQuality;
}

export interface DetailedKpiUpdate {
	id: number;
	overview_date: string;
	closed_quality: string;
	affected_workers: number;
	remediation_paid_baht: number;
	remediation_paid_kyat: number;
	remediation_paid_ringitt: number;
	remediation_paid_usd: number;
	supplier_kpi_id: number;
	closed_at: string;
	closed_Month_Year: string;
	opened_at: string;
	opened_Month_Year: string;
	closed_notes: string;
	status_id: number;
	closure_date: string;
	kpi_id: number;
	kpi_category_id: number;
	level: string;
	description: string;
	remediation_notes: string;
	remediation_action: string;
	remediation_validation: string;
	remediation_results: string;
	kpi_category_name: string;
	kpi_grouping_name: string;
	industry_names: string;
	supplier_id: number;
	supplier_name: string;
	days_to_close: string;
}

export interface SocialResponsibilityFilters {
	country?: string;
	industry?: string;
	subIndustry?: string;
	category?: string;
	year?: string;
	startDate?: string | null; // ISO YYYY-MM-DD
	endDate?: string | null; // ISO YYYY-MM-DD
	closedQuality?: string | null;
	// supplierId may be a single id, a CSV string, or an array of ids
	supplierId?: string | string[] | number[] | null;
	partnerId?: string | number | null;
}

const normalizeFilterValue = (value?: string) => {
	if (!value) return undefined;
	const normalized = value.trim();
	if (!normalized || normalized.toLowerCase().startsWith("all ")) {
		return undefined;
	}
	return normalized;
};

const buildLaborFilterParams = (filters?: SocialResponsibilityFilters) => {
	const country = normalizeFilterValue(filters?.country);
	const industry = normalizeFilterValue(filters?.industry);
	const subIndustry = normalizeFilterValue(filters?.subIndustry);
	const category = normalizeFilterValue(filters?.category);
	const year = normalizeFilterValue(filters?.year);

	return {
		...(country ? { country: country } : {}),
		...(industry ? { industry: industry } : {}),
		...(subIndustry ? { sub_industry: subIndustry } : {}),
		...(category ? { category } : {}),
		...(year ? { year } : {}),
		...(filters?.startDate ? { start_date: filters.startDate } : {}),
		...(filters?.endDate ? { end_date: filters.endDate } : {}),
		...(filters?.closedQuality
			? { closed_quality: filters.closedQuality }
			: {}),
		...(filters && filters.supplierId != null
			? {
					supplier_id: `${Array.isArray(filters.supplierId) ? filters.supplierId.join(",") : String(filters.supplierId)},`,
				}
			: {}),
		...(filters && filters.partnerId != null
			? { partner_id: filters.partnerId }
			: {}),
	};
};

// Hook for Cases by Category
export const useCasesByCategory = (filters?: SocialResponsibilityFilters) =>
	useQuery({
		queryKey: [
			filters?.industry,
			filters?.category,
			filters?.year,
			filters?.supplierId,
		],
		queryFn: async () => {
			const params = buildLaborFilterParams(filters);
			const response = await api.get<{
				data: CaseByCategory[];
				status: string;
			}>(`${API_BASE_URL}/labor/cases-by-category`, { params });
			return response.data;
		},
	});

// Hook for Remediation Quality
export const useRemediationQuality = () =>
	useQuery({
		queryKey: ["remediationQuality"],
		queryFn: async () => {
			const response = await api.get<{
				data: RemediationQuality;
				status: string;
			}>(`${API_BASE_URL}/labor/remediation-quality`);
			return response.data;
		},
	});

// Hook for Demographics
export const useDemographics = () =>
	useQuery({
		queryKey: ["demographics"],
		queryFn: async () => {
			const response = await api.get<{ data: Demographics; status: string }>(
				`${API_BASE_URL}/labor/demographics`,
			);
			return response.data;
		},
	});

// Hook for Closure Time
export const useClosureTime = () =>
	useQuery({
		queryKey: ["closure-time"],
		queryFn: async () => {
			const response = await api.get<{ data: ClosureTime; status: string }>(
				`${API_BASE_URL}/labor/closure-time`,
			);
			return response.data;
		},
	});

// Hook for Closure Time
export const useMainStats = () =>
	useQuery({
		queryKey: ["main-stats"],
		queryFn: async () => {
			const response = await api.get<{ data: MainStats; status: string }>(
				`${API_BASE_URL}/labor/main-stats`,
			);
			return response.data;
		},
	});

// Hook for Cases by Issue Category
export const useCasesByIssueCategory = (
	filters?: SocialResponsibilityFilters,
) =>
	useQuery({
		queryKey: [
			"cases-by-issue-category",
			filters?.country,
			filters?.industry,
			filters?.category,
			filters?.year,
			filters?.supplierId,
		],
		queryFn: async () => {
			const params = buildLaborFilterParams(filters);
			const response = await api.get<{
				data: CaseByIssueCategory[];
				status: string;
			}>(`${API_BASE_URL}/labor/cases-by-issue-category`, { params });
			return response.data;
		},
	});

export interface RecruitmentMetrics {
	recruitment_related_fees_detected_and_intercepted: number;
	remediation_for_recruitment_fees_and_cases: number;
	workers_connected?: number;
	calls_and_messages?: number;
	workers_receiving_remediation?: number;
}

// Hook for Recruitment Metrics
export const useRecruitmentMetrics = (filters?: {
	from?: string;
	to?: string;
}) =>
	useQuery({
		queryKey: ["recruitment-metrics", filters?.from, filters?.to],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filters?.from) params.append("from", filters.from);
			if (filters?.to) params.append("to", filters.to);
			const queryString = params.toString();
			const response = await api.get<{
				data: RecruitmentMetrics;
				status: string;
			}>(
				`${API_BASE_URL}/labor/recruitment-metrics${
					queryString ? `?${queryString}` : ""
				}`,
			);
			return response.data;
		},
	});
// Hook for Cases by Issue Category KPI Update Overview
export const useCaseOverviewByKPICategory = () =>
	useQuery({
		queryKey: ["supplier-kpi-update-overview"],
		queryFn: async () => {
			const response = await api.get<{
				data: { kpi_categories: CaseOverview[]; total_reported_issue: number };
				status: string;
			}>(`${API_BASE_URL}/labor/supplier-kpi-update-overview`);
			return response.data;
		},
	});

export const useTopViolations = (filters?: SocialResponsibilityFilters) =>
	useQuery({
		queryKey: [
			"top-violations",
			filters?.country,
			filters?.industry,
			filters?.category,
			filters?.year,
			filters?.supplierId,
		],
		queryFn: async () => {
			const params = buildLaborFilterParams(filters);
			const response = await api.get<{
				data: { violations: TopViolation[] };
				status: string;
			}>(`${API_BASE_URL}/labor/top-violations`, { params });
			return response.data;
		},
	});

export const useDetailedKpiUpdates = (
	filters?: SocialResponsibilityFilters,
) => {
	const lang = useActiveLanguage();

	return useQuery({
		queryKey: [
			"detailed-kpi-updates",
			filters?.country,
			filters?.industry,
			filters?.subIndustry,
			filters?.category,
			filters?.year,
			filters?.startDate,
			filters?.endDate,
			filters?.closedQuality,
			// include supplierId and partnerId in cache key so queries are distinct per selection
			filters?.supplierId,
			filters?.partnerId,
			lang,
		],
		queryFn: async () => {
			const params = { ...buildLaborFilterParams(filters), lang };
			const response = await api.get<{
				data: DetailedKpiUpdate[];
				status: string;
			}>(`${API_BASE_URL}/labor/detailed-kpi-updates`, { params });
			return response.data;
		},
	});
};
