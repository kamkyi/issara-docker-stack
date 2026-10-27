import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import type { FilterBarFilters } from "$src/components/ui/FilterBar";

export interface KpiClosuresData {
	totalAffectedWorkers: number;
	totalClosedKpis: number;
	supplyChain: { workers: number; closedKpis: number };
	nonSupplyChain: { workers: number; closedKpis: number };
	monthly: {
		month: string;
		supplyChain: number;
		nonSupplyChain: number;
		supplyChainWorkers: number;
		nonSupplyChainWorkers: number;
	}[];
	monthlyQuality: {
		month: string;
		poor: number;
		fair: number;
		good: number;
		excellent: number;
		poorWorkers: number;
		fairWorkers: number;
		goodWorkers: number;
		excellentWorkers: number;
		poorRemediationUsd: number;
		fairRemediationUsd: number;
		goodRemediationUsd: number;
		excellentRemediationUsd: number;
	}[];
	qualitySummary: {
		poorKpis: number;
		poorWorkers: number;
		goodKpis: number;
		goodWorkers: number;
	};
}

const EMPTY: KpiClosuresData = {
	totalAffectedWorkers: 0,
	totalClosedKpis: 0,
	supplyChain: { workers: 0, closedKpis: 0 },
	nonSupplyChain: { workers: 0, closedKpis: 0 },
	monthly: [],
	monthlyQuality: [],
	qualitySummary: { poorKpis: 0, poorWorkers: 0, goodKpis: 0, goodWorkers: 0 },
};

const join = (values?: string[]) => {
	const cleaned = (values ?? []).filter(Boolean);
	return cleaned.length > 0 ? cleaned.join(",") : undefined;
};

export function useKpiClosures(
	filters?: FilterBarFilters & { enabled?: boolean },
) {
	// Map the FilterBar selections onto the singular query-param names the
	// internal-dashboard controller's extractFilters() understands.
	const supplierId = join(filters?.suppliers);
	const country = join(filters?.countries);
	const industry = join(filters?.industries);
	const subIndustry = join(filters?.subIndustries);
	const partnerId = join(filters?.strategicPartners);
	const from = filters?.from?.trim() || undefined;
	const to = filters?.to?.trim() || undefined;

	const queryParams = new URLSearchParams();
	if (partnerId) queryParams.append("partner_id", partnerId);
	if (supplierId) queryParams.append("supplier_id", supplierId);
	if (country) queryParams.append("country", country);
	if (industry) queryParams.append("industry", industry);
	if (subIndustry) queryParams.append("sub_industry", subIndustry);
	if (from) queryParams.append("from", from);
	if (to) queryParams.append("to", to);

	const queryString = queryParams.toString();
	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/ilm/kpi-closures${
		queryString ? `?${queryString}` : ""
	}`;

	return useQuery({
		queryKey: [
			"kpi-closures",
			partnerId,
			supplierId,
			country,
			industry,
			subIndustry,
			from,
			to,
		],
		enabled: filters?.enabled ?? true,
		placeholderData: keepPreviousData,
		queryFn: async () => {
			const res = await api.get<
				{ data?: KpiClosuresData } & Partial<KpiClosuresData>
			>(url);
			return (res.data?.data ?? res.data ?? EMPTY) as KpiClosuresData;
		},
	});
}
