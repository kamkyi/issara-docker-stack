import { beforeEach, describe, expect, it } from "vitest";
import { getUserIdentifiers } from "$utils/getUserIdentifiers";

describe("getUserIdentifiers", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("uses authorization supplier ID from merged user data", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-supplier" }),
		);
		localStorage.setItem(
			"merged_main_user",
			JSON.stringify({
				authorization: {
					supplierId: "456",
				},
			}),
		);

		expect(getUserIdentifiers().supplierId).toBe(456);
	});

	it("falls back to the Golden Dreams linked user ID", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({
				links: {
					gd: {
						userId: "17792",
					},
				},
				role_slug: "org-supplier",
			}),
		);

		expect(getUserIdentifiers().supplierId).toBe(17792);
	});

	it("prefers the supplier id used by the worker verification QR over GD links", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({
				links: {
					gd: {
						userId: "999",
					},
				},
				role_slug: "org-supplier",
				supplier: "457",
			}),
		);
		localStorage.setItem(
			"merged_main_user",
			JSON.stringify({
				links: {
					gd: {
						userId: "999",
					},
				},
			}),
		);

		expect(getUserIdentifiers().supplierId).toBe(457);
	});
});
