import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface WorkerVoiceMonthlyBreakdownItem {
	month: string;
	total: number;
	uniqueWorkers?: number;
}

export interface WorkerVoiceRollingAverageItem {
	month: string;
	average: number;
}

export interface WorkerVoiceSummaryData {
	workersWithAccess: number;
	totalInteractions: number;
	totalUniqueWorkers: number;
	monthlyBreakdown: WorkerVoiceMonthlyBreakdownItem[];
	monthlyRollingAverage?: WorkerVoiceRollingAverageItem[];
	casesByCountry: Array<{ country: string; count: number }>;
	casesByIndustry: Array<{ industry: string; count: number }>;
	casesByGender: Array<{ gender: string; count: number }>;
	nationalityByCallCount?: Array<{ nationality: string; count: number }>;
	casesByOperator?: Array<{
		operator: string;
		operatorId: number;
		count: number;
	}>;
	firstTimeContactingIssara?: number;
	firstTimeMonthlyBreakdown?: Array<{ month: string; total: number }>;
}

export interface WorkerVoiceResponse {
	status: string;
	data: WorkerVoiceSummaryData;
}

const API_BASE_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/ilm`;

interface WorkerVoiceFilters {
	supplierId?: string;
	country?: string;
	industry?: string;
	operator?: string;
}

export const useWorkerVoice = (
	from?: string,
	to?: string,
	filters?: WorkerVoiceFilters,
) => {
	return useQuery({
		queryKey: ["worker-voice", { from, to, ...filters }],
		queryFn: async () => {
			const response = await api.get<WorkerVoiceResponse>(
				`${API_BASE_URL}/worker-voice`,
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
	});
};
