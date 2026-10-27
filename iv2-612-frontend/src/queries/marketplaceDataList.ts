import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getCascadeApiUrl } from "$src/utils/config";

/**
 * Incoming marketplace user activity (registrations, submissions, etc.),
 * reviewed by the internal Issara team under ILM Management. Backed by
 * cascade-api `/marketplace-data-list`.
 */

export type MarketplaceActivityType =
	| "registration"
	| "submission"
	| "notification";

/** The specific marketplace action a row came from (`type` is too coarse). */
export type MarketplaceActivityAction =
	| "quote_request"
	| "wage_quote_request"
	| "schedule"
	| "self_certification"
	| "agency_disclosure"
	| "policy_document"
	| "contract_document"
	| "training_registration"
	| "notify_suppliers";

export interface MarketplaceActivity {
	id: number;
	type: MarketplaceActivityType;
	action: MarketplaceActivityAction;
	user_name: string;
	email: string;
	supplier_name: string;
	solution_name: string;
	created_at: string;
	details: Record<string, unknown>;
}

function requireBase(): string {
	const base = getCascadeApiUrl();
	if (!base) {
		throw new Error("Cascade API URL is not configured");
	}
	return base;
}

/** The full activity list (internal org only), newest first. */
export const useMarketplaceDataList = () =>
	useQuery<MarketplaceActivity[]>({
		queryKey: ["marketplace-data-list"],
		queryFn: async () => {
			const response = await api.get<{
				data: { activities: MarketplaceActivity[] };
			}>(`${requireBase()}/marketplace-data-list`);
			return response.data.data.activities;
		},
		staleTime: 30 * 1000,
		gcTime: 5 * 60 * 1000,
	});
