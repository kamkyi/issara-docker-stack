import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type {
	ChoroplethCountry,
	SupplierSite,
} from "$components/interactive-map/ChoroplethMap";
import { toSearchQueryParams } from "$hooks/useSupplyChainSuppliersTable";
import type { WorkplaceStatsParams } from "$queries/useWorkplaceStats";
import { useWorkplaceStats } from "$queries/useWorkplaceStats";

// ---------------------------------------------------------------------------
// Types mirrored from the suppliers-map API response
// ---------------------------------------------------------------------------
interface SuppliersMapSupplier {
	supplier_id: number;
	supplier_name: string;
	industry: string;
	industry_name?: string;
	district?: string;
	district_name?: string;
	lat: number;
	lng: number;
	workers: number;
	strategic_partner?: string;
	strategic_partner_name?: string;
	partner_name?: string;
	strategic_partner_grouping?: string;
	strategic_partner_grouping_name?: string;
	supply_chain_member?: boolean;
	/** ISO 3166-1 alpha-2 country code when returned by the API */
	country_iso2?: string;
	/** Country name (e.g., "Thailand") as returned by the API */
	country?: string;
	/** Worker voice status */
	worker_voice_status?:
		| "no_worker_voice"
		| "worker_voice_without_supplier_engagement"
		| "worker_voice_with_supplier_engagement";
	tier_id?: 1 | 2 | 3 | string | number;
}

interface SuppliersMapResponse {
	suppliers: SuppliersMapSupplier[];
}

// ---------------------------------------------------------------------------
// Bounding-box country lookup (covers the primary countries in scope).
// Used to derive countryData from lat/lng when the API omits country_iso2.
// ---------------------------------------------------------------------------
const COUNTRY_BOUNDS: Array<{
	iso2: string;
	latMin: number;
	latMax: number;
	lngMin: number;
	lngMax: number;
}> = [
	{ iso2: "TH", latMin: 5.6, latMax: 20.5, lngMin: 97.3, lngMax: 105.7 },
	{ iso2: "MM", latMin: 9.6, latMax: 28.5, lngMin: 92.2, lngMax: 101.2 },
	{ iso2: "KH", latMin: 10.4, latMax: 14.7, lngMin: 102.3, lngMax: 107.6 },
	{ iso2: "LA", latMin: 13.9, latMax: 22.5, lngMin: 100.1, lngMax: 107.6 },
	{ iso2: "VN", latMin: 8.4, latMax: 23.4, lngMin: 102.1, lngMax: 109.5 },
	{ iso2: "IN", latMin: 8.0, latMax: 37.1, lngMin: 68.1, lngMax: 97.4 },
	{ iso2: "BD", latMin: 20.6, latMax: 26.6, lngMin: 88.0, lngMax: 92.7 },
	{ iso2: "ID", latMin: -11.0, latMax: 6.1, lngMin: 95.0, lngMax: 141.0 },
	{ iso2: "MY", latMin: 0.8, latMax: 7.4, lngMin: 99.6, lngMax: 119.3 },
	{ iso2: "PH", latMin: 4.6, latMax: 21.1, lngMin: 116.9, lngMax: 126.6 },
	{ iso2: "NP", latMin: 26.3, latMax: 30.5, lngMin: 80.0, lngMax: 88.2 },
	{ iso2: "LK", latMin: 5.9, latMax: 9.8, lngMin: 79.5, lngMax: 81.9 },
];

function guessIso2(lat: number, lng: number): string | null {
	for (const b of COUNTRY_BOUNDS) {
		if (
			lat >= b.latMin &&
			lat <= b.latMax &&
			lng >= b.lngMin &&
			lng <= b.lngMax
		) {
			return b.iso2;
		}
	}
	return null;
}

// Map from country name to ISO 3166-1 alpha-2 code
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
	Thailand: "TH",
	Myanmar: "MM",
	Cambodia: "KH",
	Laos: "LA",
	Vietnam: "VN",
	India: "IN",
	Bangladesh: "BD",
	Indonesia: "ID",
	Malaysia: "MY",
	Philippines: "PH",
	Nepal: "NP",
	"Sri Lanka": "LK",
};

