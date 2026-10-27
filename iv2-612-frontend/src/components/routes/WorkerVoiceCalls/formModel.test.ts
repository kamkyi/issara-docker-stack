import { describe, expect, it } from "vitest";
import type {
	WorkerVoiceCaseLabels,
	WorkerVoiceCaseRecord,
} from "$src/services/workerVoiceCaseService";
import {
	EMPTY_FORM,
	firstIncompleteStepBefore,
	fromRecord,
	ISSUE_REPORT_REASON_ID,
	missingFieldsForStep,
	REFERRAL_TO_PARTNER_ORG_ACTION_ID,
	STEP_COUNT,
	toPayload,
	type WorkerVoiceFormData,
} from "./formModel";

const completeStep1: Partial<WorkerVoiceFormData> = {
	nationalityId: 1,
	reasonId: 2,
	officerId: 3,
	channelId: 4,
	firstTimeContacting: "Yes",
	clientTypeId: 5,
	interactionDate: "2026-08-28",
	summary: "New case. Unpaid overtime reported.",
};

const completeThroughStep4: Partial<WorkerVoiceFormData> = {
	...completeStep1,
	originCountryId: 10,
	monthsAtWorkplace: "14",
	contractTypeId: 6,
	workersAffected: "3",
};

// The read-only display labels the API adds to every record. `fromRecord`
// rehydrates the form from ids, never from these, so they are all empty.
const labels: WorkerVoiceCaseLabels = {
	client_nationality_name: null,
	interaction_reason_name: null,
	interaction_channel_name: null,
	client_type_name: null,
	client_gender_name: null,
	supplier_name: null,
	country_name: null,
	province_name: null,
	district_name: null,
	client_origin_country_name: null,
	client_origin_province_name: null,
	client_origin_district_name: null,
	client_crossing_country_name: null,
	client_crossing_province_name: null,
	client_crossing_district_name: null,
	client_contract_type_name: null,
	client_document_type_name: null,
	case_status_name: null,
	referral_action_name: null,
	refer_to_org_name: null,
	interaction_issara_staff_name: null,
	next_steps_issara_staff_name: null,
	kpi_details: [],
};

describe("required-field gating", () => {
	it("reports every missing key-data field on an empty form", () => {
		const missing = missingFieldsForStep(EMPTY_FORM, 0);

		expect(missing).toHaveLength(8);
		expect(missing).toContain("workerVoiceForm.fields.nationality.label");
		expect(missing).toContain("workerVoiceForm.fields.summary.label");
	});

	it("treats a whitespace-only summary as missing", () => {
		const formData = { ...EMPTY_FORM, ...completeStep1, summary: "   " };

		expect(missingFieldsForStep(formData, 0)).toEqual([
			"workerVoiceForm.fields.summary.label",
		]);
	});

	it("clears once the step is filled in", () => {
		expect(
			missingFieldsForStep({ ...EMPTY_FORM, ...completeStep1 }, 0),
		).toEqual([]);
	});

	it("blocks a forward jump at the first incomplete step", () => {
		const formData = { ...EMPTY_FORM, ...completeStep1 };

		// Step 2 (index 1) still needs the worker's origin country.
		expect(firstIncompleteStepBefore(formData, 4)).toBe(1);
	});

	it("allows a jump once everything before the target is complete", () => {
		const formData = { ...EMPTY_FORM, ...completeThroughStep4 };

		expect(firstIncompleteStepBefore(formData, STEP_COUNT)).toBeNull();
	});

	it("never blocks a jump backwards to the first step", () => {
		expect(firstIncompleteStepBefore(EMPTY_FORM, 0)).toBeNull();
	});

	it("requires the number of workers affected on step 4", () => {
		expect(missingFieldsForStep(EMPTY_FORM, 3)).toEqual([
			"workerVoiceForm.fields.workersAffected.label",
		]);

		expect(
			missingFieldsForStep({ ...EMPTY_FORM, workersAffected: "3" }, 3),
		).toEqual([]);
	});

	it("blocks a jump past step 4 until the count is given", () => {
		const formData = {
			...EMPTY_FORM,
			...completeThroughStep4,
			workersAffected: "",
		};

		expect(firstIncompleteStepBefore(formData, STEP_COUNT)).toBe(3);
	});
});

describe("the issue-report reason", () => {
	// Step 4 hides the KPI tabs unless the worker reported an issue, and step 1
	// clears the selection when the officer moves off that reason. The id has
	// to stay pinned to the row the two steps agree on.
	it("names the reason that reveals the issue categories", () => {
		expect(ISSUE_REPORT_REASON_ID).toBe(2);
	});

	it("still round-trips KPIs chosen under that reason", () => {
		const payload = toPayload({
			...EMPTY_FORM,
			...completeThroughStep4,
			reasonId: ISSUE_REPORT_REASON_ID,
			selectedKpis: { 4: [11, 12], 7: [30] },
		});

		expect(payload.kpis).toEqual([11, 12, 30]);
	});
});

