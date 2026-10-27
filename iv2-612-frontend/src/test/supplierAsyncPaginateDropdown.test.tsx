/**
 * The async supplier picker on Worker Voice step 1 (IV2-582).
 *
 * What matters here is that the supplier table is never loaded up front:
 * typing has to reach the server, and more results have to arrive by cursor
 * rather than by having been fetched already.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSupplierPage = vi.fn();
const fetchSupplierById = vi.fn();

vi.mock("$src/queries/suppliers", () => ({
	fetchSupplierPage: (search: string, cursor: string | null) =>
		fetchSupplierPage(search, cursor),
	fetchSupplierById: (id: number) => fetchSupplierById(id),
}));

import SupplierAsyncPaginateDropdown from "$src/components/dropdowns/SupplierAsyncPaginateDropdown";

const page = (
	suppliers: Array<{ id: number; name: string }>,
	nextCursor: string | null = null,
) => ({ suppliers, nextCursor });

beforeEach(() => {
	fetchSupplierPage.mockReset();
	fetchSupplierById.mockReset();
	fetchSupplierPage.mockResolvedValue(page([]));
	fetchSupplierById.mockResolvedValue(null);
});

describe("SupplierAsyncPaginateDropdown", () => {
	it("asks the server for the first page instead of loading every supplier", async () => {
		fetchSupplierPage.mockResolvedValue(
			page([{ id: 1, name: "Alpha Seafood" }], "cursor-2"),
		);

		render(
			<SupplierAsyncPaginateDropdown
				onChange={vi.fn()}
				placeholder="Search for a supplier by name"
				value={null}
			/>,
		);

		await userEvent.click(
			screen.getByLabelText("Search for a supplier by name"),
		);

		await waitFor(() => {
			expect(fetchSupplierPage).toHaveBeenCalledWith("", null);
		});
		expect(await screen.findByText("Alpha Seafood")).toBeInTheDocument();
	});

	it("searches server-side on the typed term", async () => {
		render(<SupplierAsyncPaginateDropdown onChange={vi.fn()} value={null} />);

		const input = screen.getByRole("combobox");
		await userEvent.click(input);
		await userEvent.type(input, "phatthana");

		// Debounced, so the term arrives as one request rather than nine.
		await waitFor(
			() => {
				expect(fetchSupplierPage).toHaveBeenCalledWith("phatthana", null);
			},
			{ timeout: 2000 },
		);
	});

	it("hands the whole supplier back on selection", async () => {
		const onChange = vi.fn();
		fetchSupplierPage.mockResolvedValue(
			page([{ id: 18055, name: "India-Supplier" }]),
		);

		render(<SupplierAsyncPaginateDropdown onChange={onChange} value={null} />);

		await userEvent.click(screen.getByRole("combobox"));
		await userEvent.click(await screen.findByText("India-Supplier"));

		expect(onChange).toHaveBeenCalledWith({
			id: 18055,
			name: "India-Supplier",
		});
	});

	it("reports a cleared selection as null", async () => {
		const onChange = vi.fn();
		fetchSupplierPage.mockResolvedValue(
			page([{ id: 18055, name: "India-Supplier" }]),
		);

		render(<SupplierAsyncPaginateDropdown onChange={onChange} value={null} />);

		await userEvent.click(screen.getByRole("combobox"));
		await userEvent.click(await screen.findByText("India-Supplier"));
		onChange.mockClear();

		// react-select's clear indicator carries no accessible name, so this
		// takes the keyboard path a user has anyway: backspace on an empty
		// input drops the current value.
		await userEvent.type(screen.getByRole("combobox"), "{backspace}");

		expect(onChange).toHaveBeenCalledWith(null);
	});

	it("resolves a preselected id it never listed, so the edit form shows a name", async () => {
		fetchSupplierById.mockResolvedValue({ id: 18055, name: "India-Supplier" });

		render(<SupplierAsyncPaginateDropdown onChange={vi.fn()} value={18055} />);

		expect(await screen.findByText("India-Supplier")).toBeInTheDocument();
		expect(fetchSupplierById).toHaveBeenCalledWith(18055);
	});

	it("says so when nothing matches rather than looking stuck", async () => {
		render(<SupplierAsyncPaginateDropdown onChange={vi.fn()} value={null} />);

		await userEvent.click(screen.getByRole("combobox"));

		// The message only lands once the first page has resolved, so this
		// waits past the loading state rather than racing it.
		expect(
			await screen.findByText("No suppliers match that name", undefined, {
				timeout: 5000,
			}),
		).toBeInTheDocument();
	});

	it("shows an error rather than wedging the menu when the request fails", async () => {
		fetchSupplierPage.mockRejectedValue(new Error("network"));

		render(<SupplierAsyncPaginateDropdown onChange={vi.fn()} value={null} />);

		await userEvent.click(screen.getByRole("combobox"));

		expect(
			await screen.findByText(
				"Could not load suppliers. Check your connection and try again.",
				undefined,
				{ timeout: 5000 },
			),
		).toBeInTheDocument();
	});
});
