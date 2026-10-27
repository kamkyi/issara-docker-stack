import { describe, expect, it } from "vitest";
import { getTourStepSpecsForSupplierTrack } from "$src/components/onboarding/OnboardingOverlay";

describe("onboarding tour steps by supplier track", () => {
	it("keeps only the visible Marketplace target for Marketplace suppliers", () => {
		const steps = getTourStepSpecsForSupplierTrack("MARKETPLACE");

		expect(steps.map((step) => step.key)).toEqual(["marketplace"]);
		expect(steps[0]?.targetSelector).toBe(
			'[data-onboarding-target="cascade-marketplace"]',
		);
	});

	it("keeps the full tour for Full Access and unresolved tracks", () => {
		expect(getTourStepSpecsForSupplierTrack("FULL")).toHaveLength(4);
		expect(getTourStepSpecsForSupplierTrack(null)).toHaveLength(4);
	});
});
