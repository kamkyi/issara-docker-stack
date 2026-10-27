import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

// Define the referral action type
export interface ReferralAction {
	id: number;
	name: string;
}

interface ReferralActionOptions {
	csoOnly?: boolean;
}

/**
 * Fetch all referral actions
 */
export const useReferralActions = (
	language = "en",
	options: ReferralActionOptions = {},
) => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION || "3.0";
	const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
	const csoOnly = options.csoOnly ?? false;

	return useQuery({
		queryKey: ["referralActions", language, { csoOnly }],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const params = new URLSearchParams({
				lang: language,
				client_version: clientVersion,
			});
			if (csoOnly) {
				params.set("cso_only", "true");
			}

			const response = await api.get<ReferralAction[]>(
				`${baseUrl}/api/v2/referralactions/?${params.toString()}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};
