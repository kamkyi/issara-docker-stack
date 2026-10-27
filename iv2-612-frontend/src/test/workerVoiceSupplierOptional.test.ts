/**
 * Supplier stays optional on the Worker Voice form.
 *
 * A CSO officer often cannot name the workplace -- the worker does not know it,
 * or it is not in ILM yet -- so the call still has to be loggable and editable
 * with no supplier at all. "Add Supplier" is deliberately a separate, later
 * feature; nothing here creates a supplier record.
 */
import { describe, expect, it } from "vitest";
import {
	EMPTY_FORM,
	fromRecord,
	missingFieldsForStep,
	STEP_COUNT,
	toPayload,
} from "$src/components/routes/WorkerVoiceCalls/formModel";

const filled = {
	...EMPTY_FORM,
	nationalityId: 1,
	reasonId: 2,
	officerId: 3,
	channelId: 4,
	firstTimeContacting: "Yes" as const,
	clientTypeId: 5,
	interactionDate: "2026-09-09",
	summary: "Worker reported unpaid overtime.",
	originCountryId: 6,
};

describe("supplier is optional", () => {
	it("never appears in the required fields of any step", () => {
		for (let step = 0; step < STEP_COUNT; step += 1) {
			expect(missingFieldsForStep(EMPTY_FORM, step)).not.toContain(
				"workerVoiceForm.fields.supplier.label",
			);
		}
	});

	it("does not block step 1 when left empty", () => {
		expect(missingFieldsForStep({ ...filled, supplierId: null }, 0)).toEqual(
			[],
		);
	});

	it("sends an explicit null rather than omitting the key", () => {
		// The backend distinguishes an absent field from an explicit null, and
		// this is the one the client actually performs.
		const payload = toPayload({ ...filled, supplierId: null });

		expect(payload).toHaveProperty("supplier", null);
		expect(payload).toHaveProperty("country", null);
		expect(payload).toHaveProperty("province", null);
		expect(payload).toHaveProperty("district", null);
	});

	it("still sends a chosen supplier and its location", () => {
		const payload = toPayload({
			...filled,
			supplierId: 42,
			supplierCountryId: 7,
			supplierProvinceId: 8,
			supplierDistrictId: 9,
		});

		expect(payload).toMatchObject({
			supplier: 42,
			country: 7,
			province: 8,
			district: 9,
		});
	});

	it("hydrates an existing call that has no supplier", () => {
		const form = fromRecord(
			{
				supplier: null,
				country: null,
				province: null,
				district: null,
			} as Parameters<typeof fromRecord>[0],
			new Map(),
		);

		expect(form.supplierId).toBeNull();
		expect(form.supplierCountryId).toBeNull();
		expect(
			missingFieldsForStep({ ...filled, ...form, supplierId: null }, 0),
		).not.toContain("workerVoiceForm.fields.supplier.label");
	});

	it("hydrates an existing call that has one", () => {
		const form = fromRecord(
			{
				supplier: 42,
				country: 7,
				province: 8,
				district: 9,
			} as Parameters<typeof fromRecord>[0],
			new Map(),
		);

		expect(form.supplierId).toBe(42);
		expect(form.supplierCountryId).toBe(7);
	});
});
