/**
 * Shape, defaults, validation and API mapping for the Worker Voice form.
 *
 * Kept separate from the step components so the five steps stay presentational
 * and the mapping onto the ILM `cases` columns is readable in one place.
 */
import type {
	FirstContactAnswer,
	RiskLevel,
	SituationImproving,
	WorkerVoiceAttachment,
	WorkerVoiceCasePayload,
	WorkerVoiceCaseRecord,
	YesNo,
} from "$src/services/workerVoiceCaseService";

export interface WorkerVoiceFormData {
	// Step 1 -- Key data
	nationalityId: number | null;
	reasonId: number | null;
	officerId: number | null;
	channelId: number | null;
	firstTimeContacting: FirstContactAnswer | null;
	clientTypeId: number | null;
	interactionDate: string;
	summary: string;
	/** The workplace the call is about. Null under the unknown-supplier flow. */
	supplierId: number | null;
	/**
	 * Where that workplace is. Auto-filled from the supplier on selection and
	 * still editable afterwards, matching the legacy call wizard -- a supplier
	 * whose own location is blank or wrong has to be correctable here.
	 */
	supplierCountryId: number | null;
	supplierProvinceId: number | null;
	supplierDistrictId: number | null;
	// Step 2 -- Worker info
	workerInformation: string;
	workerName: string;
	genderId: number | null;
	phoneNumber: string;
	whatsapp: string;
	viber: string;
	telegram: string;
	facebook: string;
	line: string;
	zalo: string;
	/** Whatever platform the named fields above do not cover, as free text. */
	otherContact: string;
	originCountryId: number | null;
	originProvinceId: number | null;
	originDistrictId: number | null;
	crossingCountryId: number | null;
	crossingProvinceId: number | null;
	crossingDistrictId: number | null;
	// Step 3 -- Recruitment info
	monthsAtWorkplace: string;
	employerDebtBondage: YesNo | null;
	employerDebtBondageDetail: string;
	brokerDebtBondage: YesNo | null;
	brokerDebtBondageDetail: string;
	contractTypeId: number | null;
	documentTypeId: number | null;
	// Step 4 -- Issue details
	issueDescription: string;
	workersAffected: string;
	situationImproving: SituationImproving | null;
	situationImprovingDescription: string;
	/** categoryId -> selected KPI ids, matching the KPI tabs component. */
	selectedKpis: Record<number, number[]>;
	// Step 5 -- Support and actions
	urgentNeeds: string;
	shareInfoConsent: YesNo | null;
	discussAnonymouslyConsent: YesNo | null;
	riskLevel: RiskLevel | null;
	caseStatusId: number | null;
	referralActionId: number | null;
	/** Only asked for, and only kept, under REFERRAL_TO_PARTNER_ORG_ACTION_ID. */
	referToOrgId: number | null;
	nextSteps: string;
	nextStepsOfficerId: number | null;
	deadlineDate: string;
	finalRemarks: string;
	safeguardsRemarks: string;
	attachments: File[];
	/** Files already saved against the call, shown when editing one. */
	existingAttachments: WorkerVoiceAttachment[];
	/** Saved files the officer took off the call; detached on save. */
	removedAttachmentIds: number[];
}

export const EMPTY_FORM: WorkerVoiceFormData = {
	nationalityId: null,
	reasonId: null,
	officerId: null,
	channelId: null,
	firstTimeContacting: null,
	clientTypeId: null,
	interactionDate: "",
	summary: "",
	supplierId: null,
	supplierCountryId: null,
	supplierProvinceId: null,
	supplierDistrictId: null,
	workerInformation: "",
	workerName: "",
	genderId: null,
	phoneNumber: "",
	whatsapp: "",
	viber: "",
	telegram: "",
	facebook: "",
	line: "",
	zalo: "",
	otherContact: "",
	originCountryId: null,
	originProvinceId: null,
	originDistrictId: null,
	crossingCountryId: null,
	crossingProvinceId: null,
	crossingDistrictId: null,
	monthsAtWorkplace: "",
	employerDebtBondage: null,
	employerDebtBondageDetail: "",
	brokerDebtBondage: null,
	brokerDebtBondageDetail: "",
	contractTypeId: null,
	documentTypeId: null,
	issueDescription: "",
	workersAffected: "",
	situationImproving: null,
	situationImprovingDescription: "",
	selectedKpis: {},
	urgentNeeds: "",
	shareInfoConsent: null,
	discussAnonymouslyConsent: null,
	riskLevel: null,
	caseStatusId: null,
	referralActionId: null,
	referToOrgId: null,
	nextSteps: "",
	nextStepsOfficerId: null,
	deadlineDate: "",
	finalRemarks: "",
	safeguardsRemarks: "",
	attachments: [],
	existingAttachments: [],
	removedAttachmentIds: [],
};

