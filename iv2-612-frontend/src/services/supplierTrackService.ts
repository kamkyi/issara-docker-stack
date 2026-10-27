import { api } from "$src/api/axios";

export type SupplierTrack = "MARKETPLACE" | "FULL";
export type SupplierAccessStatus =
	| "ACTIVE"
	| "NOT_SELECTED"
	| "RESET"
	| "REVOKED"
	| "DELETED"
	| "REACCEPT_REQUIRED"
	| "INACTIVE";

export interface SupplierAgreementSection {
	title: string;
	body: string;
}

export interface SupplierTrackStatus {
	supplier_id: number;
	supplier_name: string;
	track_selection: SupplierTrack | null;
	license_agreed_at: string | null;
	agreement_signer_name: string | null;
	agreement_signer_title: string | null;
	agreement_signer_affiliation: string | null;
	agreement_version: string;
	agreement_sections: SupplierAgreementSection[];
	access_status: SupplierAccessStatus;
	access_changed_at: string | null;
	needs_track_selection: boolean;
}

export type SupplierPostLoginRoute =
	| "/company-dashboard"
	| "/cascade-marketplace"
	| "/track-selection";

interface ApiEnvelope<T> {
	status: "success";
	data: T;
}

interface TrackSelectionResult {
	data: SupplierTrackStatus;
	changed: boolean;
	email_sent: boolean | null;
}

const SUPPLIER_TRACK_STORAGE_KEY = "supplier_track_selection";
export const SUPPLIER_TRACK_CHANGED_EVENT = "supplier-track-selection-changed";
export const SUPPLIER_TRACK_STATUS_STALE_TIME_MS = 60_000;

export const getSupplierTrackQueryKey = (workosUserId?: string | null) =>
	["supplier-track-selection", workosUserId ?? "current-user"] as const;

export const getStoredWorkosUserId = (): string | null => {
	try {
		const raw = localStorage.getItem("auth_user");
		if (!raw) return null;
		const id = (JSON.parse(raw) as { id?: unknown }).id;
		return typeof id === "string" && id.startsWith("user_") ? id : null;
	} catch {
		return null;
	}
};

const getApiErrorDetails = (error: unknown) => {
	if (!error || typeof error !== "object" || !("response" in error)) {
		return { status: undefined, code: "", message: "" };
	}
	const response = (
		error as {
			response?: { status?: number; data?: unknown };
		}
	).response;
	const data = response?.data;
	if (!data || typeof data !== "object") {
		return { status: response?.status, code: "", message: "" };
	}
	const record = data as Record<string, unknown>;
	const detail =
		record.detail && typeof record.detail === "object"
			? (record.detail as Record<string, unknown>)
			: record;
	return {
		status: response?.status,
		code: String(detail.code ?? record.code ?? ""),
		message: String(detail.message ?? record.message ?? record.detail ?? ""),
	};
};

export const isSupplierAssignmentRequiredError = (error: unknown) => {
	const { status, code, message } = getApiErrorDetails(error);
	return (
		status === 403 &&
		(code === "supplier_assignment_required" ||
			message.toLowerCase().includes("no supplier is associated"))
	);
};

export const getSupplierPostLoginRoute = (
	status: Pick<
		SupplierTrackStatus,
		"needs_track_selection" | "track_selection"
	>,
): SupplierPostLoginRoute => {
	if (status.needs_track_selection) return "/track-selection";
	if (status.track_selection === "MARKETPLACE") {
		return "/cascade-marketplace";
	}
	return "/company-dashboard";
};

const trackSelectionUrl = () => {
	const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL;
	if (!baseUrl) throw new Error("CASCADE API URL is not configured");
	return `${baseUrl.replace(/\/+$/, "")}/suppliers/track-selection`;
};

export const storeSupplierTrack = (track: SupplierTrack | null) => {
	if (track) {
		localStorage.setItem(SUPPLIER_TRACK_STORAGE_KEY, track);
	} else {
		localStorage.removeItem(SUPPLIER_TRACK_STORAGE_KEY);
	}

	window.dispatchEvent(
		new CustomEvent(SUPPLIER_TRACK_CHANGED_EVENT, { detail: { track } }),
	);

	try {
		const raw = localStorage.getItem("auth_user");
		if (!raw) return;
		const authUser = JSON.parse(raw) as Record<string, unknown>;
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ ...authUser, supplierTrack: track }),
		);
	} catch {
		// The dedicated key remains authoritative for frontend presentation.
	}
};

export const getStoredSupplierTrack = (): SupplierTrack | null => {
	const value = localStorage.getItem(SUPPLIER_TRACK_STORAGE_KEY);
	return value === "MARKETPLACE" || value === "FULL" ? value : null;
};

export const getSupplierTrackStatus =
	async (): Promise<SupplierTrackStatus> => {
		const response = await api.get<ApiEnvelope<SupplierTrackStatus>>(
			trackSelectionUrl(),
		);
		storeSupplierTrack(response.data.data.track_selection);
		return response.data.data;
	};

export const getSupplierTrackQueryOptions = (
	workosUserId?: string | null,
	queryFn = getSupplierTrackStatus,
) => ({
	queryKey: getSupplierTrackQueryKey(workosUserId),
	queryFn,
	staleTime: SUPPLIER_TRACK_STATUS_STALE_TIME_MS,
	retry: (failureCount: number, error: unknown) =>
		!isSupplierAssignmentRequiredError(error) && failureCount < 1,
});

export const selectMarketplaceTrack = async (input?: {
	lang?: string;
}): Promise<TrackSelectionResult> => {
	const response = await api.post<ApiEnvelope<TrackSelectionResult>>(
		trackSelectionUrl(),
		{ track: "MARKETPLACE", lang: input?.lang },
	);
	storeSupplierTrack(response.data.data.data.track_selection);
	return response.data.data;
};

export const selectFullTrack = async (input: {
	signerName: string;
	signerTitle: string;
	signerAffiliation: string;
	agreementVersion: string;
	lang?: string;
}): Promise<TrackSelectionResult> => {
	const response = await api.post<ApiEnvelope<TrackSelectionResult>>(
		trackSelectionUrl(),
		{
			track: "FULL",
			accepted: true,
			signer_name: input.signerName,
			signer_title: input.signerTitle,
			signer_affiliation: input.signerAffiliation,
			agreement_version: input.agreementVersion,
			lang: input.lang,
		},
	);
	storeSupplierTrack(response.data.data.data.track_selection);
	return response.data.data;
};
