import { describe, expect, it } from "vitest";
import {
	clampPaginationModelToRowCount,
	resetPageWhenPageSizeChanges,
} from "$utils/dataTablePagination";

describe("DataTable pagination helpers", () => {
	it("resets the page when the page size changes", () => {
		expect(
			resetPageWhenPageSizeChanges(
				{ page: 3, pageSize: 10 },
				{ page: 3, pageSize: 20 },
			),
		).toEqual({ page: 0, pageSize: 20 });
	});
	it("keeps the current page when the page size stays the same", () => {
		expect(
			resetPageWhenPageSizeChanges(
				{ page: 2, pageSize: 10 },
				{ page: 1, pageSize: 10 },
			),
		).toEqual({ page: 1, pageSize: 10 });
	});

	it("clamps client pagination to the last available page", () => {
		expect(
			clampPaginationModelToRowCount({ page: 4, pageSize: 10 }, 21),
		).toEqual({ page: 2, pageSize: 10 });
	});

	it("keeps the current page when it is still valid", () => {
		expect(
			clampPaginationModelToRowCount({ page: 1, pageSize: 10 }, 25),
		).toEqual({ page: 1, pageSize: 10 });
	});
});
