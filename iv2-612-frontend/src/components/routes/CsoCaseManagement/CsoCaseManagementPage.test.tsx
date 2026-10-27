import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CsoCaseManagementPage from "$src/components/routes/CsoCaseManagement/CsoCaseManagementPage";

const mocks = vi.hoisted(() => ({
	role: "org-issara-management",
	viewMode: "cso-view",
	context: vi.fn(),
	organizations: vi.fn(),
	kpis: vi.fn(),
	cycles: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("$src/store/store.auth", () => ({
	default: (selector: (state: { role: string }) => string) =>
		selector({ role: mocks.role }),
}));
vi.mock("$src/store/viewModeStore", () => ({
	useViewModeStore: (selector: (state: { viewMode: string }) => string) =>
		selector({ viewMode: mocks.viewMode }),
}));
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mocks.navigate,
}));
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));
// The shared filter bar drives its supplier picker off a real react-query hook;
// these tests render without a QueryClientProvider, so it is stubbed out.
vi.mock("$src/queries/suppliers", () => ({
	useSupplierSearch: () => ({ data: [], isLoading: false }),
}));
vi.mock("$src/queries/csoCaseManagement", () => ({
	useCaseManagementContext: mocks.context,
	useCsoOrganizations: mocks.organizations,
	useCsoKpis: mocks.kpis,
	useCsoKpiCycles: mocks.cycles,
	useCsoKpiDetail: () => ({ isLoading: false }),
	useCsoKpiHistory: () => ({ isLoading: false }),
	useCsoCaseCall: () => ({ isLoading: false }),
	usePatchCsoKpi: () => ({ isPending: false, isError: false }),
}));

const noOrganization = {
	actual_role: "management",
	effective_organization: null,
	selection_required: true,
	can_select_organization: true,
	statuses: [],
} as const;

const selectedOrganization = {
	actual_role: "management",
	effective_organization: { id: 4, name: "Linked CSO" },
	selection_required: false,
	can_select_organization: true,
	statuses: [],
} as const;

describe("Case Management effective organization UI", () => {
	beforeEach(() => {
		mocks.role = "org-issara-management";
		mocks.viewMode = "cso-view";
		mocks.context.mockReset();
		mocks.organizations.mockReset();
		mocks.kpis.mockReset();
		mocks.cycles.mockReset();
		mocks.context.mockReturnValue({ data: noOrganization, isLoading: false });
		mocks.organizations.mockReturnValue({
			data: [{ id: 4, name: "Linked CSO" }],
			isError: false,
		});
		mocks.kpis.mockReturnValue({
			data: { count: 0, results: [] },
			isLoading: false,
			isError: false,
		});
		mocks.cycles.mockReturnValue({
			data: { count: 0, results: [] },
			isLoading: false,
			isError: false,
		});
	});

	it("shows the picker and does not enable an unscoped KPI query", () => {
		render(<CsoCaseManagementPage />);
		expect(
			screen.getByText("Select a CSO organization to inspect its cases."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "CSO organization" }),
		).toBeInTheDocument();
		expect(mocks.kpis).toHaveBeenCalledWith(
			expect.objectContaining({ selectedOrganizationId: null }),
			false,
		);
	});

	it("keeps the Management picker visible after selecting an organization", () => {
		mocks.context.mockReturnValue({
			data: selectedOrganization,
			isLoading: false,
		});
		render(<CsoCaseManagementPage />);
		expect(
			screen.getByText("Linked CSO · Case Management"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "CSO organization" }),
		).toBeInTheDocument();
		expect(mocks.kpis).toHaveBeenCalledWith(
			expect.objectContaining({ selectedOrganizationId: null }),
			true,
		);
	});

	it("uses the selected CSO as the Management effective organization", async () => {
		mocks.context.mockImplementation((id: number | null) => ({
			data: id === 4 ? selectedOrganization : noOrganization,
			isLoading: false,
		}));
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		await user.selectOptions(
			screen.getByRole("combobox", { name: "CSO organization" }),
			"4",
		);
		expect(mocks.context).toHaveBeenCalledWith(4);
		expect(
			screen.getByRole("combobox", { name: "CSO organization" }),
		).toBeInTheDocument();
		expect(mocks.kpis).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedOrganizationId: 4 }),
			true,
		);
	});
});