/** Gender ids match the ILM `genders` table, which has no list endpoint. */
export const GENDER_OPTIONS = [
	{ id: 1, labelKey: "workerVoiceForm.options.gender.male" },
	{ id: 2, labelKey: "workerVoiceForm.options.gender.female" },
	{ id: 3, labelKey: "workerVoiceForm.options.gender.other" },
	{ id: 4, labelKey: "workerVoiceForm.options.gender.nonBinary" },
] as const;

export const STEP_COUNT = 5;

/**
 * `referral_actions` row 13, "Referral information provided to the partner
 * organization" -- the only action that names another organization, so step 5
 * reveals the organization picker for it and requires an answer.
 *
 * The row is shared with Issara staff and predates this form, so the id is the
 * same on local, staging and production. The backend enforces the same rule in
 * `cascade/views/worker_voice_calls.py`.
 */
export const REFERRAL_TO_PARTNER_ORG_ACTION_ID = 13;

/**
 * `interaction_reasons` row 2, "Reporting an issue or getting updated on an
 * issue" -- the only reason on step 1 that describes an issue, so it is the
 * one that puts the Issue Categories section on step 4. Every other reason
 * (social talk, a policy question, a wrong number) has no issue to categorize.
 *
 * Like the referral action above, the row predates this form and is worded
 * neutrally rather than for CSOs, so the id is the same everywhere.
 */
export const ISSUE_REPORT_REASON_ID = 2;

/**
 * Required fields per step, as translation keys. Index matches step index, so
 * the stepper can gate a forward jump on everything before the target step.
 */
const REQUIRED_BY_STEP: Array<
	Array<{ field: keyof WorkerVoiceFormData; labelKey: string }>
> = [
	[
		{
			field: "nationalityId",
			labelKey: "workerVoiceForm.fields.nationality.label",
		},
		{
			field: "reasonId",
			labelKey: "workerVoiceForm.fields.contactReason.label",
		},
		{ field: "officerId", labelKey: "workerVoiceForm.fields.officer.label" },
		{ field: "channelId", labelKey: "workerVoiceForm.fields.channel.label" },
		{
			field: "firstTimeContacting",
			labelKey: "workerVoiceForm.fields.firstTime.label",
		},
		{
			field: "clientTypeId",
			labelKey: "workerVoiceForm.fields.workerType.label",
		},
		{
			field: "interactionDate",
			labelKey: "workerVoiceForm.fields.interactionDate.label",
		},
		{ field: "summary", labelKey: "workerVoiceForm.fields.summary.label" },
	],
	[
		{
			field: "originCountryId",
			labelKey: "workerVoiceForm.fields.originCountry.label",
		},
	],
	[
		{
			field: "monthsAtWorkplace",
			labelKey: "workerVoiceForm.fields.monthsAtWorkplace.label",
		},
		{
			field: "contractTypeId",
			labelKey: "workerVoiceForm.fields.contractType.label",
		},
	],
	[
		{
			field: "workersAffected",
			labelKey: "workerVoiceForm.fields.workersAffected.label",
		},
	],
	[],
];

const isBlank = (value: unknown) =>
	value === null ||
	value === undefined ||
	(typeof value === "string" && value.trim() === "");

/**
 * Fields required only because of an answer already given, keyed by step.
 *
 * Step 5's organization picker is the only one so far: it is hidden until the
 * partner-referral action is chosen, and required from the moment it appears.
 */
