import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

type IndustryFilter = string | number | { id: number; name?: string };

export interface SupplyChainSuppliersTableParams {
	partnerId?: string | number | Array<string | number>;
	spGrouping?: string | string[];
	country?: string | string[];
	province?: string | string[];
	district?: string | string[];
	industry?: IndustryFilter | IndustryFilter[];
	industries?: IndustryFilter[];
	page?: number;
	pageSize?: number;
	enabled?: boolean;
	ne_lat?: number;
	ne_lng?: number;
	sw_lat?: number;
	sw_lng?: number;
	/**
	 * Free-text search per table column, sent as `q_*` params and matched
	 * case-insensitively server-side so results cover the whole dataset rather
	 * than the current page.
	 */
	search?: SupplyChainSuppliersSearch;
}

export interface SupplyChainSuppliersSearch {
	/** DataGrid column fields not named below (e.g. `industries`) are also accepted. */
	[field: string]: string | undefined;
	supplierName?: string;
	strategicPartner?: string;
	strategicPartnerGrouping?: string;
	country?: string;
	province?: string;
	district?: string;
	industry?: string;
	tier?: string;
	workerVoiceStatus?: string;
}

/**
 * Maps the table's column fields onto the API's `q_*` query params. Exported so
 * the map query (`useChoroplethData`) sends exactly the same params and the two
 * can't drift apart.
 *
 * `industries` is the DataGrid field name for the industry column, so the
 * per-column search box keys its value under that name rather than `industry`.
 */
export const SEARCH_PARAMS: Record<string, string> = {
	supplierName: "q_supplier_name",
	strategicPartner: "q_strategic_partner",
	strategicPartnerGrouping: "q_sp_grouping",
	country: "q_country",
	province: "q_province",
	district: "q_district",
	industry: "q_industry",
	industries: "q_industry",
	tier: "q_tier",
	workerVoiceStatus: "q_worker_voice_status",
};

/** Reduces a per-column search record to the non-empty `q_*` params it implies. */
export const toSearchQueryParams = (
	search?: Record<string, string | undefined>,
): Record<string, string> => {
	const params: Record<string, string> = {};
	if (!search) return params;
	for (const [field, paramName] of Object.entries(SEARCH_PARAMS)) {
		const value = search[field]?.trim();
		if (value) params[paramName] = value;
	}
	return params;
};

export interface SupplyChainSupplierRow {
	id?: number | string;
	supplier_id?: number | string;
	supplier_name?: string;
	name?: string;
	strategic_partners: {
		id: number;
		name: string;
		supply_chain_name?: string;
	}[];
	strategic_partner_grouping?: string;
	strategic_partner_grouping_name?: string;
	country?: string;
	country_name?: string;
	district?: string;
	district_name?: string;
	province?: string;
	province_name?: string;
	industries: { id: number; name: string }[];
	tier?: string | number;
	tier_id?: string | number;
	worker_voice_status?: string;
	worker_voice_status_name?: string;
}

export interface SupplyChainSuppliersTableResponse {
	count: number;
	page: number;
	pageSize: number;
	results: SupplyChainSupplierRow[];
}

const toCsv = (
	value?: string | number | Array<string | number>,
): string | undefined => {
	if (value == null) return undefined;
	if (Array.isArray(value)) {
		const sanitized = value
			.map((item) => String(item).trim())
			.filter((item) => item.length > 0);
		return sanitized.length > 0 ? sanitized.join(",") : undefined;
	}
	const normalized = String(value).trim();
	return normalized.length > 0 ? normalized : undefined;
};

export const useSupplyChainSuppliersTable = (
	params?: SupplyChainSuppliersTableParams,
) => {
	const page = params?.page ?? 1;
	const pageSize = params?.pageSize ?? 20;
	const industrySource = params?.industry ?? params?.industries;
	const industryList = Array.isArray(industrySource)
		? industrySource
		: industrySource == null
			? []
			: [industrySource];

	return useQuery({
		queryKey: [
			"supply-chain-suppliers-table",
			params?.partnerId,
			params?.spGrouping,
			params?.country,
			params?.province,
			params?.district,
			industryList,
			page,
			pageSize,
			params?.ne_lat,
			params?.ne_lng,
			params?.sw_lat,
			params?.sw_lng,
			params?.search,
		],
		enabled: params?.enabled ?? true,
		placeholderData: keepPreviousData,
		queryFn: async (): Promise<SupplyChainSuppliersTableResponse> => {
			const query = new URLSearchParams();

			const partnerId = toCsv(params?.partnerId);
			const spGrouping = toCsv(params?.spGrouping);
			const country = toCsv(params?.country);
			const province = toCsv(params?.province);
			const district = toCsv(params?.district);
			const industry = toCsv(
				industryList.map((industryItem) =>
					typeof industryItem === "object" ? industryItem.id : industryItem,
				),
			);

			if (partnerId) query.append("partner_id", partnerId);
			if (spGrouping) query.append("sp_grouping", spGrouping);
			if (country) query.append("country", country);
			if (province) query.append("province", province);
			if (district) query.append("district", district);
			if (industry) query.append("industry", industry);
			if (params?.ne_lat != null) query.append("ne_lat", String(params.ne_lat));
			if (params?.ne_lng != null) query.append("ne_lng", String(params.ne_lng));
			if (params?.sw_lat != null) query.append("sw_lat", String(params.sw_lat));
			if (params?.sw_lng != null) query.append("sw_lng", String(params.sw_lng));

			for (const [paramName, value] of Object.entries(
				toSearchQueryParams(params?.search),
			)) {
				query.append(paramName, value);
			}

			query.append("page", String(page));
			query.append("page_size", String(pageSize));

			const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL ?? "";
			const url = `${baseUrl}/cascade/suppliers?${query.toString()}`;
			const { data } = await api.get(url);

			const payload =
				(data?.results && data) ||
				(data?.data?.results && data.data) ||
				(Array.isArray(data) ? { results: data } : null);

			const results = Array.isArray(payload?.results) ? payload.results : [];
			const count =
				typeof payload?.count === "number" ? payload.count : results.length;

			return {
				count,
				page,
				pageSize,
				results,
			};
		},
	});
};
