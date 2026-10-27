import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SupplierKPI } from "$src/hooks/useSupplyChain";
import {
	normalizeSupplierKpiRows,
	renderKpiExpandedContent,
} from "$src/utils/workerReportedKpiTable";

describe("normalizeSupplierKpiRows", () => {
	it("keeps the Supplier KPI id for grievance API requests", () => {
		const rows = normalizeSupplierKpiRows(
			[
				{
					id: 2586,
					kpi: 1006,
					supplier_name: "Fish Seafood Co.",
					category: "Labor",
					description: "Unsafe working conditions",
					status: 1,
					opened_at: "2026-07-14",
					affected_workers: 12,
					level: 3,
				} as unknown as SupplierKPI,
			],
			new Map(),
		);

		expect(rows).toHaveLength(1);
		expect(rows[0].display_id).toBe(1006);
		expect(rows[0].resource_id).toBe(2586);
	});

	it("preserves row-specific worker issue summary and actions", () => {
		const rows = normalizeSupplierKpiRows(
			[
				{
					id: 1014,
					supplier_name: "Sunshine Seafood",
					category: "Labor",
					description: "Verbal abuse",
					status: 2,
					worker_issue_summary: "Line supervisor yelling",
					issara_action: "Contacted HR",
					supplier_action: "Investigating conduct",
				} as unknown as SupplierKPI,
			],
			new Map(),
		);

		expect(rows[0].worker_issue_summary).toBe("Line supervisor yelling");
		expect(rows[0].issara_action).toBe("Contacted HR");
		expect(rows[0].supplier_action).toBe("Investigating conduct");
	});
});

