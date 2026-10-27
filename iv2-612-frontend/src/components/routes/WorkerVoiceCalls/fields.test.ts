import { describe, expect, it } from "vitest";
import { DIAL_CODES, joinPhone, splitPhone } from "./fields";

describe("splitPhone", () => {
	it("splits a stored contact into its code and number", () => {
		expect(splitPhone("+95 912345678")).toEqual({
			dialCode: "+95",
			number: "912345678",
		});
	});

	it("keeps codes that share a prefix apart", () => {
		// "+1" and "+91" only stay distinguishable because of the separator.
		expect(splitPhone("+1 5551234").dialCode).toBe("+1");
		expect(splitPhone("+91 5551234").dialCode).toBe("+91");
	});

	it("treats a value saved without a code as the number", () => {
		// Cases created before the code dropdown existed still have to load.
		expect(splitPhone("0912345678")).toEqual({
			dialCode: null,
			number: "0912345678",
		});
	});

	it("round-trips every global code the dropdown offers", () => {
		for (const { code } of DIAL_CODES) {
			expect(splitPhone(joinPhone(code, "123456"))).toEqual({
				dialCode: code,
				number: "123456",
			});
		}
	});
});

describe("DIAL_CODES", () => {
	it("uses maintained metadata for a worldwide country list", () => {
		expect(DIAL_CODES.length).toBeGreaterThan(200);
		expect(DIAL_CODES).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: "+66",
					countryCode: "TH",
					flag: "🇹🇭",
					label: "Thailand",
				}),
				expect.objectContaining({
					code: "+44",
					countryCode: "GB",
					flag: "🇬🇧",
					label: "United Kingdom",
				}),
				expect.objectContaining({
					code: "+237",
					countryCode: "CM",
					flag: "🇨🇲",
					label: "Cameroon",
				}),
			]),
		);
	});

	it("keeps the familiar countries first before the worldwide list", () => {
		expect(
			DIAL_CODES.slice(0, 12).map(({ countryCode }) => countryCode),
		).toEqual([
			"MM",
			"KH",
			"TH",
			"VN",
			"LA",
			"BD",
			"NP",
			"IN",
			"PH",
			"ID",
			"MY",
			"US",
		]);
	});
});

describe("joinPhone", () => {
	it("stores nothing when the number is blank", () => {
		expect(joinPhone("+66", "")).toBe("");
		expect(joinPhone("+66", "   ")).toBe("");
	});
});
