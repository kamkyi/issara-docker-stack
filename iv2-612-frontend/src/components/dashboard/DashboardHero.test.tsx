import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardHero from "$src/components/dashboard/DashboardHero";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: { language: "en" },
		t: (key: string, options?: { defaultValue?: string }) => {
			const staleBackendCopy: Record<string, string> = {
				"companyDashboard.hero.title": "Company Dashboard",
				"companyDashboard.hero.subtitle":
					"Key Real-time Metrics of Your Supply Chain",
			};
			return staleBackendCopy[key] ?? options?.defaultValue ?? key;
		},
	}),
}));

describe("DashboardHero", () => {
	it("replaces stale generic backend copy with the HRDD page heading", () => {
		render(
			<DashboardHero
				endDate={new Date("2026-07-15T00:00:00")}
				formatDate={() => "15 Jul 2026"}
				handleReset={vi.fn()}
				setEndDate={vi.fn()}
				setStartDate={vi.fn()}
				startDate={new Date("2025-07-15T00:00:00")}
			/>,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Human Rights Due Diligence (HRDD) Overview",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				level: 3,
				name: "6 components of HRDD, driven by real-time worker voice",
			}),
		).toBeInTheDocument();
	});
});
