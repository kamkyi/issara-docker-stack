import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import {
	type LksgRiskValues,
	type OptionType,
	useLksgRiskStore,
} from "$src/store/lksgRiskStore";

const CASCADE_BASE = import.meta.env.VITE_APP_CASCADE_API_URL;

export interface LksgRiskSettingsPayload {
	worker_voice_mechanism?: OptionType;
	remediation_support?: OptionType;
	human_rights_officer_confirmed?: boolean;
	human_rights_officer_name?: string | null;
	senior_management_reporting_confirmed?: boolean;
	senior_management_reporting_date?: string | null;
}

const toStoreValues = (
	data: LksgRiskSettingsPayload | null | undefined,
): LksgRiskValues => ({
	workerVoiceMechanism: data?.worker_voice_mechanism || null,
	remediationSupport: data?.remediation_support || null,
	humanRightsOfficerConfirmed: Boolean(data?.human_rights_officer_confirmed),
	humanRightsOfficerName: data?.human_rights_officer_name || "",
	seniorManagementReportingConfirmed: Boolean(
		data?.senior_management_reporting_confirmed,
	),
	seniorManagementReportingDate: data?.senior_management_reporting_date || "",
});

export function useLksgRiskSettings(partnerId?: number | string | null) {
	const queryClient = useQueryClient();
	const setSavedState = useLksgRiskStore((state) => state.setSavedState);

	const queryKey = ["lksg-risk-settings", partnerId];

	const query = useQuery({
		queryKey,
		queryFn: async () => {
			if (!partnerId) return null;
			const res = await api.get(
				`${CASCADE_BASE}/cascade/strategic-partners/${partnerId}/lksg-risk-settings`,
			);
			const data: LksgRiskSettingsPayload | null = res.data?.data ?? null;
			setSavedState(toStoreValues(data));
			return data;
		},
		enabled: Boolean(partnerId),
	});

	const mutation = useMutation({
		mutationFn: async (payload: LksgRiskSettingsPayload) => {
			if (!partnerId) return payload;
			const res = await api.put(
				`${CASCADE_BASE}/cascade/strategic-partners/${partnerId}/lksg-risk-settings`,
				payload,
			);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	return {
		data: query.data,
		isLoading: query.isLoading,
		updateSettings: mutation.mutateAsync,
	};
}
