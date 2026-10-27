import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getCascadeApiUrl } from "$src/utils/config";

/**
 * CASCADE access requests. Non pre-approved users submit their details from the
 * Unauthorized page (`useSubmitAccessRequest`); the internal Issara team lists
 * and reviews them under ILM Management (`useAccessRequests` /
 * `useUpdateAccessRequestStatus`). Backed by cascade-api `/access-requests`.
 */

export type AccessRequestStatus = "pending" | "approved" | "rejected";
export type AccessRequestOrgType =
	| "supplier"
	| "global_partner"
	| "recruiter"
	| "certification_body"
	| "philanthropic_donor"
	| "cso_ngo"
	| "other";

export interface AccessRequest {
	id: number;
	workos_user_id: string | null;
	full_name: string;
	email: string;
	title: string | null;
	company_website: string | null;
	hear_about_us: string | null;
	organization_name: string;
	organization_type: AccessRequestOrgType;
	role_or_reason: string;
	message: string | null;
	status: AccessRequestStatus;
	reviewed_by_user_id: string | null;
	reviewed_by_name: string | null;
	review_notes: string | null;
	reviewed_at: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SubmitAccessRequestInput {
	fullName: string;
	email: string;
	title?: string;
	companyWebsite?: string;
	hearAboutUs?: string;
	organizationName: string;
	organizationType: AccessRequestOrgType;
	roleOrReason: string;
	message?: string;
}

function requireBase(): string {
	const base = getCascadeApiUrl();
	if (!base) {
		throw new Error("Cascade API URL is not configured");
	}
	return base;
}

/** Submit a new access request (public/best-effort auth). */
export const useSubmitAccessRequest = () =>
	useMutation<{ id: number }, unknown, SubmitAccessRequestInput>({
		mutationFn: async (input) => {
			const response = await api.post<{ data: { id: number } }>(
				`${requireBase()}/access-requests`,
				input,
			);
			return response.data.data;
		},
	});

/** The review list (internal org only), newest first. */
export const useAccessRequests = (status?: AccessRequestStatus) =>
	useQuery<AccessRequest[]>({
		queryKey: ["access-requests", "list", status ?? "all"],
		queryFn: async () => {
			const response = await api.get<{ data: { requests: AccessRequest[] } }>(
				`${requireBase()}/access-requests`,
				{ params: status ? { status } : undefined },
			);
			return response.data.data.requests;
		},
		staleTime: 30 * 1000,
		gcTime: 5 * 60 * 1000,
	});

export interface AccessRequestEmailRecipient {
	workos_user_id: string;
	email: string;
	name: string | null;
	enabled: boolean;
}

/** Management users + their email-notification preference (management only). */
export const useAccessRequestEmailRecipients = (enabled = true) =>
	useQuery<AccessRequestEmailRecipient[]>({
		queryKey: ["access-requests", "email-recipients"],
		enabled,
		queryFn: async () => {
			const response = await api.get<{
				data: { recipients: AccessRequestEmailRecipient[] };
			}>(`${requireBase()}/access-requests/email-recipients`);
			return response.data.data.recipients;
		},
		staleTime: 60 * 1000,
	});

/** Save the full recipient selection (management only, enforced server-side). */
export const useUpdateAccessRequestEmailRecipients = () => {
	const queryClient = useQueryClient();
	return useMutation<
		{ updated: number },
		unknown,
		AccessRequestEmailRecipient[]
	>({
		mutationFn: async (recipients) => {
			const response = await api.put<{ data: { updated: number } }>(
				`${requireBase()}/access-requests/email-recipients`,
				{ recipients },
			);
			return response.data.data;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["access-requests", "email-recipients"],
			});
		},
	});
};

/** Approve/reject a request (Issara Management only, enforced server-side). */
export const useUpdateAccessRequestStatus = () => {
	const queryClient = useQueryClient();
	return useMutation<
		AccessRequest,
		unknown,
		{ id: number; status: "approved" | "rejected"; reviewNotes?: string }
	>({
		mutationFn: async ({ id, status, reviewNotes }) => {
			const response = await api.patch<{ data: { request: AccessRequest } }>(
				`${requireBase()}/access-requests/${id}/status`,
				{ status, reviewNotes },
			);
			return response.data.data.request;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["access-requests", "list"],
			});
		},
	});
};
