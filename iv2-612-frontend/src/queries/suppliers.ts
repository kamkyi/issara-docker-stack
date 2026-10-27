import {
	keepPreviousData,
	useInfiniteQuery,
	useQuery,
} from "@tanstack/react-query";
import axios from "axios";
import { api } from "$src/api/axios";

// Define the supplier type
export interface Supplier {
	id: number;
	name: string;
	status?: string;
}

// Interface for API response
interface SuppliersResponse {
	count?: number;
	next: string | null;
	previous: string | null;
	results: Supplier[];
}

/**
 * Fetch all suppliers
 */
// export const useSuppliers = (searchTerm?: string) => {
//   const baseUrl = import.meta.env.VITE_API_BASE_URL

//   return useQuery({
//     queryKey: ['suppliers', searchTerm],
//     queryFn: async () => {
//       const token = localStorage.getItem('auth_token')
//       if (!token) {
//         throw new Error('Authentication token not found')
//       }

//       const url = new URL(`${baseUrl}/api/v2/supplier_list_dropdown/`)
//       if (searchTerm) {
//         url.searchParams.append('name', searchTerm)
//       }

//       const response = await axios.get<SuppliersResponse>(url.toString(), {
//         headers: {
//           'Accept': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//       })
//       return response.data
//     },
//     enabled: !!searchTerm,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//     gcTime: 10 * 60 * 1000, // 10 minutes
//   })
// }

/**
 * Fetch suppliers with pagination and search support
 */
export const useInfiniteSuppliers = (searchTerm?: string) => {
	const baseUrl = (import.meta.env.VITE_APP_CASCADE_API_URL as string)?.replace(
		/\/$/,
		"",
	);
	// Fetch the dropdown in large pages so the full list loads in a couple of
	// round-trips instead of ~100 sequential calls (PAGE_SIZE default is 100).
	const PAGE_SIZE = 2000;
	const initialUrl = `${baseUrl}/supplier_list_dropdown/?page_size=${PAGE_SIZE}${searchTerm ? `&name=${encodeURIComponent(searchTerm)}` : ""}`;

	return useInfiniteQuery({
		queryKey: ["suppliers", "infinite", searchTerm],
		queryFn: async ({ pageParam = initialUrl }) => {
			const token = localStorage.getItem("auth_token");
			if (!token) {
				throw new Error("Authentication token not found");
			}

			const response = await axios.get<SuppliersResponse>(pageParam, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			return response.data;
		},
		initialPageParam: initialUrl,
		getNextPageParam: (lastPage) => lastPage.next || undefined,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});
};

/**
 * Server-side supplier search for type-ahead dropdowns. Fetches a single bounded
 * page filtered by `name`, so the dropdown never has to walk the full (~10k row)
 * supplier list. Empty term returns the first `limit` suppliers.
 */
export const useSupplierSearch = (
	searchTerm = "",
	limit = 50,
	enabled = true,
) => {
	const baseUrl = (import.meta.env.VITE_APP_CASCADE_API_URL as string)?.replace(
		/\/$/,
		"",
	);
	const term = searchTerm.trim();

	return useQuery({
		queryKey: ["suppliers", "search", term, limit],
		enabled,
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		queryFn: async () => {
			const token = localStorage.getItem("auth_token");
			if (!token) throw new Error("Authentication token not found");
			const params = new URLSearchParams({ page_size: String(limit) });
			if (term) params.set("name", term);
			const response = await axios.get<SuppliersResponse>(
				`${baseUrl}/supplier_list_dropdown/?${params.toString()}`,
				{
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
					},
				},
			);
			return response.data.results ?? [];
		},
	});
};

/**
 * Supplier picker for the Worker Voice form (IV2-582).
 *
 * The legacy call wizard's `SuppliersPaginateDropdown` shape, reimplemented on
 * the facelift's `api` instance so it carries the AuthKit bearer token: search
 * server-side with `?name=`, walk pages with the cursor lifted out of `next`,
 * and hydrate a preselected id with `?id=`. Nothing loads the full ~10k-row
 * supplier table -- `useInfiniteSuppliers` above still does that against
 * cascade-api for the filter bar, and is deliberately left alone.
 *
 * Django's `/api/v2/supplier_list_dropdown/` is the endpoint the legacy wizard
 * already uses. It ignores `page_size` (DRF `CursorPagination` exposes no such
 * query param), so pages are the server's 20.
 */
const djangoApiUrl = () => {
	const baseUrl = (import.meta.env.VITE_APP_API_URL as string)?.replace(
		/\/$/,
		"",
	);
	if (!baseUrl) {
		throw new Error("VITE_APP_API_URL is not configured");
	}
	return baseUrl;
};

/** The cursor for the next page, or null when this was the last one. */
export const cursorFromNextUrl = (nextUrl: string | null): string | null => {
	if (!nextUrl) {
		return null;
	}
	try {
		return new URL(nextUrl, window.location.origin).searchParams.get("cursor");
	} catch {
		return null;
	}
};

export interface SupplierPage {
	suppliers: Supplier[];
	nextCursor: string | null;
}

export const fetchSupplierPage = async (
	search: string,
	cursor: string | null,
): Promise<SupplierPage> => {
	const params = new URLSearchParams();
	if (search) {
		params.set("name", search);
	}
	if (cursor) {
		params.set("cursor", cursor);
	}
	const { data } = await api.get<SuppliersResponse>(
		`${djangoApiUrl()}/supplier_list_dropdown/?${params.toString()}`,
	);
	return {
		suppliers: data.results ?? [],
		nextCursor: cursorFromNextUrl(data.next),
	};
};

/** Name for an already-saved supplier id, so the edit form shows a label. */
export const fetchSupplierById = async (
	supplierId: number,
): Promise<Supplier | null> => {
	const params = new URLSearchParams({ id: String(supplierId) });
	const { data } = await api.get<SuppliersResponse>(
		`${djangoApiUrl()}/supplier_list_dropdown/?${params.toString()}`,
	);
	return data.results?.[0] ?? null;
};

/** Where a supplier is, as the Worker Voice form auto-fills it. */
export interface SupplierLocation {
	countryId: number | null;
	provinceId: number | null;
	districtId: number | null;
}

/**
 * The supplier's own country/province/district.
 *
 * A separate request against the existing supplier-detail endpoint, which is
 * what the legacy wizard does (`RequiredCallFields.fetchSupplierById`). The
 * dropdown endpoint returns only id and name, and it is shared with
 * ILM-fronted, so it is left exactly as it is rather than widened here -- the
 * `suppliers` row stays the single source of truth either way.
 */
export const fetchSupplierLocation = async (
	supplierId: number,
): Promise<SupplierLocation> => {
	const { data } = await api.get<{
		country: number | null;
		province: number | null;
		district: number | null;
	}>(`${djangoApiUrl()}/suppliers/${supplierId}/`);
	return {
		countryId: data.country ?? null,
		provinceId: data.province ?? null,
		districtId: data.district ?? null,
	};
};
