import { ROLE_MAPPINGS } from "$src/constants/role";

const AUTHKIT_APP_ROLES = new Set([
	"org-cso",
	"org-global-partner",
	"org-issara-management",
	"org-issara-staff",
	"org-member",
	"org-recruiter",
	"org-recruitment-agency",
	"org-supplier",
	"org-test-user",
]);

export const determineLegacyRoleSlug = (groups: string[]): string => {
	const normalizedGroups = new Set(groups.map((group) => group.trim()));

	if (
		normalizedGroups.has("Issara Management") ||
		normalizedGroups.has("org-issara-management")
	) {
		return "org-issara-management";
	}
	if (
		normalizedGroups.has("Issara Staff") ||
		normalizedGroups.has("org-issara-staff")
	) {
		return "org-issara-staff";
	}
	if (
		normalizedGroups.has("org-test-user") ||
		normalizedGroups.has("org-tester") ||
		normalizedGroups.has("Tester") ||
		normalizedGroups.has("tester") ||
		normalizedGroups.has("Test User")
	) {
		return "org-test-user";
	}
	if (normalizedGroups.has("CSO") || normalizedGroups.has("org-cso")) {
		return "org-cso";
	}

	for (const mapping of ROLE_MAPPINGS) {
		if (
			normalizedGroups.has(mapping.group) ||
			normalizedGroups.has(mapping.slug)
		) {
			return mapping.slug;
		}
	}

	return "";
};

const validAppRole = (value: unknown): string => {
	if (typeof value !== "string") return "";
	const role = value.trim();
	return AUTHKIT_APP_ROLES.has(role) ? role : "";
};

export const selectCallbackAccessToken = ({
	legacyToken,
	sessionAccessToken,
}: {
	legacyToken?: unknown;
	sessionAccessToken?: unknown;
}): string => {
	const refreshedToken =
		typeof sessionAccessToken === "string" ? sessionAccessToken.trim() : "";
	if (refreshedToken) return refreshedToken;

	return typeof legacyToken === "string" ? legacyToken.trim() : "";
};

export const selectTokenAppRole = ({
	role,
	roles,
}: {
	role?: unknown;
	roles?: unknown;
}): string => {
	const primaryRole = validAppRole(role);
	if (primaryRole) return primaryRole;

	if (!Array.isArray(roles)) return "";
	for (const candidate of roles) {
		const validRole = validAppRole(candidate);
		if (validRole) return validRole;
	}

	return "";
};

export const resolveCallbackAppRole = ({
	groups,
}: {
	appRole?: unknown;
	groups: string[];
	tokenRole?: unknown;
}): string => determineLegacyRoleSlug(groups) || "org-member";

export const resolveSynchronizedCallbackAppRole = ({
	appRole,
	groups,
	tokenRole,
}: {
	appRole?: unknown;
	groups: string[];
	tokenRole?: unknown;
}): string => {
	const verifiedTokenRole = validAppRole(tokenRole);
	const resolvedRole = resolveCallbackAppRole({ appRole, groups, tokenRole });

	if (!verifiedTokenRole || verifiedTokenRole !== resolvedRole) {
		throw new Error(
			"AuthKit role synchronization did not produce a matching token",
		);
	}

	return resolvedRole;
};
