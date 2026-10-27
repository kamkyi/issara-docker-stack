import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";
import {
	normalizeUsersResponse,
	type OrganizationUser,
	type OrganizationUserDetail,
	type OrganizationUsersResponse,
} from "$src/utils/organizationUsers";

const API_BASE_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

export type SupplierUserDetail = OrganizationUserDetail;
export type SupplierUser = OrganizationUser;
export type SupplierUsersResponse = OrganizationUsersResponse;

/**
 * Users belonging to a supplier. The strategic-partner equivalent lives in
 * useStrategicPartnerUsers().
 */
export const useSupplierUsers = (
	supplierId?: number,
	options?: { enabled?: boolean },
) => {
	const resolvedSupplierId = supplierId ?? getUserIdentifiers().supplierId;

	return useQuery({
		queryKey: ["supplier-users", resolvedSupplierId],
		queryFn: async () => {
			const response = await api.get<unknown>(
				`${API_BASE_URL}/ilm/supplier-users`,
				{
					params: {
						supplier_id: resolvedSupplierId,
					},
				},
			);

			return normalizeUsersResponse(response.data);
		},
		enabled: (options?.enabled ?? true) && Number.isFinite(resolvedSupplierId),
	});
};