describe("renderKpiExpandedContent (Supplier UI)", () => {
	const mockT = ((key: string, options?: any) =>
		options?.defaultValue ?? key) as any;

	it("displays 'Issue summary reported by workers', 'Action from Issara', and 'Action from the supplier' for open issues", () => {
		const row = {
			id: 1014,
			resource_id: 1014,
			supplier_name: "Sunshine Seafood",
			category: "Labor",
			description: "Excessive overtime",
			status: 1,
			status_name: "No Progress",
			opened_at: "2026-06-01",
			affected_workers: 20,
			level: 3,
			source: "Social Responsibility KPI",
			worker_issue_summary: "Workers report 14-hour daily shifts",
			issara_action: "Issara contacted management",
			supplier_action: "Reviewed shift scheduling",
			remediation_action: "Adjusted shift schedule",
			remediation_validation: "Workers confirmed reduced hours",
			remediation_results: "Resolved",
			remediation_sp_recommendation: "Monitor next audit",
		} as any;

		const { getByText, queryByText } = render(
			renderKpiExpandedContent({
				row,
				isClosed: false,
				isSupplierContext: true,
				t: mockT,
				variant: "metaBar",
			}),
		);

		// Box 1: Issue summary
		expect(
			getByText("workerReportedIssues.details.issueSummary:"),
		).toBeDefined();
		expect(getByText("Workers report 14-hour daily shifts")).toBeDefined();

		// Box 2: Action from Issara
		expect(getByText(/Action from Issara/i)).toBeDefined();
		expect(getByText("Issara contacted management")).toBeDefined();

		// Box 3: Action from the supplier
		expect(getByText(/Action from the supplier/i)).toBeDefined();
		expect(getByText("Reviewed shift scheduling")).toBeDefined();

		// Other legacy remediation boxes should NOT be displayed
		expect(
			queryByText(
				"Actions that have been taken by the employer regarding this issue:",
			),
		).toBeNull();
		expect(
			queryByText("Updates from workers regarding this issue:"),
		).toBeNull();
		expect(queryByText("Result or outcome of the issue:")).toBeNull();
		expect(
			queryByText(
				"Recommendations and notices for Strategic Partners regarding this case:",
			),
		).toBeNull();
	});

	it("displays 'Issue summary reported by workers', 'Action from Issara', and 'Action from the supplier' for closed issues", () => {
		const row = {
			id: 1015,
			resource_id: 1015,
			supplier_name: "Sunshine Seafood",
			category: "Labor",
			description: "Unpaid overtime wages",
			status: 3,
			status_name: "Closed",
			opened_at: "2026-05-01",
			closed_at: "2026-06-01",
			affected_workers: 15,
			level: 3,
			source: "Social Responsibility KPI",
			worker_issue_summary: "Unpaid overtime hours logged in May",
			issara_action: "Issara mediated wage settlement",
			supplier_action: "Paid back pay",
			remediation_action: "Issued retroactive pay",
			remediation_validation: "Workers received back pay",
			remediation_results: "Completed",
			remediation_sp_recommendation: "Review payroll records",
		} as any;

		const { getByText, queryByText } = render(
			renderKpiExpandedContent({
				row,
				isClosed: true,
				isSupplierContext: true,
				t: mockT,
				variant: "card",
			}),
		);

		// Basic metadata should still be visible
		expect(getByText("workerReportedIssues.details.kpiTitle")).toBeDefined();
		expect(getByText("Unpaid overtime wages")).toBeDefined();

		// Box 1: Issue summary
		expect(
			getByText("workerReportedIssues.details.issueSummary:"),
		).toBeDefined();
		expect(getByText("Unpaid overtime hours logged in May")).toBeDefined();

		// Box 2: Action from Issara
		expect(getByText(/Action from Issara/i)).toBeDefined();
		expect(getByText("Issara mediated wage settlement")).toBeDefined();

		// Box 3: Action from the supplier
		expect(getByText(/Action from the supplier/i)).toBeDefined();
		expect(getByText("Paid back pay")).toBeDefined();

		// Other legacy remediation boxes should NOT be displayed
		expect(
			queryByText(
				"Actions that have been taken by the employer regarding this issue:",
			),
		).toBeNull();
		expect(
			queryByText("Updates from workers regarding this issue:"),
		).toBeNull();
		expect(queryByText("Result or outcome of the issue:")).toBeNull();
		expect(
			queryByText(
				"Recommendations and notices for Strategic Partners regarding this case:",
			),
		).toBeNull();
	});

	it("falls back to remediation_action and remediation_notes from backend KPI records", () => {
		const row = {
			id: 6527,
			resource_id: 2687,
			supplier_name: "India-Supplier",
			category: "Labor",
			description: "Verbal abuse by interpreter",
			status: 1,
			status_name: "Open",
			opened_at: "2026-07-24",
			affected_workers: 0,
			level: 2,
			source: "Social Responsibility KPI",
			remediation_notes: "Worker notes about verbal abuse",
			remediation_action: "Issara spoke with factory management",
		} as any;

		const { getByText } = render(
			renderKpiExpandedContent({
				row,
				isClosed: false,
				isSupplierContext: true,
				t: mockT,
				variant: "metaBar",
			}),
		);

		// Box 1: Issue summary from remediation_notes
		expect(
			getByText("workerReportedIssues.details.issueSummary:"),
		).toBeDefined();
		expect(getByText("Worker notes about verbal abuse")).toBeDefined();

		// Box 2: Action from Issara from remediation_action
		expect(getByText(/Action from Issara/i)).toBeDefined();
		expect(getByText("Issara spoke with factory management")).toBeDefined();

		// Box 3: Action from the supplier
		expect(getByText(/Action from the supplier/i)).toBeDefined();
	});

	it("hides 'Action from the supplier' completely for closed issues when there is no supplier action data", () => {
		const row = {
			id: 1016,
			resource_id: 1016,
			supplier_name: "Sunshine Seafood",
			category: "Labor",
			description: "Unpaid wages",
			status: 3,
			status_name: "Closed",
			opened_at: "2026-05-01",
			closed_at: "2026-06-01",
			affected_workers: 5,
			level: 2,
			source: "Social Responsibility KPI",
			worker_issue_summary: "Wage discrepancy",
			issara_action: "Issara mediated",
		} as any;

		const { getByText, queryByText } = render(
			renderKpiExpandedContent({
				row,
				isClosed: true,
				isSupplierContext: true,
				t: mockT,
				variant: "card",
			}),
		);

		// Box 1 & 2 are displayed
		expect(
			getByText("workerReportedIssues.details.issueSummary:"),
		).toBeDefined();
		expect(getByText("Wage discrepancy")).toBeDefined();
		expect(getByText(/Action from Issara/i)).toBeDefined();
		expect(getByText("Issara mediated")).toBeDefined();

		// Action from the supplier is hidden completely
		expect(queryByText(/Action from the supplier/i)).toBeNull();
		expect(
			queryByText(
				"No remediation updates yet. Updates entered in Step 3 will appear here.",
			),
		).toBeNull();
	});
});
