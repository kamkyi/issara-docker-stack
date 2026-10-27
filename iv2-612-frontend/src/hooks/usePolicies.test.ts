import { describe, expect, it } from "vitest";
import { normalizePolicy, shouldUsePolicyMock } from "$src/utils/policies";

describe("normalizePolicy", () => {
	it("falls back safely when policy metadata is missing or legacy-shaped", () => {
		const policy = normalizePolicy({
			id: "42",
			title: "Legacy policy",
			type: null,
			audience: "everyone",
			category_slugs: JSON.stringify(["human-rights", "unknown-category"]),
			file_id: null,
			source_shared_file_id: 0,
		});

		expect(policy).toMatchObject({
			id: 42,
			title: "Legacy policy",
			type: "text",
			audience: "members",
			category_slugs: ["human-rights"],
			text_value: null,
			link_url: null,
			file_id: null,
			source_shared_file_id: null,
			is_source_hidden: false,
			file_url: null,
			file_name: null,
		});
	});
});

describe("shouldUsePolicyMock", () => {
	it("uses mock based on autoMocked for strategic partner owners", () => {
		expect(shouldUsePolicyMock({ kind: "strategic-partner" }, true)).toBe(true);
	});

	it("keeps existing mock behavior for supplier owners", () => {
		expect(shouldUsePolicyMock({ kind: "supplier" }, true)).toBe(true);
		expect(
			shouldUsePolicyMock({ kind: "supplier" }, true, {
				mockMode: "never",
			}),
		).toBe(false);
	});
});
