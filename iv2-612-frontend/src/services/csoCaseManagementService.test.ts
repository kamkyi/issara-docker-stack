import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import {
	fetchCaseManagementContext,
	fetchCsoCaseCall,
	fetchCsoKpiDetail,
	fetchCsoKpis,
	fetchCsoOrganizations,
	patchCsoKpi,
} from "$src/services/csoCaseManagementService";

vi.mock("$src/api/axios", () => ({
	api: { get: vi.fn(), patch: vi.fn() },
}));

describe("CSO Case Management service", () => {
	beforeEach(() => {
		vi.stubEnv("VITE_API_BASE_URL", "https://ilm.example.test/api/v2");
		vi.mocked(api.get).mockReset();
		vi.mocked(api.patch).mockReset();
		vi.mocked(api.get).mockResolvedValue({ data: { results: [] } });
		vi.mocked(api.patch).mockResolvedValue({ data: {} });
	});

	it("loads the backend-resolved context without a browser organization", async () => {
		await fetchCaseManagementContext();
		expect(api.get).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/context/",
			{ params: {} },
		);
	});

	it("sends a selected organization only for the Management selection flow", async () => {
		await fetchCaseManagementContext(12);
		await fetchCsoKpis({
			selectedOrganizationId: 12,
			page: 2,
			search: "wages",
		});
		expect(api.get).toHaveBeenLastCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/kpis/",
			{
				params: expect.objectContaining({
					selected_organization_id: 12,
					page: 2,
					search: "wages",
				}),
			},
		);
	});

	it("never sends legacy organization_id as an authorization parameter", async () => {
		await fetchCsoKpis({ page: 1 });
		const config = vi.mocked(api.get).mock.calls[0][1] as {
			params: Record<string, unknown>;
		};
		expect(config.params).not.toHaveProperty("organization_id");
		expect(config.params).not.toHaveProperty("selected_organization_id");
	});

	it("scopes detail requests and uses only the adapter PATCH", async () => {
		await fetchCsoKpiDetail(7, 12);
		expect(api.get).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/kpis/7/",
			{ params: { selected_organization_id: 12 } },
		);
		await patchCsoKpi(7, { affected_workers: 5 });
		expect(api.patch).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/kpis/7/",
			{ affected_workers: 5 },
		);
	});

	it("loads the complete Management picker from the adapter", async () => {
		await fetchCsoOrganizations();
		expect(api.get).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/organizations/",
		);
	});

	it("addresses a specific call through its scoped KPI and organization", async () => {
		await fetchCsoCaseCall(7, 42, 12);
		expect(api.get).toHaveBeenCalledWith(
			"https://ilm.example.test/api/v2/cascade/cso-case-management/kpis/7/calls/42/",
			{ params: { selected_organization_id: 12 } },
		);
	});
});

describe("legacy list params", () => {
	beforeEach(() => {
		vi.stubEnv("VITE_API_BASE_URL", "https://ilm.example.test/api/v2");
		vi.mocked(api.get).mockReset();
		vi.mocked(api.get).mockResolvedValue({ data: { count: 0, results: [] } });
	});

	const lastParams = () =>
		vi.mocked(api.get).mock.calls[0][1]?.params as Record<string, unknown>;

	it("omits supply-chain flags unless one is chosen", async () => {
		await fetchCsoKpis({ supplyChain: false, nonSupplyChain: false });
		expect(lastParams()).not.toHaveProperty("supply_chain");
		expect(lastParams()).not.toHaveProperty("non_supply_chain");
	});

	it("drops blank column filters so an empty box never narrows the queue", async () => {
		await fetchCsoKpis({
			columnFilters: { supplier__name: "  ", status__name: "Closed" },
		});
		expect(lastParams()).not.toHaveProperty("supplier__name");
		expect(lastParams().status__name).toBe("Closed");
	});

	it("passes ordering, paging and days-active through to the adapter", async () => {
		await fetchCsoKpis({
			ordering: "-closed_at",
			page: 3,
			pageSize: 25,
			daysOpenMin: "10",
			daysOpenMax: "90",
		});
		expect(lastParams()).toMatchObject({
			ordering: "-closed_at",
			page: 3,
			page_size: 25,
			days_open__min: "10",
			days_open__max: "90",
		});
	});
});
