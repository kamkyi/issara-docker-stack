import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../api/axios";
import { useActiveLanguage } from "../hooks/useActiveLanguage";

// Define the nationality type
export interface Nationality {
	id: number;
	name: string;
	imageicon: number | null;
}

// Interface for API response
interface NationalitiesResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: Nationality[];
}

interface GDNationalitiesResponse {
	nationality: number;
	language: number;
	name: string;
}

/**
 * Fetch all nationalities
 */
export const useNationalities = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	return useQuery({
		queryKey: ["nationalities"],
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}
			const response = await api.get<NationalitiesResponse>(
				`${baseUrl}/api/v2/nationalities/?client_version=${clientVersion}`,
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
		gcTime: 10 * 60 * 1000, // 10 minutes (fixed from cacheTime)
	});
};

/**
 * Fetch nationalities with pagination support
 */
export const useInfiniteNationalities = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	return useInfiniteQuery({
		queryKey: ["nationalities", "infinite"],
		queryFn: async ({
			pageParam = `${baseUrl}/api/v2/nationalities/?client_version=${clientVersion}`,
		}) => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await api.get<NationalitiesResponse>(pageParam, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			return response.data;
		},
		initialPageParam: `${baseUrl}/api/v2/nationalities/?client_version=${clientVersion}`,
		getNextPageParam: (lastPage) => lastPage.next || undefined,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (fixed from cacheTime)
	});
};

export const useGDNationalities = () => {
	const baseUrl = import.meta.env.VITE_APP_GD_API_V1_URL;
	const lang = useActiveLanguage();

	return useQuery({
		queryKey: ["gd-nationalities", lang],
		queryFn: async () => {
			const response = await axios.get<GDNationalitiesResponse[]>(
				`${baseUrl}/localization/nationalities?lang=${lang}`,
				{
					headers: {
						Accept: "application/json",
						// Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (fixed from cacheTime)
	});
};
