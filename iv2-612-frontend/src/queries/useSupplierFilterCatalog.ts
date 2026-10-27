/**
 * The supplier → country / industry map that drives the Social Responsibility
 * Overview filter dropdowns.
 *
 * The supply-chain payload (/legacy-labor/supplychains) carries neither field on
 * its supplier rows, so filter options built from it could never narrow each
 * other. /cascade/suppliers does: every row resolves `country_name` and the full
 * many-to-many `industries` list.
 *
 * The catalog is fetched *unfiltered* for the account's scope and cross-filtered
 * in the browser, so changing a selection re-derives the dropdowns without a
 * request.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";

export interface SupplierFilterCatalogItem {
	value: string;
	label: string;
	countryNames: string[];
	industries: string[];
}

/** The endpoint's cap; larger values are clamped server-side. */
const PAGE_SIZE = 100;

/** Stops a runaway loop if `next` never settles. 20 × 100 = 2000 suppliers. */
const MAX_PAGES = 20;

interface SupplierRow {
	id?: number | string;
	name?: string;
	country_name?: string | null;
	industries?: Array<{ id?: number; name?: string | null }> | null;
}

const readResults = (payload: unknown): SupplierRow[] => {
	if (Array.isArray(payload)) return payload as SupplierRow[];
	if (!payload || typeof payload !== "object") return [];
	const envelope = payload as {
		results?: unknown;
		data?: { results?: unknown };
	};
	if (Array.isArray(envelope.results)) return envelope.results as SupplierRow[];
	if (Array.isArray(envelope.data?.results)) {
		return envelope.data.results as SupplierRow[];
	}
	return [];
};

const hasNextPage = (payload: unknown): boolean =>
	!!payload &&
	typeof payload === "object" &&
	Boolean((payload as { next?: unknown }).next);

const toCatalogItem = (row: SupplierRow): SupplierFilterCatalogItem | null => {
	const id = row.id == null ? "" : String(row.id);
	if (!id) return null;

	const country = row.country_name?.trim();
	const industries = (row.industries ?? [])
		.map((industry) => industry?.name?.trim())
		.filter((name): name is string => !!name);

	return {
		value: id,
		label: row.name?.trim() || id,
		countryNames: country ? [country] : [],
		industries: Array.from(new Set(industries)),
	};
};

export const useSupplierFilterCatalog = (
	partnerId?: number | null,
	options?: { enabled?: boolean },
) =>
	useQuery({
		queryKey: ["supplier-filter-catalog", partnerId ?? null],
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		queryFn: async (): Promise<SupplierFilterCatalogItem[]> => {
			// partner_id is the only thing scoping this endpoint to the signed-in
			// account. Without it /cascade/suppliers returns every supplier in the
			// system, so refuse rather than leak them into a filter dropdown.
			if (!partnerId) return [];

			const baseUrl = import.meta.env.VITE_APP_CASCADE_API_URL ?? "";
			const byId = new Map<string, SupplierFilterCatalogItem>();

			for (let page = 1; page <= MAX_PAGES; page++) {
				const query = new URLSearchParams();
				query.append("partner_id", String(partnerId));
				query.append("page", String(page));
				query.append("page_size", String(PAGE_SIZE));

				const { data } = await api.get(
					`${baseUrl}/cascade/suppliers?${query.toString()}`,
				);

				const rows = readResults(data);
				for (const row of rows) {
					const item = toCatalogItem(row);
					if (!item) continue;

					// A supplier can appear on more than one supply chain; merge rather
					// than overwrite so no country or industry is lost.
					const existing = byId.get(item.value);
					if (!existing) {
						byId.set(item.value, item);
						continue;
					}
					for (const country of item.countryNames) {
						if (!existing.countryNames.includes(country)) {
							existing.countryNames.push(country);
						}
					}
					for (const industry of item.industries) {
						if (!existing.industries.includes(industry)) {
							existing.industries.push(industry);
						}
					}
				}

				if (rows.length < PAGE_SIZE || !hasNextPage(data)) break;
			}

			return Array.from(byId.values()).sort((left, right) =>
				left.label.localeCompare(right.label),
			);
		},
	});
