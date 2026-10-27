import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
	isMemberDirectoryGlobalPartner,
	mapStrategicPartnerToMember,
} from "$src/utils/memberDirectory";

type StrategicPartnerResponse = {
	count?: number;
	next?: string | null;
	previous?: string | null;
	results?: any[];
};

type AppEnvironment = "local" | "staging" | "production";

const APP_ENVIRONMENT = import.meta.env.VITE_APP_ENVIRONMENT as
	| AppEnvironment
	| undefined;
const APP_API_URL = import.meta.env.VITE_APP_API_URL;
const GLOBAL_BUYERS_API_URL_BY_ENV: Record<
	Exclude<AppEnvironment, "local">,
	string
> = {
	staging: "https://staging.cms.issarainstitute.org/api/v2",
	production: "https://cms.issarainstitute.org/api/v2",
};
const GLOBAL_BUYERS_PAGE_SIZE = "100";
const MEMBER_DIRECTORY_QUERY_VERSION = "member-directory-v3";

const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return token
		? {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			}
		: {
				Accept: "application/json",
			};
};

export const getGlobalBuyersApiUrl = (
	environment = APP_ENVIRONMENT,
	fallbackApiUrl = APP_API_URL,
) => {
	if (environment === "local") {
		return fallbackApiUrl?.replace(/\/$/, "") ?? "";
	}

	const apiUrl =
		environment && environment in GLOBAL_BUYERS_API_URL_BY_ENV
			? GLOBAL_BUYERS_API_URL_BY_ENV[environment as AppEnvironment]
			: fallbackApiUrl;

	return apiUrl?.replace(/\/$/, "") ?? "";
};

const GLOBAL_BUYERS_API_URL = getGlobalBuyersApiUrl();

export const fetchAllGlobalBuyerPages = async (initialUrl: string) => {
	const aggregatedResults: any[] = [];
	const visitedUrls = new Set<string>();
	let nextUrl: string | null = initialUrl;

	while (nextUrl && !visitedUrls.has(nextUrl)) {
		visitedUrls.add(nextUrl);
		const { data } = await axios.get<StrategicPartnerResponse>(nextUrl, {
			headers: getAuthHeaders(),
		});
		aggregatedResults.push(...(data.results ?? []));
		nextUrl = data.next ?? null;
	}

	return aggregatedResults;
};

export const useGlobalBuyers = (options?: {
	enabled?: boolean;
	ordering?: string;
	country?: (string | number)[];
	industry?: (string | number)[];
	search?: string;
}) => {
	return useInfiniteQuery({
		queryKey: [
			MEMBER_DIRECTORY_QUERY_VERSION,
			"global-buyers",
			options?.ordering,
			options?.country,
			options?.industry,
			options?.search,
		],
		queryFn: async ({ pageParam }) => {
			let url = pageParam || `${GLOBAL_BUYERS_API_URL}/strategicpartners/`;
			const params = new URLSearchParams();

			params.append("page_size", GLOBAL_BUYERS_PAGE_SIZE);

			if (options?.ordering) {
				params.append("ordering", options.ordering);
			}

			if (options?.country && options.country.length > 0) {
				params.append("country", String(options.country[0]));
			}

			if (options?.industry && options.industry.length > 0) {
				params.append("industry", options.industry.join(","));
			}

			if (options?.search?.trim()) {
				params.append("search", options.search.trim());
			}

			if (!url.includes("?") && params.toString()) {
				url += `?${params.toString()}`;
			} else if (
				url.includes("?") &&
				params.toString() &&
				!url.includes("search=")
			) {
				url += `&${params.toString()}`;
			}

			const results = await fetchAllGlobalBuyerPages(url);
			const allowedResults =
				results.filter((partner: any) =>
					isMemberDirectoryGlobalPartner(partner),
				) ?? [];

			const seenNames = new Set<string>();
			const uniqueResults: any[] = [];
			for (const partner of allowedResults) {
				const nameKey = String(partner?.name_en || partner?.name || "")
					.trim()
					.toLowerCase();
				if (nameKey && !seenNames.has(nameKey)) {
					seenNames.add(nameKey);
					uniqueResults.push(partner);
				}
			}

			return {
				count: uniqueResults.length,
				next: null,
				previous: null,
				results: uniqueResults.map((partner: any) =>
					mapStrategicPartnerToMember(partner),
				),
			};
		},
		initialPageParam: `${GLOBAL_BUYERS_API_URL}/strategicpartners/`,
		getNextPageParam: (lastPage) => lastPage.next,
		getPreviousPageParam: (firstPage) => firstPage.previous,
		staleTime: 30000,
		gcTime: 60000,
		enabled: options?.enabled ?? true,
	});
};

export const useGlobalBuyerIndustries = () =>
	useQuery({
		queryKey: [MEMBER_DIRECTORY_QUERY_VERSION, "global-buyer-industries"],
		queryFn: async () => {
			const { data } = await axios.get(
				`${GLOBAL_BUYERS_API_URL}/industries/?page_size=500`,
				{
					headers: getAuthHeaders(),
				},
			);
			return (data.results ?? data) as {
				id: number;
				name: string;
			}[];
		},
		staleTime: 30000,
		gcTime: 60000,
	});

export const useGlobalBuyerDetail = (id: number) =>
	useQuery({
		queryKey: ["global-buyer", id],
		queryFn: async () => {
			const { data } = await axios.get(
				`${GLOBAL_BUYERS_API_URL}/strategicpartners/${id}/`,
				{
					headers: getAuthHeaders(),
				},
			);
			return mapStrategicPartnerToMember(data);
		},
		enabled: !!id,
		staleTime: 0,
	});
