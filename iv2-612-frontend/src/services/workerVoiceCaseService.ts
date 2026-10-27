/**
 * Worker Voice call logging for CSO partners (IV2-582).
 *
 * A logged call is a row in the ILM `cases` table, so worker voice from partner
 * organizations lands alongside Issara's own casework. The backend derives
 * ownership from the authenticated user's organization, so no organization or
 * creator id is ever sent from here.
 *
 * Backed by Django `/cascade/worker-voice-calls/`.
 */
import { api } from "$src/api/axios";

export type YesNo = "Yes" | "No";
export type FirstContactAnswer = YesNo | "Cannot remember";
export type SituationImproving = YesNo | "About the same";
/**
 * Every value `cases.worker_identification_risk_level` can hold.
 *
 * The Low/Medium/High scale belongs to ILM-fronted's risk bar and to the rows
 * saved before this form existed; the two named risks are what this form asks
 * for. A record can arrive carrying any of them, so all five are modelled here
 * and step 5 offers only the subset it collects.
 */
export type RiskLevel =
	| "LOW"
	| "MEDIUM"
	| "HIGH"
	| "EARLY_WARNING"
	| "FORCED_LABOR";

export interface WorkerVoiceAttachment {
	id: number;
	name: string;
	type: string;
	size: string;
	file_path: string | null;
	created_at: string | null;
}

/** Mirrors the writable fields of the Django serializer, step by step. */
export interface WorkerVoiceCasePayload {
	// Step 1 -- Key data
	client_nationality: number | null;
	interaction_reason: number | null;
	interaction_issara_staff: number | null;
	interaction_channel: number | null;
	first_time_contacting_issara: FirstContactAnswer | null;
	client_type: number | null;
	interacted: string | null;
	interaction_summary: string;
	/** `cases.supplier` -- the workplace the call is about. */
	supplier: number | null;
	/** That workplace's location, seeded from the supplier record. */
	country: number | null;
	province: number | null;
	district: number | null;
	// Step 2 -- Worker info
	description: string;
	client_nickname: string;
	client_gender: number | null;
	client_phonenumber: string;
	client_whatsapp_account: string;
	client_viber_account: string;
	client_telegram_account: string;
	client_facebook_account: string;
	client_line_account: string;
	client_zalo_account: string;
	client_other_account: string;
	client_origin_country: number | null;
	client_origin_province: number | null;
	client_origin_district: number | null;
	client_crossing_country: number | null;
	client_crossing_province: number | null;
	client_crossing_district: number | null;
	// Step 3 -- Recruitment info
	client_time_at_job: number | null;
	debt_bondage: YesNo | null;
	debt_bondage_detail: string;
	debt_bondage_broker: YesNo | null;
	debt_bondage_detail_broker: string;
	client_contract_type: number | null;
	client_document_type: number | null;
	// Step 4 -- Issue details
	issue_description: string;
	issue_workers_affected: number | null;
	issue_getting_better: SituationImproving | null;
	issue_getting_better_description: string;
	kpis: number[];
	// Step 5 -- Support and actions
	vot_needs: string;
	client_share_info_consent: YesNo | null;
	consent_to_discuss_with_employer_anonymously: boolean | null;
	worker_identification_risk_level: RiskLevel | null;
	case_status: number | null;
	referral_action: number | null;
	/** The partner organization a referral was handed to, when one was. */
	refer_to_org: number | null;
	next_steps: string;
	next_steps_issara_staff: number | null;
	dead_line_date: string | null;
	final_remarks: string;
	safeguards_remarks: string;
}

/** One KPI as step 4 presents it, resolved server-side for the detail view. */
export interface WorkerVoiceKpiDetail {
	id: number;
	description: string;
	category: string | null;
}

/**
 * Display labels the API resolves for every lookup the form selects from.
 * Reading them back client-side would mean a request per lookup table, and the
 * geography ones are parameterized by their parent, so the API answers them.
 */
