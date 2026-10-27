import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";

// Define the interaction reason type
export interface InteractionReason {
	id: number;
	name: string;
	description?: string | null;
}

interface InteractionReasonsOptions {
	/**
	 * Ask for the CSO row set rather than the one this token's Django groups
	 * imply. Set by the Worker Voice form so an Issara Management tester in CSO
	 * view reviews the options a CSO officer really gets; see `useCsoAudience`.
	 */
	csoOnly?: boolean;
}

/**
 * Fetch all interaction reasons
 */
export const useInteractionReasons = (
	options: InteractionReasonsOptions = {},
) => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION || "3.0";
	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const lang = useActiveLanguage();
	const csoOnly = options.csoOnly ?? false;

	return useQuery({
		// In the key because it changes the request -- the persisted IndexedDB
		// cache would otherwise answer a CSO-view request with the Management
		// list it stored earlier.
		queryKey: ["interactionReasons", lang, { csoOnly }],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<InteractionReason[]>(
				`${baseUrl}/api/v2/interactionreasons/?lang=${lang}&client_version=${clientVersion}${
					csoOnly ? "&cso_only=true" : ""
				}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);

			// Adapt the response to match the expected format
			return {
				count: response.data.length,
				next: null,
				previous: null,
				results: response.data,
			};
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

/**
 * Fetch interaction reasons with pagination support
 */
export const useInfiniteInteractionReasons = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const lang = useActiveLanguage();

	return useInfiniteQuery({
		queryKey: ["interactionReasons", "infinite", lang],
		queryFn: async ({
			pageParam = `${baseUrl}/api/v2/interactionreasons/?lang=${lang}&client_version=${clientVersion}`,
		}) => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<InteractionReason[]>(pageParam, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			// Adapt the response to match the expected format
			return {
				count: response.data.length,
				next: null,
				previous: null,
				results: response.data,
			};
		},
		initialPageParam: `${baseUrl}/api/v2/interactionreasons/?lang=${lang}&client_version=${clientVersion}`,
		getNextPageParam: () => undefined, // Disable pagination as we get all data at once
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};
