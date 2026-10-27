import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompanyProfileTabs from "$src/components/company-profile/CompanyProfileTabs";

vi.mock("$src/hooks/useTranslation", () => ({
	useTranslation: () => ({
		t: (key: string) =>
			(
				({
					"companyProfilePage.tabs.profileDetails": "Profile Details",
					"companyProfilePage.tabs.userManagement": "User Management",
					"companyProfilePage.tabs.companyQr": "Company QR",
				}) as Record<string, string>
			)[key] ?? key,
	}),
}));

describe("CompanyProfileTabs", () => {
	it("renders user management while Company QR is paused", () => {
		render(<CompanyProfileTabs activeTab="profile" onChange={() => {}} />);

		expect(
			screen.getByRole("button", { name: /profile details/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /user management/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /company qr/i }),
		).not.toBeInTheDocument();
	});

	it("hides the Company QR tab when supplier-only access is disabled", () => {
		render(
			<CompanyProfileTabs
				activeTab="profile"
				onChange={() => {}}
				showCompanyQr={false}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /profile details/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /company qr/i }),
		).not.toBeInTheDocument();
	});
});
