// src/hooks/useIndustries.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "./useActiveLanguage";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;
const GD_API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

export const useIndustries = () =>
	useQuery({
		queryKey: ["cascade-industries-list"],
		queryFn: async () => {
			const { data } = await axios.get(`${CASCADE_API_URL}/industries`);
			return (data?.data?.industries ?? data?.results ?? []) as {
				id: number;
				name: string;
			}[];
		},
	});

export const useSubIndustries = () =>
	useQuery({
		queryKey: ["cascade-subindustries-list"],
		queryFn: async () => {
			const { data } = await axios.get(`${CASCADE_API_URL}/subindustries`);
			return (data?.data?.subIndustries ?? data?.results ?? []) as {
				id: number;
				name: string;
				industry_id: number;
			}[];
		},
	});

export const useGDIndustries = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["gd-industries", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${GD_API_URL}/industries?lang=${lang}`,
				{
					// headers: getAuthHeaders(),
				},
			);
			return data;
		},
	});
};

export const useGDSubIndustries = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["gd-sub-industries", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${GD_API_URL}/sub-industries?lang=${lang}`,
				{
					// headers: getAuthHeaders(),
				},
			);
			return data;
		},
	});
};
