// src/hooks/useIndustries.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "./useActiveLanguage";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;
const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

// Helper to get auth header from localStorage
// const getAuthHeaders = () => {
// 	const token = localStorage.getItem("auth_token");
// 	return token ? { Authorization: `Bearer ${token}` } : {};
// };

export const useCountries = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["countries", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/localization/countries?lang=${lang}`,
			);
			return data;
		},
	});
};

export const useStates = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["states", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/localization/states?lang=${lang}`,
				{
					// headers: getAuthHeaders(),
				},
			);
			return data;
		},
	});
};

export const useCities = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["cities", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/localization/cities?lang=${lang}`,
				{
					// headers: getAuthHeaders(),
				},
			);
			return data;
		},
	});
};

export const useCascadeCountries = () =>
	useQuery({
		queryKey: ["cascade-countries"],
		queryFn: async () => {
			const response = await axios.get(`${CASCADE_API_URL}/cascade/countries`);
			return response.data;
		},
	});

export const useCascadeIndustries = () =>
	useQuery({
		queryKey: ["cascade-industries"],
		queryFn: async () => {
			const response = await axios.get(`${CASCADE_API_URL}/industries`);
			return response.data;
		},
	});

export const useCascadeProductCategories = () =>
	useQuery({
		queryKey: ["cascade-product-categories"],
		queryFn: async () => {
			const response = await axios.get(`${CASCADE_API_URL}/product-categories`);
			return response.data;
		},
	});

export const useCascadeProvinces = (countryIds: string[] = []) =>
	useQuery({
		queryKey: ["cascade-provinces", countryIds],
		enabled: countryIds.length > 0,
		queryFn: async () => {
			const response = await axios.get(`${CASCADE_API_URL}/cascade/province`, {
				params: {
					country_ids: countryIds.join(","),
				},
			});
			return response.data;
		},
	});

export const useCascadeDistricts = (provinceIds: string[] = []) =>
	useQuery({
		queryKey: ["cascade-districts", provinceIds],
		enabled: provinceIds.length > 0,
		queryFn: async () => {
			const response = await axios.get(`${CASCADE_API_URL}/cascade/district`, {
				params: {
					province_ids: provinceIds.join(","),
				},
			});
			return response.data;
		},
	});