export interface WorkerVoiceCaseLabels {
	client_nationality_name: string | null;
	interaction_reason_name: string | null;
	interaction_channel_name: string | null;
	client_type_name: string | null;
	client_gender_name: string | null;
	supplier_name: string | null;
	country_name: string | null;
	province_name: string | null;
	district_name: string | null;
	client_origin_country_name: string | null;
	client_origin_province_name: string | null;
	client_origin_district_name: string | null;
	client_crossing_country_name: string | null;
	client_crossing_province_name: string | null;
	client_crossing_district_name: string | null;
	client_contract_type_name: string | null;
	client_document_type_name: string | null;
	case_status_name: string | null;
	referral_action_name: string | null;
	refer_to_org_name: string | null;
	interaction_issara_staff_name: string | null;
	next_steps_issara_staff_name: string | null;
	kpi_details: WorkerVoiceKpiDetail[];
}

export interface WorkerVoiceCaseRecord
	extends WorkerVoiceCasePayload,
		WorkerVoiceCaseLabels {
	id: number;
	created: string | null;
	last_modified: string | null;
	case_created_by: number | null;
	/** The organization that logged the call, which is not always the reader's. */
	organization_name: string | null;
	/**
	 * True when the reader's organization holds this call as a referral rather
	 * than having logged it: readable, but not theirs to edit or delete.
	 */
	shared_with_my_organization: boolean;
	attachments: WorkerVoiceAttachment[];
}

/**
 * A row of the "View Worker Voice" table. The list endpoint answers with
 * labels and only the columns the table draws, not the whole case -- the
 * contact details a call carries are the form's business, not the table's.
 */
export interface WorkerVoiceCaseListRow {
	id: number;
	created: string | null;
	interacted: string | null;
	client_nickname: string | null;
	client_nationality_name: string | null;
	interaction_reason_name: string | null;
	interaction_channel_name: string | null;
	client_type_name: string | null;
	case_status_name: string | null;
	/** The supplier the call is about, when the case names one. */
	supplier_name: string | null;
	client_phonenumber: string | null;
	worker_identification_risk_level: RiskLevel | null;
	/**
	 * Levels of the KPIs picked on step 4. The table reads them into the
	 * "Forced labor risk level" column; the API sends the levels rather than a
	 * verdict, so the mapping stays with the rest of the KPI-level logic here.
	 */
	kpi_levels: number[];
	/**
	 * Descriptions of those same KPIs, in the language the request asked for,
	 * falling back to the English text. This is what the "Issue Description"
	 * column draws -- the same thing ILM shows under "Kpi".
	 */
	kpi_descriptions: string[];
	interaction_summary: string | null;
	issue_description: string | null;
	attachment_count: number;
	/** The organization that logged the call. */
	owner_organization_name: string | null;
	/**
	 * Email of the account that entered the call, for the "Staff" column. Null
	 * on a referred-in row -- the API withholds it there, so the column shows
	 * the organization that sent the call and not an officer of it.
	 */
	staff_email: string | null;
	/** True for a call another organization referred to the reader's. */
	shared_with_my_organization: boolean;
}

export interface WorkerVoiceCaseListResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: WorkerVoiceCaseListRow[];
}

/**
 * The per-column search boxes in the table header, keyed by column. The keys
 * are the column keys themselves -- the endpoint names its filters after the
 * columns rather than after the `cases` fields they read.
 */
export type WorkerVoiceCaseColumnFilters = Partial<
	Record<
		| "id"
		| "date"
		| "worker"
		| "nationality"
		| "supplier"
		| "phone"
		| "kpi"
		| "staff"
		| "kpi_risk",
		string
	>
>;

/**
 * Which half of the caseload to draw. Omitted means both, which is the default
 * tab: a referral another organization sent is part of an officer's caseload.
 */
export type WorkerVoiceCaseScope = "all" | "own" | "shared";

export interface WorkerVoiceCaseListParams {
	limit?: number;
	offset?: number;
	/** Free-text term matched server-side across the table's columns and the id. */
	search?: string;
	/** Column boxes, which narrow the free-text term rather than replace it. */
	filters?: WorkerVoiceCaseColumnFilters;
	/** The "All / Logged by us / Referred to us" tabs. */
	scope?: WorkerVoiceCaseScope;
	/**
	 * The reader's language, for the KPI descriptions the table draws. The
	 * server maps the facelift's locale codes onto ILM's (`my` -> `mm`,
	 * `km` -> `kh`, `vi` -> `vn`) and falls back to English per KPI.
	 */
	lang?: string;
}

