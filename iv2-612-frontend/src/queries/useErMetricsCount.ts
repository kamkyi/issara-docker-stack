import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { api } from "$src/api/axios";

export interface ErMetricsCountData {
	workers_voice_channels: number;
	workers_receiving_remedition: number;
	workers_pre_departure_mm: number;
	workers_pre_departure_ne: number;
	workers_pre_departure_kh: number;
	workers_pre_departure_vn: number;
	workers_pre_departure_th: number;
	workers_trained: number;
	recruitment_related_fees_detected_and_intercepted: number;
	remediation_for_recruitment_fees_and_cases: number;
	recruitment_agencies_trained: number;
	suppliers_trained: number;
}

export interface UseErMetricsCountParams {
	startTimestamp?: number | string;
	endTimestamp?: number | string;
}

// Default timestamps: Jan 1, 2024 to Jan 1, 2025
const DEFAULT_START_TIMESTAMP = 1514739600; // Jan 1, 2024 00:00:00 UTC
const DEFAULT_END_TIMESTAMP = 1781164737; // Jan 1, 2025 00:00:00 UTC

export function useErMetricsCount(params?: UseErMetricsCountParams) {
	const startTimestamp = params
		? moment(params.startTimestamp).unix()
		: DEFAULT_START_TIMESTAMP;
	const endTimestamp = params
		? moment(params.endTimestamp).unix()
		: DEFAULT_END_TIMESTAMP;

	const queryString = new URLSearchParams({
		start_timestamp: String(startTimestamp),
		end_timestamp: String(endTimestamp),
	}).toString();

	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/ilm/er-metrics-count?${queryString}`;

	return useQuery({
		queryKey: ["er-metrics-count", startTimestamp, endTimestamp],
		queryFn: async () => {
			const response = await api.get(url);
			const payload = response.data.data;

			// If response has a data field with array
			if (payload) {
				return payload as ErMetricsCountData;
			}
			return {} as ErMetricsCountData;
		},
	});
}
