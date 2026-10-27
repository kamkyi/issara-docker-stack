import axios from "axios";
import type { ViewMode } from "$src/store/viewModeStore";
import type { AuthUser, MergedMainUser } from "$src/types";

export type WorkerVerificationStatus =
	| "pending"
	| "saved_for_later"
	| "verified"
	| "rejected";

export interface WorkerVerificationRequest {
	id: string;
	supplierKey: string;
	workerId: string;
	workerName: string;
	workerEmail: string;
	status: WorkerVerificationStatus;
	source: "worker-qr";
	requestedAt: string;
	statusUpdatedAt: string;
}

export interface WorkerProfileChoice {
	id: number | string;
	code?: string | null;
	name: string;
}

export interface WorkerResumeDetail {
	id: number | string;
	fullName?: string | null;
	gender?: string | null;
	photoUrl?: string | null;
	email?: string | null;
	phoneNumber?: string | null;
	countryCode?: string | null;
	addressDetails?: string | null;
	address?: {
		country?: WorkerProfileChoice | null;
		state?: WorkerProfileChoice | null;
		city?: WorkerProfileChoice | null;
		details?: string | null;
	} | null;
	nationality?: WorkerProfileChoice | null;
	nationalIdNumber?: string | null;
	passportNumber?: string | null;
	passportExpireDate?: string | null;
	pinkcardIdNumber?: string | null;
	education?: WorkerProfileChoice | null;
	major?: string | null;
	maritalStatus?: WorkerProfileChoice | null;
	skills?: string | null;
	desiredLocations?: WorkerProfileChoice[];
	industries?: WorkerProfileChoice[];
	workingExperiences?: Array<{
		id: number | string;
		title?: string | null;
		industry?: WorkerProfileChoice | null;
		years?: number | null;
	}>;
	languages?: Array<{
		id: number | string;
		language?: WorkerProfileChoice | null;
		level?: string | null;
		readLevel?: string | null;
		speakLevel?: string | null;
	}>;
	updatedAt?: string | null;
}

export interface WorkerUploadedResume {
	id: number | string;
	name: string;
	fileUrl?: string | null;
	uploadedAt?: string | null;
}

export interface WorkerProfileDetail {
	id: number | string;
	fullName?: string | null;
	email?: string | null;
	phoneNumber?: string | null;
	countryCode?: string | null;
	gender?: string | null;
	age?: number | null;
	profileImageUrl?: string | null;
	nationality?: WorkerProfileChoice | null;
	residenceCountry?: WorkerProfileChoice | null;
	resume?: WorkerResumeDetail | null;
	uploadedResumes?: WorkerUploadedResume[];
}

export interface WorkerVerificationProfileResponse {
	request: WorkerVerificationRequest;
	worker: WorkerProfileDetail;
}

const WORKER_VERIFICATION_STORAGE_KEY =
	"cascade_worker_verification_requests_v1";

type BuildWorkerVerificationQrTargetInput = {
	appLinkPrefix?: string | null;
	origin: string;
	targetToken?: string | null;
};

type BuildWorkerVerificationTargetTokenInput = {
	id: string | number;
	name?: string | null;
	type: "supplier" | "recruiter";
};

const normalizeWorkerVerificationRole = (
	role: string | null | undefined,
): string => {
	return (
		role
			?.trim()
			.toLowerCase()
			.replace(/[_\s]+/g, "-") ?? ""
	);
};

export const isWorkerVerificationRecruiterRole = (
	role: string | null | undefined,
): boolean => {
	return [
		"recruiter",
		"org-recruiter",
		"org-recruitment-agency",
		"recruitment-agency",
	].includes(normalizeWorkerVerificationRole(role));
};

const isSupplierRole = (role: string | null | undefined): boolean => {
	return ["supplier", "org-supplier"].includes(
		normalizeWorkerVerificationRole(role),
	);
};

export const canShowWorkerVerificationQr = ({
	roles,
}: {
	roles: Array<string | null | undefined>;
	viewMode?: ViewMode | null;
}): boolean => {
	return roles.some((role) => isSupplierRole(role));
};

