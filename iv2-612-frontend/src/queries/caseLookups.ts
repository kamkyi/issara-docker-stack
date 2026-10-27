/**
 * Small ILM lookup tables the Worker Voice form needs (IV2-582).
 *
 * These sit behind the legacy Django `/api/v2/` router, which paginates with a
 * 10,000 page size, so every table below arrives in a single response and the
 * geography selects can cascade client-side.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface NamedLookup {
	id: number;
	name: string;
}

export interface Province extends NamedLookup {
	country: number | null;
}

export interface District extends NamedLookup {
	province: number | null;
}

interface Paginated<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

const LOOKUP_STALE_TIME = 30 * 60 * 1000;

const fetchLookup = async <T>(resource: string, search = ""): Promise<T[]> => {
	const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, "");
	if (!baseUrl) {
		throw new Error("VITE_APP_API_URL is not configured");
	}
	const { data } = await api.get<Paginated<T>>(
		`${baseUrl}/${resource}/${search}`,
	);
	return data.results ?? [];
};

const lookupQuery = <T>(resource: string, key: string, search = "") => ({
	queryKey: ["case-lookup", key],
	queryFn: () => fetchLookup<T>(resource, search),
	staleTime: LOOKUP_STALE_TIME,
	gcTime: 60 * 60 * 1000,
});

export const useContractTypes = () =>
	useQuery(lookupQuery<NamedLookup>("contracttypes", "contract-types"));

export const useDocumentTypes = () =>
	useQuery(lookupQuery<NamedLookup>("documenttypes", "document-types"));

/**
 * Case statuses -- the shared ILM set, which is the plain Open / Closed / some
 * progress the legacy screens have always offered.
 *
 * The endpoint also holds "Early warning risk" and "Forced labor risk", added
 * for this form and served only to a caller that asks for the CSO set by name.
 * This form stopped asking in round three: those two classify the *issue*, and
 * the calls table now derives that from the levels of the KPIs picked on step
 * 4, so offering them here read as though a call's status and its forced-labor
 * risk were the same answer. The rows are left in place -- nothing is renamed
 * or deleted, and any call already saved on one still reads back by name.
 */
export const useCaseStatuses = () =>
	// The cache key changed with the request. The app persists React Query to
	// IndexedDB for a day, and this query's URL moved without its key moving,
	// so an officer who had already opened the form would have been served the
	// old CSO list -- the two statuses this change removes included -- from
	// cache, and `staleTime` would have suppressed the refetch that corrected
	// it. A new key cannot be answered by the old entry.
	useQuery(lookupQuery<NamedLookup>("casestatuses", "case-statuses-shared"));

export const useCountries = () =>
	useQuery(lookupQuery<NamedLookup>("countries", "countries"));

export const useProvinces = () =>
	useQuery(lookupQuery<Province>("provinces", "provinces"));

export const useDistricts = () =>
	useQuery(lookupQuery<District>("districts", "districts"));

/**
 * Organizations a case can be referred to on step 5.
 *
 * `/referralorg/` is the whole `organizations` table -- Issara maintains it in
 * the admin and partners maintain their own row through the CSO profile
 * endpoint, so this list is read-only here and carries a name, never contact
 * details. Notifying the organization is the server's job once the case saves.
 */
export const useReferralOrgs = () =>
	useQuery(lookupQuery<NamedLookup>("referralorg", "referral-orgs"));
