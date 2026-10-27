import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GrievanceAccordionSection from "./GrievanceAccordionSection";

const stubViewport = () => {
	const scrollBy = vi.fn();
	vi.stubGlobal("scrollBy", scrollBy);
	vi.stubGlobal("innerHeight", 800);
	return scrollBy;
};

/** Places the section below the fold so a reveal would have to scroll. */
const clipSection = (title: RegExp) => {
	const section = screen.getByRole("button", { name: title })
		.parentElement as HTMLElement;
	section.getBoundingClientRect = () =>
		({ top: 1200, bottom: 1600, height: 400 }) as DOMRect;
	return section;
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("GrievanceAccordionSection", () => {
	it("connects the trigger to the panel and preserves its content", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		const { rerender } = render(
			<GrievanceAccordionSection
				isOpen={false}
				onToggle={onToggle}
				subtitle="Immediate protective actions"
				title="1. Safeguarding"
			>
				<input aria-label="Case notes" defaultValue="Preserved notes" />
			</GrievanceAccordionSection>,
		);

		const trigger = screen.getByRole("button", {
			name: /1\. Safeguarding/,
		});
		const panelId = trigger.getAttribute("aria-controls");
		const panel = document.getElementById(panelId ?? "");

		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveAttribute("aria-hidden", "true");
		expect(panel).toHaveClass("grid-rows-[0fr]");

		await user.click(trigger);
		expect(onToggle).toHaveBeenCalledOnce();

		rerender(
			<GrievanceAccordionSection
				isOpen
				onToggle={onToggle}
				subtitle="Immediate protective actions"
				title="1. Safeguarding"
			>
				<input aria-label="Case notes" defaultValue="Preserved notes" />
			</GrievanceAccordionSection>,
		);

		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(panel).toHaveAttribute("aria-hidden", "false");
		expect(panel).toHaveClass("grid-rows-[1fr]");
		expect(screen.getByRole("textbox", { name: "Case notes" })).toHaveValue(
			"Preserved notes",
		);
	});

	it("does not scroll the page when it mounts already open", async () => {
		const scrollBy = stubViewport();

		render(
			<GrievanceAccordionSection
				isOpen
				onToggle={vi.fn()}
				subtitle="Immediate protective actions"
				title="1. Safeguarding"
			>
				<p>Step content</p>
			</GrievanceAccordionSection>,
		);
		clipSection(/1\. Safeguarding/);

		await new Promise((resolve) => setTimeout(resolve, 450));

		expect(scrollBy).not.toHaveBeenCalled();
	});

	it("reveals the step once the user opens it and the panel settles", async () => {
		const scrollBy = stubViewport();

		const props = {
			onToggle: vi.fn(),
			subtitle: "Immediate protective actions",
			title: "1. Safeguarding",
		};
		const { rerender } = render(
			<GrievanceAccordionSection {...props} isOpen={false}>
				<p>Step content</p>
			</GrievanceAccordionSection>,
		);

		const section = clipSection(/1\. Safeguarding/);
		expect(scrollBy).not.toHaveBeenCalled();

		rerender(
			<GrievanceAccordionSection {...props} isOpen>
				<p>Step content</p>
			</GrievanceAccordionSection>,
		);
		section.getBoundingClientRect = () =>
			({ top: 1200, bottom: 1600, height: 400 }) as DOMRect;

		const trigger = screen.getByRole("button", { name: /1\. Safeguarding/ });
		const panel = document.getElementById(
			trigger.getAttribute("aria-controls") ?? "",
		) as HTMLElement;
		panel.dispatchEvent(new Event("transitionend"));

		await waitFor(() => expect(scrollBy).toHaveBeenCalledOnce());
		expect(scrollBy).toHaveBeenCalledWith(
			expect.objectContaining({ top: expect.any(Number) }),
		);
	});
});
