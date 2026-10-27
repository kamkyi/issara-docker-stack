import moment from "moment";
import { api } from "$src/api/axios";
import workerFeedbackMockData from "$src/assets/mock/worker-feedback.json";
import { useMockData } from "$src/utils/config";

const SUPPLIER_WORKER_FEEDBACK_PATH = "/supplier/worker-feedback/";

export interface WorkerFeedbackUser {
	id: number;
	username?: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	full_name?: string;
}

export interface WorkerFeedbackAttachment {
	id: number;
	name: string;
	type: string;
	file_path: string;
	size: string;
}

export interface WorkerFeedbackRecord {
	id: number;
	nationality: number | null;
	contact_reason?: number | null;
	case_call_type: number | null;
	supplier: number | null;
	hr_staff?: WorkerFeedbackUser | null;
	hr_staff_id?: number | null;
	worker_voice_channel: number | null;
	interaction_date: string | null;
	summary: string;
	client_name: string;
	employee_id: string;
	phone_number: string;
	line_id: string;
	whatsapp: string;
	zalo: string;
	gender: number | string | null;
	employee_department: string;
	feedback_description: string;
	workers_affected: number | null;
	workers_affected_description: string;
	situation_improving: string;
	situation_improving_description: string;
	issue_categories: number[];
	kpi_categories: number[];
	selected_kpis: number[];
	case_status: number | null;
	next_steps: string;
	urgent_needs_of_employee: string;
	deadline: string | null;
	final_remarks: string;
	safeguards_remarks: string;
	next_steps_for_company_staff: WorkerFeedbackUser[];
	created_at: string;
	updated_at: string;
	additional_attachments?: WorkerFeedbackAttachment[];
	mock_issue_category_names?: string[];
	mock_issue_descriptions?: string[];
	mock_level?: string;
	mock_channel_name?: string;
	mock_contact_reason_name?: string;
	mock_nationality_name?: string;
	mock_gender_name?: string;
	mock_assigned_users?: string[];
}

export interface WorkerFeedbackListResponse {
	count?: number;
	next?: string | null;
	previous?: string | null;
	results?: WorkerFeedbackRecord[];
}

export interface CreateWorkerFeedbackPayload {
	nationality: number | null;
	case_call_type: number | null;
	supplier: number | null;
	worker_voice_channel: number | null;
	interaction_date: string;
	summary: string;
	client_name: string;
	employee_id: string;
	phone_number: string;
	line_id: string;
	whatsapp: string;
	zalo: string;
	gender: number | string | null;
	employee_department: string;
	feedback_description: string;
	workers_affected: number | null;
	workers_affected_description: string;
	situation_improving: string;
	situation_improving_description: string;
	issue_categories: number[];
	kpi_categories: number[];
	selected_kpis: number[];
	case_status: number | null;
	next_steps: string;
	urgent_needs_of_employee: string;
	deadline: string;
	final_remarks: string;
	safeguards_remarks: string;
	next_steps_for_company_staff_ids: number[];
	hr_staff_id: number | null;
	contact_reason_id: number | null;
}

export type UpdateWorkerFeedbackPayload = CreateWorkerFeedbackPayload;

const WORKER_FEEDBACK_MOCK_ROLES = new Set([
	"org-test-user",
	"org-issara-management",
	"org-issara-staff",
]);

const MOCK_WORKER_FEEDBACK_RECORDS =
	workerFeedbackMockData as WorkerFeedbackRecord[];

const getWorkerFeedbackStoredRole = () => {
	try {
		const authStorageRaw = localStorage.getItem("auth-storage");
		const authStorage = authStorageRaw ? JSON.parse(authStorageRaw) : null;
		const authStorageRole = authStorage?.state?.role;
		if (typeof authStorageRole === "string" && authStorageRole.length > 0) {
			return authStorageRole;
		}

		const authUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
		const authUserRole =
			authUser?.role_slug ||
			(Array.isArray(authUser?.groups) && authUser.groups[0]) ||
			null;

		return typeof authUserRole === "string" ? authUserRole : null;
	} catch {
		return null;
	}
};

export const isWorkerFeedbackMockEnabled = () => {
	if (useMockData()) {
		return true;
	}

	const role = getWorkerFeedbackStoredRole();
	if (typeof role === "string" && WORKER_FEEDBACK_MOCK_ROLES.has(role)) {
		return true;
	}

	return false;
};

