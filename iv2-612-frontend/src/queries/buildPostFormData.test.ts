import { describe, expect, it, vi } from "vitest";

// Mock axios to prevent the router → routeTree.gen → marketplace → MUI icons
// import chain from exhausting OS file handles during module resolution.
vi.mock("$src/api/axios", () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
}));

import {
	buildPostFormData,
	type PostFormValues,
} from "./useMessageBoardMutations";

const base: PostFormValues = {
	post_type: "announcement",
	title: "Welcome",
	description: "<p>Hello</p>",
	pinned: false,
	ack_required: false,
};

// Regression coverage for the "sent to everyone" incident: a custom multi-select
// audience must serialize its explicit partner ids, never collapse to a broadcast.
describe("buildPostFormData audience serialization", () => {
	it("broadcasts only when strategic_partner_all is set", () => {
		const fd = buildPostFormData({ ...base, strategic_partner_all: true });
		expect(fd.get("strategic_partner_all")).toBe("true");
		expect(fd.get("audience_partner_ids")).toBeNull();
		expect(fd.get("strategic_partner")).toBeNull();
	});

	it("sends explicit ids for a custom multi-select (no grouping)", () => {
		const fd = buildPostFormData({
			...base,
			audience_grouping: null,
			audience_partner_ids: [11, 22, 33],
		});
		expect(fd.get("audience_partner_ids")).toBe(JSON.stringify([11, 22, 33]));
		// Must NOT fall through to an empty single-partner value (the old bug).
		expect(fd.get("strategic_partner")).toBeNull();
		expect(fd.get("strategic_partner_all")).toBeNull();
	});

	it("sends grouping plus its id snapshot for a group selection", () => {
		const fd = buildPostFormData({
			...base,
			audience_grouping: "Current CASCADE Partners",
			audience_partner_ids: [1, 2],
		});
		expect(fd.get("audience_grouping")).toBe("Current CASCADE Partners");
		expect(fd.get("audience_partner_ids")).toBe(JSON.stringify([1, 2]));
	});

	it("sends a single strategic_partner FK for a one-partner selection", () => {
		const fd = buildPostFormData({ ...base, strategic_partner: 42 });
		expect(fd.get("strategic_partner")).toBe("42");
		expect(fd.get("audience_partner_ids")).toBeNull();
	});
});
