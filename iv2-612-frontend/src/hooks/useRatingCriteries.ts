// src/hooks/useIndustries.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "./useActiveLanguage";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

export const useRatingCriteries = (options?: { enabled?: boolean }) => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["rating-criteries", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/rating-criteries?lang=${lang}`,
			);
			return data;
		},
		enabled: options?.enabled ?? true,
	});
};
