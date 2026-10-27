import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface GrievanceDiagnosticSubmission {
	id: number;
	supplierId: number | null;
	partnerId: number | null;
	submittedByUserId: number | null;
	overallScore: number;
	stars: number;
	sectionScores: Record<string, number>;
	answers: Record<string, number>;
	submittedAt: string;
}

export interface CreateDiagnosticPayload {
	supplier_id?: number | null;
	partner_id?: number | null;
	submitted_by_user_id?: number | null;
	overall_score: number;
	stars: number;
	section_scores: Record<string, number>;
	answers: Record<string, number>;
}

const baseUrl = () =>
	`${import.meta.env.VITE_APP_CASCADE_API_URL}/grievance-diagnostic`;

export function useDiagnosticHistory(
	supplierId?: number | null,
	partnerId?: number | null,
) {
	const queryParams = new URLSearchParams();
	if (supplierId) queryParams.append("supplier_id", String(supplierId));
	if (partnerId) queryParams.append("partner_id", String(partnerId));
	const queryString = queryParams.toString();

	return useQuery<{ submissions: GrievanceDiagnosticSubmission[] }>({
		queryKey: ["grievance-diagnostic-history", supplierId, partnerId],
		queryFn: async () => {
			const res = await api.get(
				`${baseUrl()}/submissions${queryString ? `?${queryString}` : ""}`,
			);
			return res.data;
		},
		enabled: Boolean(supplierId || partnerId),
	});
}

export function useSubmitDiagnostic() {
	const queryClient = useQueryClient();

	return useMutation<
		{ submission: GrievanceDiagnosticSubmission },
		Error,
		CreateDiagnosticPayload
	>({
		mutationFn: async (payload) => {
			const res = await api.post(`${baseUrl()}/submissions`, payload);
			return res.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: [
					"grievance-diagnostic-history",
					variables.supplier_id ?? null,
					variables.partner_id ?? null,
				],
			});
		},
	});
}
