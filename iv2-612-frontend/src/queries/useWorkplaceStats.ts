import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import companyDashboardData from "$src/assets/mock/company-dashboard.json";
import supplierDashboardData from "$src/assets/mock/supplier-dashboard.json";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import { useMockData } from "$src/utils/config";

export interface WorkplaceStatsParams {
	supplierId?: string | string[] | number | number[] | null;
	partnerId?: string | string[] | number | number[] | null;
	forceApi?: boolean;
	startTime?: string | null; // ISO YYYY-MM-DD
	endTime?: string | null; // ISO YYYY-MM-DD
	startDate?: string | null; // alias for startTime
	endDate?: string | null; // alias for endTime
	country?: string;
	province?: string;
	district?: string;
	industry?: string;
	strategicPartnerGrouping?: string;
	subIndustry?: string;
	allSuppliers?: boolean; // if true, fetches all suppliers regardless of filters
	// Opt-in, mock-mode only: return the single-factory fixture
	// (supplier-dashboard.json) instead of the supply-chain-wide
	// company-dashboard.json. Set by supplier-facing views only, so partner and
	// public pages keep the aggregate mock they render today.
	supplierScopedMock?: boolean;
}

export function useWorkplaceStats(params?: WorkplaceStatsParams) {
	const lang = useActiveLanguage();
	const {
		supplierId,
		partnerId,
		forceApi,
		country,
		province,
		district,
		industry,
		subIndustry,
		strategicPartnerGrouping,
		allSuppliers,
		supplierScopedMock,
	} = params || {};
	let { startTime, endTime } = params || {};

	// Accept startDate/endDate as aliases for startTime/endTime
	startTime = startTime ?? params?.startDate ?? undefined;
	endTime = endTime ?? params?.endDate ?? undefined;

	// Default date range: past 12 months (inclusive)
	if (!startTime || !endTime) {
		const now = new Date();
		const start = new Date(now);
		start.setFullYear(start.getFullYear() - 1);
		startTime = startTime || "";
		endTime = endTime || "";
	}

	// Build query params — send supplier_id as a comma-separated single string
	const queryParams = new URLSearchParams();
	if (supplierId) {
		const ids = Array.isArray(supplierId) ? supplierId : [supplierId];
		const joined = `${ids.map(String).join(",")},`;
		queryParams.append("supplier_id", joined);
	}
	if (partnerId) {
		const ids = Array.isArray(partnerId) ? partnerId : [partnerId];
		const joined = ids.map(String).join(",");
		queryParams.append("partner_id", joined);
	}
	if (country) {
		queryParams.append("country", country);
	}
	if (province) {
		queryParams.append("province", province);
	}
	if (district) {
		queryParams.append("district", district);
	}
	if (industry) {
		queryParams.append("industry", industry);
	}
	if (strategicPartnerGrouping) {
		queryParams.append("strategic_partner_grouping", strategicPartnerGrouping);
	}
	if (subIndustry) {
		queryParams.append("sub_industry", subIndustry);
	}
	if (allSuppliers) {
		queryParams.append("all_suppliers", "true");
	}
	if (startTime) queryParams.append("start_time", String(startTime));
	if (endTime) queryParams.append("end_time", String(endTime));
	queryParams.append("lang", lang);

	const queryString = queryParams.toString();
	const API_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/cascade_workplace/${
		queryString ? `?${queryString}` : ""
	}`;

	const shouldUseMock = useMockData() && !forceApi;

	return useQuery({
		queryKey: [
			"cascade-workplace",
			supplierId,
			partnerId,
			forceApi,
			country,
			province,
			district,
			industry,
			strategicPartnerGrouping,
			subIndustry,
			startTime,
			endTime,
			lang,
			shouldUseMock,
			supplierScopedMock,
		],
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		queryFn: async () => {
			if (shouldUseMock) {
				return supplierScopedMock
					? supplierDashboardData
					: companyDashboardData;
			}

			const res = await api.get(API_URL);
			return res.data;
		},
	});
}

export function useLksgTreemap(params?: WorkplaceStatsParams) {
	const lang = useActiveLanguage();
	const {
		supplierId,
		partnerId,
		forceApi,
		country,
		province,
		district,
		industry,
		subIndustry,
		strategicPartnerGrouping,
		allSuppliers,
	} = params || {};
	let { startTime, endTime } = params || {};

	startTime = startTime ?? params?.startDate ?? undefined;
	endTime = endTime ?? params?.endDate ?? undefined;

	const queryParams = new URLSearchParams();
	if (supplierId) {
		const ids = Array.isArray(supplierId) ? supplierId : [supplierId];
		queryParams.append("supplier_id", ids.map(String).join(","));
	}
	if (partnerId) {
		const ids = Array.isArray(partnerId) ? partnerId : [partnerId];
		queryParams.append("partner_id", ids.map(String).join(","));
	}
	if (country) queryParams.append("country", country);
	if (province) queryParams.append("province", province);
	if (district) queryParams.append("district", district);
	if (industry) queryParams.append("industry", industry);
	if (strategicPartnerGrouping)
		queryParams.append("strategic_partner_grouping", strategicPartnerGrouping);
	if (subIndustry) queryParams.append("sub_industry", subIndustry);
	if (allSuppliers) queryParams.append("all_suppliers", "true");
	if (startTime) queryParams.append("start_time", String(startTime));
	if (endTime) queryParams.append("end_time", String(endTime));
	queryParams.append("lang", lang);

	const queryString = queryParams.toString();
	const API_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/lksg_treemap${
		queryString ? `?${queryString}` : ""
	}`;

	const shouldUseMock = useMockData() && !forceApi;

	return useQuery({
		queryKey: [
			"lksg-treemap",
			supplierId,
			partnerId,
			forceApi,
			country,
			province,
			district,
			industry,
			strategicPartnerGrouping,
			subIndustry,
			startTime,
			endTime,
			lang,
			shouldUseMock,
		],
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		queryFn: async () => {
			if (shouldUseMock) {
				return null;
			}
			try {
				const res = await api.get(API_URL);
				return res.data?.data;
			} catch (err) {
				return null;
			}
		},
	});
}