describe("mapping onto the cases table", () => {
	it("maps the form onto the ILM column names", () => {
		const payload = toPayload({
			...EMPTY_FORM,
			...completeThroughStep4,
			workerName: "Anonymous",
			zalo: "+84 90 000 0000",
			otherContact: "Signal - +66 81 000 0000",
			safeguardsRemarks: "Identity withheld.",
			riskLevel: "HIGH",
		});

		expect(payload.client_nationality).toBe(1);
		expect(payload.interaction_issara_staff).toBe(3);
		expect(payload.interaction_summary).toBe(
			"New case. Unpaid overtime reported.",
		);
		expect(payload.client_nickname).toBe("Anonymous");
		expect(payload.client_zalo_account).toBe("+84 90 000 0000");
		expect(payload.client_other_account).toBe("Signal - +66 81 000 0000");
		expect(payload.safeguards_remarks).toBe("Identity withheld.");
		expect(payload.worker_identification_risk_level).toBe("HIGH");
	});

	it("converts numeric text fields to numbers, and blanks to null", () => {
		const filled = toPayload({
			...EMPTY_FORM,
			monthsAtWorkplace: "14",
			workersAffected: "30",
		});
		expect(filled.client_time_at_job).toBe(14);
		expect(filled.issue_workers_affected).toBe(30);

		const blank = toPayload(EMPTY_FORM);
		expect(blank.client_time_at_job).toBeNull();
		expect(blank.issue_workers_affected).toBeNull();
	});

	it("sends the anonymous-discussion consent as a boolean, not a string", () => {
		expect(
			toPayload({ ...EMPTY_FORM, discussAnonymouslyConsent: "Yes" })
				.consent_to_discuss_with_employer_anonymously,
		).toBe(true);
		expect(
			toPayload({ ...EMPTY_FORM, discussAnonymouslyConsent: "No" })
				.consent_to_discuss_with_employer_anonymously,
		).toBe(false);
		expect(
			toPayload(EMPTY_FORM).consent_to_discuss_with_employer_anonymously,
		).toBeNull();
	});

	it("flattens the per-category KPI selection into the cases m2m list", () => {
		const payload = toPayload({
			...EMPTY_FORM,
			selectedKpis: { 1: [11, 12], 5: [51] },
		});

		expect(payload.kpis.sort()).toEqual([11, 12, 51]);
	});

	it("sends empty dates as null rather than an empty string", () => {
		const payload = toPayload(EMPTY_FORM);

		expect(payload.interacted).toBeNull();
		expect(payload.dead_line_date).toBeNull();
	});

	it("sends the supplier and the workplace location it filled in", () => {
		const payload = toPayload({
			...EMPTY_FORM,
			supplierId: 18055,
			supplierCountryId: 18,
			supplierProvinceId: 204,
			supplierDistrictId: 3011,
		});

		expect(payload.supplier).toBe(18055);
		expect(payload.country).toBe(18);
		expect(payload.province).toBe(204);
		expect(payload.district).toBe(3011);
	});

	it("sends a location the officer corrected, not the supplier's own", () => {
		// The three fields stay editable after the auto-fill, as they are in the
		// legacy call wizard, so whatever is in form state is what is saved.
		const payload = toPayload({
			...EMPTY_FORM,
			supplierId: 18055,
			supplierCountryId: 2,
			supplierProvinceId: null,
			supplierDistrictId: null,
		});

		expect(payload.supplier).toBe(18055);
		expect(payload.country).toBe(2);
		expect(payload.province).toBeNull();
	});

	it("sends no location once the supplier is cleared", () => {
		// The step blanks all three alongside the supplier, so a submitted call
		// can never carry the previously selected supplier's location.
		const payload = toPayload({
			...EMPTY_FORM,
			supplierId: null,
			supplierCountryId: null,
			supplierProvinceId: null,
			supplierDistrictId: null,
		});

		expect(payload.supplier).toBeNull();
		expect(payload.country).toBeNull();
		expect(payload.province).toBeNull();
		expect(payload.district).toBeNull();
	});

	it("leaves the supplier optional, for a workplace the worker cannot name", () => {
		expect(missingFieldsForStep(EMPTY_FORM, 0)).not.toContain(
			"workerVoiceForm.fields.supplier.label",
		);
	});
});

