import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";

// Define the interaction channel type
export interface InteractionChannel {
	id: number;
	name: string;
}
interface InteractionChannelsOptions {
	/**
	 * Ask for the CSO row set rather than the one this token's Django groups
	 * imply. Set by the Worker Voice form so an Issara Management tester in CSO
	 * view reviews the options a CSO officer really gets; see `useCsoAudience`.
	 */
	csoOnly?: boolean;
}

/**
 * Fetch all interaction channels
 */
export const useInteractionChannels = (
	options: InteractionChannelsOptions = {},
) => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION || "3.0";
	const language = useActiveLanguage();
	const baseUrl =
		import.meta.env.VITE_API_BASE_URL ||
		"https://staging.cms.issarainstitute.org";
	const csoOnly = options.csoOnly ?? false;

	return useQuery({
		// In the key because it changes the request -- the persisted IndexedDB
		// cache would otherwise answer a CSO-view request with the Management
		// list it stored earlier.
		queryKey: ["interactionChannels", language, { csoOnly }],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<InteractionChannel[]>(
				`${baseUrl}/cascade/interactionchannels/?lang=${language}&client_version=${clientVersion}${
					csoOnly ? "&cso_only=true" : ""
				}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			// Return in a format compatible with the existing code structure
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
 * Fetch interaction channels with pagination support
 */
export const useInfiniteInteractionChannels = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION || "3.0";
	const language = useActiveLanguage();
	const baseUrl =
		import.meta.env.VITE_API_BASE_URL ||
		"https://staging.cms.issarainstitute.org";

	return useInfiniteQuery({
		queryKey: ["interactionChannels", "infinite", language],
		queryFn: async ({
			pageParam = `${baseUrl}/api/v2/interactionchannels/?lang=${language}&client_version=${clientVersion}`,
		}) => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<InteractionChannel[]>(pageParam, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			// Return in a format compatible with the existing component code
			const result = {
				count: response.data.length,
				next: null, // No pagination needed as we get all data at once
				previous: null,
				results: response.data,
			};

			return result;
		},
		initialPageParam: `${baseUrl}/cascade/interactionchannels/?lang=${language}&client_version=${clientVersion}`,
		getNextPageParam: (lastPage) => lastPage.next || undefined,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};
