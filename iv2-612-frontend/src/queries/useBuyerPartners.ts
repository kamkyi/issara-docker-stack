import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { useMockData } from "$src/utils/config";

export type BuyerPartnerStatus = "active" | "pending";

export interface BuyerPartner {
	id: string;
	name: string;
	city: string;
	country: string;
	industry: string;
	initials: string;
	palette: [string, string];
	status: BuyerPartnerStatus;
	added?: boolean;
	note?: string;
}

const BUYER_PARTNERS_MOCK: BuyerPartner[] = [
	{
		id: "nordic",
		name: "Nordic Apparel Group",
		city: "Stockholm",
		country: "Sweden",
		industry: "Apparel & footwear",
		initials: "NA",
		palette: ["#0e1a1e", "#ffffff"],
		status: "active",
	},
	{
		id: "atlas",
		name: "Atlas Foods International",
		city: "London",
		country: "United Kingdom",
		industry: "Food & beverage",
		initials: "AF",
		palette: ["#1e3a8a", "#dbeafe"],
		status: "active",
	},
	{
		id: "pacifica",
		name: "Pacifica Electronics Co.",
		city: "San Francisco",
		country: "United States",
		industry: "Electronics & devices",
		initials: "PE",
		palette: ["#6F2E97", "#e8d6f3"],
		status: "active",
	},
	{
		id: "verdant",
		name: "Verdant Goods",
		city: "Berlin",
		country: "Germany",
		industry: "Home goods & textiles",
		initials: "VG",
		palette: ["#2f8a55", "#d6f0df"],
		status: "pending",
	},
];

const DEFAULT_PALETTE: [string, string] = ["#004A60", "#A6DFDD"];

const initialsOf = (name: string) =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0] || "")
		.join("")
		.toUpperCase() || "?";

const normalizeOne = (r: any, i: number): BuyerPartner => {
	const name = r?.name ?? r?.buyer_name ?? r?.brand ?? "";
	const rawStatus = r?.status;
	const status: BuyerPartnerStatus =
		rawStatus === "pending" ? "pending" : "active";
	return {
		id: String(r?.id ?? r?.buyer_id ?? r?.slug ?? `buyer-${i}`),
		name,
		city: r?.city ?? "",
		country: r?.country ?? "",
		industry: r?.industry ?? r?.sector ?? "",
		initials: r?.initials ?? initialsOf(name),
		palette:
			Array.isArray(r?.palette) && r.palette.length === 2
				? (r.palette as [string, string])
				: DEFAULT_PALETTE,
		status,
		added: !!r?.added,
		note: r?.note ?? undefined,
	};
};

const normalize = (raw: unknown): BuyerPartner[] => {
	if (!Array.isArray(raw)) return [];
	return raw.map((r, i) => normalizeOne(r, i));
};

export interface UseBuyerPartnersParams {
	supplierId?: string | number | null;
}

export function useBuyerPartners(params?: UseBuyerPartnersParams) {
	const { supplierId } = params || {};
	const shouldUseMock = useMockData();

	return useQuery<BuyerPartner[]>({
		queryKey: ["cascade-buyer-partners", supplierId, shouldUseMock],
		queryFn: async () => {
			if (shouldUseMock) return BUYER_PARTNERS_MOCK;

			const qs = new URLSearchParams();
			if (supplierId) qs.append("supplier_id", `${supplierId}`);
			const API_URL = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade/buyer_partners/${
				qs.toString() ? `?${qs.toString()}` : ""
			}`;

			try {
				const res = await api.get(API_URL);
				return normalize(res.data);
			} catch {
				// Endpoint not yet available — render the empty state so the
				// supplier can still add buyers manually.
				return [];
			}
		},
	});
}

const CASCADE_BASE = `${import.meta.env.VITE_APP_CASCADE_API_URL}/cascade`;

export interface CreateBuyerPartnerInput {
	supplier_id: string | number;
	name: string;
	country?: string;
	industry?: string;
	note?: string;
}

export function useCreateBuyerPartner() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (
			input: CreateBuyerPartnerInput,
		): Promise<BuyerPartner> => {
			const res = await api.post(`${CASCADE_BASE}/buyer_partners/`, input);
			return normalizeOne(res.data ?? {}, 0);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["cascade-buyer-partners"] });
		},
	});
}

export type BuyerPartnerFlagReason =
	| "no_longer_sources"
	| "update_status"
	| "correct_info"
	| "general";

export interface CreateBuyerPartnerFlagInput {
	supplier_id: string | number;
	strategic_partner_id?: string | number | null;
	reason: BuyerPartnerFlagReason;
	note: string;
	buyer_name?: string;
}

export function useCreateBuyerPartnerFlag() {
	return useMutation({
		mutationFn: async (input: CreateBuyerPartnerFlagInput) => {
			const res = await api.post(`${CASCADE_BASE}/buyer_partner_flags/`, input);
			return res.data as { id: number; status: string };
		},
	});
}
