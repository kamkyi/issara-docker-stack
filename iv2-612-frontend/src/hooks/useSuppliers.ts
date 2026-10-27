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

export const useSuppliers = (options?: {
	enabled?: boolean;
	ordering?: string;
	country?: (string | number)[];
	industry?: (string | number)[];
	search?: string;
}) => {
	return useInfiniteQuery({
		queryKey: [
			MEMBER_DIRECTORY_QUERY_VERSION,
			"suppliers",
			options?.ordering,
			options?.country,
			options?.industry,
			options?.search,
		],
		queryFn: async ({ pageParam }) => {
			let url = pageParam || `${API_URL}/employers`;
			const params = new URLSearchParams();
			params.append("lang", "en");

			if (options?.ordering) {
				params.append("ordering", options.ordering);
			}

			if (options?.country && options.country.length > 0) {
				params.append("country", options.country.join(","));
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
					data.results?.map((supplier: any) => ({
						...supplier,
						type: "Supplier",
					})) ?? [],
			};
		},
		initialPageParam: `${API_URL}/employers`,
		getNextPageParam: (lastPage) => lastPage.next,
		getPreviousPageParam: (firstPage) => firstPage.previous,
		staleTime: 30000,
		gcTime: 60000,
		enabled: options?.enabled ?? true,
	});
};

export const useSupplierDetail = (id: number) =>
	useQuery({
		queryKey: ["employer", id],
		queryFn: async () => {
			const { data } = await axios.get(`${API_URL}/employers/${id}`, {
				// headers: getAuthHeaders(),
			});
			return data; // not data.results
		},
		enabled: !!id,
		staleTime: 0, // always stale, forces refetch on mount/focus
	});
