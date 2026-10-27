// src/hooks/useCities.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "./useActiveLanguage";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

// Helper to get auth header from localStorage
const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useCities = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["cities", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/localization/cities?lang=${lang}`,
				{
					headers: getAuthHeaders(),
				},
			);
			return data;
		},
	});
};
