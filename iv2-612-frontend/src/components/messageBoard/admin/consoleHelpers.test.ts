import { describe, expect, it } from "vitest";
import type { BoardPost } from "$src/assets/mock/message-board";
import { boardPostToInitial } from "./consoleHelpers";

const basePost: BoardPost = {
	id: "1",
	type: "announcement",
	pinned: false,
	unread: false,
	author: { name: "Staff", role: "Admin", initials: "ST", color: "#000" },
	time: "",
	date: "",
	title: "Test",
	body: "<p>Body</p>",
	ackRequired: false,
	comments: [],
};

// Regression: editing a saved post whose audience is a hand-picked multi-select
// must NOT be treated as a broadcast — otherwise reopening it silently reverts the
// audience to "all partners".
describe("boardPostToInitial audience derivation", () => {
	it("is not a broadcast when explicit partner ids are present", () => {
		const initial = boardPostToInitial({
			...basePost,
			audienceGrouping: null,
			strategicPartnerId: null,
			audiencePartnerIds: [49, 32],
		});
		expect(initial.audience_all).toBe(false);
		expect(initial.audience_partner_ids).toEqual([49, 32]);
	});

	it("is a broadcast only when grouping, FK, and ids are all absent", () => {
		const initial = boardPostToInitial({
			...basePost,
			audienceGrouping: null,
			strategicPartnerId: null,
			audiencePartnerIds: null,
		});
		expect(initial.audience_all).toBe(true);
	});

	it("is not a broadcast for a grouping selection", () => {
		const initial = boardPostToInitial({
			...basePost,
			audienceGrouping: "Current CASCADE Partners",
			audiencePartnerIds: null,
		});
		expect(initial.audience_all).toBe(false);
		expect(initial.audience_grouping).toBe("Current CASCADE Partners");
	});
});
