import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import cascadeIndexMock from "$src/assets/mock/cascade-index.json";
import { useMockData } from "$src/utils/config";

export interface CascadeIndexResult {
	wvScore: number;
	ciScore: number;
	finalScore: number;
	supplierScores: Array<{ supplier_id: number; score: number }>;
}

export function useCascadeIndex(
	supplierId?: number | null,
	partnerId?: number | null,
	startTime?: string | null,
	endTime?: string | null,
	country?: string,
	industry?: string,
) {
	const shouldUseMock = useMockData();

	const queryParams = new URLSearchParams();
	if (supplierId) queryParams.append("supplier_id", String(supplierId));
	if (partnerId) queryParams.append("partner_id", String(partnerId));
	if (startTime) queryParams.append("start_time", startTime);
	if (endTime) queryParams.append("end_time", endTime);
	if (country) queryParams.append("country", country);
	if (industry) queryParams.append("industry", industry);
	const queryString = queryParams.toString();

	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/cascade-index${queryString ? `?${queryString}` : ""}`;

	return useQuery<CascadeIndexResult>({
		queryKey: [
			"cascade-index",
			supplierId,
			partnerId,
			startTime,
			endTime,
			country,
			industry,
			shouldUseMock,
		],
		queryFn: async () => {
			if (shouldUseMock) {
				console.log("[CascadeIndex] wvScore (mock):", cascadeIndexMock.wvScore);
				console.log(
					"[CascadeIndex] Worker Voice scores per supplier (mock):",
					cascadeIndexMock.supplierScores,
				);
				return cascadeIndexMock as CascadeIndexResult;
			}
			const res = await api.get(url);
			const result = res.data as CascadeIndexResult;
			console.log("[CascadeIndex] wvScore:", result.wvScore);
			console.log(
				"[CascadeIndex] Worker Voice scores per supplier:",
				result.supplierScores,
			);
			return result;
		},
		enabled: shouldUseMock || !!(supplierId || partnerId),
	});
}
