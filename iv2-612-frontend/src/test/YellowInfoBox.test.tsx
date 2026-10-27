import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import YellowInfoBox from "$src/components/ui/YellowInfoBox";

describe("YellowInfoBox", () => {
	it("renders the summary text by default", () => {
		render(
			<YellowInfoBox
				expanded="This is the expanded content"
				summary="This is a summary"
			/>,
		);

		expect(screen.getByText("This is a summary")).toBeInTheDocument();
		expect(
			screen.queryByText("This is the expanded content"),
		).not.toBeInTheDocument();
	});

	it("shows expanded content when 'See more' is clicked", async () => {
		const user = userEvent.setup();
		render(
			<YellowInfoBox expanded="Expanded detail text" summary="Summary text" />,
		);

		await user.click(screen.getByRole("link", { name: /see more/i }));

		expect(screen.getByText("Expanded detail text")).toBeInTheDocument();
		expect(screen.queryByText("Summary text")).not.toBeInTheDocument();
	});

	it("collapses back when 'See less' is clicked", async () => {
		const user = userEvent.setup();
		render(
			<YellowInfoBox expanded="Expanded detail text" summary="Summary text" />,
		);

		await user.click(screen.getByRole("link", { name: /see more/i }));
		await user.click(screen.getByRole("link", { name: /see less/i }));

		expect(screen.getByText("Summary text")).toBeInTheDocument();
		expect(screen.queryByText("Expanded detail text")).not.toBeInTheDocument();
	});

	it("accepts custom className and style props", () => {
		const { container } = render(
			<YellowInfoBox
				className="my-custom-class"
				expanded="Expanded"
				style={{ marginTop: "10px" }}
				summary="Summary"
			/>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("my-custom-class");
		expect(wrapper).toHaveStyle({ marginTop: "10px" });
	});
});
