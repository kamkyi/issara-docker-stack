/**
 * Single source of truth for "which role is signed in", read from localStorage.
 *
 * The app persists the role in two places: the Zustand `auth-storage` entry
 * (written by the auth callback, read by authStatus(), viewModeStore and the
 * tester floating button) and the `auth_user` blob. They are written in the
 * same callback step but only `auth-storage` is guaranteed — if anything after
 * setRole() fails, or `auth_user` was stored by an older build / the legacy OTP
 * login (which persists WorkOS *group names* such as "Issara Management"
 * instead of slugs), an internal user ends up recognised by the navbar and the
 * tester button but not by the mock-data checks. Resolving the role from every
 * source keeps those in agreement.
 */

export const INTERNAL_ROLE_SLUGS = [
	"org-test-user",
	"org-issara-management",
	"org-issara-staff",
] as const;

// Mirrors determineRoleSlug() in routes/auth/callback.tsx, which maps the WorkOS
// group names to role slugs.
const GROUP_NAME_TO_SLUG: Record<string, string> = {
	"Issara Management": "org-issara-management",
	"Issara Staff": "org-issara-staff",
	CSO: "org-cso",
	Tester: "org-test-user",
	tester: "org-test-user",
	"Test User": "org-test-user",
	"org-tester": "org-test-user",
	Supplier: "org-supplier",
	supplier: "org-supplier",
	recruiter: "org-recruiter",
	"org-recruitment-agency": "org-recruiter",
	global_partner: "org-global-partner",
};

export const normalizeRoleSlug = (role: unknown): string | null => {
	if (typeof role !== "string") return null;
	const trimmed = role.trim();
	if (!trimmed) return null;
	return GROUP_NAME_TO_SLUG[trimmed] ?? trimmed;
};

const readJson = (key: string): Record<string, unknown> | null => {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
};

/**
 * The signed-in user's role slug, resolved from `auth_user` (role_slug, then
 * groups) and falling back to the persisted `auth-storage` role. Group names
 * are normalized to slugs. Returns null when no source carries a role.
 */
export const getStoredRole = (): string | null => {
	const authUser = readJson("auth_user");
	const fromRoleSlug = normalizeRoleSlug(authUser?.role_slug);
	if (fromRoleSlug) return fromRoleSlug;

	const groups = authUser?.groups;
	if (Array.isArray(groups)) {
		for (const group of groups) {
			const normalized = normalizeRoleSlug(group);
			if (normalized) return normalized;
		}
	}

	const authStorage = readJson("auth-storage");
	const state =
		authStorage?.state && typeof authStorage.state === "object"
			? (authStorage.state as Record<string, unknown>)
			: null;
	return normalizeRoleSlug(state?.role);
};

/**
 * Internal Issara roles (test user, staff, management) — the accounts that must
 * only ever see mock data.
 */
export const isInternalRole = (role: string | null): boolean =>
	role != null && (INTERNAL_ROLE_SLUGS as readonly string[]).includes(role);

/** Whether the signed-in user is an internal Issara account. */
export const isInternalUser = (): boolean => isInternalRole(getStoredRole());
