// src/hooks/useStates.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useActiveLanguage } from "./useActiveLanguage";

const API_URL = import.meta.env.VITE_APP_GD_API_V1_URL;

export const useStates = () => {
	const lang = useActiveLanguage();
	return useQuery({
		queryKey: ["states", lang],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}/localization/states?lang=${lang}`,
			);
			return data;
		},
	});
};
