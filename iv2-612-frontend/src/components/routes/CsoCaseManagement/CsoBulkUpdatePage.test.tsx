import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CsoBulkUpdatePage, {
	parseIds,
} from "$src/components/routes/CsoCaseManagement/CsoBulkUpdatePage";

const mocks = vi.hoisted(() => ({
	navigate: vi.fn(),
	detail: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mocks.navigate,
}));
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("$src/queries/csoCaseManagement", () => ({
	useCsoKpiDetail: mocks.detail,
	usePatchCsoKpi: () => ({
		isPending: false,
		isError: false,
		mutateAsync: vi.fn(),
	}),
}));

const kpi = (id: number, statusName = "No Progress") => ({
	id,
	supplier_name: "Blue Bay Seafood",
	category: "Payments",
	description: "Unpaid wages",
	level: 2,
	status: 1,
	status_name: statusName,
	opened_at: "2026-01-04T00:00:00Z",
	affected_workers: 12,
	days_open: 40,
	// The detail endpoint always returns the related calls; the context panel
	// counts them.
	calls: [{ id: 1 }],
	can_edit: true,
});

describe("bulk update queue", () => {
	beforeEach(() => {
		mocks.navigate.mockReset();
		mocks.detail.mockReset();
		mocks.detail.mockImplementation((id: number) => ({
			data: kpi(id),
			isLoading: false,
			isError: false,
		}));
	});

	it("parses, de-duplicates and rejects junk ids from the URL", () => {
		expect(parseIds("51, 52 ,51,,abc,-3,0")).toEqual([51, 52]);
		expect(parseIds("")).toEqual([]);
	});

	it("renders one editable card per selected KPI", () => {
		render(
			<CsoBulkUpdatePage ids={[51, 52]} onIdsChange={vi.fn()} statuses={[]} />,
		);
		expect(screen.getByTestId("bulk-card-51")).toBeInTheDocument();
		expect(screen.getByTestId("bulk-card-52")).toBeInTheDocument();
		expect(screen.getByText("2 total · 0 recently saved")).toBeInTheDocument();
	});

	it("returns to Case Management once the queue empties", () => {
		render(<CsoBulkUpdatePage ids={[]} onIdsChange={vi.fn()} statuses={[]} />);
		expect(mocks.navigate).toHaveBeenCalledWith({
			to: "/worker-voice-calls/cases",
		});
	});

	it("shows a read-only notice instead of a form for another org's KPI", () => {
		mocks.detail.mockImplementation((id: number) => ({
			data: { ...kpi(id), can_edit: false },
			isLoading: false,
			isError: false,
		}));
		render(
			<CsoBulkUpdatePage ids={[51]} onIdsChange={vi.fn()} statuses={[]} />,
		);
		expect(
			screen.getByText(
				"This KPI belongs to another organization and is read-only.",
			),
		).toBeInTheDocument();
	});

	it("can hide cards that were already saved", async () => {
		const user = userEvent.setup();
		render(
			<CsoBulkUpdatePage ids={[51]} onIdsChange={vi.fn()} statuses={[]} />,
		);
		await user.click(
			screen.getByRole("checkbox", { name: /Hide recently updated/i }),
		);
		// Nothing saved yet, so the card stays put.
		expect(screen.getByTestId("bulk-card-51")).toBeInTheDocument();
	});
});
