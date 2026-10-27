import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CompanyProfilePageHeader from "$src/components/company-profile/CompanyProfilePageHeader";

vi.mock("$src/hooks/useTranslation", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { companyName?: string }) => {
			if (key === "companyProfilePage.titleWithCompany") {
				return `${options?.companyName} Profile`;
			}
			if (key === "companyProfilePage.title") return "Company Profile";
			if (key === "companyProfilePage.subtitle") {
				return "Manage your organisation's public profile information.";
			}
			return key;
		},
	}),
}));

describe("CompanyProfilePageHeader", () => {
	it("uses the trimmed company name in the page title", () => {
		render(<CompanyProfilePageHeader companyName="  Nestle  " />);

		expect(
			screen.getByRole("heading", { name: "Nestle Profile" }),
		).toBeInTheDocument();
	});

	it.each([undefined, null, "", "   "])(
		"falls back to Company Profile when the company name is %s",
		(companyName) => {
			render(<CompanyProfilePageHeader companyName={companyName} />);

			expect(
				screen.getByRole("heading", { name: "Company Profile" }),
			).toBeInTheDocument();
		},
	);
});