const conditionallyRequired = (
	formData: WorkerVoiceFormData,
	stepIndex: number,
): Array<{ field: keyof WorkerVoiceFormData; labelKey: string }> => {
	if (
		stepIndex === 4 &&
		formData.referralActionId === REFERRAL_TO_PARTNER_ORG_ACTION_ID
	) {
		return [
			{
				field: "referToOrgId",
				labelKey: "workerVoiceForm.fields.referralOrg.label",
			},
		];
	}
	return [];
};

/** Translation keys for the fields still missing on `stepIndex`. */
export const missingFieldsForStep = (
	formData: WorkerVoiceFormData,
	stepIndex: number,
): string[] =>
	[
		...(REQUIRED_BY_STEP[stepIndex] ?? []),
		...conditionallyRequired(formData, stepIndex),
	]
		.filter(({ field }) => isBlank(formData[field]))
		.map(({ labelKey }) => labelKey);

/** The first step before `targetStep` that still has missing fields, or null. */
export const firstIncompleteStepBefore = (
	formData: WorkerVoiceFormData,
	targetStep: number,
): number | null => {
	for (let step = 0; step < targetStep; step += 1) {
		if (missingFieldsForStep(formData, step).length > 0) {
			return step;
		}
	}
	return null;
};

const toNumberOrNull = (value: string): number | null => {
	if (value.trim() === "") {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const yesNoToBoolean = (value: YesNo | null): boolean | null => {
	if (value === null) {
		return null;
	}
	return value === "Yes";
};

export const toPayload = (
	formData: WorkerVoiceFormData,
): WorkerVoiceCasePayload => ({
	client_nationality: formData.nationalityId,
	interaction_reason: formData.reasonId,
	interaction_issara_staff: formData.officerId,
	interaction_channel: formData.channelId,
	first_time_contacting_issara: formData.firstTimeContacting,
	client_type: formData.clientTypeId,
	interacted: formData.interactionDate || null,
	interaction_summary: formData.summary,
	supplier: formData.supplierId,
	// Sent from form state, never re-derived from the supplier at submit time,
	// so an edited location is what gets saved and a cleared supplier cannot
	// leave the previous one's country behind.
	country: formData.supplierCountryId,
	province: formData.supplierProvinceId,
	district: formData.supplierDistrictId,

	description: formData.workerInformation,
	client_nickname: formData.workerName,
	client_gender: formData.genderId,
	client_phonenumber: formData.phoneNumber,
	client_whatsapp_account: formData.whatsapp,
	client_viber_account: formData.viber,
	client_telegram_account: formData.telegram,
	client_facebook_account: formData.facebook,
	client_line_account: formData.line,
	client_zalo_account: formData.zalo,
	client_other_account: formData.otherContact,
	client_origin_country: formData.originCountryId,
	client_origin_province: formData.originProvinceId,
	client_origin_district: formData.originDistrictId,
	client_crossing_country: formData.crossingCountryId,
	client_crossing_province: formData.crossingProvinceId,
	client_crossing_district: formData.crossingDistrictId,

	client_time_at_job: toNumberOrNull(formData.monthsAtWorkplace),
	debt_bondage: formData.employerDebtBondage,
	debt_bondage_detail: formData.employerDebtBondageDetail,
	debt_bondage_broker: formData.brokerDebtBondage,
	debt_bondage_detail_broker: formData.brokerDebtBondageDetail,
	client_contract_type: formData.contractTypeId,
	client_document_type: formData.documentTypeId,

	issue_description: formData.issueDescription,
	issue_workers_affected: toNumberOrNull(formData.workersAffected),
	issue_getting_better: formData.situationImproving,
	issue_getting_better_description: formData.situationImprovingDescription,
	kpis: Object.values(formData.selectedKpis).flat(),

	vot_needs: formData.urgentNeeds,
	client_share_info_consent: formData.shareInfoConsent,
	consent_to_discuss_with_employer_anonymously: yesNoToBoolean(
		formData.discussAnonymouslyConsent,
	),
	worker_identification_risk_level: formData.riskLevel,
	case_status: formData.caseStatusId,
	referral_action: formData.referralActionId,
	// Only meaningful under the partner-referral action, and the step clears
	// it when the officer moves off that action, so it round-trips as null.
	refer_to_org: formData.referToOrgId,
	next_steps: formData.nextSteps,
	next_steps_issara_staff: formData.nextStepsOfficerId,
	dead_line_date: formData.deadlineDate || null,
	final_remarks: formData.finalRemarks,
	safeguards_remarks: formData.safeguardsRemarks,
});

const booleanToYesNo = (value: boolean | null): YesNo | null => {
	if (value === null || value === undefined) {
		return null;
	}
	return value ? "Yes" : "No";
};

/** Rehydrate the form from a saved case, for the edit flow. */
export const fromRecord = (
	record: WorkerVoiceCaseRecord,
	kpiCategoryByKpiId: Map<number, number>,
): WorkerVoiceFormData => {
	const selectedKpis: Record<number, number[]> = {};
	for (const kpiId of record.kpis ?? []) {
		const categoryId = kpiCategoryByKpiId.get(kpiId);
		if (categoryId === undefined) {
			continue;
		}
		selectedKpis[categoryId] = [...(selectedKpis[categoryId] ?? []), kpiId];
	}

	return {
		...EMPTY_FORM,
		nationalityId: record.client_nationality,
		reasonId: record.interaction_reason,
		officerId: record.interaction_issara_staff,
		channelId: record.interaction_channel,
		firstTimeContacting: record.first_time_contacting_issara,
		clientTypeId: record.client_type,
		interactionDate: record.interacted ?? "",
		summary: record.interaction_summary ?? "",
		supplierId: record.supplier,
		supplierCountryId: record.country,
		supplierProvinceId: record.province,
		supplierDistrictId: record.district,
		workerInformation: record.description ?? "",
		workerName: record.client_nickname ?? "",
		genderId: record.client_gender,
		phoneNumber: record.client_phonenumber ?? "",
		whatsapp: record.client_whatsapp_account ?? "",
		viber: record.client_viber_account ?? "",
		telegram: record.client_telegram_account ?? "",
		facebook: record.client_facebook_account ?? "",
		line: record.client_line_account ?? "",
		zalo: record.client_zalo_account ?? "",
		otherContact: record.client_other_account ?? "",
		originCountryId: record.client_origin_country,
		originProvinceId: record.client_origin_province,
		originDistrictId: record.client_origin_district,
		crossingCountryId: record.client_crossing_country,
		crossingProvinceId: record.client_crossing_province,
		crossingDistrictId: record.client_crossing_district,
		monthsAtWorkplace:
			record.client_time_at_job === null
				? ""
				: String(record.client_time_at_job),
		employerDebtBondage: record.debt_bondage,
		employerDebtBondageDetail: record.debt_bondage_detail ?? "",
		brokerDebtBondage: record.debt_bondage_broker,
		brokerDebtBondageDetail: record.debt_bondage_detail_broker ?? "",
		contractTypeId: record.client_contract_type,
		documentTypeId: record.client_document_type,
		issueDescription: record.issue_description ?? "",
		workersAffected:
			record.issue_workers_affected === null
				? ""
				: String(record.issue_workers_affected),
		situationImproving: record.issue_getting_better,
		situationImprovingDescription:
			record.issue_getting_better_description ?? "",
		selectedKpis,
		urgentNeeds: record.vot_needs ?? "",
		shareInfoConsent: record.client_share_info_consent,
		discussAnonymouslyConsent: booleanToYesNo(
			record.consent_to_discuss_with_employer_anonymously,
		),
		riskLevel: record.worker_identification_risk_level,
		caseStatusId: record.case_status,
		referralActionId: record.referral_action,
		referToOrgId: record.refer_to_org,
		nextSteps: record.next_steps ?? "",
		nextStepsOfficerId: record.next_steps_issara_staff,
		deadlineDate: record.dead_line_date ?? "",
		finalRemarks: record.final_remarks ?? "",
		safeguardsRemarks: record.safeguards_remarks ?? "",
		attachments: [],
		existingAttachments: record.attachments,
		removedAttachmentIds: [],
	};
};