describe("rehydrating a saved call", () => {
	const record = {
		...labels,
		...toPayload(EMPTY_FORM),
		id: 7,
		created: "2026-08-28",
		last_modified: "2026-08-28",
		case_created_by: 3,
		organization_name: "Partner CSO",
		shared_with_my_organization: false,
		attachments: [],
		client_nationality: 1,
		interaction_summary: "Follow-up call.",
		client_time_at_job: 14,
		consent_to_discuss_with_employer_anonymously: true,
		kpis: [11, 12, 51],
	} as WorkerVoiceCaseRecord;

	it("regroups the flat KPI list back under its categories", () => {
		const kpiCategories = new Map([
			[11, 1],
			[12, 1],
			[51, 5],
		]);

		const formData = fromRecord(record, kpiCategories);

		expect(formData.selectedKpis).toEqual({ 1: [11, 12], 5: [51] });
		expect(formData.monthsAtWorkplace).toBe("14");
		expect(formData.discussAnonymouslyConsent).toBe("Yes");
		expect(formData.summary).toBe("Follow-up call.");
	});

	it("reopens a saved call on its supplier and workplace location", () => {
		const saved = {
			...record,
			supplier: 18055,
			country: 18,
			province: 204,
			district: 3011,
		} as WorkerVoiceCaseRecord;

		const formData = fromRecord(saved, new Map());

		expect(formData.supplierId).toBe(18055);
		expect(formData.supplierCountryId).toBe(18);
		expect(formData.supplierProvinceId).toBe(204);
		expect(formData.supplierDistrictId).toBe(3011);
	});

	it("reopens a call logged without a supplier on empty fields", () => {
		const formData = fromRecord(record, new Map());

		expect(formData.supplierId).toBeNull();
		expect(formData.supplierCountryId).toBeNull();
	});

	it("hands the edit form the files already saved against the call", () => {
		// Without these the officer editing a call sees an empty uploads list and
		// has no way to tell what is already attached.
		const saved = {
			...record,
			attachments: [
				{
					id: 3,
					name: "scan.pdf",
					type: "O",
					size: "2048",
					file_path: "https://files.example.test/scan.pdf",
					created_at: "2026-08-28",
				},
			],
		} as WorkerVoiceCaseRecord;

		const formData = fromRecord(saved, new Map());

		expect(formData.existingAttachments).toHaveLength(1);
		expect(formData.existingAttachments[0].name).toBe("scan.pdf");
		expect(formData.removedAttachmentIds).toEqual([]);
	});

	it("drops KPIs whose category is unknown rather than crashing", () => {
		const formData = fromRecord(record, new Map([[11, 1]]));

		expect(formData.selectedKpis).toEqual({ 1: [11] });
	});

	it("round-trips back to an equivalent payload", () => {
		const kpiCategories = new Map([
			[11, 1],
			[12, 1],
			[51, 5],
		]);

		const payload = toPayload(fromRecord(record, kpiCategories));

		expect(payload.client_time_at_job).toBe(14);
		expect(payload.consent_to_discuss_with_employer_anonymously).toBe(true);
		expect(payload.kpis.sort()).toEqual([11, 12, 51]);
	});
});

describe("the partner referral's organization", () => {
	it("is not asked for under any other referral action", () => {
		const formData = {
			...EMPTY_FORM,
			...completeThroughStep4,
			referralActionId: 1,
		};

		expect(missingFieldsForStep(formData, 4)).toEqual([]);
	});

	it("is required as soon as the partner referral is chosen", () => {
		const formData = {
			...EMPTY_FORM,
			...completeThroughStep4,
			referralActionId: REFERRAL_TO_PARTNER_ORG_ACTION_ID,
		};

		expect(missingFieldsForStep(formData, 4)).toEqual([
			"workerVoiceForm.fields.referralOrg.label",
		]);
	});

	it("clears the requirement once an organization is picked", () => {
		const formData = {
			...EMPTY_FORM,
			...completeThroughStep4,
			referralActionId: REFERRAL_TO_PARTNER_ORG_ACTION_ID,
			referToOrgId: 8,
		};

		expect(missingFieldsForStep(formData, 4)).toEqual([]);
	});

	it("blocks submitting a partner referral with no organization", () => {
		const formData = {
			...EMPTY_FORM,
			...completeThroughStep4,
			referralActionId: REFERRAL_TO_PARTNER_ORG_ACTION_ID,
		};

		// The submit button gates on every step, step 5 included.
		expect(firstIncompleteStepBefore(formData, STEP_COUNT)).toBe(4);
	});

	it("maps onto the cases.refer_to_org column", () => {
		const payload = toPayload({
			...EMPTY_FORM,
			referralActionId: REFERRAL_TO_PARTNER_ORG_ACTION_ID,
			referToOrgId: 8,
		});

		expect(payload.referral_action).toBe(REFERRAL_TO_PARTNER_ORG_ACTION_ID);
		expect(payload.refer_to_org).toBe(8);
	});

	it("comes back on the edit form", () => {
		const rehydrated = fromRecord(
			{
				...labels,
				...toPayload(EMPTY_FORM),
				id: 7,
				created: null,
				last_modified: null,
				case_created_by: 3,
				organization_name: "Partner CSO",
				shared_with_my_organization: false,
				attachments: [],
				referral_action: REFERRAL_TO_PARTNER_ORG_ACTION_ID,
				refer_to_org: 8,
			} as WorkerVoiceCaseRecord,
			new Map(),
		);

		expect(rehydrated.referralActionId).toBe(REFERRAL_TO_PARTNER_ORG_ACTION_ID);
		expect(rehydrated.referToOrgId).toBe(8);
	});
});
