import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface HotlineOperator {
	id: number;
	name: string;
}

export interface HotlineOperatorsResponse {
	status: string;
	data: HotlineOperator[];
}

const API_BASE_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/ilm`;

export const useHotlineOperators = () => {
	return useQuery({
		queryKey: ["hotline-operators"],
		queryFn: async () => {
			const response = await api.get<HotlineOperatorsResponse>(
				`${API_BASE_URL}/hotline-operators`,
			);
			return response.data;
		},
	});
};