export const buildWorkerVerificationQrTargetUrl = ({
	appLinkPrefix,
	origin,
	targetToken,
}: BuildWorkerVerificationQrTargetInput): string => {
	const searchParams = new URLSearchParams({
		source: "worker-qr",
		targetToken: targetToken ?? "",
	});
	const trimmedAppLinkPrefix = appLinkPrefix?.trim();

	if (trimmedAppLinkPrefix) {
		const separator =
			trimmedAppLinkPrefix.endsWith("/") || trimmedAppLinkPrefix.endsWith("://")
				? ""
				: "/";
		return `${trimmedAppLinkPrefix}${separator}worker-verification?${searchParams.toString()}`;
	}

	return `${origin}/company-profile?${searchParams.toString()}`;
};

export const buildWorkerVerificationTargetToken = ({
	id,
	name,
	type,
}: BuildWorkerVerificationTargetTokenInput): string => {
	const payload = JSON.stringify({
		id: String(id),
		name: name?.trim() || undefined,
		type,
	});
	return btoa(payload)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};

const parseRequests = (): WorkerVerificationRequest[] => {
	if (typeof window === "undefined") return [];
	const raw = localStorage.getItem(WORKER_VERIFICATION_STORAGE_KEY);
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is WorkerVerificationRequest =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as WorkerVerificationRequest).id === "string" &&
				typeof (item as WorkerVerificationRequest).supplierKey === "string" &&
				typeof (item as WorkerVerificationRequest).workerId === "string" &&
				typeof (item as WorkerVerificationRequest).workerName === "string" &&
				typeof (item as WorkerVerificationRequest).workerEmail === "string" &&
				typeof (item as WorkerVerificationRequest).status === "string" &&
				typeof (item as WorkerVerificationRequest).requestedAt === "string",
		);
	} catch (error) {
		console.error("Failed to parse worker verification requests", error);
		return [];
	}
};

const writeRequests = (requests: WorkerVerificationRequest[]) => {
	if (typeof window === "undefined") return;
	localStorage.setItem(
		WORKER_VERIFICATION_STORAGE_KEY,
		JSON.stringify(requests),
	);
};

export const getSupplierWorkerVerificationKey = (
	mergedMainUser: MergedMainUser | null,
	authUser: AuthUser | null,
) => {
	const supplierId =
		mergedMainUser?.authorization?.supplierId ??
		mergedMainUser?.links?.gd?.userId ??
		authUser?.supplier ??
		authUser?.links?.gd?.userId ??
		authUser?.id;

	if (supplierId === null || supplierId === undefined) return null;
	const normalized = String(supplierId).trim();
	return normalized ? `supplier:${normalized}` : null;
};

export const listWorkerVerificationRequests = (supplierKey: string) => {
	return parseRequests()
		.filter((request) => request.supplierKey === supplierKey)
		.sort(
			(a, b) =>
				new Date(b.statusUpdatedAt).getTime() -
				new Date(a.statusUpdatedAt).getTime(),
		);
};

type UpsertWorkerVerificationInput = {
	supplierKey: string;
	workerId: string;
	workerName: string;
	workerEmail: string;
	status: "pending" | "saved_for_later";
};

export const upsertWorkerVerificationRequest = ({
	supplierKey,
	workerId,
	workerName,
	workerEmail,
	status,
}: UpsertWorkerVerificationInput) => {
	const now = new Date().toISOString();
	const requests = parseRequests();
	const index = requests.findIndex(
		(request) =>
			request.supplierKey === supplierKey && request.workerId === workerId,
	);

	if (index >= 0) {
		const existing = requests[index];
		requests[index] = {
			...existing,
			workerName: workerName || existing.workerName,
			workerEmail: workerEmail || existing.workerEmail,
			status,
			statusUpdatedAt: now,
		};
		writeRequests(requests);
		return requests[index];
	}

	const created: WorkerVerificationRequest = {
		id: `${supplierKey}:${workerId}:${Date.now()}`,
		supplierKey,
		workerId,
		workerName,
		workerEmail,
		status,
		source: "worker-qr",
		requestedAt: now,
		statusUpdatedAt: now,
	};

	writeRequests([created, ...requests]);
	return created;
};

