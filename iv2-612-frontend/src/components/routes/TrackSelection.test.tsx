import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrackSelection from "$src/components/routes/TrackSelection";
import {
	getSupplierTrackQueryKey,
	getSupplierTrackStatus,
	type SupplierTrackStatus,
	selectFullTrack,
	selectMarketplaceTrack,
} from "$src/services/supplierTrackService";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

vi.mock("$src/services/supplierTrackService", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("$src/services/supplierTrackService")
	>()),
	getSupplierTrackStatus: vi.fn(),
	selectFullTrack: vi.fn(),
	selectMarketplaceTrack: vi.fn(),
}));

const status: SupplierTrackStatus = {
	supplier_id: 17792,
	supplier_name: "Test Supplier",
	track_selection: null,
	license_agreed_at: null,
	agreement_signer_name: null,
	agreement_signer_title: null,
	agreement_signer_affiliation: null,
	agreement_version: "cascade-full-access-v1.0",
	agreement_sections: [
		{
			title: "1. Purpose & Scope",
			body: "Test agreement body.",
		},
	],
	access_status: "NOT_SELECTED",
	access_changed_at: null,
	needs_track_selection: true,
};

function renderScreen(
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	}),
) {
	return render(
		<Theme>
			<QueryClientProvider client={queryClient}>
				<TrackSelection />
			</QueryClientProvider>
		</Theme>,
	);
}

