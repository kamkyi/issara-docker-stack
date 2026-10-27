import { describe, expect, it } from "vitest";
import {
	buildBasicInformationUpdatePayload,
	buildWorkforceBreakdownUpdatePayload,
} from "./companyProfileUpdatePayloads";

describe("company profile section update payloads", () => {
	it("keeps Basic Information fields separate from workforce data", () => {
		const payload = buildBasicInformationUpdatePayload({
			name: " Example Supplier ",
			address: " Bangkok ",
			website: "https://example.test",
			background: " Profile ",
			countryId: "66",
			image: "",
			industryIds: [1],
			productCategoryIds: [2],
		});

		expect(payload.partner).not.toHaveProperty("total_num_workers");
		expect(payload).not.toHaveProperty("policy_compliances");
		expect(payload.sourcing).toEqual({
			industry_ids: [1],
			product_category_ids: [2],
		});
	});

	it("keeps Worker Breakdown limited to numeric worker fields", () => {
		const payload = buildWorkforceBreakdownUpdatePayload(
			{ total_num_workers: "120", total_num_men_workers: "" },
			{ total_num_thai_male_workers: "30" },
		);

		expect(payload).toEqual({
			partner: {
				total_num_workers: 120,
				total_num_men_workers: null,
				total_num_thai_male_workers: 30,
			},
		});
		expect(payload).not.toHaveProperty("sourcing");
		expect(payload.partner).not.toHaveProperty("name");
	});
});
