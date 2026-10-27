/**
 * Utility to get supplier_id, partner_id, and role-specific identifiers from localStorage
 */

import { getStoredRole, isInternalRole } from "$src/utils/storedRole";

const MOCK_SUPPLIER_ID = 17792;
const MOCK_PARTNER_ID = 28;

export interface UserIdentifiers {
	role: string | null;
	supplierId: number | null;
	partnerId: number | null;
	/**
	 * The supplier id the account actually carries, with no MOCK_SUPPLIER_ID
	 * fallback and no Golden Dreams `links.gd.userId` guess. Use this (not
	 * `supplierId`) when an id is about to be sent as a real supplier filter:
	 * both fallbacks resolve to ids that exist on staging and would scope an
	 * unlinked user to somebody else's supplier.
	 */
	accountSupplierId: number | null;
	/** Partner id the account carries, with no MOCK_PARTNER_ID fallback. */
	accountPartnerId: number | null;
	isSupplier: boolean;
	isGlobalPartner: boolean;
	isTestUser: boolean;
}

const readObject = (raw: string | null): Record<string, unknown> => {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
};

const readRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const readPositiveNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
	}
	return null;
};

const readFirstPositiveNumber = (...values: unknown[]): number | null => {
	for (const value of values) {
		const parsed = readPositiveNumber(value);
		if (parsed) return parsed;
	}
	return null;
};

export function getUserIdentifiers(): UserIdentifiers {
	try {
		// Get role from auth_user
		const authUser = readObject(localStorage.getItem("auth_user"));
		const mergedUser = readObject(localStorage.getItem("merged_main_user"));
		const authLinks = readRecord(authUser.links);
		const mergedLinks = readRecord(mergedUser.links);
		const authGdLink = readRecord(authLinks.gd);
		const mergedGdLink = readRecord(mergedLinks.gd);
		const authorization = readRecord(mergedUser.authorization);

		// role_slug, then groups, then the persisted auth-storage role — see
		// getStoredRole(). Reading auth_user alone left internal users unrecognised
		// (and therefore off the mock-data path) whenever auth_user was stale or
		// carried a WorkOS group name instead of the slug.
		const role = getStoredRole();

		// Ids the account explicitly carries, distinct from the Golden Dreams link
		// below: a GD user id is not a supplier id, so it must not reach callers
		// that send it as a `suppliers` filter.
		const accountSupplierId = readFirstPositiveNumber(
			authorization.supplierId,
			authUser.supplier,
			authUser.supplier_id,
			authUser.supplierId,
		);

		// Keep this order aligned with the worker verification QR target.
		const supplierId = readFirstPositiveNumber(
			accountSupplierId,
			mergedGdLink.userId,
			authGdLink.userId,
		);

		// Get partner from auth_user (multiple possible field names)
		const partnerFromAuth = readFirstPositiveNumber(
			authUser.partner,
			authUser.partnerId,
			authUser.partner_id,
		);

		// For test/staff users, use hardcoded values (must match useMockData() in config.ts)
		const isTestUser = isInternalRole(role);
		const isSupplier = role === "org-supplier";
		const isGlobalPartner = role === "org-global-partner";
		const shouldUseMockSupplierId = isTestUser || (isSupplier && !supplierId);
		const shouldUseMockPartnerId =
			isTestUser || (isGlobalPartner && !partnerFromAuth);

		return {
			role,
			supplierId: shouldUseMockSupplierId
				? MOCK_SUPPLIER_ID
				: supplierId
					? Number(supplierId)
					: null,
			partnerId: shouldUseMockPartnerId
				? MOCK_PARTNER_ID
				: partnerFromAuth
					? Number(partnerFromAuth)
					: null,
			accountSupplierId,
			accountPartnerId: partnerFromAuth,
			isSupplier,
			isGlobalPartner,
			isTestUser,
		};
	} catch (error) {
		console.error("Error getting user identifiers:", error);
		return {
			role: null,
			supplierId: null,
			partnerId: null,
			accountSupplierId: null,
			accountPartnerId: null,
			isSupplier: false,
			isGlobalPartner: false,
			isTestUser: false,
		};
	}
}

export default getUserIdentifiers;
