import { describe, expect, it } from "vitest";
import {
	resolveCallbackAppRole,
	resolveSynchronizedCallbackAppRole,
	selectCallbackAccessToken,
	selectTokenAppRole,
} from "./authCallbackRole";

describe("resolveCallbackAppRole", () => {
	it("prefers active directory groups over stale appRole when group mapping exists", () => {
		expect(
			resolveCallbackAppRole({
				appRole: "org-test-user",
				groups: ["CSO"],
				tokenRole: "org-supplier",
			}),
		).toBe("org-cso");
	});

	it("returns org-member when groups is empty", () => {
		expect(
			resolveCallbackAppRole({
				appRole: "org-global-partner",
				groups: [],
				tokenRole: "org-supplier",
			}),
		).toBe("org-member");
	});

	it("keeps legacy callback compatibility when appRole is absent", () => {
		expect(
			resolveCallbackAppRole({
				groups: ["Issara Management"],
				tokenRole: "org-member",
			}),
		).toBe("org-issara-management");
		expect(
			resolveCallbackAppRole({
				groups: ["Issara Staff"],
				tokenRole: "org-member",
			}),
		).toBe("org-issara-staff");
		expect(
			resolveCallbackAppRole({
				groups: ["Supplier"],
				tokenRole: "org-member",
			}),
		).toBe("org-supplier");
		expect(
			resolveCallbackAppRole({
				groups: ["global_partner"],
				tokenRole: "org-member",
			}),
		).toBe("org-global-partner");
		expect(
			resolveCallbackAppRole({
				groups: ["recruiter"],
				tokenRole: "org-member",
			}),
		).toBe("org-recruiter");
	});

	it("resolves the CSO group to org-cso, not the internal test-user role", () => {
		expect(
			resolveCallbackAppRole({
				groups: ["CSO"],
				tokenRole: "org-member",
			}),
		).toBe("org-cso");
	});

	it("keeps org-test-user resolving to the internal role", () => {
		expect(
			resolveCallbackAppRole({
				groups: ["org-test-user"],
				tokenRole: "org-member",
			}),
		).toBe("org-test-user");
		expect(
			resolveCallbackAppRole({
				groups: ["Tester"],
				tokenRole: "org-member",
			}),
		).toBe("org-test-user");
		expect(
			resolveCallbackAppRole({
				groups: ["org-tester"],
				tokenRole: "org-member",
			}),
		).toBe("org-test-user");
		expect(
			resolveCallbackAppRole({
				groups: ["CSO", "Tester"],
				tokenRole: "org-member",
			}),
		).toBe("org-test-user");
		expect(
			resolveCallbackAppRole({
				appRole: "org-test-user",
				groups: ["CSO", "Tester"],
				tokenRole: "org-test-user",
			}),
		).toBe("org-test-user");
	});

	it("returns org-member when groups is empty even if tokenRole exists", () => {
		expect(
			resolveCallbackAppRole({
				groups: [],
				tokenRole: "org-recruiter",
			}),
		).toBe("org-member");
	});

	it("never accepts a Cascade business role as an AuthKit app role", () => {
		expect(
			resolveCallbackAppRole({
				appRole: "organization_admin",
				groups: [],
			}),
		).toBe("org-member");
	});
});

describe("callback token synchronization", () => {
	it("prefers the refreshed session token over the legacy token field", () => {
		expect(
			selectCallbackAccessToken({
				legacyToken: "old-token",
				sessionAccessToken: "new-token",
			}),
		).toBe("new-token");
	});

	it("supports AuthKit tokens that expose the role in the roles claim", () => {
		expect(
			selectTokenAppRole({ roles: ["org-supplier", "organization_admin"] }),
		).toBe("org-supplier");
	});

	it("accepts an effective role only when the refreshed token agrees", () => {
		expect(
			resolveSynchronizedCallbackAppRole({
				appRole: "org-supplier",
				groups: ["Supplier"],
				tokenRole: "org-supplier",
			}),
		).toBe("org-supplier");
	});

	it("rejects a stale token role instead of entering with mixed auth state", () => {
		expect(() =>
			resolveSynchronizedCallbackAppRole({
				appRole: "org-supplier",
				groups: ["Supplier"],
				tokenRole: "org-issara-management",
			}),
		).toThrow("AuthKit role synchronization");
	});
});
