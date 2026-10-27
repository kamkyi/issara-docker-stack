/**
 * Step 1 must hand the three audience-filtered lookups the view it is being
 * rendered in.
 *
 * This is the whole fix seen end to end: an Issara Management account in CSO
 * view holds a Management token, so unless the form says which audience it is
 * rendering, the server answers with the Issara-worded rows and the tester
 * reviews options no CSO officer will ever be offered.
 */
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkerVoiceForm from "$src/components/routes/WorkerVoiceCalls/WorkerVoiceForm";
import { useViewModeStore, type ViewMode } from "$src/store/viewModeStore";

interface CsoAudienceOptions {
	csoOnly?: boolean;
}

const useClientTypes = vi.fn(
	(_lang?: string, _options?: CsoAudienceOptions) => ({}),
);
const useInteractionReasons = vi.fn((_options?: CsoAudienceOptions) => ({}));
const useInteractionChannels = vi.fn((_options?: CsoAudienceOptions) => ({}));
const useUsers = vi.fn((_options?: CsoAudienceOptions) => ({}));

vi.mock("$src/queries/nationalities", () => ({ useNationalities: () => ({}) }));
vi.mock("$src/queries/interactionReasons", () => ({
	useInteractionReasons: (options?: CsoAudienceOptions) =>
		useInteractionReasons(options),
}));
vi.mock("$src/queries/interactionChannels", () => ({
	useInteractionChannels: (options?: CsoAudienceOptions) =>
		useInteractionChannels(options),
}));
vi.mock("$src/queries/clientTypes", () => ({
	useClientTypes: (lang?: string, options?: CsoAudienceOptions) =>
		useClientTypes(lang, options),
}));
vi.mock("$src/queries/referralActions", () => ({
	useReferralActions: () => ({}),
}));
vi.mock("$src/queries/users", () => ({
	useUsers: (options?: CsoAudienceOptions) => useUsers(options),
}));
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
vi.mock("$src/components/toast/toastUtil", () => ({
	showToast: { error: vi.fn(), success: vi.fn() },
}));

const renderIn = (mode: ViewMode) => {
	useViewModeStore.getState().setViewMode(mode);
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

describe("Worker Voice form in the CSO tester view", () => {
	beforeEach(() => {
		useClientTypes.mockClear();
		useInteractionReasons.mockClear();
		useInteractionChannels.mockClear();
		useUsers.mockClear();
	});

	it("asks the audience-filtered lookups for the CSO rows in CSO view", () => {
		renderIn("cso-view");

		expect(useClientTypes).toHaveBeenCalledWith("en", { csoOnly: true });
		expect(useInteractionReasons).toHaveBeenCalledWith({ csoOnly: true });
		expect(useInteractionChannels).toHaveBeenCalledWith({ csoOnly: true });
	});

	it("does not override the audience outside CSO view", () => {
		renderIn("ilm-view");

		expect(useClientTypes).toHaveBeenCalledWith("en", { csoOnly: false });
		expect(useInteractionReasons).toHaveBeenCalledWith({ csoOnly: false });
		expect(useInteractionChannels).toHaveBeenCalledWith({ csoOnly: false });
	});

	it("switches the officer picker to the CSO rule in CSO view", () => {
		// `/cascade/users/` always scopes to the signed-in account's own
		// organization -- the flag changes the *rule*, never the organization.
		// The CSO rule is "my organization's officers"; the Management rule is
		// "every non-CSO user", so the two genuinely differ for one same org.
		renderIn("cso-view");

		expect(useUsers).toHaveBeenCalledWith({ csoOnly: true });
	});

	it("keeps the Management officer rule outside CSO view", () => {
		renderIn("ilm-view");

		expect(useUsers).toHaveBeenCalledWith({ csoOnly: false });
	});
});
