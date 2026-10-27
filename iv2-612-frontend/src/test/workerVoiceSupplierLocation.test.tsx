/**
 * Supplier -> location auto-population on Worker Voice step 1 (IV2-582).
 *
 * The legacy call wizard fills Country/Province/District in from the supplier
 * and leaves them editable (`RequiredCallFields.fetchSupplierById`). This pins
 * the part of that behaviour that can go wrong quietly: a location belonging to
 * a supplier that is no longer selected.
 */
import { Theme } from "@radix-ui/themes";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerVoiceFormData } from "$src/components/routes/WorkerVoiceCalls/formModel";

const fetchSupplierPage = vi.fn();
const fetchSupplierById = vi.fn();
const fetchSupplierLocation = vi.fn();

vi.mock("$src/queries/suppliers", () => ({
	fetchSupplierPage: (search: string, cursor: string | null) =>
		fetchSupplierPage(search, cursor),
	fetchSupplierById: (id: number) => fetchSupplierById(id),
	fetchSupplierLocation: (id: number) => fetchSupplierLocation(id),
}));

vi.mock("$src/queries/nationalities", () => ({ useNationalities: () => ({}) }));
vi.mock("$src/queries/interactionReasons", () => ({
	useInteractionReasons: () => ({}),
}));
vi.mock("$src/queries/interactionChannels", () => ({
	useInteractionChannels: () => ({}),
}));
vi.mock("$src/queries/clientTypes", () => ({ useClientTypes: () => ({}) }));
vi.mock("$src/queries/users", () => ({ useUsers: () => ({}) }));
vi.mock("$src/queries/caseLookups", () => ({
	useCountries: () => ({ data: [{ id: 18, name: "India" }] }),
	useProvinces: () => ({ data: [{ id: 204, name: "Kerala", country: 18 }] }),
	useDistricts: () => ({ data: [{ id: 3011, name: "Kochi", province: 204 }] }),
}));

import { EMPTY_FORM } from "$src/components/routes/WorkerVoiceCalls/formModel";
import Step1KeyData from "$src/components/routes/WorkerVoiceCalls/steps/Step1KeyData";

/**
 * Renders step 1 against real form state, so `update` behaves as it does in
 * `WorkerVoiceForm` -- a functional setState -- and the assertions can read
 * back what would actually be submitted.
 */
const renderStep = () => {
	const formData: { current: WorkerVoiceFormData } = { current: EMPTY_FORM };
	const Harness: React.FC = () => {
		const [data, setData] = React.useState<WorkerVoiceFormData>(EMPTY_FORM);
		formData.current = data;
		return (
			<Theme>
				<Step1KeyData
					formData={data}
					missing={[]}
					update={(field, value) =>
						setData((previous) => ({ ...previous, [field]: value }))
					}
				/>
			</Theme>
		);
	};
	render(<Harness />);
	return formData;
};

const pickSupplier = async (name: string) => {
	const user = userEvent.setup();
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(await screen.findByText(name));
};

beforeEach(() => {
	fetchSupplierPage.mockReset();
	fetchSupplierById.mockReset();
	fetchSupplierLocation.mockReset();
	fetchSupplierById.mockResolvedValue(null);
	fetchSupplierPage.mockResolvedValue({
		suppliers: [
			{ id: 1, name: "Alpha Seafood" },
			{ id: 2, name: "Beta Textiles" },
		],
		nextCursor: null,
	});
});

describe("supplier selection fills in the workplace location", () => {
	it("populates country, province and district from the chosen supplier", async () => {
		fetchSupplierLocation.mockResolvedValue({
			countryId: 18,
			provinceId: 204,
			districtId: 3011,
		});

		const formData = renderStep();
		await pickSupplier("Alpha Seafood");

		await waitFor(() => {
			expect(formData.current.supplierCountryId).toBe(18);
		});
		expect(formData.current.supplierId).toBe(1);
		expect(formData.current.supplierProvinceId).toBe(204);
		expect(formData.current.supplierDistrictId).toBe(3011);
		expect(fetchSupplierLocation).toHaveBeenCalledWith(1);
	});

	it("replaces the location when the officer switches supplier", async () => {
		fetchSupplierLocation
			.mockResolvedValueOnce({
				countryId: 18,
				provinceId: 204,
				districtId: 3011,
			})
			.mockResolvedValueOnce({
				countryId: 2,
				provinceId: null,
				districtId: null,
			});

		const formData = renderStep();
		await pickSupplier("Alpha Seafood");
		await waitFor(() => expect(formData.current.supplierCountryId).toBe(18));

		await pickSupplier("Beta Textiles");

		await waitFor(() => {
			expect(formData.current.supplierId).toBe(2);
			expect(formData.current.supplierCountryId).toBe(2);
		});
		// Supplier B has no province or district on file, so A's must not survive.
		expect(formData.current.supplierProvinceId).toBeNull();
		expect(formData.current.supplierDistrictId).toBeNull();
	});

	it("drops the location when the supplier is cleared", async () => {
		fetchSupplierLocation.mockResolvedValue({
			countryId: 18,
			provinceId: 204,
			districtId: 3011,
		});

		const formData = renderStep();
		await pickSupplier("Alpha Seafood");
		await waitFor(() => expect(formData.current.supplierCountryId).toBe(18));

		await userEvent
			.setup()
			.type(screen.getAllByRole("combobox")[0], "{backspace}");

		await waitFor(() => {
			expect(formData.current.supplierId).toBeNull();
		});
		expect(formData.current.supplierCountryId).toBeNull();
		expect(formData.current.supplierProvinceId).toBeNull();
		expect(formData.current.supplierDistrictId).toBeNull();
	});

	it("ignores a location that arrives after a newer supplier was picked", async () => {
		// A slow response for supplier A must not overwrite supplier B's
		// location, which is the one the officer can see selected.
		let resolveAlpha: (value: unknown) => void = () => {};
		fetchSupplierLocation
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveAlpha = resolve;
					}),
			)
			.mockResolvedValueOnce({
				countryId: 2,
				provinceId: null,
				districtId: null,
			});

		const formData = renderStep();
		await pickSupplier("Alpha Seafood");
		await pickSupplier("Beta Textiles");
		await waitFor(() => expect(formData.current.supplierCountryId).toBe(2));

		resolveAlpha({ countryId: 18, provinceId: 204, districtId: 3011 });

		await waitFor(() => {
			expect(formData.current.supplierId).toBe(2);
			expect(formData.current.supplierCountryId).toBe(2);
		});
	});

	it("leaves the location blank and editable when the lookup fails", async () => {
		fetchSupplierLocation.mockRejectedValue(new Error("network"));

		const formData = renderStep();
		await pickSupplier("Alpha Seafood");

		await waitFor(() => expect(formData.current.supplierId).toBe(1));
		expect(formData.current.supplierCountryId).toBeNull();
	});
});
