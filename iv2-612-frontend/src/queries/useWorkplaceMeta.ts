import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { useMockData } from "$src/utils/config";

export function useWorkplaceMeta(params?: {
	supplierId?: string | number | null;
	partnerId?: number | null;
}) {
	const shouldUseMock = useMockData();
	const { supplierId, partnerId } = params || {};
	const qs = new URLSearchParams();
	if (supplierId) qs.append("supplier_id", String(supplierId));
	if (partnerId) qs.append("partner_id", String(partnerId));
	const url = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/cascade_workplace/meta${qs.toString() ? `?${qs.toString()}` : ""}`;

	return useQuery({
		queryKey: ["cascade-workplace-meta", supplierId, partnerId, shouldUseMock],
		queryFn: async () => {
			if (shouldUseMock) {
				return {
					supplier_ids: [],
					supplier_name: undefined,
					total_cases: 0,
					total_workers_with_access: 0,
					fetched_at: new Date().toISOString(),
				};
			}
			const res = await api.get(url);
			return res.data;
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

export default useWorkplaceMeta;
