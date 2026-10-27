/**
 * Configuration utility to access environment variables
 */
import flagsmith from "flagsmith";
import { getStoredRole, isInternalRole } from "$src/utils/storedRole";

const getStoredAuthUser = () => {
	const authUserRaw = localStorage.getItem("auth_user");
	return authUserRaw ? JSON.parse(authUserRaw) : {};
};

const getStoredMergedUser = () => {
	const mergedUserRaw = localStorage.getItem("merged_main_user");
	return mergedUserRaw ? JSON.parse(mergedUserRaw) : {};
};

/**
 * Check if the app should use mock data instead of production data.
 * Returns true when the Flagsmith `use_mock_data` flag forces it, when the
 * logged-in user is an internal role (test user / Issara staff / management —
 * including one who has switched to the Supplier view), or when a supplier /
 * strategic partner user is missing the identifier required to scope live data.
 */
export const useMockData = (): boolean => {
	if (flagsmith.hasFeature("use_mock_data")) return true;
	try {
		const authUser = getStoredAuthUser();
		const mergedUser = getStoredMergedUser();
		// Resolved across auth_user and the persisted auth-storage role so an
		// internal user is recognised even when auth_user is stale or carries the
		// WorkOS group name instead of the slug.
		const role = getStoredRole();

		if (isInternalRole(role)) {
			return true;
		}

		const supplierId =
			mergedUser?.authorization?.supplierId ?? authUser?.supplier ?? null;
		const partnerId =
			authUser?.partner ?? authUser?.partnerId ?? authUser?.partner_id ?? null;

		if (role === "org-supplier" && !supplierId) {
			return true;
		}

		if (role === "org-global-partner" && !partnerId) {
			return true;
		}

		return false;
	} catch {
		return false;
	}
};

/**
 * Stricter mock-data check: only the Flagsmith flag or the test-user role.
 * Unlike useMockData(), this does NOT return true for supplier / partner users
 * that are missing their scope id — those users see an empty state instead of
 * mock content.
 */
export const useMockDataStrict = (): boolean => {
	if (flagsmith.hasFeature("use_mock_data")) return true;
	try {
		return getStoredRole() === "org-test-user";
	} catch {
		return false;
	}
};

/**
 * Get API base URL
 */
export const getApiUrl = (): string => {
	return import.meta.env.VITE_APP_API_URL || "";
};

/**
 * Get API Gateway URL
 */
export const getApiGatewayUrl = (): string => {
	return import.meta.env.VITE_APP_API_GATEWAY_URL || "";
};

/**
 * Get Cascade API URL
 */
export const getCascadeApiUrl = (): string => {
	return import.meta.env.VITE_APP_CASCADE_API_URL || "";
};
