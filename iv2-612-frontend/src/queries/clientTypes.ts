import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

// Define the client type interface
export interface ClientType {
	id: number;
	name: string;
}

// Type for API response - an array of client types
type ClientTypesResponse = ClientType[];

interface ClientTypesOptions {
	/**
	 * Ask for the CSO row set rather than the one this token's Django groups
	 * imply. Set by the Worker Voice form so an Issara Management tester in CSO
	 * view reviews the options a CSO officer really gets; see `useCsoAudience`.
	 */
	csoOnly?: boolean;
}

/**
 * Fetch all client types
 */
export const useClientTypes = (
	lang: string = "en",
	options: ClientTypesOptions = {},
) => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const csoOnly = options.csoOnly ?? false;

	return useQuery({
		// `csoOnly` belongs in the key because it changes the request. React
		// Query is persisted to IndexedDB for a day with no buster, so a key
		// shared between the two audiences would serve the Management list from
		// cache after a switch into CSO view -- and `staleTime` would suppress
		// the refetch that corrected it.
		queryKey: ["clientTypes", lang, { csoOnly }],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<ClientTypesResponse>(
				`${baseUrl}/api/v2/clienttypes/?lang=${lang}&client_version=${clientVersion}${
					csoOnly ? "&cso_only=true" : ""
				}`,
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
	});
};