const getMockWorkerFeedbackRecords = () =>
	MOCK_WORKER_FEEDBACK_RECORDS.map((record) => {
		let created_at = record.created_at;
		let interaction_date = record.interaction_date;
		let updated_at = record.updated_at;
		let deadline = record.deadline;

		if (record.id === 9002) {
			// exactly 30 days active
			interaction_date = moment().subtract(30, "days").format("YYYY-MM-DD");
			created_at = moment()
				.subtract(30, "days")
				.startOf("day")
				.add(12, "hours")
				.toISOString();
			updated_at = moment().subtract(21, "days").startOf("day").toISOString(); // created_at + 9 days
			deadline = moment().subtract(15, "days").format("YYYY-MM-DD"); // interaction_date + 15 days
		} else if (record.id === 9001) {
			// exactly 25 days active
			interaction_date = moment().subtract(25, "days").format("YYYY-MM-DD");
			created_at = moment()
				.subtract(25, "days")
				.startOf("day")
				.add(12, "hours")
				.toISOString();
			updated_at = moment().subtract(23, "days").startOf("day").toISOString(); // created_at + 2 days
			deadline = moment().subtract(11, "days").format("YYYY-MM-DD"); // interaction_date + 14 days
		} else if (record.id === 9003) {
			// exactly 19 days active
			interaction_date = moment().subtract(19, "days").format("YYYY-MM-DD");
			created_at = moment().subtract(19, "days").startOf("day").toISOString();
			updated_at = moment().startOf("day").toISOString(); // exactly 19.0 days difference
			deadline = moment()
				.subtract(19, "days")
				.add(20, "days")
				.format("YYYY-MM-DD"); // interaction_date + 20 days
		}

		return {
			...record,
			created_at,
			interaction_date,
			updated_at,
			deadline,
			additional_attachments: record.additional_attachments?.map(
				(attachment) => ({
					...attachment,
				}),
			),
			next_steps_for_company_staff: record.next_steps_for_company_staff.map(
				(user) => ({ ...user }),
			),
			hr_staff: record.hr_staff ? { ...record.hr_staff } : null,
		};
	});

const appendArrayValues = (
	formData: FormData,
	key: string,
	values: Array<number | string>,
) => {
	for (const value of values) {
		formData.append(key, String(value));
	}
};

const buildWorkerFeedbackRequestBody = (
	payload: CreateWorkerFeedbackPayload,
	additionalAttachments?: File[],
) => {
	if (!additionalAttachments?.length) {
		return {
			body: payload,
			headers: {
				"Content-Type": "application/json;charset=UTF-8",
				Accept: "application/json, text/plain, */*",
			},
		};
	}

	const formData = new FormData();

	formData.append("nationality", String(payload.nationality ?? ""));
	formData.append("case_call_type", String(payload.case_call_type ?? ""));
	formData.append("supplier", String(payload.supplier ?? ""));
	formData.append(
		"worker_voice_channel",
		String(payload.worker_voice_channel ?? ""),
	);
	formData.append("interaction_date", payload.interaction_date);
	formData.append("summary", payload.summary);
	formData.append("client_name", payload.client_name);
	formData.append("employee_id", payload.employee_id);
	formData.append("phone_number", payload.phone_number);
	formData.append("line_id", payload.line_id);
	formData.append("whatsapp", payload.whatsapp);
	formData.append("zalo", payload.zalo);
	formData.append("gender", String(payload.gender ?? ""));
	formData.append("employee_department", payload.employee_department);
	formData.append("feedback_description", payload.feedback_description);
	formData.append("workers_affected", String(payload.workers_affected ?? ""));
	formData.append(
		"workers_affected_description",
		payload.workers_affected_description,
	);
	formData.append("situation_improving", payload.situation_improving);
	formData.append(
		"situation_improving_description",
		payload.situation_improving_description,
	);
	appendArrayValues(formData, "issue_categories", payload.issue_categories);
	appendArrayValues(formData, "kpi_categories", payload.kpi_categories);
	appendArrayValues(formData, "selected_kpis", payload.selected_kpis);
	formData.append("case_status", String(payload.case_status ?? ""));
	formData.append("next_steps", payload.next_steps);
	formData.append("urgent_needs_of_employee", payload.urgent_needs_of_employee);
	formData.append("deadline", payload.deadline);
	formData.append("final_remarks", payload.final_remarks);
	formData.append("safeguards_remarks", payload.safeguards_remarks);
	appendArrayValues(
		formData,
		"next_steps_for_company_staff_ids",
		payload.next_steps_for_company_staff_ids,
	);
	formData.append("hr_staff_id", String(payload.hr_staff_id ?? ""));
	formData.append("contact_reason_id", String(payload.contact_reason_id ?? ""));

	for (const attachment of additionalAttachments) {
		formData.append("additional_attachments", attachment);
	}

	return {
		body: formData,
		headers: {
			Accept: "application/json, text/plain, */*",
		},
	};
};

const buildSupplierApiBaseUrl = () => {
	const appApiUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, "");
	if (appApiUrl) {
		return appApiUrl;
	}

	const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	if (!baseUrl) {
		throw new Error("API base URL is not defined");
	}

	return `${baseUrl}/api/v2`;
};