const kpiRow = {
	id: 51,
	supplier_name: "Blue Bay Seafood",
	category: "Payments",
	description: "Unpaid wages",
	level: 2,
	status_name: "No Progress",
	opened_at: "2026-01-04T00:00:00Z",
	closed_at: null,
	affected_workers: 12,
	days_open: 40,
	can_edit: true,
};

const cycleRow = {
	id: 900,
	supplier_kpi: 51,
	supplier_name: "Blue Bay Seafood",
	category: "Payments",
	description: "Unpaid wages",
	level: 2,
	status_name: "Closed",
	opened_at: "2025-02-01T00:00:00Z",
	closed_at: "2025-06-01T00:00:00Z",
};

describe("Case Management queue follows the legacy workflow", () => {
	beforeEach(() => {
		mocks.role = "org-cso";
		mocks.viewMode = "cso-view";
		mocks.context.mockReset();
		mocks.organizations.mockReset();
		mocks.kpis.mockReset();
		mocks.cycles.mockReset();
		mocks.context.mockReturnValue({
			data: {
				actual_role: "cso",
				effective_organization: { id: 7, name: "Issara Institute" },
				selection_required: false,
				can_select_organization: false,
				statuses: [],
			},
			isLoading: false,
		});
		mocks.organizations.mockReturnValue({ data: [], isError: false });
		mocks.kpis.mockReturnValue({
			data: { count: 1, results: [kpiRow] },
			isLoading: false,
			isError: false,
			isFetching: false,
			refetch: vi.fn(),
		});
		mocks.cycles.mockReturnValue({
			data: { count: 1, results: [cycleRow] },
			isLoading: false,
			isError: false,
			isFetching: false,
			refetch: vi.fn(),
		});
	});

	it("shows both queues at once rather than behind a toggle", () => {
		render(<CsoCaseManagementPage />);
		expect(screen.getByText("Current Supplier KPIs")).toBeInTheDocument();
		expect(
			screen.getByText("Supplier KPI open/reopen cycles"),
		).toBeInTheDocument();
	});

	it("opens the detail drawer from a queue row", async () => {
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		await user.click(screen.getAllByRole("button", { name: "View KPI 51" })[0]);
		expect(
			screen.getByRole("complementary", { name: "Supplier KPI 51" }),
		).toBeInTheDocument();
	});

	it("a cycle row opens the Supplier KPI it belongs to, not the update id", async () => {
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		// Both tables expose KPI 51; the cycles row must not open update #900.
		expect(
			screen.queryByRole("button", { name: "View KPI 900" }),
		).not.toBeInTheDocument();
		await user.click(screen.getAllByRole("button", { name: "View KPI 51" })[1]);
		expect(
			screen.getByRole("complementary", { name: "Supplier KPI 51" }),
		).toBeInTheDocument();
	});

	it("offers a bulk update only once rows are selected", async () => {
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		expect(screen.queryByText(/Update selected/)).not.toBeInTheDocument();
		await user.click(screen.getByRole("checkbox", { name: "Select KPI 51" }));
		expect(screen.getByText("Update selected (1)")).toBeInTheDocument();
	});

	it("switches the default sort to closed date when closed rows are shown", async () => {
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		expect(mocks.kpis).toHaveBeenLastCalledWith(
			expect.objectContaining({ ordering: "-opened_at" }),
			true,
		);
		await user.click(screen.getByRole("checkbox", { name: /Show closed/i }));
		expect(mocks.kpis).toHaveBeenLastCalledWith(
			expect.objectContaining({ ordering: "-closed_at", showClosed: true }),
			true,
		);
	});
	it("hands the selection to the bulk update route, as legacy does", async () => {
		const user = userEvent.setup();
		render(<CsoCaseManagementPage />);
		await user.click(screen.getByRole("checkbox", { name: "Select KPI 51" }));
		await user.click(screen.getByText("Update selected (1)"));
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/worker-voice-calls/cases/bulk-update",
			search: { ids: "51" },
		});
	});

	it("drops a selected row that a filter change removed from the queue", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<CsoCaseManagementPage />);
		await user.click(screen.getByRole("checkbox", { name: "Select KPI 51" }));
		expect(screen.getByText("Update selected (1)")).toBeInTheDocument();

		mocks.kpis.mockReturnValue({
			data: { count: 0, results: [] },
			isLoading: false,
			isError: false,
			isFetching: false,
			refetch: vi.fn(),
		});
		rerender(<CsoCaseManagementPage />);
		expect(screen.queryByText(/Update selected/)).not.toBeInTheDocument();
	});
});
