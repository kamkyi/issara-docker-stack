import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SolutionTitle, splitSolutionTitle } from "./SolutionTitle";

describe("SolutionTitle", () => {
	it("splits a title immediately after its first colon", () => {
		expect(
			splitSolutionTitle(
				"Issara Academy: Ethical Grievance Mechanisms: An Introduction",
			),
		).toEqual({
			prefix: "Issara Academy:",
			remainder: "Ethical Grievance Mechanisms: An Introduction",
		});
	});

	it("keeps a title without a colon intact", () => {
		expect(
			splitSolutionTitle(
				"Ethical Grievance Mechanisms self-diagnostic, for suppliers and recruitment agencies",
			),
		).toEqual({
			prefix: null,
			remainder:
				"Ethical Grievance Mechanisms self-diagnostic, for suppliers and recruitment agencies",
		});
	});

	it("renders the colon prefix as an uppercase first line", () => {
		render(
			<SolutionTitle title="Issara Academy: Ethical Grievance Mechanisms 101" />,
		);

		const prefix = screen.getByText("Issara Academy:");
		const remainder = screen.getByText("Ethical Grievance Mechanisms 101");

		expect(prefix).toHaveClass("block", "uppercase", "text-[#148696]");
		expect(remainder).toHaveClass("block", "line-clamp-1");
	});

	it("uses balanced two-line wrapping for a title without a colon", () => {
		render(
			<SolutionTitle title="Ethical Grievance Mechanisms self-diagnostic, for suppliers and recruitment agencies" />,
		);

		const title = screen.getByText(
			"Ethical Grievance Mechanisms self-diagnostic, for suppliers and recruitment agencies",
		);

		expect(title).toHaveClass("line-clamp-2", "[text-wrap:balance]");
	});
});
