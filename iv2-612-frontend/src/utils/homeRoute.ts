import type { ViewMode } from "$src/store/viewModeStore";
import { isILMManagement } from "$src/utils/account";

export type HomeRoute =
	| "/company-dashboard"
	| "/internal-dashboard"
	| "/organization-profile";

// The "Home" destination depends on the *active view*, not just the role.
// Internal users (management / staff / test user) can switch view modes, and
// /internal-dashboard is guarded on viewMode === "ilm-view" — so sending them
// there while they are in supplier/buyer/RA view lands them on /unauthorized.
export const getHomeRoute = (
	role: string | null,
	viewMode: ViewMode,
): HomeRoute => {
	if (viewMode === "ilm-view") return "/internal-dashboard";
	if (viewMode === "cso-view") return "/organization-profile";
	if (viewMode) return "/company-dashboard";

	// No view mode stored yet: fall back to the role's default landing page.
	if (role && isILMManagement(role)) return "/internal-dashboard";
	if (role === "org-cso") return "/organization-profile";
	return "/company-dashboard";
};
