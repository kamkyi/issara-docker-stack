import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HrddAccordionSection from "$src/components/dashboard/partner/HrddAccordionSection";

describe("HrddAccordionSection", () => {
	it("exposes its initial state and accessible panel relationship", () => {
		render(
			<HrddAccordionSection defaultExpanded title="HRDD Component 1">
				<p>Policy commitments</p>
			</HrddAccordionSection>,
		);

		const trigger = screen.getByRole("button", {
			name: "HRDD Component 1",
		});
		const panel = screen.getByRole("region", {
			name: "HRDD Component 1",
		});

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger).toHaveAttribute("aria-controls", panel.id);
		expect(panel).toHaveAttribute("aria-hidden", "false");
		expect(panel).not.toHaveAttribute("inert");
	});

	it("starts collapsed by default and toggles from the keyboard", async () => {
		const user = userEvent.setup();
		render(
			<HrddAccordionSection title="HRDD Component 2">
				<button type="button">Existing action</button>
			</HrddAccordionSection>,
		);

		const trigger = screen.getByRole("button", {
			name: "HRDD Component 2",
		});
		const panel = document.getElementById(
			trigger.getAttribute("aria-controls") ?? "",
		);

		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveAttribute("aria-hidden", "true");
		expect(panel).toHaveAttribute("inert");

		trigger.focus();
		await user.keyboard("{Enter}");

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(panel).toHaveAttribute("aria-hidden", "false");
		expect(panel).not.toHaveAttribute("inert");

		await user.keyboard(" ");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveAttribute("aria-hidden", "true");
		expect(panel).toHaveAttribute("inert");
	});

	it("keeps its existing content mounted while collapsed", async () => {
		const user = userEvent.setup();
		render(
			<HrddAccordionSection defaultExpanded title="HRDD Component 3">
				<input aria-label="Existing field" defaultValue="Preserved value" />
			</HrddAccordionSection>,
		);

		const trigger = screen.getByRole("button", {
			name: "HRDD Component 3",
		});
		const field = screen.getByRole("textbox", { name: "Existing field" });

		await user.clear(field);
		await user.type(field, "Updated value");
		await user.click(trigger);
		await user.click(trigger);

		expect(field).toHaveValue("Updated value");
	});
});
