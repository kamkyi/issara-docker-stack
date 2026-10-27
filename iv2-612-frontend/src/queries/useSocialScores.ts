import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import socialScoresMock from "$src/assets/mock/social-scores.json";
import { useMockData } from "$src/utils/config";

export interface SocialScoresResult {
	overall: number;
	labor: number;
	recruitment: number;
	livingWage: number;
	trends: {
		overall: number;
		labor: number;
		recruitment: number;
		livingWage: number;
	};
}

export function useSocialScores(
	supplierIds?: number[] | null,
	partnerId?: number | null,
	startDate?: string | null,
	endDate?: string | null,
	country?: string,
	industry?: string,
) {
	const shouldUseMock = useMockData();

	const queryParams = new URLSearchParams();
	if (supplierIds && supplierIds.length > 0) {
		queryParams.append("supplier_id", supplierIds.join(","));
	}
	if (partnerId) queryParams.append("partner_id", String(partnerId));
	if (startDate) queryParams.append("start_date", startDate);
	if (endDate) queryParams.append("end_date", endDate);
	if (country) queryParams.append("country", country);
	if (industry) queryParams.append("industry", industry);
	const queryString = queryParams.toString();

	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/social-scores${queryString ? `?${queryString}` : ""}`;

	return useQuery<SocialScoresResult>({
		queryKey: [
			"social-scores",
			supplierIds,
			partnerId,
			startDate,
			endDate,
			country,
			industry,
			shouldUseMock,
		],
		placeholderData: keepPreviousData,
		queryFn: async () => {
			if (shouldUseMock) return socialScoresMock as SocialScoresResult;
			const res = await api.get(url);
			return res.data as SocialScoresResult;
		},
		enabled: shouldUseMock || !!(supplierIds?.length || partnerId),
	});
}
