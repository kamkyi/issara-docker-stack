import { describe, expect, it } from "vitest";
import { isSupplierAgreementAccessError } from "$src/utils/supplierAgreementEvents";

describe("supplier agreement protected-response detection", () => {
	it("recognizes Cascade and Django agreement-required responses", () => {
		expect(
			isSupplierAgreementAccessError(403, {
				message: "An active supplier agreement is required",
			}),
		).toBe(true);
		expect(
			isSupplierAgreementAccessError(403, {
				detail: {
					code: "supplier_agreement_required",
					message: "An active supplier agreement is required.",
				},
			}),
		).toBe(true);
	});

	it("ignores unrelated forbidden and authentication responses", () => {
		expect(isSupplierAgreementAccessError(403, { message: "Forbidden" })).toBe(
			false,
		);
		expect(
			isSupplierAgreementAccessError(401, {
				message: "An active supplier agreement is required",
			}),
		).toBe(false);
	});
});
