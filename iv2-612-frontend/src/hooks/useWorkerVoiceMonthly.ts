import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface WorkerVoiceMonthlyItem {
	month: string; // ISO date string like "2018-01-01"
	data: Array<{ key: string; count: number }>;
}

export interface WorkerVoiceMonthlyResponse {
	status: string;
	data: WorkerVoiceMonthlyItem[];
}

const API_BASE_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/social-responsibility/labor`;

interface WorkerVoiceMonthlyFilters {
	supplierId?: string;
	country?: string;
	industry?: string;
	operator?: string;
}

export const useWorkerVoiceMonthly = (
	from: string,
	to: string,
	filters?: WorkerVoiceMonthlyFilters,
) => {
	return useQuery({
		queryKey: ["worker-voice-monthly", { from, to, ...filters }],
		queryFn: async () => {
			const response = await api.get<WorkerVoiceMonthlyResponse>(
				`${API_BASE_URL}/worker-voice-monthly`,
				{
					params: {
						from,
						to,
						supplier_id: filters?.supplierId,
						country: filters?.country,
						industry: filters?.industry,
						operator: filters?.operator,
					},
				},
			);
			return response.data;
		},
		enabled: !!from && !!to,
	});
};
