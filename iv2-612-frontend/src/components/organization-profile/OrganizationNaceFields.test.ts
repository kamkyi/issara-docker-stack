import { describe, expect, it } from "vitest";
import type { NaceCode } from "$src/queries/naceCodes";
import { getNaceSectionCodes } from "./OrganizationNaceFields";

const items: NaceCode[] = [
	{
		id: 1,
		code: "A",
		level: 1,
		parent_code: null,
		section_code: "A",
		label: "Agriculture, forestry and fishing",
		sort_order: 1,
	},
	{
		id: 2,
		code: "01",
		level: 2,
		parent_code: "A",
		section_code: "A",
		label: "Crop production",
		sort_order: 2,
	},
	{
		id: 3,
		code: "01.1",
		level: 3,
		parent_code: "01",
		section_code: "A",
		label: "Non-perennial crops",
		sort_order: 3,
	},
	{
		id: 4,
		code: "01.11",
		level: 4,
		parent_code: "01.1",
		section_code: "A",
		label: "Cereals",
		sort_order: 4,
	},
	{
		id: 5,
		code: "C",
		level: 1,
		parent_code: null,
		section_code: "C",
		label: "Manufacturing",
		sort_order: 20,
	},
	{
		id: 6,
		code: "10",
		level: 2,
		parent_code: "C",
		section_code: "C",
		label: "Manufacture of food products",
		sort_order: 21,
	},
];

describe("Tier 1 NACE selection", () => {
	it("keeps multiple selected sections in official order", () => {
		expect(getNaceSectionCodes(["C", "A"], items)).toEqual(["A", "C"]);
	});

	it("converts legacy lower-tier values to unique sections", () => {
		expect(getNaceSectionCodes(["01", "01.1", "01.11", "10"], items)).toEqual([
			"A",
			"C",
		]);
	});

	it("retains only section-shaped values while reference data loads", () => {
		expect(getNaceSectionCodes(["C", "01.11", "A", "C"], [])).toEqual([
			"C",
			"A",
		]);
	});
});
