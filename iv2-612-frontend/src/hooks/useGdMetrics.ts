import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

const API_BASE_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/gd`;

export interface GdMetrics {
	totalUsers: number;
	languages: { name: string; count: number }[];
	totalEmployers: number;
	totalRecruiters: number;
	totalComments: number;
	totalQuestionsAndAnswers: number;
}

// Hook for Golden Dreams Metrics
export const useGdMetrics = () =>
	useQuery({
		queryKey: ["gdMetrics"],
		queryFn: async () => {
			const response = await api.get<{
				data: GdMetrics;
				status: string;
			}>(`${API_BASE_URL}/metrics`);
			return response.data;
		},
	});
