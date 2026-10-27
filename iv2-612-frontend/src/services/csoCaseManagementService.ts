/** Facelift CSO Case Management uses only the scoped Django adapter. */
import { api } from "$src/api/axios";
import type { WorkerVoiceCaseRecord } from "$src/services/workerVoiceCaseService";

export interface OrganizationOption {
	id: number;
	name: string;
}

export interface CaseManagementContext {
	actual_role: "cso" | "management";
	effective_organization: OrganizationOption | null;
	selection_required: boolean;
	can_select_organization: boolean;
	statuses: OrganizationOption[];
}

export interface CsoKpi {
	id: number;
	supplier: number;
	supplier_name: string;
	kpi: number;
	category: string;
	description: string;
	level: number;
	status: number | null;
	status_name: string;
	opened_at: string | null;
	closed_at: string | null;
	closure_date: string | null;
	closed_quality: string | null;
	affected_workers: number | null;
	days_open: number | string;
	open: boolean;
	retaliation: boolean | null;
	retaliation_cso: boolean | null;
	hide: boolean;
	closed_notes: string | null;
	remediation_issara_recommendation: string | null;
	remediation_progress: string | null;
	remediation_aligned: string | null;
	remediation_business_steps_taken: string | null;
	remediation_business_steps_remaining: string | null;
	remediation_payment_deadline: string | null;
	remediation_owed_baht: number;
	remediation_owed_kyat: number;
	remediation_owed_ringitt: number;
	remediation_owed_usd: number;
	remediation_paid_baht: number;
	remediation_paid_kyat: number;
	remediation_paid_ringitt: number;
	remediation_paid_usd: number;
	remediation_workers_paid: number;
	remediation_documents_owed: number;
	remediation_documents_provided: number;
	remediation_documents_deadline: string | null;
	systems_change_issara_recommendation: string | null;
	systems_change_progress: string | null;
	systems_change_aligned: string | null;
	systems_change_business_steps_taken: string | null;
	systems_change_business_steps_remaining: string | null;
	systems_change_deadline: string | null;
	next_description: string | null;
	deadline: string | null;
	issue_escalated_to_buyer: boolean;
	can_edit: boolean;
}

export interface CsoCaseCall {
	id: number;
	created: string | null;
	interacted: string | null;
	client_nickname: string | null;
	client_phonenumber: string | null;
	interaction_summary: string | null;
	description: string | null;
	referral_notes: string | null;
	next_steps: string | null;
}

export interface CsoKpiDetail extends CsoKpi {
	calls: CsoCaseCall[];
	can_edit: boolean;
}

export interface CsoKpiHistory
	extends Omit<
		CsoKpi,
		"id" | "kpi" | "days_open" | "open" | "hide" | "can_edit"
	> {
	id: number;
	supplier_kpi: number;
	cycle_update_count?: number;
}

export interface KpiPage<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface CsoKpiFilters {
	selectedOrganizationId?: number | null;
	page?: number;
	pageSize?: number;
	/** Legacy sends `-opened_at` by default, and `-closed_at` once closed rows show. */
	ordering?: string;
	search?: string;
	showClosed?: boolean;
	suppliers?: string;
	openedAfter?: string;
	openedBefore?: string;
	daysOpenMin?: string;
	daysOpenMax?: string;
	supplyChain?: boolean;
	nonSupplyChain?: boolean;
	/**
	 * Per-column search boxes, already keyed by the backend filter name the
	 * table uses -- `supplier__name` on the KPI table,
	 * `supplier_kpi__supplier__name` on the cycles table.
	 */
	columnFilters?: Record<string, string>;
}

const buildUrl = (path: string): string => {
	const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	if (!base) throw new Error("VITE_API_BASE_URL is not configured");
	return `${base}/cascade/cso-case-management/${path}`;
};

const scopeParams = (selectedOrganizationId?: number | null) =>
	selectedOrganizationId
		? { selected_organization_id: selectedOrganizationId }
		: {};

/** Blank column boxes are dropped, so an empty filter never narrows the queue. */
const columnParams = (columnFilters?: Record<string, string>) =>
	Object.fromEntries(
		Object.entries(columnFilters ?? {})
			.map(([key, value]) => [key, value.trim()] as const)
			.filter(([, value]) => value !== ""),
	);

