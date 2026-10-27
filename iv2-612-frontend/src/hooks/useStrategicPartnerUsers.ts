import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getStrategicPartnerId } from "$src/utils/auth-utils";
import {
	normalizeUsersResponse,
	type OrganizationUser,
	type OrganizationUserDetail,
	type OrganizationUsersResponse,
} from "$src/utils/organizationUsers";

const API_BASE_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

export type StrategicPartnerUserDetail = OrganizationUserDetail;
export type StrategicPartnerUser = OrganizationUser;
export type StrategicPartnerUsersResponse = OrganizationUsersResponse;

/**
 * Users belonging to a strategic partner. Suppliers have their own endpoint —
 * use useSupplierUsers() for those, and gate the two with `enabled` so a
 * component that can render either role only fetches the one that applies.
 */
export const useStrategicPartnerUsers = (
	strategicPartnerId?: number,
	options?: { enabled?: boolean },
) => {
	const resolvedStrategicPartnerId =
		strategicPartnerId ?? getStrategicPartnerId();

	return useQuery({
		queryKey: ["strategic-partner-users", resolvedStrategicPartnerId],
		queryFn: async () => {
			const response = await api.get<unknown>(
				`${API_BASE_URL}/ilm/strategic-partner-users`,
				{
					params: {
						strategic_partner_id: resolvedStrategicPartnerId,
					},
				},
			);

			return normalizeUsersResponse(response.data);
		},
		enabled:
			(options?.enabled ?? true) && Number.isFinite(resolvedStrategicPartnerId),
	});
};
