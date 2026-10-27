import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CsoCaseManagementFilters, {
	type CaseManagementFilterState,
	EMPTY_FILTERS,
} from "$src/components/routes/CsoCaseManagement/CsoCaseManagementFilters";

vi.mock("$src/queries/suppliers", () => ({
	useSupplierSearch: () => ({ data: [], isLoading: false }),
}));

const scrollTo = (y: number) =>
	act(() => {
		window.scrollY = y;
		window.dispatchEvent(new Event("scroll"));
	});

const setup = (value: CaseManagementFilterState = EMPTY_FILTERS) => {
	const onChange = vi.fn();
	render(
		<CsoCaseManagementFilters
			isRefreshing={false}
			onChange={onChange}
			onRefresh={vi.fn()}
			value={value}
		/>,
	);
	return onChange;
};

describe("Case Management filter bar", () => {
	beforeEach(() => {
		window.scrollY = 0;
	});

	it("shows the full panel at the top of the page", () => {
		setup();
		expect(screen.getByText("Days active — min")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
	});

	it("condenses to a compact bar once the queue is scrolled", () => {
		setup();
		scrollTo(400);
		expect(screen.queryByText("Days active — min")).toBeNull();
		expect(
			screen.getByRole("button", { name: /^Filters/ }),
		).toBeInTheDocument();
	});

	it("counts the active filters on the collapsed bar", () => {
		setup({
			...EMPTY_FILTERS,
			supplierIds: ["1", "2"],
			showClosed: true,
		});
		scrollTo(400);
		expect(
			screen.getByRole("button", { name: /Filters \(2\)/ }),
		).toBeInTheDocument();
		expect(screen.getByText("2 suppliers")).toBeInTheDocument();
		expect(screen.getByText("Closed shown")).toBeInTheDocument();
	});

	it("reopens the full panel on demand and collapses again", async () => {
		const user = userEvent.setup();
		setup();
		scrollTo(400);
		await user.click(screen.getByRole("button", { name: /^Filters/ }));
		expect(screen.getByText("Days active — min")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /^Collapse/ }));
		expect(screen.queryByText("Days active — min")).toBeNull();
	});

	it("restores the full panel when the user scrolls back up", () => {
		setup();
		scrollTo(400);
		expect(screen.queryByText("Days active — min")).toBeNull();
		scrollTo(0);
		expect(screen.getByText("Days active — min")).toBeInTheDocument();
	});

	it("keeps search usable while collapsed", async () => {
		const user = userEvent.setup();
		const onChange = setup();
		scrollTo(400);
		await user.type(screen.getByLabelText("Search all fields"), "b");
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ search: "b" }),
		);
	});
});