const listParams = (filters: CsoKpiFilters) => ({
	...scopeParams(filters.selectedOrganizationId),
	page: filters.page ?? 1,
	page_size: filters.pageSize ?? 10,
	...(filters.ordering ? { ordering: filters.ordering } : {}),
	...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
	show_closed: filters.showClosed ?? false,
	...(filters.suppliers ? { suppliers: filters.suppliers } : {}),
	...(filters.openedAfter
		? { opened_at_range_after: filters.openedAfter }
		: {}),
	...(filters.openedBefore
		? { opened_at_range_before: filters.openedBefore }
		: {}),
	...(filters.daysOpenMin ? { days_open__min: filters.daysOpenMin } : {}),
	...(filters.daysOpenMax ? { days_open__max: filters.daysOpenMax } : {}),
	// Legacy only narrows when a box is ticked: `supply_chain=false` is a no-op
	// server-side (kpis/filters.py), so sending it would be misleading.
	...(filters.supplyChain ? { supply_chain: true } : {}),
	...(filters.nonSupplyChain ? { non_supply_chain: true } : {}),
	...columnParams(filters.columnFilters),
});

export const fetchCaseManagementContext = async (
	selectedOrganizationId?: number | null,
): Promise<CaseManagementContext> => {
	const { data } = await api.get<CaseManagementContext>(buildUrl("context/"), {
		params: scopeParams(selectedOrganizationId),
	});
	return data;
};

export const fetchCsoOrganizations = async (): Promise<
	OrganizationOption[]
> => {
	const { data } = await api.get<OrganizationOption[]>(
		buildUrl("organizations/"),
	);
	return data;
};

export const fetchCsoKpis = async (
	filters: CsoKpiFilters,
): Promise<KpiPage<CsoKpi>> => {
	const { data } = await api.get<KpiPage<CsoKpi>>(buildUrl("kpis/"), {
		params: listParams(filters),
	});
	return data;
};

export const fetchCsoKpiCycles = async (
	filters: CsoKpiFilters,
): Promise<KpiPage<CsoKpiHistory>> => {
	const { data } = await api.get<KpiPage<CsoKpiHistory>>(buildUrl("cycles/"), {
		params: listParams(filters),
	});
	return data;
};

export const fetchCsoKpiDetail = async (
	id: number,
	selectedOrganizationId?: number | null,
): Promise<CsoKpiDetail> => {
	const { data } = await api.get<CsoKpiDetail>(buildUrl(`kpis/${id}/`), {
		params: scopeParams(selectedOrganizationId),
	});
	return data;
};

export const fetchCsoKpiHistory = async (
	id: number,
	selectedOrganizationId?: number | null,
): Promise<CsoKpiHistory[]> => {
	const { data } = await api.get<CsoKpiHistory[]>(
		buildUrl(`kpis/${id}/updates/`),
		{ params: scopeParams(selectedOrganizationId) },
	);
	return data;
};

export const fetchCsoCaseCall = async (
	kpiId: number,
	callId: number,
	selectedOrganizationId?: number | null,
): Promise<WorkerVoiceCaseRecord> => {
	const { data } = await api.get<WorkerVoiceCaseRecord>(
		buildUrl(`kpis/${kpiId}/calls/${callId}/`),
		{ params: scopeParams(selectedOrganizationId) },
	);
	return data;
};

export type CsoKpiPatch = Partial<
	Pick<
		CsoKpi,
		| "status"
		| "opened_at"
		| "closed_at"
		| "closed_quality"
		| "closed_notes"
		| "affected_workers"
		| "retaliation"
		| "retaliation_cso"
		| "hide"
		| "remediation_issara_recommendation"
		| "remediation_progress"
		| "remediation_aligned"
		| "remediation_business_steps_taken"
		| "remediation_business_steps_remaining"
		| "remediation_payment_deadline"
		| "remediation_owed_baht"
		| "remediation_owed_kyat"
		| "remediation_owed_ringitt"
		| "remediation_owed_usd"
		| "remediation_paid_baht"
		| "remediation_paid_kyat"
		| "remediation_paid_ringitt"
		| "remediation_paid_usd"
		| "remediation_workers_paid"
		| "remediation_documents_owed"
		| "remediation_documents_provided"
		| "remediation_documents_deadline"
		| "systems_change_issara_recommendation"
		| "systems_change_progress"
		| "systems_change_aligned"
		| "systems_change_business_steps_taken"
		| "systems_change_business_steps_remaining"
		| "systems_change_deadline"
		| "next_description"
		| "deadline"
		| "issue_escalated_to_buyer"
	>
>;

export const patchCsoKpi = async (
	id: number,
	payload: CsoKpiPatch,
): Promise<CsoKpi> => {
	const { data } = await api.patch<CsoKpi>(buildUrl(`kpis/${id}/`), payload);
	return data;
};
