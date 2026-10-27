import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface FieldworkActivityApiItem {
	id?: number;
	fieldwork_activity_id?: number;
	fieldwork_date?: string;
	organization_name?: string;
	fieldwork_type_name?: string;
	supplier_names?: string | string[];
	recruiters_names?: string | string[];
	recruiter_names?: string | null;
	outreach_target?: number | null;
	nationality_name?: string | null;
	female_workers_reached?: number | null;
	male_workers_reached?: number | null;
	bangladeshi_workers_reached?: number | null;
	cambodian_workers_reached?: number | null;
	filipino_workers_reached?: number | null;
	indian_workers_reached?: number | null;
	indonesian_workers_reached?: number | null;
	lao_workers_reached?: number | null;
	malaysian_workers_reached?: number | null;
	myanmar_workers_reached?: number | null;
	nepalese_workers_reached?: number | null;
	pakistani_workers_reached?: number | null;
	sri_lankan_workers_reached?: number | null;
	taiwanese_workers_reached?: number | null;
	thai_workers_reached?: number | null;
	vietnamese_workers_reached?: number | null;
	other_workers_reached?: number | null;
	male_reached?: number | null;
	female_reached?: number | null;
	district_name?: string;
	province_name?: string;
	country_name?: string;
	target?: string;
	target_name?: string;
	notes?: string;
	links?: string | string[];
	link_url?: string;
	fieldwork_category_id?: number | null;
	fieldwork_category_name?: string | null;
	org_bucket?: "Issara" | "Partners";
	total_worker?: number;
	total_workers_reached?: number;
	total_people_reached?: number;
	total_workers?: number;
	workers_reached?: number;
	created_by?: string;
	created_by_name?: string;
	created_by_email?: string;
	[key: string]: unknown;
}

export interface OutreachEffectivenessData {
	fieldActivities: FieldworkActivityApiItem[];
	results?: FieldworkActivityApiItem[];
	data?: FieldworkActivityApiItem[];
	activitiesByMonth: Record<string, { month: string; count: number }>[];
	activitiesByType: Record<string, { type: string; count: number }>[];
	categories?: { id: number; name: string }[];
	geo?: GeoOptions;
}

export interface GeoOptions {
	countries: { id: number; name: string }[];
	provinces: { id: number; name: string; countryId: number | null }[];
	districts: { id: number; name: string; provinceId: number | null }[];
}

type OutreachEffectivenessResponse = {
	data?: OutreachEffectivenessData | FieldworkActivityApiItem[];
} & Partial<OutreachEffectivenessData>;

interface OutreachEffectivenessParams {
	startTimestamp?: number;
	from?: string;
	endTimestamp?: number;
	to?: string;
	country?: string;
	province?: string;
	district?: string;
	supplierId?: string;
}

const DEFAULT_QUERY_PARAMS = {
	startTimestamp: 1704067200, // Jan 1, 2024
	from: "2025-01-01",
	endTimestamp: 1779184484,
	to: "2026-05-19",
} satisfies OutreachEffectivenessParams;

export function useOutreachEffectiveness(params?: OutreachEffectivenessParams) {
	const mergedParams = {
		...DEFAULT_QUERY_PARAMS,
		...(params ?? {}),
	};

	const search = new URLSearchParams({
		start_timestamp: String(mergedParams.startTimestamp),
		from: mergedParams.from,
		end_timestamp: String(mergedParams.endTimestamp),
		to: mergedParams.to,
	});
	if (mergedParams.country) search.set("country", mergedParams.country);
	if (mergedParams.province) search.set("province", mergedParams.province);
	if (mergedParams.district) search.set("district", mergedParams.district);
	if (mergedParams.supplierId)
		search.set("supplier_id", mergedParams.supplierId);
	const queryString = search.toString();

	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/ilm/outreach-effectiveness/?${queryString}`;

	return useQuery({
		queryKey: ["outreach-effectiveness", mergedParams],
		queryFn: async () => {
			const response = await api.get<OutreachEffectivenessResponse>(url);
			const payload = response.data.data ?? response.data;
			if (Array.isArray(payload)) {
				return {
					fieldActivities: payload,
					activitiesByMonth: [],
					activitiesByType: [],
					top5FieldsWorkActivitiesByImpact: [],
					categories: [],
					geo: { countries: [], provinces: [], districts: [] },
				};
			}

			return {
				fieldActivities: payload.fieldActivities ?? payload.data ?? [],
				results: payload.results,
				data: payload.data,
				activitiesByMonth: payload.activitiesByMonth ?? [],
				activitiesByType: payload.activitiesByType ?? [],
				top5FieldsWorkActivitiesByImpact:
					(payload as any).top5FieldsWorkActivitiesByImpact ?? [],
				categories: payload.categories ?? [],
				geo: payload.geo ?? { countries: [], provinces: [], districts: [] },
			};
		},
	});
}