export const updateWorkerVerificationStatus = (
	requestId: string,
	status: Extract<WorkerVerificationStatus, "verified" | "rejected">,
) => {
	const now = new Date().toISOString();
	const requests = parseRequests();
	const index = requests.findIndex((request) => request.id === requestId);
	if (index < 0) return null;

	requests[index] = {
		...requests[index],
		status,
		statusUpdatedAt: now,
	};
	writeRequests(requests);
	return requests[index];
};

type CascadeWorkerVerificationStatus =
	| "REQUESTED"
	| "WITHDRAWN"
	| "VERIFIED"
	| "REJECTED";

type CascadeWorkerVerificationRequest = {
	id: number | string;
	targetToken?: string | null;
	target_token?: string | null;
	targetType?: string | null;
	target_type?: string | null;
	targetId?: string | number | null;
	target_id?: string | number | null;
	workerJobseekerId?: string | number | null;
	worker_jobseeker_id?: string | number | null;
	workerSnapshot?: Record<string, unknown> | null;
	worker_snapshot?: Record<string, unknown> | null;
	status?: CascadeWorkerVerificationStatus | string | null;
	requestedAt?: string | null;
	requested_at?: string | null;
	updatedAt?: string | null;
	updated_at?: string | null;
};

type CascadeWorkerVerificationListResponse = {
	requests?: CascadeWorkerVerificationRequest[];
	results?: CascadeWorkerVerificationRequest[];
	data?:
		| CascadeWorkerVerificationRequest[]
		| {
				requests?: CascadeWorkerVerificationRequest[];
				results?: CascadeWorkerVerificationRequest[];
		  };
};

type CascadeWorkerVerificationUpdateResponse = {
	request?: CascadeWorkerVerificationRequest;
	data?: {
		request?: CascadeWorkerVerificationRequest;
	};
};

type CascadeWorkerVerificationProfileResponse = {
	request?: CascadeWorkerVerificationRequest;
	worker?: WorkerProfileDetail;
	data?: {
		request?: CascadeWorkerVerificationRequest;
		worker?: WorkerProfileDetail;
	};
};

const getWorkerVerificationApiBaseUrl = () => {
	const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL?.trim() ?? "";
	const normalized = baseUrl.replace(/\/$/, "");
	if (!normalized) return "";
	if (/\/api\/v\d+$/.test(normalized)) {
		return normalized;
	}
	if (normalized.endsWith("/api")) {
		return `${normalized}/v1`;
	}
	return `${normalized}/api/v1`;
};

const getAuthHeaders = () => {
	if (typeof window === "undefined") return undefined;
	const token = window.localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : undefined;
};

const mapCascadeStatus = (
	status: CascadeWorkerVerificationStatus | string | null | undefined,
): WorkerVerificationStatus => {
	switch (status) {
		case "VERIFIED":
			return "verified";
		case "REJECTED":
			return "rejected";
		case "WITHDRAWN":
			return "saved_for_later";
		default:
			return "pending";
	}
};

const toCascadeStatus = (
	status: Extract<WorkerVerificationStatus, "verified" | "rejected">,
): Extract<CascadeWorkerVerificationStatus, "VERIFIED" | "REJECTED"> =>
	status === "verified" ? "VERIFIED" : "REJECTED";

const getStringFromSnapshot = (
	snapshot: Record<string, unknown> | null | undefined,
	keys: string[],
) => {
	if (!snapshot) return "";
	for (const key of keys) {
		const value = snapshot[key];
		if (typeof value === "string" && value.trim()) return value.trim();
		if (typeof value === "number" && Number.isFinite(value)) {
			return String(value);
		}
	}
	return "";
};

