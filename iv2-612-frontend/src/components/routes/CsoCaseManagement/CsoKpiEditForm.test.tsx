import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CsoKpiEditForm from "$src/components/routes/CsoCaseManagement/CsoKpiEditForm";
import type { CsoKpi } from "$src/services/csoCaseManagementService";

const mocks = vi.hoisted(() => ({
	mutateAsync: vi.fn(),
	toastError: vi.fn(),
	toastSuccess: vi.fn(),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key.split(".").pop() }),
}));
vi.mock("$src/components/toast/toastUtil", () => ({
	showToast: { error: mocks.toastError, success: mocks.toastSuccess },
}));
vi.mock("$src/queries/csoCaseManagement", () => ({
	usePatchCsoKpi: () => ({
		isPending: false,
		isError: false,
		mutateAsync: mocks.mutateAsync,
	}),
}));

const kpi = {
	id: 51,
	status: 1,
	opened_at: "2026-01-04",
	retaliation: false,
	retaliation_cso: false,
	affected_workers: 3,
} as unknown as CsoKpi;

/** Most legacy rows have never had the retaliation questions answered. */
const unanswered = {
	...kpi,
	retaliation: null,
	retaliation_cso: null,
} as CsoKpi;

const statuses = [
	{ id: 1, name: "No Progress" },
	{ id: 3, name: "Closed" },
];

