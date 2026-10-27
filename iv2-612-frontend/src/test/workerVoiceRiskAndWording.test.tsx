import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { clientTypeLabel } from "$src/components/routes/WorkerVoiceCalls/clientTypeLabels";
import { EMPTY_FORM } from "$src/components/routes/WorkerVoiceCalls/formModel";
import Step1KeyData from "$src/components/routes/WorkerVoiceCalls/steps/Step1KeyData";
import Step5SupportActions from "$src/components/routes/WorkerVoiceCalls/steps/Step5SupportActions";

const CLIENT_TYPES = [
	{
		id: 1,
		name: "Not a migrant worker or victim (for example, NGO, media or police)",
	},
	{ id: 2, name: "Migrant worker, not in exploitation situation" },
	{ id: 3, name: "Migrant worker, currently experiencing labor issues" },
	{ id: 12, name: "Golden Dreams Mobilizer" },
];

// Both of the shared lookups the two steps read. `casestatuses` is the plain
// ILM set now -- the CSO-only risk statuses are no longer asked for.
const CASE_STATUSES = [
	{ id: 1, name: "Open" },
	{ id: 2, name: "Closed" },
	{ id: 3, name: "Some progress" },
];

vi.mock("$src/queries/nationalities", () => ({ useNationalities: () => ({}) }));
vi.mock("$src/queries/interactionReasons", () => ({
	useInteractionReasons: () => ({}),
}));
vi.mock("$src/queries/interactionChannels", () => ({
	useInteractionChannels: () => ({}),
}));
vi.mock("$src/queries/clientTypes", () => ({
	useClientTypes: () => ({ data: CLIENT_TYPES }),
}));
vi.mock("$src/queries/referralActions", () => ({
	useReferralActions: () => ({ data: [] }),
}));
vi.mock("$src/queries/users", () => ({ useUsers: () => ({}) }));
vi.mock("$src/queries/caseLookups", () => ({
	useCaseStatuses: () => ({ data: CASE_STATUSES }),
	useReferralOrgs: () => ({ data: [] }),
	// Step 1's workplace-location row, which is not what this file is about.
	useCountries: () => ({ data: [] }),
	useProvinces: () => ({ data: [] }),
	useDistricts: () => ({ data: [] }),
}));

// Step 1's supplier picker reaches the API on mount; this file only cares
// about the worker-type wording next to it.
vi.mock("$src/queries/suppliers", () => ({
	fetchSupplierPage: vi.fn(async () => ({ suppliers: [], nextCursor: null })),
	fetchSupplierById: vi.fn(async () => null),
	fetchSupplierLocation: vi.fn(async () => ({
		countryId: null,
		provinceId: null,
		districtId: null,
	})),
}));

// `LookupSelect` is a Radix Select, which renders its items into a portal only
// once opened -- and jsdom has none of the pointer APIs that opening needs.
// Everything else in `fields` is the real thing; this swap is only so the
// options a step hands the control can be read back.
vi.mock("$src/components/routes/WorkerVoiceCalls/fields", async (original) => ({
	...(await original<
		typeof import("$src/components/routes/WorkerVoiceCalls/fields")
	>()),
	LookupSelect: ({
		controlId,
		options,
		placeholder,
		value,
		onChange,
	}: {
		controlId: string;
		options: Array<{ id: number; name: string }>;
		placeholder: string;
		value: number | string | null;
		onChange: (next: number | null) => void;
	}) => (
		<select
			aria-label={placeholder}
			id={controlId}
			onChange={(event) =>
				onChange(event.target.value === "" ? null : Number(event.target.value))
			}
			value={value === null || value === undefined ? "" : String(value)}
		>
			<option value="">{placeholder}</option>
			{options.map((option) => (
				<option key={option.id} value={String(option.id)}>
					{option.name}
				</option>
			))}
		</select>
	),
}));

const renderStep = (step: React.ReactNode) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<Theme>{step}</Theme>
		</QueryClientProvider>,
	);
};

describe("worker / caller type wording", () => {
	it("drops 'migrant' from the options that carry it", () => {
		// Partner organizations also support local workers, so the word reads as
		// a restriction the question does not intend.
		expect(
			clientTypeLabel(
				"Not a migrant worker or victim (for example, NGO, media or police)",
			),
		).toBe("Not a worker or victim (for example, NGO, media or police)");
		expect(
			clientTypeLabel("Migrant worker, not in exploitation situation"),
		).toBe("Worker, not in exploitation situation");
		expect(
			clientTypeLabel("Migrant worker, currently experiencing labor issues"),
		).toBe("Worker, currently experiencing labor issues");
	});

	it("leaves an option it does not know exactly as it came back", () => {
		// Adding a `client_types` row server-side must not need a change here.
		expect(clientTypeLabel("Golden Dreams Mobilizer")).toBe(
			"Golden Dreams Mobilizer",
		);
		expect(clientTypeLabel(null)).toBeNull();
	});

	it("re-words the dropdown without touching the value that is stored", () => {
		renderStep(
			<Step1KeyData formData={EMPTY_FORM} missing={[]} update={vi.fn()} />,
		);

		const option = screen.getByRole("option", {
			name: "Worker, currently experiencing labor issues",
		}) as HTMLOptionElement;
		// The canonical row is shared with ILM-fronted and some 47k live cases,
		// so only the label moves -- the id written to `cases` is unchanged.
		expect(option.value).toBe("3");
		expect(
			screen.queryByRole("option", {
				name: "Migrant worker, currently experiencing labor issues",
			}),
		).toBeNull();
	});
});

describe("Step 5 risk level", () => {
	it("asks for the worker's personal risk on the legacy scale", () => {
		renderStep(
			<Step5SupportActions
				formData={EMPTY_FORM}
				missing={[]}
				update={vi.fn()}
			/>,
		);

		for (const label of ["Low risk", "Medium risk", "High risk"]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
	});

	it("no longer offers the two issue classifications as a personal risk", () => {
		// Early warning and forced labor risk describe the issue, and the calls
		// table derives them from the levels of the KPIs picked on step 4.
		renderStep(
			<Step5SupportActions
				formData={EMPTY_FORM}
				missing={[]}
				update={vi.fn()}
			/>,
		);

		expect(screen.queryByText("Early warning risk")).toBeNull();
		expect(screen.queryByText("Forced labor risk")).toBeNull();
	});

	it("still says what a call already saved on one of them holds", () => {
		renderStep(
			<Step5SupportActions
				formData={{ ...EMPTY_FORM, riskLevel: "FORCED_LABOR" }}
				missing={[]}
				update={vi.fn()}
			/>,
		);

		expect(
			screen.getByText(/Currently recorded as .*Forced labor risk/),
		).toBeInTheDocument();
	});

	it("offers only the shared case statuses, not the CSO-only risk ones", () => {
		renderStep(
			<Step5SupportActions
				formData={EMPTY_FORM}
				missing={[]}
				update={vi.fn()}
			/>,
		);

		expect(screen.getByRole("option", { name: "Open" })).toBeInTheDocument();
		expect(
			screen.queryByRole("option", { name: "Early warning risk" }),
		).toBeNull();
		expect(
			screen.queryByRole("option", { name: "Forced labor risk" }),
		).toBeNull();
	});
});
