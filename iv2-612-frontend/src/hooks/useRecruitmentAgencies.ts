// src/hooks/useRecruitmentAgencies.ts
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_URL = import.meta.env.VITE_APP_GD_API_URL;
const MEMBER_DIRECTORY_QUERY_VERSION = "member-directory-v3";

// Helper to get auth header from localStorage
// const getAuthHeaders = () => {
// 	const token = localStorage.getItem("auth_token");
// 	return token ? { Authorization: `Bearer ${token}` } : {};
// };

export const useRecruitmentAgencies = (options?: {
	enabled?: boolean;
	ordering?: string;
	country?: (string | number)[];
	sendingCountry?: (string | number)[];
	industry?: (string | number)[];
	search?: string;
}) => {
	return useInfiniteQuery({
		queryKey: [
			MEMBER_DIRECTORY_QUERY_VERSION,
			"recruitment-agencies",
			options?.ordering,
			options?.country,
			options?.sendingCountry,
			options?.industry,
			options?.search,
		],
		queryFn: async ({ pageParam }) => {
			let url = pageParam || `${API_URL}/recruitment-agencies`;

			// Build query parameters
			const params = new URLSearchParams();
			params.append("lang", "en");

			if (options?.ordering) {
				params.append("ordering", options.ordering);
			}

			if (options?.country && options.country.length > 0) {
				params.append("country", options.country.join(","));
			}

			if (options?.sendingCountry && options.sendingCountry.length > 0) {
				params.append("sending_country", options.sendingCountry.join(","));
			}

			if (options?.industry && options.industry.length > 0) {
				params.append("industry", options.industry.join(","));
			}

			if (options?.search?.trim()) {
				params.append("search", options.search.trim());
			}

			// Add parameters to URL if not already present
			if (!url.includes("?")) {
				url += `?${params.toString()}`;
			} else if (!url.includes("lang=")) {
				url += `&${params.toString()}`;
			}

			const { data } = await axios.get(url, {
				// headers: getAuthHeaders(),
			});

			return {
				...data,
				results:
					data.results?.map((agency: any) => ({
						...agency,
						type: "Recruitment Agency",
					})) ?? [],
			};
		},
		initialPageParam: `${API_URL}/recruitment-agencies`,
		getNextPageParam: (lastPage) => lastPage.next,
		getPreviousPageParam: (firstPage) => firstPage.previous,
		staleTime: 30000,
		gcTime: 60000,
		enabled: options?.enabled ?? true,
	});
};

export const useRecruitmentAgenciesDetail = (id: number) =>
	useQuery({
		queryKey: ["recruitment", id],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/recruitment-agencies/${id}`,
				{
					// headers: getAuthHeaders(),
				},
			);
			return data; // not data.results
		},
		enabled: !!id,
		staleTime: 0, // always stale, forces refetch on mount/focus
	});
