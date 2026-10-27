import { describe, expect, it } from "vitest";
import {
	can,
	canCascadeRoleUpdateFeedbackRecord,
	getPermissionsForCascadeRole,
} from "./permissions";

describe("Cascade role permissions", () => {
	it("provides the complete contributor permission assignment", () => {
		expect(getPermissionsForCascadeRole("contributor")).toEqual([
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
		]);
	});

	it("does not change the basic role contract", () => {
		expect(getPermissionsForCascadeRole("basic")).toEqual([
			"profile:read",
			"user_mgmt:read",
			"feedback:read-all",
			"marketplace:read",
		]);
	});

	it("removes sensitive worker-data permissions from Marketplace suppliers", () => {
		expect(getPermissionsForCascadeRole("admin", "MARKETPLACE")).toEqual([
			"profile:read",
			"profile:update",
			"user_mgmt:read",
			"user_mgmt:update",
			"marketplace:read",
			"marketplace:action",
		]);
		expect(can("admin", "feedback:read-all", "MARKETPLACE")).toBe(false);
		expect(can("admin", "issue:read", "MARKETPLACE")).toBe(false);
		expect(can("admin", "grievance_form:add", "MARKETPLACE")).toBe(false);
	});

	it("automatically applies the supplier track saved by the access gate", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ groups: ["org-supplier"] }),
		);
		localStorage.setItem("supplier_track_selection", "MARKETPLACE");
		expect(can("admin", "feedback:read-all")).toBe(false);
		expect(can("admin", "marketplace:read")).toBe(true);
		localStorage.removeItem("auth_user");
		localStorage.removeItem("supplier_track_selection");
	});

	it("does not apply stale supplier track data to an internal user", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ groups: ["org-issara-management"] }),
		);
		localStorage.setItem("supplier_track_selection", "MARKETPLACE");
		expect(can("admin", "feedback:read-all")).toBe(true);
		localStorage.removeItem("auth_user");
		localStorage.removeItem("supplier_track_selection");
	});

	it("keeps sensitive permissions for Full Access suppliers", () => {
		expect(can("contributor", "feedback:read", "FULL")).toBe(true);
		expect(can("contributor", "grievance_form:update", "FULL")).toBe(true);
	});

	it("limits contributor feedback updates to records they own", () => {
		expect(canCascadeRoleUpdateFeedbackRecord("contributor", 7, 7)).toBe(true);
		expect(canCascadeRoleUpdateFeedbackRecord("contributor", 8, 7)).toBe(false);
		expect(canCascadeRoleUpdateFeedbackRecord("organization_admin", 8, 7)).toBe(
			true,
		);
	});
});
