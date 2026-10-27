import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface SupplierFullDetail {
	id: number;
	name: string;
	created: string | null;
	address: string | null;
	country: number | null;
	province_id: number | null;
	district_id: number | null;
	[key: string]: unknown;
}

type SupplierDetailQueryParam = "id" | "supplier_id";

interface UseSupplierFullDetailOptions {
	queryParam?: SupplierDetailQueryParam;
}

export function useSupplierFullDetail(
	supplierId: number | null,
	options?: UseSupplierFullDetailOptions,
) {
	const queryParam = options?.queryParam ?? "id";

	return useQuery<SupplierFullDetail | null>({
		queryKey: ["ilm-supplier-detail", supplierId, queryParam],
		enabled: Number.isFinite(supplierId) && (supplierId ?? 0) > 0,
		staleTime: 0,
		gcTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
		refetchOnReconnect: "always",
		queryFn: async () => {
			if (!supplierId) return null;
			const url = import.meta.env.VITE_APP_CASCADE_API_URL + "/supplier";
			const { data } = await api.get<SupplierFullDetail>(url, {
				params: { [queryParam]: supplierId },
				withCredentials: true,
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});
			return data;
		},
	});
}
