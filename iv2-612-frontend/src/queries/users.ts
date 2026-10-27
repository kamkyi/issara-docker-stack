import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

// Define the user type
export interface User {
	id: number;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	groups: string[];
	partner: number | null;
	supplier: number | null;
	organization: number;
	is_active: boolean;
}

// Interface for API response
interface UsersResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: User[];
}

interface UsersOptions {
	/**
	 * Ask for the CSO-facing people-picker: the officers of the signed-in
	 * account's *own* organization, which is how a CSO account already sees
	 * this list. It changes the rule, never the organization -- a Management
	 * tester in CSO view gets their own organization's officers, not another
	 * organization's. See `useCsoAudience`.
	 */
	csoOnly?: boolean;
}

/**
 * Fetch all users
 */
export const useUsers = (options: UsersOptions = {}) => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;
	const csoOnly = options.csoOnly ?? false;

	return useQuery({
		// The two audiences return different lists for the same organization, so
		// they cannot share a cache entry -- the persisted IndexedDB cache would
		// otherwise answer a CSO-view request with the Management list.
		queryKey: ["users", { csoOnly }],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<UsersResponse>(
				`${baseUrl}/cascade/users/?client_version=${clientVersion}${
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
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Fetch users with pagination support and filter for Issara Staff only
 */
export const useInfiniteIssaraStaff = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	return useInfiniteQuery({
		queryKey: ["users", "issara-staff", "infinite"],
		queryFn: async ({
			pageParam = `${baseUrl}/cascade/users/?client_version=${clientVersion}`,
		}) => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<UsersResponse>(pageParam, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			// Filter for Issara Staff only
			const filteredResults = response.data.results.filter((user) =>
				user.groups.includes("Issara Staff"),
			);

			return {
				...response.data,
				results: filteredResults,
			};
		},
		initialPageParam: `${baseUrl}/cascade/users/?client_version=${clientVersion}`,
		getNextPageParam: (lastPage) => lastPage.next || undefined,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Filter users to get only Issara Staff
 */
export const useIssaraStaff = () => {
	const { data, isLoading, error } = useUsers();

	const issaraStaff =
		data?.results.filter((user) => user.groups.includes("Issara Staff")) || [];

	return {
		data: issaraStaff,
		isLoading,
		error,
	};
};