describe("supplier track selection screen", () => {
	beforeEach(() => {
		localStorage.clear();
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ id: "user_supplier", email: "supplier@example.com" }),
		);
		vi.clearAllMocks();
		vi.mocked(getSupplierTrackStatus).mockResolvedValue(status);
		vi.mocked(selectMarketplaceTrack).mockResolvedValue({
			data: status,
			changed: false,
			email_sent: null,
		});
	});

	it("renders the reference track-selection content", async () => {
		renderScreen();

		expect(
			await screen.findByRole("heading", {
				name: "How would you like to get started?",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "CASCADE Marketplace" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Full CASCADE Access" }),
		).toBeInTheDocument();
		expect(screen.getByText(/License Agreement Required/)).toBeInTheDocument();
		expect(
			screen.getByText(/better data and better solutions/i),
		).toBeInTheDocument();
	});

	it("renders cached callback status without the setup loading flash", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		queryClient.setQueryData(getSupplierTrackQueryKey("user_supplier"), status);

		renderScreen(queryClient);

		expect(screen.queryByText("Preparing one-time setup")).toBeNull();
		expect(
			screen.getByRole("heading", {
				name: "How would you like to get started?",
			}),
		).toBeInTheDocument();
		expect(getSupplierTrackStatus).not.toHaveBeenCalled();
	});

	it("moves through the Full Access agreement and confirmation when all sections are confirmed", async () => {
		const user = userEvent.setup();
		vi.mocked(selectFullTrack).mockResolvedValue({
			data: { ...status, track_selection: "FULL" },
			changed: true,
			email_sent: true,
		});
		renderScreen();

		await user.click(
			await screen.findByRole("button", { name: "Review Agreement" }),
		);
		expect(
			screen.getByRole("heading", {
				name: "Issara Institute CASCADE Agreement",
			}),
		).toBeInTheDocument();
		expect(screen.getByText("supplier@example.com")).toBeInTheDocument();
		const signedDateContainer = screen.getByText("Date").closest("div");
		expect(signedDateContainer).toHaveTextContent(
			new Intl.DateTimeFormat("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				timeZone: "Asia/Bangkok",
			}).format(new Date()),
		);
		expect(screen.getByLabelText("Title")).toHaveAttribute(
			"placeholder",
			"e.g. Compliance Manager",
		);
		expect(screen.getByLabelText("Affiliation / Company")).toHaveAttribute(
			"placeholder",
			"Type your organization",
		);
		expect(document.querySelector(".react-datepicker")).not.toBeInTheDocument();

		// Fill in signer fields and main affirmation
		await user.click(
			screen.getByLabelText(
				/By clicking ‘I Agree’, you confirm that you have read/,
			),
		);
		await user.type(screen.getByLabelText("Full legal name"), "  Ref Design  ");
		await user.type(screen.getByLabelText("Title"), "  Compliance Manager  ");
		await user.type(
			screen.getByLabelText("Affiliation / Company"),
			"  Example Supplier Co.  ",
		);

		// Attempt to sign before checking accordion checkboxes -> modal warning appears
		await user.click(screen.getByRole("button", { name: "I Agree" }));
		expect(
			screen.getByRole("heading", { name: "Checkboxes Required" }),
		).toBeInTheDocument();
		expect(selectFullTrack).not.toHaveBeenCalled();

		// Dismiss modal
		await user.click(
			screen.getByRole("button", { name: "Understand & Review" }),
		);

		// Check confirmation box on the Overview section (already open by default)
		await user.click(
			screen.getByLabelText(
				/I confirm that I have read the Principles and Operating Standards Overview/,
			),
		);

		await user.click(
			screen.getByRole("button", { name: /Five Guiding Principles/ }),
		);
		await user.click(
			screen.getByLabelText(
				/I confirm that I have read the Five Guiding Principles/,
			),
		);

		await user.click(
			screen.getByRole("button", {
				name: /Operational Standards \(with the 3 Areas\)/,
			}),
		);
		await user.click(
			screen.getByLabelText(
				/I confirm that I have read the Operational Standards/,
			),
		);

		// Now click I Agree
		await user.click(screen.getByRole("button", { name: "I Agree" }));

		expect(selectFullTrack).toHaveBeenCalledWith({
			signerName: "Ref Design",
			signerTitle: "Compliance Manager",
			signerAffiliation: "Example Supplier Co.",
			agreementVersion: "cascade-full-access-v1.0",
			lang: "en",
		});
		expect(
			await screen.findByRole("heading", { name: "Agreement signed" }),
		).toBeInTheDocument();
	}, 15000);

	it("requires all signer identity fields and shows clear validation", async () => {
		const user = userEvent.setup();
		renderScreen();

		await user.click(
			await screen.findByRole("button", { name: "Review Agreement" }),
		);
		const signButton = screen.getByRole("button", {
			name: "I Agree",
		});
		await user.click(
			screen.getByLabelText(
				/By clicking ‘I Agree’, you confirm that you have read/,
			),
		);

		const titleInput = screen.getByLabelText("Title");
		await user.click(titleInput);
		await user.tab();

		await user.click(signButton);
		expect(
			screen.getByText("Please enter your professional title."),
		).toBeInTheDocument();
		expect(selectFullTrack).not.toHaveBeenCalled();
	}, 15000);

	it("grants Marketplace access without opening the Full agreement", async () => {
		const user = userEvent.setup();
		vi.mocked(selectMarketplaceTrack).mockResolvedValue({
			data: {
				...status,
				track_selection: "MARKETPLACE",
				needs_track_selection: false,
			},
			changed: true,
			email_sent: null,
		});
		renderScreen();

		await user.click(await screen.findByRole("button", { name: "Continue" }));

		expect(selectMarketplaceTrack).toHaveBeenCalledOnce();
		expect(selectFullTrack).not.toHaveBeenCalled();
		expect(navigate).toHaveBeenCalledWith({ to: "/cascade-marketplace" });
	});

	it.each(["Marketplace", "Full Access"])(
		"shows both track options after %s access is reset",
		async () => {
			vi.mocked(getSupplierTrackStatus).mockResolvedValue({
				...status,
				track_selection: null,
				license_agreed_at: null,
			});
			renderScreen();

			expect(
				await screen.findByRole("heading", {
					name: "How would you like to get started?",
				}),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("heading", {
					name: "Issara Institute CASCADE Agreement",
				}),
			).not.toBeInTheDocument();
			expect(screen.getByText("CASCADE Marketplace")).toBeInTheDocument();
			expect(screen.getByText("Full CASCADE Access")).toBeInTheDocument();
		},
	);

	it("renders the language selector on the top bar", async () => {
		renderScreen();

		expect(await screen.findByRole("combobox")).toBeInTheDocument();
	});
});
