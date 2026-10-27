import type React from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import SupplierAsyncPaginateDropdown from "$src/components/dropdowns/SupplierAsyncPaginateDropdown";
import { useCsoAudience } from "$src/hooks/useCsoAudience";
import { useClientTypes } from "$src/queries/clientTypes";
import { useInteractionChannels } from "$src/queries/interactionChannels";
import { useInteractionReasons } from "$src/queries/interactionReasons";
import { useNationalities } from "$src/queries/nationalities";
import type { Supplier } from "$src/queries/suppliers";
import { fetchSupplierLocation } from "$src/queries/suppliers";
import { useUsers } from "$src/queries/users";
import type { FirstContactAnswer } from "$src/services/workerVoiceCaseService";
import { clientTypeLabel } from "../clientTypeLabels";
import {
	ChoiceGroup,
	DateInput,
	Field,
	LookupSelect,
	TextArea,
} from "../fields";
import { ISSUE_REPORT_REASON_ID } from "../formModel";
import LocationSelect from "../LocationSelect";
import { errorFor, type StepProps, StepShell } from "./StepShell";

const Step1KeyData: React.FC<StepProps> = ({ formData, update, missing }) => {
	const { t } = useTranslation();
	const requiredMessage = t("workerVoiceForm.validation.required");

	// Reasons, channels and client types are audience-filtered server-side.
	// The filter keys off the caller's Django groups, which is the right answer
	// for a real CSO login and the wrong one for an Issara Management or Tester
	// account viewing this form through the Tester Floating Button: the token
	// stays a Management token, so the server would hand back the Issara-worded
	// rows and the tester would be reviewing a form no CSO will ever see.
	// Naming the audience makes both cases return the same list.
	const csoOnly = useCsoAudience();
	const { data: nationalities } = useNationalities();
	const { data: reasons } = useInteractionReasons({ csoOnly });
	const { data: channels } = useInteractionChannels({ csoOnly });
	const { data: clientTypes } = useClientTypes("en", { csoOnly });
	// Organization-scoped, always from the signed-in account -- the view mode
	// never changes *which* organization. What it changes is the rule: the
	// CSO-facing picker offers that organization's own officers, where the
	// Management one offers every non-CSO user in the system.
	const { data: users } = useUsers({ csoOnly });

	const toOptions = (response: unknown) => {
		const results = (
			response as { results?: Array<{ id: number; name: string }> }
		)?.results;
		if (Array.isArray(results)) {
			return results;
		}
		return Array.isArray(response)
			? (response as Array<{ id: number; name: string }>)
			: [];
	};

	// `/cascade/users/` already returns only the caller's organization for a
	// CSO, which is what "users listed under that specific CSO domain" means.
	const officerOptions = toOptions(users).map((user) => {
		const named = user as unknown as {
			id: number;
			first_name?: string;
			last_name?: string;
			username?: string;
			email?: string;
		};
		const fullName = [named.first_name, named.last_name]
			.filter(Boolean)
			.join(" ")
			.trim();
		return {
			id: named.id,
			name: fullName || named.username || named.email || String(named.id),
		};
	});

	const firstContactOptions: Array<{
		value: FirstContactAnswer;
		label: string;
	}> = [
		{ value: "Yes", label: t("workerVoiceForm.options.yesNo.yes") },
		{ value: "No", label: t("workerVoiceForm.options.yesNo.no") },
		{
			value: "Cannot remember",
			label: t("workerVoiceForm.options.firstTime.cannotRemember"),
		},
	];

	/**
	 * Picking a supplier fills its location in, exactly as the legacy call
	 * wizard does (`RequiredCallFields.fetchSupplierById`). Clearing the
	 * supplier clears all three in the same update, so a call can never be
	 * submitted carrying the previous supplier's country; the officer can
	 * still edit them afterwards, for a supplier whose own location is blank.
	 */
	const latestSupplierRef = useRef<number | null>(null);

	const handleSupplierChange = async (supplier: Supplier | null) => {
		const supplierId = supplier?.id ?? null;
		latestSupplierRef.current = supplierId;
		update("supplierId", supplierId);

		// Blank the old location immediately, before any request goes out.
		// Switching A -> B must never show A's country next to B's name, even
		// for the moment B's location is in flight.
		update("supplierCountryId", null);
		update("supplierProvinceId", null);
		update("supplierDistrictId", null);
		if (supplierId === null) {
			return;
		}

		try {
			const location = await fetchSupplierLocation(supplierId);
			// A later pick already superseded this one; its own call owns the
			// location fields now.
			if (latestSupplierRef.current !== supplierId) {
				return;
			}
			update("supplierCountryId", location.countryId);
			update("supplierProvinceId", location.provinceId);
			update("supplierDistrictId", location.districtId);
		} catch {
			// The supplier still counts as chosen. The fields are already
			// blank, so the officer just fills them in by hand.
		}
	};

	return (
		<StepShell
			subtitle={t("workerVoiceForm.requiredNote")}
			title={t("workerVoiceForm.steps.keyData")}
		>
			<Field label={t("workerVoiceForm.fields.supplier.label")}>
				{(controlId) => (
					<SupplierAsyncPaginateDropdown
						controlId={controlId}
						onChange={handleSupplierChange}
						placeholder={t("workerVoiceForm.fields.supplier.placeholder")}
						value={formData.supplierId}
					/>
				)}
			</Field>

			<LocationSelect
				label={t("workerVoiceForm.fields.supplierLocation.label")}
				onChange={(location) => {
					update("supplierCountryId", location.countryId);
					update("supplierProvinceId", location.provinceId);
					update("supplierDistrictId", location.districtId);
				}}
				value={{
					countryId: formData.supplierCountryId,
					provinceId: formData.supplierProvinceId,
					districtId: formData.supplierDistrictId,
				}}
			/>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.nationality.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.nationality.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("nationalityId", value)}
						options={toOptions(nationalities)}
						placeholder={t("workerVoiceForm.fields.nationality.placeholder")}
						value={formData.nationalityId}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.contactReason.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.contactReason.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => {
							update("reasonId", value);
							// Step 4 only shows the issue categories for the reason that
							// reports an issue, so moving off it drops the selection
							// rather than saving KPIs against a call about something else.
							if (value !== ISSUE_REPORT_REASON_ID) {
								update("selectedKpis", {});
							}
						}}
						options={toOptions(reasons)}
						placeholder={t("workerVoiceForm.fields.contactReason.placeholder")}
						value={formData.reasonId}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.officer.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.officer.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("officerId", value)}
						options={officerOptions}
						placeholder={t("workerVoiceForm.fields.officer.placeholder")}
						value={formData.officerId}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.channel.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.channel.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("channelId", value)}
						options={toOptions(channels)}
						placeholder={t("workerVoiceForm.fields.channel.placeholder")}
						value={formData.channelId}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.firstTime.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.firstTime.label")}
				required
			>
				{() => (
					<ChoiceGroup
						name="firstTimeContacting"
						onChange={(value) => update("firstTimeContacting", value)}
						options={firstContactOptions}
						value={formData.firstTimeContacting}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.workerType.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.workerType.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("clientTypeId", value)}
						options={toOptions(clientTypes).map((option) => ({
							...option,
							name: clientTypeLabel(option.name),
						}))}
						placeholder={t("workerVoiceForm.fields.workerType.placeholder")}
						value={formData.clientTypeId}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.interactionDate.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.interactionDate.label")}
				required
			>
				{(controlId) => (
					<DateInput
						controlId={controlId}
						invalid={missing.includes(
							"workerVoiceForm.fields.interactionDate.label",
						)}
						onChange={(value) => update("interactionDate", value)}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.interactionDate",
						)}
						value={formData.interactionDate}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.summary.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.summary.label")}
				required
			>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("summary", value)}
						placeholder={t("workerVoiceForm.fields.summary.placeholder")}
						rows={6}
						value={formData.summary}
					/>
				)}
			</Field>
		</StepShell>
	);
};

export default Step1KeyData;
