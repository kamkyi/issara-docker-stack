import { redirect } from "@tanstack/react-router";

interface AuthGuardOptions {
	isAuthenticated: boolean;
	role: string | null;
}

const ROLE_ALIASES: Record<string, string> = {
	recruiter: "org-recruiter",
	"org-recruitment-agency": "org-recruiter",
	Supplier: "org-supplier",
	supplier: "org-supplier",
	global_partner: "org-global-partner",
};

const normalizeRole = (role: string | null) => {
	if (!role) return null;
	return ROLE_ALIASES[role] ?? role;
};

// Every assigned role is admitted on every guarded route. This restores the
// pre-IV2-580 behaviour (commit 6694865d dropped the three external roles from
// this list, which silently revoked access to pages unrelated to that ticket)
// and additionally grants `org-cso`, which never had the implicit grant.
//
// Consequence, deliberately: `allowedGroups` no longer narrows anything, so the
// route guards are decorative and the navbar config is the sole control over
// what each role sees. This is a stopgap to unblock users, not the end state —
// the durable fix is a single per-page role map that both the guards and the
// navbar read, so the two cannot drift again.
//
// `org-member` is intentionally absent: cascade-api's handshake assigns it to
// users with no role configured, and those users genuinely have no access yet.
const IMPLICIT_ROLES = [
	"org-issara-management",
	"org-issara-staff",
	"org-test-user",
	"org-global-partner",
	"org-recruiter",
	"org-supplier",
	"org-cso",
];

export const isAuthorizedForGroups = (
	role: string | null,
	allowedGroups: string[],
) => {
	const normalizedRole = normalizeRole(role);
	const allowed = [...allowedGroups, ...IMPLICIT_ROLES]
		.map((group) => normalizeRole(group))
		.filter(Boolean);
	return Boolean(normalizedRole && allowed.includes(normalizedRole));
};

const createAuthGuard = (allowedGroups: string[]) => {
	return ({ isAuthenticated, role }: AuthGuardOptions) => {
		if (!isAuthenticated) {
			throw redirect({ to: "/" });
		}

		const normalizedRole = normalizeRole(role);

		// An authenticated session with no role stored means the sign-in never
		// finished (e.g. the handshake did not complete), not that the user lacks
		// access. Send them back through sign-in rather than stranding them on the
		// Request Access page, which they cannot recover from.
		if (!normalizedRole) {
			throw redirect({ to: "/" });
		}

		const isAuthorized = isAuthorizedForGroups(normalizedRole, allowedGroups);

		if (!isAuthorized) {
			throw redirect({
				to: "/unauthorized",
			});
		}
	};
};

export const requireRecruiterAuth = createAuthGuard(["recruiter"]);
export const requireSupplierAuth = createAuthGuard(["Supplier"]);
export const requireGlobalPartnerAuth = createAuthGuard(["global_partner"]);
export const requireRecruiterOrGlobalPartnerAuth = createAuthGuard([
	"recruiter",
	"global_partner",
]);
export const requireSupplierOrGlobalPartnerAuth = createAuthGuard([
	"Supplier",
	"global_partner",
]);
export const requireRecruiterSupplierAuth = createAuthGuard([
	"recruiter",
	"Supplier",
]);
export const requireIssaraStaffAuth = createAuthGuard([
	"org-issara-staff",
	"org-issara-management",
]);
export const requireCsoAuth = createAuthGuard(["org-cso"]);
// CSO partners share selected supplier-facing pages with suppliers. Kept
// separate from requireSupplierAuth so the CSO role is not widened onto every
// other supplier-guarded route.
export const requireCsoOrSupplierAuth = createAuthGuard([
	"Supplier",
	"org-cso",
]);

export const handleSignIn = async () => {
	try {
		// Clear all client-side cache before sign-in
		const { clearAllClientCache } = await import("$src/utils/clearCache");
		await clearAllClientCache();

		// Build the authentication URL with the redirect URI
		const authUrl = new URL(import.meta.env.VITE_APP_AUTHKIT_URL);
		authUrl.searchParams.append(
			"redirect_uri",
			import.meta.env.VITE_APP_AUTHKIT_REDIRECT_URI,
		);

		// Redirect to the WorkOS authentication page
		window.location.href = authUrl.toString();
	} catch (error) {
		console.error("Error initiating sign in:", error);
	}
};