describe("KPI edit form", () => {
	beforeEach(() => {
		mocks.mutateAsync.mockReset();
		mocks.toastError.mockReset();
		mocks.toastSuccess.mockReset();
		mocks.mutateAsync.mockResolvedValue({ ...kpi, status_name: "No Progress" });
	});

	it("uses tabs in the drawer, showing one group at a time", () => {
		render(<CsoKpiEditForm kpi={kpi} onSaved={vi.fn()} statuses={statuses} />);
		expect(screen.getByRole("tablist")).toBeInTheDocument();
		expect(screen.getByLabelText("Affected workers")).toBeInTheDocument();
	});

	it("offers the six local-currency fields present in Legacy", async () => {
		const user = userEvent.setup();
		render(<CsoKpiEditForm kpi={kpi} onSaved={vi.fn()} statuses={statuses} />);
		await user.click(screen.getByRole("tab", { name: /remediation/i }));
		for (const currency of ["Thai baht", "Myanmar kyat", "Malaysian ringgit"]) {
			expect(screen.getByLabelText(`${currency} owed`)).toBeInTheDocument();
			expect(screen.getByLabelText(`${currency} paid`)).toBeInTheDocument();
		}
	});

	it("uses collapsible sections in the bulk queue, opening on Status", () => {
		render(
			<CsoKpiEditForm
				kpi={kpi}
				onSaved={vi.fn()}
				statuses={statuses}
				variant="sections"
			/>,
		);
		expect(screen.queryByRole("tablist")).toBeNull();
		const status = screen.getByRole("button", { name: /status/i });
		expect(status).toHaveAttribute("aria-expanded", "true");
		expect(
			screen.getByRole("button", { name: /remediation/i }),
		).toHaveAttribute("aria-expanded", "false");
	});

	it("opens another section and collapses the previous one", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm
				kpi={kpi}
				onSaved={vi.fn()}
				statuses={statuses}
				variant="sections"
			/>,
		);
		await user.click(screen.getByRole("button", { name: /remediation/i }));
		expect(
			screen.getByRole("button", { name: /remediation/i }),
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("button", { name: /status/i })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	it("badges a section with how many of its fields were edited", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm
				kpi={kpi}
				onSaved={vi.fn()}
				statuses={statuses}
				variant="sections"
			/>,
		);
		expect(screen.queryByText("1 edited")).toBeNull();
		await user.clear(screen.getByLabelText("Affected workers"));
		await user.type(screen.getByLabelText("Affected workers"), "9");
		expect(screen.getByText("1 edited")).toBeInTheDocument();
	});

	it("keeps edits when a collapsed section is reopened", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm
				kpi={kpi}
				onSaved={vi.fn()}
				statuses={statuses}
				variant="sections"
			/>,
		);
		await user.clear(screen.getByLabelText("Affected workers"));
		await user.type(screen.getByLabelText("Affected workers"), "9");
		await user.click(screen.getByRole("button", { name: /status/i }));
		expect(screen.getByRole("button", { name: /status/i })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await user.click(screen.getByRole("button", { name: /status/i }));
		expect(screen.getByLabelText("Affected workers")).toHaveValue(9);
	});
	it("does not flag missing answers before the user has done anything", () => {
		render(
			<CsoKpiEditForm kpi={unanswered} onSaved={vi.fn()} statuses={statuses} />,
		);
		expect(screen.queryByText(/is required|are required/)).toBeNull();
		expect(
			screen.getByLabelText("Retaliation against workers"),
		).toBeInTheDocument();
	});

	it("names what is missing only once the user tries to save", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm kpi={unanswered} onSaved={vi.fn()} statuses={statuses} />,
		);
		await user.clear(screen.getByLabelText("Affected workers"));
		await user.type(screen.getByLabelText("Affected workers"), "9");
		await user.click(screen.getByRole("button", { name: /Save KPI update/ }));

		expect(mocks.toastError).toHaveBeenCalledWith(
			"Retaliation against workers and Retaliation against CSO are required before this update can be saved.",
			{ id: "cso-kpi-51-required" },
		);
		// The offending field is marked invalid, and "Required" joins its
		// accessible name so a screen reader announces it with the field.
		expect(
			screen.getByLabelText(/Retaliation against workers\s*Required/),
		).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByLabelText("Affected workers")).not.toHaveAttribute(
			"aria-invalid",
		);
		expect(mocks.mutateAsync).not.toHaveBeenCalled();
	});

	it("saves once the missing answers are supplied", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		render(
			<CsoKpiEditForm kpi={unanswered} onSaved={onSaved} statuses={statuses} />,
		);
		await user.selectOptions(
			screen.getByLabelText("Retaliation against workers"),
			"false",
		);
		await user.selectOptions(
			screen.getByLabelText("Retaliation against CSO"),
			"false",
		);
		await user.click(screen.getByRole("button", { name: /Save KPI update/ }));

		expect(mocks.mutateAsync).toHaveBeenCalledWith({
			id: 51,
			payload: { retaliation: false, retaliation_cso: false },
		});
		// The saved record is handed back, so the caller can see its new status.
		expect(onSaved).toHaveBeenCalledWith(
			expect.objectContaining({ status_name: "No Progress" }),
		);
		expect(mocks.toastSuccess).toHaveBeenCalledWith(
			"Supplier KPI #51 updated.",
			{ id: "cso-kpi-51-saved" },
		);
	});
	it("repeats the toast under one id so attempts do not stack up", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm kpi={unanswered} onSaved={vi.fn()} statuses={statuses} />,
		);
		const save = screen.getByRole("button", { name: /Save KPI update/ });
		await user.clear(screen.getByLabelText("Affected workers"));
		await user.type(screen.getByLabelText("Affected workers"), "9");
		await user.click(save);
		await user.click(save);
		expect(mocks.toastError).toHaveBeenCalledTimes(2);
		for (const call of mocks.toastError.mock.calls) {
			expect(call[1]).toEqual({ id: "cso-kpi-51-required" });
		}
	});

	it("marks the group holding the error so it is findable while collapsed", async () => {
		const user = userEvent.setup();
		render(
			<CsoKpiEditForm
				kpi={unanswered}
				onSaved={vi.fn()}
				statuses={statuses}
				variant="sections"
			/>,
		);
		await user.clear(screen.getByLabelText("Affected workers"));
		await user.type(screen.getByLabelText("Affected workers"), "9");
		await user.click(screen.getByRole("button", { name: /Save KPI update/ }));
		expect(
			screen.getByRole("button", { name: /status.*Required/i }),
		).toBeInTheDocument();
	});
});
