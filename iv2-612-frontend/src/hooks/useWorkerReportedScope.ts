import { useMemo } from "react";
import { useSupplyChains } from "$src/hooks/useSupplyChain";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";

/**
 * Which suppliers the logged-in user is allowed to see worker-reported issues
 * for.
 *
 * - `all`       — no `suppliers` filter is sent (internal staff / test users).
 * - `scoped`    — send `suppliers=<ids>`; a supplier sees only itself, a global
 *                 partner sees every supplier in its linked portfolio.
 * - `emptyPortfolio` — partner with no linked suppliers: show nothing, no request.
 * - `unresolved`— the account carries no usable supplier/partner id. We do NOT
 *                 guess and we do NOT fall back to an unscoped request; the page
 *                 shows an explanatory empty state instead. This is what the
 *                 `links.gd.userId` fallback used to paper over by sending a
 *                 Golden Dreams user id as a supplier id.
 * - `loading`   — the partner's portfolio is still resolving.
 */
export type WorkerReportedScope =
	| { status: "loading" }
	| { status: "all" }
	| { status: "scoped"; supplierIds: number[] }
	| { status: "emptyPortfolio" }
	| { status: "unresolved"; role: "supplier" | "partner" };

type SupplyChainLike = { suppliers?: Array<{ id?: number | string }> };

const collectSupplierIds = (supplyChains: unknown): number[] => {
	if (!Array.isArray(supplyChains)) return [];
	const ids = new Set<number>();
	(supplyChains as SupplyChainLike[]).forEach((chain) => {
		(chain?.suppliers ?? []).forEach((supplier) => {
			const id = Number(supplier?.id);
			if (Number.isFinite(id) && id > 0) ids.add(id);
		});
	});
	return [...ids];
};

export function useWorkerReportedScope(): WorkerReportedScope {
	// Deliberately the account-level ids: `supplierId`/`partnerId` fall back to
	// MOCK_SUPPLIER_ID / MOCK_PARTNER_ID, which are real ids on staging and would
	// scope an unlinked user to somebody else's supplier.
	const {
		accountSupplierId: supplierId,
		accountPartnerId: partnerId,
		isSupplier,
		isGlobalPartner,
		isTestUser,
	} = getUserIdentifiers();

	const partnerScopeEnabled = Boolean(isGlobalPartner && partnerId);
	const { data: supplyChains, isLoading: loadingSupplyChains } =
		useSupplyChains(
			partnerScopeEnabled ? { partnerId: Number(partnerId) } : undefined,
			{ enabled: partnerScopeEnabled },
		);

	const portfolioSupplierIds = useMemo(
		() => collectSupplierIds(supplyChains),
		[supplyChains],
	);

	return useMemo<WorkerReportedScope>(() => {
		// Internal roles are not tied to one supplier: no filter, all suppliers.
		if (isTestUser) return { status: "all" };

		if (isSupplier) {
			return supplierId
				? { status: "scoped", supplierIds: [supplierId] }
				: { status: "unresolved", role: "supplier" };
		}

		if (isGlobalPartner) {
			if (!partnerId) return { status: "unresolved", role: "partner" };
			if (loadingSupplyChains) return { status: "loading" };
			return portfolioSupplierIds.length > 0
				? { status: "scoped", supplierIds: portfolioSupplierIds }
				: { status: "emptyPortfolio" };
		}

		// Any other authenticated role (e.g. recruiter): scope to an explicit
		// supplier id when the account carries one, otherwise show everything —
		// matching the behaviour these roles had before supplier scoping existed.
		return supplierId
			? { status: "scoped", supplierIds: [supplierId] }
			: { status: "all" };
	}, [
		isTestUser,
		isSupplier,
		isGlobalPartner,
		supplierId,
		partnerId,
		loadingSupplyChains,
		portfolioSupplierIds,
	]);
}

export default useWorkerReportedScope;
