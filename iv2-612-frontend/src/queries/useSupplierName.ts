import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

interface SupplierDropdownEntry {
	id: number;
	name: string;
	status?: string;
}

interface SupplierDropdownResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: SupplierDropdownEntry[];
}

export function useSupplierName(supplierId: number | null) {
	return useQuery({
		queryKey: ["supplier-name", supplierId],
		enabled: !!supplierId,
		staleTime: 5 * 60 * 1000,
		queryFn: async () => {
			if (!supplierId) return null;
			const { data }: { data: SupplierDropdownResponse } = await axios.get(
				`${CASCADE_API_URL}/supplier_list_dropdown/?id=${supplierId}`,
			);
			return data.results?.[0]?.name ?? null;
		},
	});
}
