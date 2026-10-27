import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookADemo } from "$src/components/routes/BookADemo";

vi.mock("$src/components/home/CTASection", () => ({
	default: () => null,
}));

vi.mock("$src/components/navbars/AnimatedStickyNavbar", () => ({
	default: () => null,
}));

describe("BookADemo", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
			}),
		);
	});

	it("shows only the Book a Demo heading in the hero", () => {
		const { container } = render(<BookADemo />);

		expect(
			screen.getByRole("heading", { name: "BOOK A DEMO" }),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/Connect with a global community/i),
		).not.toBeInTheDocument();
		expect(container.querySelectorAll("section img")).toHaveLength(3);
	});

	it("shows the requested success message in a responsive card", async () => {
		const user = userEvent.setup();
		render(<BookADemo />);

		await user.type(screen.getByLabelText(/Full Name/), "Jane Smith");
		await user.type(screen.getByLabelText(/Job Title/), "Sustainability Lead");
		await user.type(screen.getByLabelText(/Work Email/), "jane@example.com");
		await user.type(
			screen.getByLabelText(/Company \/ Organization Name/),
			"Example Co",
		);
		await user.click(
			screen.getByRole("button", {
				name: "Global Buyer / Brand / Retailer",
			}),
		);
		await user.type(
			screen.getByLabelText(/Please tell us more/),
			"We would like to schedule a demo.",
		);
		await user.click(screen.getByRole("button", { name: /Submit Inquiry/ }));

		const status = await screen.findByRole("status");
		expect(status).toHaveClass("w-full", "max-w-[36rem]");
		expect(
			screen.getByRole("heading", { name: "Inquiry Submitted!" }),
		).toBeInTheDocument();
		expect(status).toHaveTextContent(
			"Thank you for reaching out. Our team will review your message and get back to you shortly via email.",
		);
		await waitFor(() => {
			const contactRequests = vi
				.mocked(fetch)
				.mock.calls.filter(
					([url, init]) =>
						String(url).endsWith("/contact") && init?.method === "POST",
				);
			expect(contactRequests).toHaveLength(1);
		});
	});
});
