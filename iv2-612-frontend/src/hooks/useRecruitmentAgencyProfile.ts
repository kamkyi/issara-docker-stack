import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";

const API_BASE_URL = import.meta.env.VITE_APP_CASCADE_API_URL + "/ilm";

export interface RecruitmentAgencyBasicInformation {
	user_id: number;
	company_name: string | null;
	company_description: string | null;
	country: string | null;
	sending_countries: string[];
	industries: number[];
	sub_industries: number[];
	avatar: string | null;
	date_of_registration: string | null;
	cambodia_recruiter_registration_year: number | null;
	license_number: string | null;
	license_valid_date: string | null;
	thai_license_number: string | null;
	thai_license_valid_date: string | null;
	status: string | null;
	status_from_date: string | null;
	status_to_date: string | null;
	latitude: number | null;
	longitude: number | null;
}

export interface RecruitmentAgencyBasicInformationUpdatePayload {
	company_name?: string;
	company_description?: string;
	country?: string;
	sending_countries?: string[];
	industries?: number[];
	sub_industries?: number[];
	date_of_registration?: string | null;
	cambodia_recruiter_registration_year?: number | null;
	license_number?: string;
	license_valid_date?: string | null;
	thai_license_number?: string;
	thai_license_valid_date?: string | null;
	status?: string;
	status_from_date?: string | null;
	status_to_date?: string | null;
	latitude?: number | null;
	longitude?: number | null;
}

export interface RecruitmentAgencyContactInformation {
	user_id: number;
	main_contact_name: string | null;
	contact_phone_number: string | null;
	website: string | null;
	email: string | null;
	phone_numbers: string | null;
	facebook: string | null;
	viber: string | null;
	line: string | null;
	zalo: string | null;
}

export type RecruitmentAgencyContactInformationUpdatePayload = Partial<
	Omit<RecruitmentAgencyContactInformation, "user_id">
>;

interface BasicInformationResponse {
	status: string;
	data: { basicInformation: RecruitmentAgencyBasicInformation };
}

interface ContactInformationResponse {
	status: string;
	data: { contactInformation: RecruitmentAgencyContactInformation };
}

export const useRecruitmentAgencyBasicInformation = (userId: number | null) => {
	return useQuery({
		queryKey: ["recruitment-agency-basic-information", userId],
		queryFn: async () => {
			const response = await api.get<BasicInformationResponse>(
				`${API_BASE_URL}/recruitment-agencies/${userId}/basic-information`,
			);
			return response.data.data.basicInformation;
		},
		enabled: Number.isFinite(userId) && Number(userId) > 0,
	});
};

export const useUpdateRecruitmentAgencyBasicInformation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			payload,
		}: {
			userId: number;
			payload: RecruitmentAgencyBasicInformationUpdatePayload;
		}) => {
			const response = await api.put<BasicInformationResponse>(
				`${API_BASE_URL}/recruitment-agencies/${userId}/basic-information`,
				payload,
			);
			return response.data.data.basicInformation;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["recruitment-agency-basic-information", variables.userId],
			});
		},
	});
};

export const useRecruitmentAgencyContactInformation = (
	userId: number | null,
) => {
	return useQuery({
		queryKey: ["recruitment-agency-contact-information", userId],
		queryFn: async () => {
			const response = await api.get<ContactInformationResponse>(
				`${API_BASE_URL}/recruitment-agencies/${userId}/contact-information`,
			);
			return response.data.data.contactInformation;
		},
		enabled: Number.isFinite(userId) && Number(userId) > 0,
	});
};

export const useUpdateRecruitmentAgencyContactInformation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			userId,
			payload,
		}: {
			userId: number;
			payload: RecruitmentAgencyContactInformationUpdatePayload;
		}) => {
			const response = await api.put<ContactInformationResponse>(
				`${API_BASE_URL}/recruitment-agencies/${userId}/contact-information`,
				payload,
			);
			return response.data.data.contactInformation;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["recruitment-agency-contact-information", variables.userId],
			});
		},
	});
};
