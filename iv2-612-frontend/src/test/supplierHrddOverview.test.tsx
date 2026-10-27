import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SupplierHrddOverview from "$src/components/dashboard/supplier/SupplierHrddOverview";

// Stub the heavy child sections — this suite covers the page's own composition
// (which HRDD components render, and that the multi-supplier live status
// monitor is absent), not the internals of each section.
vi.mock("$src/components/dashboard/DashboardHero", () => ({
	default: () => <div data-testid="dashboard-hero" />,
}));
vi.mock("$src/components/dashboard/KpiCards", () => ({
	default: ({
		escalationsDescription,
	}: {
		escalationsDescription?: string;
	}) => <div data-testid="kpi-cards">{escalationsDescription}</div>,
}));
vi.mock("$src/components/dashboard/KpiClosuresByMonthQualityChart", () => ({
	default: () => <div data-testid="closures-chart" />,
}));
vi.mock("$src/components/dashboard/PerformanceMetrics", () => ({
	default: () => <div data-testid="performance-metrics" />,
}));
vi.mock("$src/components/dashboard/LiveStatusBar", () => ({
	default: () => <div data-testid="live-status-bar" />,
}));
vi.mock("$src/components/dashboard/partner/PolicyCommitmentsBox", () => ({
	default: () => <div data-testid="policy-commitments" />,
}));
vi.mock("$src/components/dashboard/partner/OpenEscalatedCasesTable", () => ({
	default: () => <div data-testid="open-escalated-cases" />,
	useOpenEscalatedCases: () => ({
		rows: [],
		caseCount: 3,
		supplierCount: 1,
		isSupplierContext: true,
	}),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (_key: string, options?: { defaultValue?: string }) =>
			options?.defaultValue ?? _key,
		i18n: { language: "en" },
	}),
}));

vi.mock("$src/store/store.auth", () => ({
	default: () => ({ role: "org-supplier" }),
}));
vi.mock("$src/utils/getUserIdentifiers", () => ({
	default: () => ({
		role: "org-supplier",
		supplierId: 17792,
		partnerId: null,
		isSupplier: true,
		isGlobalPartner: false,
		isTestUser: false,
	}),
}));
vi.mock("$src/utils/config", () => ({ useMockData: () => true }));
vi.mock("$src/queries/useWorkplaceStats", () => ({
	useWorkplaceStats: () => ({ data: null, isFetching: false }),
}));
vi.mock("$src/queries/useKpiClosures", () => ({
	useKpiClosures: () => ({ data: null, isError: false, isLoading: false }),
}));

describe("SupplierHrddOverview", () => {
	it("renders all six HRDD components", () => {
		render(<SupplierHrddOverview />);

		[
			"HRDD Component 1. Embed Policy Commitments",
			"HRDD Component 2. Identify & Assess Adverse Impacts",
			"HRDD Component 3. Cease, Prevent & Mitigate Impacts",
			"HRDD Component 4. Track Implementation & Results",
			"HRDD Component 5. Communicate Progress & Impacts",
			"HRDD Component 6. Provide for or Cooperate in Remediation",
		].forEach((title) => {
			expect(screen.getByText(title)).toBeInTheDocument();
		});
	});

	it("omits the multi-supplier live status monitor", () => {
		render(<SupplierHrddOverview />);
		expect(screen.queryByTestId("live-status-bar")).not.toBeInTheDocument();
	});

	it("labels the escalations KPI with the single-supplier wording", () => {
		render(<SupplierHrddOverview />);
		expect(
			screen.getByText("Open Cases Escalated to Buyers"),
		).toBeInTheDocument();
	});
});
