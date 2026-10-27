import { describe, expect, it } from "vitest";
import { mergePatchedDetail } from "$src/queries/csoCaseManagement";

const cached = {
	id: 51,
	affected_workers: 3,
	can_edit: true,
	calls: [{ id: 900 }],
	status_name: "No Progress",
};

const merge = (updated: Record<string, unknown>) =>
	mergePatchedDetail(cached, updated, 51) as Record<string, unknown>;

describe("detail cache merge after a save", () => {
	it("keeps can_edit from the cached detail, not the write response", () => {
		const merged = merge({ id: 51, affected_workers: 9, can_edit: false });
		expect(merged.can_edit).toBe(true);
		expect(merged.affected_workers).toBe(9);
	});

	it("keeps the related calls the write response does not carry", () => {
		expect(merge({ id: 51, affected_workers: 9 }).calls).toEqual([{ id: 900 }]);
	});

	it("leaves a different KPI's cached detail alone", () => {
		expect(mergePatchedDetail(cached, { id: 52 }, 52)).toBe(cached);
	});

	it("ignores an empty cache entry", () => {
		expect(mergePatchedDetail(undefined, { id: 51 }, 51)).toBeUndefined();
	});
});