export interface ChoroplethDataResult {
	/** Raw workplace stats response (may be null while loading) */
	dashboardData: unknown;
	/** Country polygons with supplier counts for ChoroplethMap */
	countryData: ChoroplethCountry[];
	/** Supplier-site pin markers for ChoroplethMap */
	markers: SupplierSite[];
	/**
	 * Stable identity of the active search, or null when nothing is searched.
	 * ChoroplethMap re-fits its view whenever this changes.
	 */
	searchSignature: string | null;
	/** Currently selected date range start */
	startDate: Date;
	setStartDate: (d: Date) => void;
	/** Currently selected date range end */
	endDate: Date;
	setEndDate: (d: Date) => void;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Encapsulates date-range state, the workplace-stats query, and the
 * suppliers-map query — transforming both into ChoroplethMap-ready shapes.
 *
 * Markers come from the live `cascade/suppliers_map/` endpoint.
 * Country fill values are derived from that same response (bounding-box
 * country lookup), falling back to static data while loading.
 */
export function useChoroplethData(
	extraParams?: Omit<WorkplaceStatsParams, "startTime" | "endTime"> & {
		/**
		 * Per-column search from the Supply Chain Coverage data table, keyed by
		 * column field. Narrows the map pins to the rows the table is showing.
		 * Deliberately not forwarded to `useWorkplaceStats` — those figures drive
		 * the page-level LIVE STATUS MONITOR bars, not the table.
		 */
		search?: Record<string, string>;
	},
): ChoroplethDataResult {
	const defaultEnd = new Date();
	const defaultStart = new Date(
		defaultEnd.getFullYear() - 1,
		defaultEnd.getMonth(),
		defaultEnd.getDate(),
	);

	const [startDate, setStartDate] = useState<Date>(defaultStart);
	const [endDate, setEndDate] = useState<Date>(defaultEnd);

	const { search, ...statsParams } = extraParams ?? {};
	const searchParams = useMemo(() => toSearchQueryParams(search), [search]);
	const searchSignature = useMemo(
		() =>
			Object.keys(searchParams).length > 0
				? JSON.stringify(searchParams)
				: null,
		[searchParams],
	);

	// The markers query keeps the previous result on screen while refetching, so
	// publishing the signature immediately would let consumers (the map's
	// auto-fit) act on markers belonging to the *previous* search. Hold it back
	// until the request for this search has landed.
	const [settledSearchSignature, setSettledSearchSignature] = useState<
		string | null
	>(null);

	// const ids = getUserIdentifiers();
	// const fmt = (d: Date) => d.toISOString().split("T")[0];

	// Workplace stats — used for dashboardData / LiveStatusBar
	const {
		data,
		isLoading: statsLoading,
		error: statsError,
	} = useWorkplaceStats({
		supplierId: extraParams?.supplierId || undefined,
		partnerId: extraParams?.partnerId || undefined,
		...statsParams,
		// startTime: fmt(startDate),
		// endTime: fmt(endDate),
		allSuppliers: true,
	});

	// Suppliers map — real lat/lng data for markers and country counts
	const {
		data: suppliersMapData,
		isLoading: suppliersLoading,
		isFetching: suppliersFetching,
		error: suppliersError,
	} = useQuery<SuppliersMapResponse>({
		queryFn: async () => {
			const params: Record<string, string> = {};
			if (extraParams?.country) params.country = String(extraParams.country);
			if (extraParams?.province) params.province = String(extraParams.province);
			if (extraParams?.industry) params.industry = String(extraParams.industry);
			if (extraParams?.district) params.district = String(extraParams.district);
			if (extraParams?.strategicPartnerGrouping) {
				params.strategic_partner_grouping = String(
					extraParams.strategicPartnerGrouping,
				);
			}
			if (extraParams?.partnerId) {
				const partnerIds = Array.isArray(extraParams.partnerId)
					? extraParams.partnerId
					: [extraParams.partnerId];
				params.partner_id = partnerIds.map(String).join(",");
			}

			Object.assign(params, searchParams);

			const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL ?? "";
			const url = `${baseUrl}/maps/suppliers_map/`;
			const { data: res } = await axios.get<SuppliersMapResponse>(url, {
				params,
			});
			return res;
		},
		queryKey: [
			"suppliers-map-choropleth",
			extraParams?.supplierId,
			extraParams?.country,
			extraParams?.province,
			extraParams?.industry,
			extraParams?.district,
			extraParams?.partnerId,
			extraParams?.strategicPartnerGrouping,
			searchSignature,
		],
		placeholderData: (prev) => prev,
	});

	useEffect(() => {
		if (!suppliersFetching) setSettledSearchSignature(searchSignature);
	}, [suppliersFetching, searchSignature]);

	// Map API suppliers → ChoroplethMap SupplierSite markers
	const markers = useMemo<SupplierSite[]>(() => {
		const list = suppliersMapData?.suppliers;
		if (!list?.length) return [];
		return list.map((s) => {
			const iso2 =
				s.country_iso2?.toUpperCase() ||
				(s.country && COUNTRY_NAME_TO_ISO2[s.country]) ||
				guessIso2(s.lat, s.lng) ||
				undefined;
			return {
				id: s.supplier_id,
				country: s.country,
				district: s.district_name ?? s.district,
				districtName: s.district_name,
				industry: s.industry_name ?? s.industry,
				lat: s.lat,
				lng: s.lng,
				name: s.supplier_name,
				strategicPartner:
					s.strategic_partner_name ?? s.partner_name ?? s.strategic_partner,
				strategicPartnerGrouping:
					s.strategic_partner_grouping_name ?? s.strategic_partner_grouping,
				workerVoiceStatusLabel:
					s.worker_voice_status === "worker_voice_with_supplier_engagement"
						? "Worker Voice With Supplier Engagement"
						: s.worker_voice_status ===
								"worker_voice_without_supplier_engagement"
							? "Worker Voice Without Supplier Engagement"
							: s.worker_voice_status === "no_worker_voice"
								? "No Worker Voice"
								: undefined,
				countryIso2: iso2,
				worker_voice_status: s.worker_voice_status,
				tier_id: s.tier_id as 1 | 2 | 3,
			};
		});
	}, [suppliersMapData]);

	// Derive per-country supplier counts from the same response
	const countryData = useMemo<ChoroplethCountry[]>(() => {
		const list = suppliersMapData?.suppliers;
		if (!list?.length) return [];

		const counts = new Map<string, number>();
		for (const s of list) {
			const iso2 =
				s.country_iso2?.toUpperCase() ||
				(s.country && COUNTRY_NAME_TO_ISO2[s.country]) ||
				guessIso2(s.lat, s.lng);
			if (iso2) counts.set(iso2, (counts.get(iso2) ?? 0) + 1);
		}
		if (counts.size === 0) return [];

		return Array.from(counts.entries()).map(([iso2, value]) => ({
			iso2,
			value,
		}));
	}, [suppliersMapData]);

	return {
		dashboardData: data ?? null,
		countryData,
		markers,
		searchSignature: settledSearchSignature,
		startDate,
		setStartDate,
		endDate,
		setEndDate,
		isLoading: statsLoading || suppliersLoading,
		error: (statsError ?? suppliersError) as Error | null,
	};
}
