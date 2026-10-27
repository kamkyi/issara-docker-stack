import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileAvatarStrengthCard from "$src/components/company-profile/ProfileAvatarStrengthCard";

vi.mock("$src/hooks/useTranslation", () => ({
	useTranslation: () => ({
		t: (key: string) =>
			(
				({
					"companyProfilePage.avatar.changeAria": "Change company avatar",
					"companyProfilePage.avatar.change": "Change photo",
					"companyProfilePage.avatar.uploading": "Uploading...",
					"companyProfilePage.profileStrength.title": "Profile Strength",
					"companyProfilePage.profileStrength.levels.basic": "Basic",
				}) as Record<string, string>
			)[key] ?? key,
	}),
}));

describe("ProfileAvatarStrengthCard", () => {
	it("contains wide and tall logos without cropping", () => {
		render(
			<ProfileAvatarStrengthCard
				avatarImage="https://example.com/wide-logo.png"
				companyName="Nestle"
				profileOwnerEmail="admin@example.com"
				profileOwnerName="Company Administrator"
				profileStrength={20}
			/>,
		);

		const logo = screen.getByRole("img", { name: "Nestle logo" });
		expect(logo).toHaveClass("h-full", "w-full", "object-contain");
		expect(logo.closest("button")).toHaveClass("h-20", "w-28", "rounded-md");
		expect(logo.closest("button")).not.toHaveClass("rounded-full");
	});
});
