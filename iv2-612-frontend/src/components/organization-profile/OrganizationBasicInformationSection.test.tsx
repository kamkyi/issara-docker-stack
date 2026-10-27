import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("$src/queries/naceCodes", () => ({
	NACE_LEVEL: { SECTION: 1, DIVISION: 2, GROUP: 3, CLASS: 4 },
	useNaceCodes: () => ({
		data: [
			{
				id: 1,
				code: "A",
				level: 1,
				parent_code: null,
				section_code: "A",
				label: "Agriculture, forestry and fishing",
				sort_order: 1,
			},
			{
				id: 2,
				code: "01",
				level: 2,
				parent_code: "A",
				section_code: "A",
				label: "Crop and animal production",
				sort_order: 2,
			},
			{
				id: 3,
				code: "C",
				level: 1,
				parent_code: null,
				section_code: "C",
				label: "Manufacturing",
				sort_order: 3,
			},
		],
	}),
}));

import OrganizationBasicInformationSection, {
	type OrganizationProfileFormValues,
} from "./OrganizationBasicInformationSection";

const values: OrganizationProfileFormValues = {
	name: "WageIndicator",
	description: "Living wage research.",
	website: "https://example.org",
	organization_type: "international_ngo",
	countries_of_registration: ["1", "2"],
	countries_of_operation: ["2"],
	languages_supported: ["en", "th"],
	core_focus_areas: ["human_rights", "living_wage"],
	stakeholder_groups: ["general_workers", "women_workers", "worker_committees"],
	nace_codes: ["A", "C"],
};

describe("OrganizationBasicInformationSection read mode", () => {
	it("shows actual multi-value selections instead of selection counts", () => {
		render(
			<OrganizationBasicInformationSection
				countries={[
					{ value: "1", label: "Thailand" },
					{ value: "2", label: "Nepal" },
				]}
				editing={false}
				isSaving={false}
				onCancel={vi.fn()}
				onChange={vi.fn()}
				onEdit={vi.fn()}
				onSave={vi.fn()}
				options={{
					organization_types: [
						{ value: "international_ngo", label: "International NGO" },
					],
					core_focus_areas: [
						{ value: "human_rights", label: "Human rights" },
						{ value: "living_wage", label: "Living wage" },
					],
					stakeholder_groups: [
						{ value: "general_workers", label: "General workers" },
						{ value: "women_workers", label: "Women workers" },
						{ value: "worker_committees", label: "Worker committees" },
					],
					languages: [
						{ value: "en", label: "English" },
						{ value: "th", label: "Thai" },
					],
				}}
				values={values}
			/>,
		);

		expect(screen.getByText("Thailand")).toBeInTheDocument();
		expect(screen.getAllByText("Nepal").length).toBeGreaterThan(0);
		expect(screen.getByText("Women workers")).toBeInTheDocument();
		expect(screen.getByText("General workers")).toBeInTheDocument();
		expect(
			screen.getByText("Agriculture, forestry and fishing"),
		).toBeInTheDocument();
		expect(screen.getByText("Manufacturing")).toBeInTheDocument();
		expect(screen.getAllByText(/Tier 1/)).toHaveLength(2);
		expect(
			screen.queryByText("Crop and animal production"),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/selected$/i)).not.toBeInTheDocument();
	});

	it("renders one Tier 1 NACE multi-select in edit mode", () => {
		render(
			<OrganizationBasicInformationSection
				countries={[]}
				editing
				isSaving={false}
				onCancel={vi.fn()}
				onChange={vi.fn()}
				onEdit={vi.fn()}
				onSave={vi.fn()}
				options={{
					organization_types: [],
					core_focus_areas: [],
					stakeholder_groups: [],
					languages: [],
				}}
				values={values}
			/>,
		);

		expect(
			screen.getByText("A — Agriculture, forestry and fishing"),
		).toBeInTheDocument();
		expect(screen.getByText("C — Manufacturing")).toBeInTheDocument();
		expect(document.querySelectorAll('[role="listbox"]')).toHaveLength(0);
		expect(screen.queryByText("Tier 2 — Division")).not.toBeInTheDocument();
	});
});
