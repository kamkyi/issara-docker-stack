import { describe, expect, it } from "vitest";
import { getInteractiveMapApiUrl } from "$src/utils/interactiveMapApi";

describe("getInteractiveMapApiUrl", () => {
	it("builds cascade-api maps URLs from the configured API base", () => {
		expect(
			getInteractiveMapApiUrl("suppliers_map", "http://localhost:3000/api/v1/"),
		).toBe("http://localhost:3000/api/v1/maps/suppliers_map");
	});

	it("normalizes legacy-style path slashes", () => {
		expect(
			getInteractiveMapApiUrl(
				"/supplier_full_detail/",
				"https://cascadebackend.example.test/api/v1",
			),
		).toBe(
			"https://cascadebackend.example.test/api/v1/maps/supplier_full_detail",
		);
	});

	it("falls back to a relative cascade-api path if the base is missing", () => {
		expect(getInteractiveMapApiUrl("industries", "")).toBe(
			"/api/v1/maps/industries",
		);
	});
});
