import { describe, expect, it } from "vitest";
import {
	getSupplierAgreementChangeMessage,
	getSupplierTrackRedirect,
	isMarketplaceBlockedPath,
	SUPPLIER_AGREEMENT_ROUTE,
} from "$src/components/auth/SupplierTrackGate";

describe("Marketplace supplier route gating", () => {
	it("blocks non-Marketplace supplier product routes", () => {
		expect(isMarketplaceBlockedPath("/company-dashboard")).toBe(true);
		expect(isMarketplaceBlockedPath("/company-profile")).toBe(true);
		expect(isMarketplaceBlockedPath("/labor")).toBe(true);
		expect(isMarketplaceBlockedPath("/member-directory")).toBe(true);
		expect(isMarketplaceBlockedPath("/worker-reported-issues")).toBe(true);
		expect(
			isMarketplaceBlockedPath("/social-responsibility/worker-reported-issues"),
		).toBe(true);
	});

	it("keeps Marketplace, account utilities, and setup routes available", () => {
		expect(isMarketplaceBlockedPath("/cascade-marketplace")).toBe(false);
		expect(
			isMarketplaceBlockedPath(
				"/cascade-marketplace/grievance-self-diagnostic",
			),
		).toBe(false);
		expect(isMarketplaceBlockedPath("/account")).toBe(false);
		expect(isMarketplaceBlockedPath("/track-selection")).toBe(false);
		expect(isMarketplaceBlockedPath("/logout")).toBe(false);
	});
});

describe("supplier agreement change messages", () => {
	it("provides a specific toast for reset, revoke, deletion, and re-acceptance", () => {
		expect(getSupplierAgreementChangeMessage("RESET")).toMatch(/reset/i);
		expect(getSupplierAgreementChangeMessage("REVOKED")).toMatch(/revoked/i);
		expect(getSupplierAgreementChangeMessage("DELETED")).toMatch(
			/no longer active/i,
		);
		expect(getSupplierAgreementChangeMessage("REACCEPT_REQUIRED")).toMatch(
			/updated by an administrator/i,
		);
	});

	it("does not toast for initial setup or unaffected active access", () => {
		expect(getSupplierAgreementChangeMessage("NOT_SELECTED")).toBeNull();
		expect(getSupplierAgreementChangeMessage("ACTIVE", true)).toBeNull();
		expect(getSupplierAgreementChangeMessage("NOT_SELECTED", true)).toMatch(
			/no longer active/i,
		);
	});
});

describe("supplier access reset routing", () => {
	it.each(["Marketplace", "Full Access"])(
		"redirects a reset %s supplier to the agreement URL",
		() => {
			expect(
				getSupplierTrackRedirect(
					{ needs_track_selection: true, track_selection: null },
					"/company-dashboard",
				),
			).toBe(SUPPLIER_AGREEMENT_ROUTE);
		},
	);

	it("does not redirect another supplier whose Full Access remains active", () => {
		expect(
			getSupplierTrackRedirect(
				{ needs_track_selection: false, track_selection: "FULL" },
				"/company-dashboard",
			),
		).toBeNull();
	});
});
