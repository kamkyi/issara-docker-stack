import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CsoKpiDrawer from "$src/components/routes/CsoCaseManagement/CsoKpiDrawer";
import type {
	CsoKpiDetail,
	CsoKpiHistory,
} from "$src/services/csoCaseManagementService";

const mocks = vi.hoisted(() => ({
	detail: vi.fn(),
	history: vi.fn(),
	call: vi.fn(),
	workerVoiceCall: vi.fn(),
}));

vi.mock("$src/queries/csoCaseManagement", () => ({
	useCsoKpiDetail: mocks.detail,
	useCsoKpiHistory: mocks.history,
	useCsoCaseCall: mocks.call,
	usePatchCsoKpi: () => ({ isPending: false, isError: false }),
}));

vi.mock("$src/queries/workerVoiceCalls", () => ({
	useWorkerVoiceCase: mocks.workerVoiceCall,
}));

const live = {
	id: 51,
	supplier_name: "Blue Bay",
	category: "Payments",
	description: "Unpaid wages",
	level: 2,
	status_name: "Open",
	opened_at: "2026-01-01",
	closed_at: null,
	remediation_owed_baht: 100,
	remediation_owed_kyat: 0,
	remediation_owed_ringitt: 0,
	remediation_owed_usd: 3,
	remediation_paid_baht: 0,
	remediation_paid_kyat: 0,
	remediation_paid_ringitt: 0,
	remediation_paid_usd: 0,
	can_edit: true,
	calls: [
		{
			id: 42,
			client_nickname: "Worker A",
			client_phonenumber: "111",
			interaction_summary: "Current call summary",
			next_steps: "Follow up",
		},
	],
} as unknown as CsoKpiDetail;

const historical = {
	...live,
	id: 900,
	supplier_kpi: 51,
	status_name: "Closed",
	opened_at: "2025-01-01",
	closed_at: "2025-06-01",
	remediation_owed_baht: 500,
} as unknown as CsoKpiHistory;

describe("CSO KPI detail drawer", () => {
	beforeEach(() => {
		mocks.detail.mockReturnValue({
			data: live,
			isLoading: false,
			isError: false,
		});
		mocks.history.mockReturnValue({ data: [historical], isLoading: false });
		mocks.workerVoiceCall.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		});
		mocks.call.mockImplementation((_kpiId: number, callId: number | null) => ({
			data:
				callId === 42
					? {
							id: 42,
							client_nickname: "Worker A",
							client_phonenumber: "111",
							interaction_summary: "Specific call detail",
							attachments: [],
							kpi_details: [],
							shared_with_my_organization: false,
						}
					: undefined,
			isLoading: false,
			isError: false,
		}));
	});

	it("opens the selected historical snapshot as read-only", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiDrawer
				id={51}
				onClose={vi.fn()}
				onSaved={vi.fn()}
				statuses={[]}
			/>,
		);
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Edit KPI" }),
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /Update #900/ }));
		expect(
			screen.getByText("Supplier KPI Update #900 (Historical View)"),
		).toBeInTheDocument();
		expect(screen.getByText("500")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Edit KPI" }),
		).not.toBeInTheDocument();
		await user.click(
			screen.getByRole("button", { name: "Back to current KPI" }),
		);
		expect(
			screen.getByRole("button", { name: "Edit KPI" }),
		).toBeInTheDocument();
	});

	it("opens the specific call inside the scoped KPI drawer", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiDrawer
				id={51}
				onClose={vi.fn()}
				onSaved={vi.fn()}
				selectedOrganizationId={12}
				statuses={[]}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "View Worker Voice" }));
		expect(mocks.call).toHaveBeenCalledWith(51, 42, 12);
		expect(screen.getByText("Specific call detail")).toBeInTheDocument();
		expect(mocks.workerVoiceCall).toHaveBeenCalledWith(undefined);
	});
});
