import { describe, expect, it } from "vitest";
import { isAuthorizedForGroups } from "./auth";

// Phase 1 of the IV2-580 guard-drift fix: every assigned role is admitted on
// every guarded route, so `allowedGroups` no longer narrows anything. These
// tests pin that contract deliberately — if a future change reintroduces
// per-route narrowing, it must also update the navbar config in the same
// commit, which is what 6694865d failed to do.

const ASSIGNED_ROLES = [
	"org-cso",
	"org-global-partner",
	"org-issara-management",
	"org-issara-staff",
	"org-recruiter",
	"org-supplier",
	"org-test-user",
];

describe("isAuthorizedForGroups", () => {
	it("admits every assigned role regardless of the route's own list", () => {
		for (const role of ASSIGNED_ROLES) {
			expect(isAuthorizedForGroups(role, ["org-cso"])).toBe(true);
			expect(isAuthorizedForGroups(role, ["Supplier"])).toBe(true);
			expect(isAuthorizedForGroups(role, [])).toBe(true);
		}
	});

	it("blocks org-member, which is the handshake's unassigned default", () => {
		expect(isAuthorizedForGroups("org-member", ["org-cso"])).toBe(false);
		expect(isAuthorizedForGroups("org-member", [])).toBe(false);
	});

	it("blocks a missing or unrecognized role", () => {
		expect(isAuthorizedForGroups(null, ["org-cso"])).toBe(false);
		expect(isAuthorizedForGroups("", ["org-cso"])).toBe(false);
		expect(isAuthorizedForGroups("not-a-role", ["org-cso"])).toBe(false);
	});

	it("normalizes legacy role aliases before matching", () => {
		expect(isAuthorizedForGroups("Supplier", ["org-supplier"])).toBe(true);
		expect(isAuthorizedForGroups("supplier", ["org-cso"])).toBe(true);
		expect(isAuthorizedForGroups("global_partner", [])).toBe(true);
		expect(isAuthorizedForGroups("org-recruitment-agency", [])).toBe(true);
	});

	// The pages IV2-580 locked users out of. Each pair is (role, the allow-list
	// its guard actually passes) taken from src/routes/**.
	it("restores access to the pages 6694865d revoked", () => {
		const revoked: Array<[string, string[]]> = [
			// Global Partner
			["org-global-partner", ["Supplier", "org-cso"]], // /company-profile
			["org-global-partner", ["Supplier"]], // /lksg-overview, /cascade-marketplace
			["org-global-partner", ["recruiter", "Supplier"]], // /message-board, /member-directory
			// Recruiter
			["org-recruiter", ["Supplier"]], // /company-dashboard, /lksg-overview
			["org-recruiter", ["global_partner"]], // /company-supply-chain
			["org-recruiter", ["Supplier", "global_partner"]], // /recruitment-agencies
			// Supplier
			["org-supplier", ["global_partner"]], // /company-supply-chain
			// CSO — never had the implicit grant at all
			["org-cso", ["Supplier"]],
			["org-cso", ["recruiter", "Supplier"]],
		];

		for (const [role, allowedGroups] of revoked) {
			expect(isAuthorizedForGroups(role, allowedGroups)).toBe(true);
		}
	});
});
