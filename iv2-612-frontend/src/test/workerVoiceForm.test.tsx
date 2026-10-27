import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import WorkerVoiceForm from "$src/components/routes/WorkerVoiceCalls/WorkerVoiceForm";

// The form's dropdowns each fetch an ILM lookup table. The behaviour under test
// is the stepper gating, so the lookups are stubbed to empty lists.
vi.mock("$src/queries/nationalities", () => ({ useNationalities: () => ({}) }));
vi.mock("$src/queries/interactionReasons", () => ({
	useInteractionReasons: () => ({}),
}));
vi.mock("$src/queries/interactionChannels", () => ({
	useInteractionChannels: () => ({}),
}));
vi.mock("$src/queries/clientTypes", () => ({ useClientTypes: () => ({}) }));
vi.mock("$src/queries/referralActions", () => ({
	useReferralActions: () => ({}),
}));
vi.mock("$src/queries/users", () => ({ useUsers: () => ({}) }));
vi.mock("$src/queries/kpis", () => ({
	useKPIs: () => ({ data: [] }),
	useKPICategories: () => ({ data: [] }),
}));
vi.mock("$src/queries/caseLookups", () => ({
	useContractTypes: () => ({ data: [] }),
	useDocumentTypes: () => ({ data: [] }),
	useCaseStatuses: () => ({ data: [] }),
	useCountries: () => ({ data: [] }),
	useProvinces: () => ({ data: [] }),
	useDistricts: () => ({ data: [] }),
}));

const toastError = vi.fn();
vi.mock("$src/components/toast/toastUtil", () => ({
	showToast: {
		error: (message: string) => toastError(message),
		success: vi.fn(),
	},
}));

const renderForm = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<QueryClientProvider client={queryClient}>
			<Theme>{children}</Theme>
		</QueryClientProvider>
	);
	return render(<WorkerVoiceForm />, { wrapper: Wrapper });
};

describe("WorkerVoiceForm", () => {
	it("opens on step 1 with the finalized key-data questions", () => {
		renderForm();

		expect(
			screen.getByText("What is the nationality of the worker?"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Which officer in the organization received the worker feedback?",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Summary of worker feedback")).toBeInTheDocument();
	});

	it("renders all five steps in the top bar", () => {
		renderForm();

		// "Key Data" also appears as the current step's heading, so match all.
		for (const label of [
			"Key Data",
			"Worker Info",
			"Recruitment Info",
			"Issue Details",
			"Support & Actions",
		]) {
			expect(screen.getAllByText(label).length).toBeGreaterThan(0);
		}
	});

	it("refuses to advance while required key-data fields are empty", async () => {
		const user = userEvent.setup();
		renderForm();

		await user.click(screen.getByRole("button", { name: /Next/ }));

		// Still on step 1, now showing the inline required errors.
		expect(
			screen.getByText("What is the nationality of the worker?"),
		).toBeInTheDocument();
		expect(
			screen.getAllByText("This field is required.").length,
		).toBeGreaterThan(0);
	});

	it("refuses a click on a later step in the top bar", async () => {
		const user = userEvent.setup();
		renderForm();

		await user.click(screen.getByText("Support & Actions"));

		expect(
			screen.getByText("What is the nationality of the worker?"),
		).toBeInTheDocument();
		expect(toastError).toHaveBeenCalled();
	});
});