const buildSupplierWorkerFeedbackUrl = () => {
	return `${buildSupplierApiBaseUrl()}${SUPPLIER_WORKER_FEEDBACK_PATH}`;
};

const buildSupplierWorkerFeedbackDetailUrl = (workerFeedbackId: number) => {
	return `${buildSupplierWorkerFeedbackUrl()}${workerFeedbackId}/`;
};

const normalizeWorkerFeedbackList = (
	data: WorkerFeedbackListResponse | WorkerFeedbackRecord[],
) => {
	if (Array.isArray(data)) {
		return data;
	}

	return Array.isArray(data?.results) ? data.results : [];
};

export const createWorkerFeedback = async (
	payload: CreateWorkerFeedbackPayload,
	additionalAttachments?: File[],
) => {
	if (isWorkerFeedbackMockEnabled()) {
		return {
			id: Date.now(),
			...payload,
			additional_attachments:
				additionalAttachments?.map((file, index) => ({
					id: index + 1,
					name: file.name,
					type: file.type,
					file_path: file.name,
					size: String(file.size),
				})) || [],
		};
	}

	const request = buildWorkerFeedbackRequestBody(
		payload,
		additionalAttachments,
	);
	const { data } = await api.post(
		buildSupplierWorkerFeedbackUrl(),
		request.body,
		{
			headers: request.headers,
		},
	);

	return data;
};

export const updateWorkerFeedback = async (
	workerFeedbackId: number,
	payload: UpdateWorkerFeedbackPayload,
	additionalAttachments?: File[],
) => {
	if (isWorkerFeedbackMockEnabled()) {
		return {
			id: workerFeedbackId,
			...payload,
			additional_attachments:
				additionalAttachments?.map((file, index) => ({
					id: index + 1,
					name: file.name,
					type: file.type,
					file_path: file.name,
					size: String(file.size),
				})) || [],
		};
	}

	const request = buildWorkerFeedbackRequestBody(
		payload,
		additionalAttachments,
	);
	const { data } = await api.patch(
		buildSupplierWorkerFeedbackDetailUrl(workerFeedbackId),
		request.body,
		{
			headers: request.headers,
		},
	);

	return data;
};

export const fetchWorkerFeedbackById = async (workerFeedbackId: number) => {
	if (isWorkerFeedbackMockEnabled()) {
		const mockRecord = getMockWorkerFeedbackRecords().find(
			(record) => record.id === workerFeedbackId,
		);

		if (!mockRecord) {
			throw new Error("Mock worker feedback record not found");
		}

		return mockRecord;
	}

	const { data } = await api.get<WorkerFeedbackRecord>(
		buildSupplierWorkerFeedbackDetailUrl(workerFeedbackId),
		{
			headers: {
				Accept: "application/json, text/plain, */*",
			},
		},
	);

	return data;
};

export const fetchWorkerFeedbackList = async (supplierId?: number | null) => {
	if (isWorkerFeedbackMockEnabled()) {
		return getMockWorkerFeedbackRecords();
	}

	const url = new URL(buildSupplierWorkerFeedbackUrl());

	if (supplierId) {
		url.searchParams.set("supplier_id", String(supplierId));
	}

	const { data } = await api.get<
		WorkerFeedbackListResponse | WorkerFeedbackRecord[]
	>(url.toString(), {
		headers: {
			Accept: "application/json, text/plain, */*",
		},
	});

	return normalizeWorkerFeedbackList(data);
};

export const fetchWorkerFeedbackPage = async ({
	limit,
	offset,
	supplierId,
}: {
	limit: number;
	offset: number;
	supplierId?: number | null;
}) => {
	if (isWorkerFeedbackMockEnabled()) {
		const results = getMockWorkerFeedbackRecords().slice(
			offset,
			offset + limit,
		);

		return {
			count: MOCK_WORKER_FEEDBACK_RECORDS.length,
			next: null,
			previous: null,
			results,
		};
	}

	const url = new URL(buildSupplierWorkerFeedbackUrl());
	url.searchParams.set("limit", String(limit));
	url.searchParams.set("offset", String(offset));

	if (supplierId) {
		url.searchParams.set("supplier_id", String(supplierId));
	}

	const { data } = await api.get<
		WorkerFeedbackListResponse | WorkerFeedbackRecord[]
	>(url.toString(), {
		headers: {
			Accept: "application/json, text/plain, */*",
		},
	});

	if (Array.isArray(data)) {
		return {
			count: data.length,
			next: null,
			previous: null,
			results: data,
		};
	}

	return {
		count: data.count ?? 0,
		next: data.next ?? null,
		previous: data.previous ?? null,
		results: normalizeWorkerFeedbackList(data),
	};
};
