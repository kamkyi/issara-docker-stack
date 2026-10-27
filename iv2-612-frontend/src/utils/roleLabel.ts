/**
 * Turns a role slug ("org-supplier") into text a user can read ("Supplier").
 *
 * Slugs reach the UI from several places — `auth_user.role_slug`, WorkOS group
 * names, the persisted auth store — so they are normalized through
 * normalizeRoleSlug() first and unknown ones still render as readable text
 * instead of leaking the raw slug.
 */

import { normalizeRoleSlug } from "$src/utils/storedRole";

/**
 * Every role slug the app issues, spelled out. normalizeRoleSlug() folds the
 * WorkOS group names and the `org-recruitment-agency` alias into these first.
 */
const ROLE_LABELS: Record<string, string> = {
	"org-supplier": "Supplier",
	// The slug says global partner, but every user-facing string in the app calls
	// this role a strategic partner.
	"org-global-partner": "Strategic Partner",
	"org-cso": "CSO",
	"org-recruiter": "Recruitment Agency",
	"org-issara-staff": "Issara Staff",
	"org-issara-management": "Issara Management",
	"org-test-user": "Tester",
	"org-member": "Member",
	"org-unknown-role": "Unknown Role",
};

/**
 * Drop the `org-` prefix and title-case the rest, so "org-global-partner" reads
 * as "Global Partner".
 */
export const humanizeRoleSlug = (slug: string): string =>
	slug
		.replace(/^org-/, "")
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");

/** Readable label for a role slug; returns "" when there is no role. */
export const getRoleLabel = (slug: string | null | undefined): string => {
	const normalized = normalizeRoleSlug(slug);
	if (!normalized) return "";
	return ROLE_LABELS[normalized] ?? humanizeRoleSlug(normalized);
};
