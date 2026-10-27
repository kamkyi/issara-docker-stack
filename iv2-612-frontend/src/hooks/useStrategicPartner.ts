import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";

const API_BASE_URL = import.meta.env.VITE_APP_CASCADE_API_URL + "/ilm";

export interface StrategicPartnerUser {
	user_id: number;
	strategic_partner_id: number;
}

export interface SpDetailSourcingCountry {
	id: number;
	sp_detail_id: number;
	country_id: number;
}

export interface SpDetailIndustry {
	id: number;
	sp_detail_id: number;
	industry_id: number;
}

export interface SpDetailProductCategory {
	id: number;
	sp_detail_id: number;
	product_category_id: number;
}

export interface PolicyCompliance {
	id: number;
	name?: string;
	code?: string;
	slug?: string;
	title?: string;
}

export interface StrategicPartnerPolicyCompliance {
	id: number;
	strategic_partner_id: number;
	policy_compliance_id: number;
	value?: string | null;
	text_value?: string | null;
	link_url?: string | null;
	policy_compliance?: PolicyCompliance;
}

export interface StrategicPartnerWorkplanFile {
	id: number | null;
	name?: string | null;
	description?: string | null;
	type?: string | null;
	file_path?: string | null;
	document_type?: string | null;
	document_type_display?: string | null;
	document_name?: string | null;
}

export interface StrategicPartnerProductCategory {
	id: number;
	strategic_partner_id: number;
	product_category_id: number;
}

export interface StrategicPartnerDetail {
	id: number;
	strategic_partner_id: number;
	SourcingCountries?: SpDetailSourcingCountry[];
	Industries?: SpDetailIndustry[];
	ProductCategories?: SpDetailProductCategory[];
}

export interface SourcingData {
	sourcing_country_ids: number[];
	industry_ids: number[];
	product_category_ids: number[];
}

export interface StrategicPartner {
	id: number;
	name: string;
	address: string;
	zipcode: string;
	contract_start_date: string | null;
	contract_end_date: string | null;
	payment_amount: number;
	payment_receipt_date: string | null;
	date_last_annual_risk_report: string | null;
	date_last_call_meeting_visit: string | null;
	focal_point_name: string;
	focal_point_title: string;
	focal_point_email: string;
	focal_point_phone_number: string;
	products_sourced: string;
	created: string;
	last_modified: string;
	country_id: number | null;
	country?: number | null;
	agreement: string | null;
	background: string | null;
	image: string | null;
	lat: number | null;
	lng: number | null;
	notes: string | null;
	website: string;
	imageicon_id: number;
	email_notify: number;
	strategicPartnerUsers: StrategicPartnerUser[];
	policy: string | null;
	strategicPartnerDetails?: StrategicPartnerDetail[];
	strategicPartnerPolicyCompliances?: StrategicPartnerPolicyCompliance[];
	strategicPartnerProductCategories?: StrategicPartnerProductCategory[];
	sourcingCountries?: { country_id: number }[];
	industries?: { industry_id: number }[];
	sourcing?: SourcingData;
	policyCompliances?: StrategicPartnerPolicyCompliance[];
	policy_compliances?: StrategicPartnerPolicyCompliance[];
	workplan_files?: StrategicPartnerWorkplanFile[];
	policy_files?: StrategicPartnerWorkplanFile[];
	compliance_files?: StrategicPartnerWorkplanFile[];
	grouping?: string;
	grouping_name?: string;
	strategic_partner_grouping?: string;
}

export interface StrategicPartnerPayload {
	name: string;
	[key: string]: unknown;
}

export interface StrategicPartnerPartnerUpdatePayload {
	name: string;
	address?: string;
	website?: string;
	background?: string;
	country_id?: number | null;
	image?: string | null;
	[key: string]: unknown;
}

export interface StrategicPartnerSourcingUpdatePayload {
	sourcing_country_ids: number[];
	industry_ids: number[];
	product_category_ids: number[];
}

export interface StrategicPartnerPolicyComplianceUpdatePayload {
	policy_compliance_id: number;
	text_value: string | null;
	link_url: string | null;
}

export interface StrategicPartnerUpdatePayload {
	partner: StrategicPartnerPartnerUpdatePayload;
	sourcing: StrategicPartnerSourcingUpdatePayload;
	policy_compliances: StrategicPartnerPolicyComplianceUpdatePayload[];
}

interface StrategicPartnersResponse {
	status: string;
	data: {
		strategicPartners: StrategicPartner[];
	};
}

interface StrategicPartnerByIdResponse {
	status: string;
	data: {
		strategicPartners?: StrategicPartner[];
		strategicPartner?: StrategicPartner;
	};
}

// List all strategic partners
export const useStrategicPartners = () => {
	return useQuery({
		queryKey: ["strategic-partners"],
		staleTime: 0,
		gcTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
		refetchOnReconnect: "always",
		queryFn: async () => {
			const response = await api.get<StrategicPartnersResponse>(
				`${API_BASE_URL}/strategic-partners`,
			);
			return response.data.data.strategicPartners;
		},
	});
};

// Get a single strategic partner by ID
export const useStrategicPartnerById = (id: number) => {
	return useQuery({
		queryKey: ["strategic-partners", id],
		staleTime: 0,
		gcTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
		refetchOnReconnect: "always",
		queryFn: async () => {
			const response = await api.get<StrategicPartnerByIdResponse>(
				`${API_BASE_URL}/strategic-partners/${id}`,
			);
			const payload = response.data.data;
			return payload.strategicPartners?.[0] ?? payload.strategicPartner ?? null;
		},
		enabled: Number.isFinite(id) && id > 0,
	});
};

// Create a new strategic partner
export const useCreateStrategicPartner = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: StrategicPartnerPayload) => {
			const response = await api.post<StrategicPartnerByIdResponse>(
				`${API_BASE_URL}/strategic-partners`,
				payload,
			);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["strategic-partners"] });
		},
	});
};

// Update an existing strategic partner
export const useUpdateStrategicPartner = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...payload
		}: StrategicPartnerUpdatePayload & { id: number }) => {
			const response = await api.put<StrategicPartnerByIdResponse>(
				`${API_BASE_URL}/strategic-partners/${id}`,
				payload,
			);
			return response.data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["strategic-partners"] });
			queryClient.invalidateQueries({
				queryKey: ["strategic-partners", variables.id],
			});
		},
	});
};
