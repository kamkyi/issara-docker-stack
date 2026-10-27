export type CascadeRole =
	| "basic"
	| "contributor"
	| "organization_admin"
	| "admin";

export type CascadePermission =
	| "profile:read"
	| "profile:update"
	| "user_mgmt:read"
	| "user_mgmt:update"
	| "feedback:create"
	| "feedback:read"
	| "feedback:read-all"
	| "feedback:update"
	| "issue:read"
	| "grievance_form:add"
	| "grievance_form:update"
	| "grievance_form:submit-for-review"
	| "marketplace:read"
	| "marketplace:action";

export type SupplierTrack = "MARKETPLACE" | "FULL" | null | undefined;

const MARKETPLACE_RESTRICTED_PREFIXES = [
	"feedback:",
	"issue:",
	"grievance_form:",
] as const;

export const isMarketplaceRestrictedPermission = (
	permission: CascadePermission,
) =>
	MARKETPLACE_RESTRICTED_PREFIXES.some((prefix) =>
		permission.startsWith(prefix),
	);

const BASIC_PERMISSIONS: CascadePermission[] = [
	"profile:read",
	"user_mgmt:read",
	"feedback:read-all",
	"marketplace:read",
];

const CONTRIBUTOR_PERMISSIONS: CascadePermission[] = [
	"profile:read",
	"user_mgmt:read",
	"feedback:create",
	"feedback:read",
	"feedback:update",
	"issue:read",
	"grievance_form:add",
	"grievance_form:update",
	"grievance_form:submit-for-review",
	"marketplace:read",
	"marketplace:action",
];

const ADMIN_PERMISSIONS: CascadePermission[] = [
	"profile:read",
	"profile:update",
	"user_mgmt:read",
	"user_mgmt:update",
	"feedback:create",
	"feedback:read-all",
	"feedback:update",
	"issue:read",
	"grievance_form:add",
	"grievance_form:update",
	"grievance_form:submit-for-review",
	"marketplace:read",
	"marketplace:action",
];

const PERMISSIONS_BY_ROLE: Record<CascadeRole, CascadePermission[]> = {
	basic: BASIC_PERMISSIONS,
	contributor: CONTRIBUTOR_PERMISSIONS,
	organization_admin: ADMIN_PERMISSIONS,
	admin: ADMIN_PERMISSIONS,
};

export const getPermissionsForCascadeRole = (
	role: string | null | undefined,
	track?: SupplierTrack,
): CascadePermission[] => {
	if (!role || !(role in PERMISSIONS_BY_ROLE)) return [];
	const rolePermissions = PERMISSIONS_BY_ROLE[role as CascadeRole];
	if (track !== "MARKETPLACE") return [...rolePermissions];
	return rolePermissions.filter(
		(permission) => !isMarketplaceRestrictedPermission(permission),
	);
};

export const can = (
	role: string | null | undefined,
	permission: CascadePermission,
	track?: SupplierTrack,
) => {
	let effectiveTrack = track;
	if (effectiveTrack === undefined && typeof window !== "undefined") {
		try {
			const authUser = JSON.parse(
				window.localStorage.getItem("auth_user") ?? "{}",
			) as { groups?: string[] };
			if (authUser.groups?.includes("org-supplier")) {
				const storedTrack = window.localStorage.getItem(
					"supplier_track_selection",
				);
				if (storedTrack === "MARKETPLACE" || storedTrack === "FULL") {
					effectiveTrack = storedTrack;
				}
			}
		} catch {
			// Invalid cached identity must never grant or remove permissions.
		}
	}
	return getPermissionsForCascadeRole(role, effectiveTrack).includes(
		permission,
	);
};

export const canCascadeRoleUpdateFeedbackRecord = (
	role: string | null | undefined,
	actorUserId: number | string | null | undefined,
	recordOwnerUserId: number | string | null | undefined,
) => {
	if (role === "organization_admin" || role === "admin") return true;
	if (role !== "contributor") return false;
	if (actorUserId == null || recordOwnerUserId == null) return false;
	return String(actorUserId) === String(recordOwnerUserId);
};
