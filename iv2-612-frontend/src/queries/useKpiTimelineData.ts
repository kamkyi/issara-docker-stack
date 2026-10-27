import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface KpiTimelineParams {
	supplierId?: number | number[] | null;
	partnerId?: number | null;
	country?: string;
	industry?: string;
}

export function useKpiTimelineData(
	params?: KpiTimelineParams,
	options?: { enabled?: boolean },
) {
	const { supplierId, partnerId, country, industry } = params || {};

	// Build query params
	const queryParams = new URLSearchParams();
	if (supplierId) {
		if (Array.isArray(supplierId)) {
			supplierId.forEach((id) => {
				queryParams.append("supplier_id", String(id));
			});
		} else {
			queryParams.append("supplier_id", String(supplierId));
		}
	}
	if (partnerId) {
		queryParams.append("partner_id", String(partnerId));
	}
	if (country) {
		queryParams.append("country", country);
	}
	if (industry) {
		queryParams.append("industry", industry);
	}

	const queryString = queryParams.toString();
	const KPI_API_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/kpis/${
		queryString ? `?${queryString}` : ""
	}`;

	return useQuery({
		queryKey: ["cascade-kpis", supplierId, partnerId, country, industry],
		queryFn: async () => {
			const res = await api.get(KPI_API_URL);
			return res.data;
		},
		...options,
	});
}
