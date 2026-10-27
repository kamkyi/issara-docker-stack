// Utility functions for authentication management

import type { AuthUser, MergedMainUser } from "$src/types/auth";

/**
 * Parses a JSON string from localStorage and returns the typed object
 * @param key - The localStorage key to retrieve
 * @returns The parsed object or null if not found or invalid
 */
export const parseStoredJson = <T>(key: string): T | null => {
	const raw = localStorage.getItem(key);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as unknown;
		return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
	} catch (error) {
		console.error(`Error parsing ${key} from localStorage:`, error);
		return null;
	}
};

/**
 * Gets the authenticated user data from localStorage
 * @returns The AuthUser object or null if not found
 */
export const getAuthUser = (): AuthUser | null => {
	return parseStoredJson<AuthUser>("auth_user");
};

/**
 * Gets the strategic partner ID from the session, checking both merged and auth user data
 * @returns The strategic partner ID as a number or null
 */
export const getPartnerId = (): number | null => {
	const mergedUser = parseStoredJson<MergedMainUser>("merged_main_user");
	if (mergedUser?.authorization?.partnerId) {
		return Number(mergedUser.authorization.partnerId);
	}
	const authUser = getAuthUser();
	if (authUser?.partner) {
		return Number(authUser.partner);
	}
	return null;
};

/**
 * Gets the strategic partner ID from the authenticated user with a fallback
 * @param defaultSpId - The default strategic partner ID to use if not found (default: 28)
 * @returns The strategic partner ID as a number
 */
export const getStrategicPartnerId = (defaultSpId = 28): number => {
	return getPartnerId() ?? defaultSpId;
};

/**
 * Gets the active supplier ID from merged user data or auth user
 * @returns The supplier ID as a number or string or null
 */
export const getActiveSupplierId = (): number | string | null => {
	const mergedUser = parseStoredJson<MergedMainUser>("merged_main_user");
	if (mergedUser?.authorization?.supplierId) {
		return mergedUser.authorization.supplierId;
	}
	const authUser = getAuthUser();
	return authUser?.supplier ?? null;
};

/**
 * Gets the ILM (Django) user id of the signed-in user, sent as
 * `submitted_by_user_id` when submitting marketplace requests so the backend
 * can attribute the submission to a real user account.
 * @returns The ILM user ID as a number or null when the account has no ILM link
 */
export const getSubmittedByUserId = (): number | null => {
	const mergedUser = parseStoredJson<MergedMainUser>("merged_main_user");
	const authUser = getAuthUser();
	const rawId = mergedUser?.links?.ilm?.userId ?? authUser?.links?.ilm?.userId;
	if (rawId == null || rawId === "") return null;
	const id = Number(rawId);
	return Number.isFinite(id) && id > 0 ? id : null;
};

const ISSARA_STAFF_ROLE_SLUGS = ["org-issara-staff", "org-issara-management"];

const normalizeGroups = (
	value: string[] | string | null | undefined,
): string[] => {
	if (Array.isArray(value)) {
		return value.filter((group): group is string => typeof group === "string");
	}
	if (typeof value === "string" && value.trim()) {
		return [value];
	}
	return [];
};

/**
 * Whether the signed-in user is Issara staff/management, based on the WorkOS
 * role slug, auth groups, or merged ILM authorization fields.
 */
export const isIssaraStaffUser = (): boolean => {
	const authUser = getAuthUser() as
		| (AuthUser & { role_slug?: string; groups?: unknown })
		| null;
	const mergedUser = parseStoredJson<MergedMainUser>("merged_main_user");
	const authGroups = normalizeGroups(
		authUser?.groups as string[] | string | null,
	);
	const mergedGroups = normalizeGroups(mergedUser?.authorization?.groups);

	// Also check the Zustand-persisted auth-storage role (the primary role source
	// used by authStatus() and the rest of the app).
	const authStorageRaw = localStorage.getItem("auth-storage");
	const authStorageRole: string | null = authStorageRaw
		? (() => {
				try {
					const parsed = JSON.parse(authStorageRaw) as {
						state?: { role?: string | null };
					};
					return parsed?.state?.role ?? null;
				} catch {
					return null;
				}
			})()
		: null;

	const roles = [
		authStorageRole,
		authUser?.role_slug || (authGroups.length > 0 ? authGroups[0] : null),
		mergedUser?.authorization?.userType,
		...authGroups,
		...mergedGroups,
	];

	return roles.some(
		(role) => role != null && ISSARA_STAFF_ROLE_SLUGS.includes(role),
	);
};

/**
 * Gets all relevant IDs (supplier, partner) for notification filtering
 * @returns An object with IDs for query params
 */
export const getNotificationParams = (): Record<string, string | number> => {
	const params: Record<string, string | number> = {};
	const supplierId = getActiveSupplierId();
	if (supplierId) params.supplier_id = supplierId;

	const spId = getPartnerId();
	if (spId) params.strategic_partner_id = spId;

	// Staff have no org id; this lets cascade-api add the `issara-staff` sentinel
	// to their recipient set even when the JWT role claim isn't present.
	if (isIssaraStaffUser()) params.staff = 1;

	return params;
};

/**
 * Gets the supplier ID from the authenticated user
 * @param defaultSupplierId - The default supplier ID to use if not found
 * @returns The supplier ID as a number or null
 */
export const getSupplierId = (defaultSupplierId?: number): number | null => {
	const userData = getAuthUser();
	if (userData?.supplier) {
		return Number(userData.supplier);
	}
	return defaultSupplierId ?? null;
};

/**
 * Gets the organization ID from the authenticated user
 * @param defaultOrgId - The default organization ID to use if not found
 * @returns The organization ID as a number or null
 */
export const getOrganizationId = (defaultOrgId?: number): number | null => {
	const userData = getAuthUser();
	if (userData?.organization) {
		return Number(userData.organization);
	}
	return defaultOrgId ?? null;
};

/**
 * Completely clears all authentication-related data from browser storage
 */
export const clearAllAuthData = () => {
	// Clear specific auth tokens
	localStorage.removeItem("auth_token");
	localStorage.removeItem("auth_user");

	// Clear WorkOS related storage
	localStorage.removeItem("workos-js-session");
	sessionStorage.removeItem("workos-js-session");

	// Clear any other auth-related items
	const authKeys = ["auth", "workos", "session", "token", "user"];

	// Check localStorage
	Object.keys(localStorage).forEach((key) => {
		if (authKeys.some((authKey) => key.toLowerCase().includes(authKey))) {
			localStorage.removeItem(key);
		}
	});

	// Check sessionStorage
	Object.keys(sessionStorage).forEach((key) => {
		if (authKeys.some((authKey) => key.toLowerCase().includes(authKey))) {
			sessionStorage.removeItem(key);
		}
	});

	console.log("All authentication data cleared");
};

/**
 * Forces a complete logout by clearing all data and reloading the page
 */
export const forceLogout = () => {
	clearAllAuthData();

	// Clear all cookies (if any)
	document.cookie.split(";").forEach((c) => {
		document.cookie = c
			.replace(/^ +/, "")
			.replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
	});

	// Force reload to clear all application state
	window.location.href = "/";
};