const buildUrl = (path = ""): string => {
	const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	if (!baseUrl) {
		throw new Error("VITE_API_BASE_URL is not configured");
	}
	return `${baseUrl}/cascade/worker-voice-calls/${path}`;
};

/**
 * Attachments force multipart, and multipart has no null: a `null` sent as form
 * data arrives as the literal string "null". Empty values are therefore omitted
 * entirely so the backend applies its own defaults.
 */
const toFormData = (
	payload: WorkerVoiceCasePayload,
	attachments: File[],
	removedAttachmentIds: number[] = [],
): FormData => {
	const formData = new FormData();

	for (const [key, value] of Object.entries(payload)) {
		if (value === null || value === undefined || value === "") {
			continue;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				formData.append(key, String(item));
			}
			continue;
		}
		formData.append(key, String(value));
	}

	for (const file of attachments) {
		formData.append("uploaded_attachments", file);
	}

	for (const id of removedAttachmentIds) {
		formData.append("removed_attachment_ids", String(id));
	}

	return formData;
};

export const createWorkerVoiceCase = async (
	payload: WorkerVoiceCasePayload,
	attachments: File[] = [],
): Promise<WorkerVoiceCaseRecord> => {
	if (attachments.length > 0) {
		const { data } = await api.post<WorkerVoiceCaseRecord>(
			buildUrl(),
			toFormData(payload, attachments),
			{ headers: { "Content-Type": "multipart/form-data" } },
		);
		return data;
	}

	const { data } = await api.post<WorkerVoiceCaseRecord>(buildUrl(), payload);
	return data;
};

export const updateWorkerVoiceCase = async (
	id: number,
	payload: WorkerVoiceCasePayload,
	attachments: File[] = [],
	/** Saved attachments the officer removed while editing. */
	removedAttachmentIds: number[] = [],
): Promise<WorkerVoiceCaseRecord> => {
	if (attachments.length > 0) {
		const { data } = await api.patch<WorkerVoiceCaseRecord>(
			buildUrl(`${id}/`),
			toFormData(payload, attachments, removedAttachmentIds),
			{ headers: { "Content-Type": "multipart/form-data" } },
		);
		return data;
	}

	const { data } = await api.patch<WorkerVoiceCaseRecord>(buildUrl(`${id}/`), {
		...payload,
		...(removedAttachmentIds.length > 0
			? { removed_attachment_ids: removedAttachmentIds }
			: {}),
	});
	return data;
};

export const fetchWorkerVoiceCase = async (
	id: number,
): Promise<WorkerVoiceCaseRecord> => {
	const { data } = await api.get<WorkerVoiceCaseRecord>(buildUrl(`${id}/`));
	return data;
};

/**
 * One page of the organization's logged calls. Paging and searching are both
 * server-side, so `count` covers the whole matching set rather than the page.
 */
/** The boxes the officer actually filled in, trimmed. */
const activeFilters = (
	filters: WorkerVoiceCaseColumnFilters,
): Record<string, string> =>
	Object.fromEntries(
		Object.entries(filters)
			.map(([column, value]) => [column, (value ?? "").trim()])
			.filter(([, value]) => value !== ""),
	);

export const fetchWorkerVoiceCases = async ({
	limit = 25,
	offset = 0,
	search = "",
	filters = {},
	scope = "all",
	lang = "",
}: WorkerVoiceCaseListParams = {}): Promise<WorkerVoiceCaseListResponse> => {
	const trimmed = search.trim();
	const { data } = await api.get<WorkerVoiceCaseListResponse>(buildUrl(), {
		// An empty `search` would still be sent as `search=`, which is harmless
		// but makes every request URL look filtered; omit it instead. The same
		// goes for a column box the officer has not typed in, and for the
		// default scope, which the endpoint already answers with.
		params: {
			limit,
			offset,
			...(trimmed ? { search: trimmed } : {}),
			...activeFilters(filters),
			...(scope === "all" ? {} : { scope }),
			// English is what the endpoint answers with anyway.
			...(lang && lang !== "en" ? { lang } : {}),
		},
	});
	return data;
};

/** Permanently removes a call the caller's organization logged. */
export const deleteWorkerVoiceCase = async (id: number): Promise<void> => {
	await api.delete(buildUrl(`${id}/`));
};
