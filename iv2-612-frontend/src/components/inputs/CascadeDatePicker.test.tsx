import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CascadeDatePicker from "./CascadeDatePicker";

describe("CascadeDatePicker", () => {
	it("shows the placeholder until a date is chosen", () => {
		render(
			<CascadeDatePicker
				aria-label="Internal Date Closed"
				onChange={vi.fn()}
				placeholderText="Select the internal closure date"
				selected={null}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Internal Date Closed" }),
		).toHaveTextContent("Select the internal closure date");
	});

	it("renders the selected date in the CASCADE format", () => {
		render(
			<CascadeDatePicker
				aria-label="Internal Date Closed"
				onChange={vi.fn()}
				selected={new Date(2025, 4, 6)}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Internal Date Closed" }),
		).toHaveTextContent("06-May-2025");
	});

	it("opens the themed calendar and reports the day the user picks", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();

		render(
			<CascadeDatePicker
				aria-label="Internal Date Closed"
				onChange={onChange}
				selected={new Date(2025, 4, 6)}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Internal Date Closed" }),
		);

		// Themed shell + custom header, not react-datepicker's default chrome.
		expect(document.querySelector(".cascade-datepicker")).not.toBeNull();
		expect(
			document.querySelector(".cascade-datepicker__title"),
		).toHaveTextContent("May 2025");

		await user.click(screen.getByRole("gridcell", { name: /May 14th, 2025/ }));

		expect(onChange).toHaveBeenCalledOnce();
		const picked = onChange.mock.calls[0][0] as Date;
		expect(picked.getFullYear()).toBe(2025);
		expect(picked.getMonth()).toBe(4);
		expect(picked.getDate()).toBe(14);
	});

	it("navigates months from the custom header", async () => {
		const user = userEvent.setup();

		render(
			<CascadeDatePicker
				aria-label="Internal Date Closed"
				onChange={vi.fn()}
				selected={new Date(2025, 4, 6)}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Internal Date Closed" }),
		);
		await user.click(screen.getByRole("button", { name: "Previous month" }));

		expect(
			document.querySelector(".cascade-datepicker__title"),
		).toHaveTextContent("April 2025");
	});
});