const mapCascadeRequest = (
	request: CascadeWorkerVerificationRequest,
): WorkerVerificationRequest => {
	const targetType = request.targetType ?? request.target_type ?? "supplier";
	const targetId = request.targetId ?? request.target_id ?? "";
	const workerJobseekerId =
		request.workerJobseekerId ?? request.worker_jobseeker_id ?? "";
	const workerId = String(workerJobseekerId);
	const snapshot = request.workerSnapshot ?? request.worker_snapshot ?? null;
	const requestedAt =
		request.requestedAt ?? request.requested_at ?? new Date().toISOString();
	const updatedAt = request.updatedAt ?? request.updated_at ?? requestedAt;

	return {
		id: String(request.id),
		source: "worker-qr",
		status: mapCascadeStatus(request.status),
		supplierKey: `${targetType}:${targetId}`,
		workerEmail: getStringFromSnapshot(snapshot, ["email"]),
		workerId,
		workerName:
			getStringFromSnapshot(snapshot, [
				"full_name",
				"fullName",
				"name",
				"username",
			]) || `Worker ${workerId || request.id}`,
		requestedAt,
		statusUpdatedAt: updatedAt,
	};
};

const getCascadeRequests = (
	data:
		| CascadeWorkerVerificationListResponse
		| CascadeWorkerVerificationRequest[],
) => {
	if (Array.isArray(data)) return data;
	if (Array.isArray(data.requests)) return data.requests;
	if (Array.isArray(data.results)) return data.results;
	if (Array.isArray(data.data)) return data.data;
	if (data.data && Array.isArray(data.data.requests)) return data.data.requests;
	if (data.data && Array.isArray(data.data.results)) return data.data.results;
	return [];
};

export const fetchWorkerVerificationRequests = async (
	targetToken: string,
): Promise<WorkerVerificationRequest[]> => {
	const baseUrl = getWorkerVerificationApiBaseUrl();
	if (!baseUrl) {
		throw new Error("VITE_APP_CASCADE_API_URL is not configured.");
	}

	const authHeaders = getAuthHeaders();
	const { data } = await axios.get<
		CascadeWorkerVerificationListResponse | CascadeWorkerVerificationRequest[]
	>(
		`${baseUrl}/worker-verification/targets/${encodeURIComponent(
			targetToken,
		)}/requests`,
		authHeaders ? { headers: authHeaders } : undefined,
	);

	return getCascadeRequests(data).map(mapCascadeRequest);
};

export const updateWorkerVerificationRequestStatus = async ({
	requestId,
	status,
	targetToken,
}: {
	requestId: string;
	status: Extract<WorkerVerificationStatus, "verified" | "rejected">;
	targetToken: string;
}): Promise<WorkerVerificationRequest> => {
	const baseUrl = getWorkerVerificationApiBaseUrl();
	if (!baseUrl) {
		throw new Error("VITE_APP_CASCADE_API_URL is not configured.");
	}

	const authHeaders = getAuthHeaders();
	const { data } = await axios.patch<CascadeWorkerVerificationUpdateResponse>(
		`${baseUrl}/worker-verification/requests/${encodeURIComponent(
			requestId,
		)}/status`,
		{
			status: toCascadeStatus(status),
			target_token: targetToken,
		},
		authHeaders ? { headers: authHeaders } : undefined,
	);

	const request = data.request ?? data.data?.request;
	if (!request) {
		throw new Error("Worker verification request was not returned.");
	}

	return mapCascadeRequest(request);
};

export const fetchWorkerVerificationWorkerProfile = async ({
	requestId,
	targetToken,
}: {
	requestId: string;
	targetToken: string;
}): Promise<WorkerVerificationProfileResponse> => {
	const baseUrl = getWorkerVerificationApiBaseUrl();
	if (!baseUrl) {
		throw new Error("VITE_APP_CASCADE_API_URL is not configured.");
	}
	const authHeaders = getAuthHeaders();

	const { data } = await axios.get<CascadeWorkerVerificationProfileResponse>(
		`${baseUrl}/worker-verification/requests/${encodeURIComponent(
			requestId,
		)}/worker-profile`,
		{
			...(authHeaders ? { headers: authHeaders } : {}),
			params: {
				target_token: targetToken,
			},
		},
	);

	const request = data.request ?? data.data?.request;
	const worker = data.worker ?? data.data?.worker;
	if (!request || !worker) {
		throw new Error("Worker profile was not returned.");
	}

	return {
		request: mapCascadeRequest(request),
		worker,
	};
};
