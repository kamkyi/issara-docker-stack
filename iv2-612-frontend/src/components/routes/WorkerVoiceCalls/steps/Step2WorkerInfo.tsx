import type React from "react";
import { useTranslation } from "react-i18next";
import {
	Field,
	LookupSelect,
	PhoneInput,
	TextArea,
	TextInput,
} from "../fields";
import { GENDER_OPTIONS } from "../formModel";
import LocationSelect from "../LocationSelect";
import { errorFor, type StepProps, StepShell } from "./StepShell";

/**
 * The contact fields, in the order the design lists them.
 *
 * Eight of them stacked one per row made this step far longer than it needed
 * to be, so they are laid out two-up. The split into two blocks is the one the
 * controls already make: the first four are dialable numbers and carry the
 * joined calling-code selector, the rest are plain handles typed as-is. Fields
 * of a kind sit together and line up, so the eye reads two short groups rather
 * than one long ladder.
 *
 * "Other" closes the list: a worker reaches an officer on whatever they have,
 * and the platforms above are only the ones common enough to earn a column.
 * Its placeholder asks for the platform as well as the handle, because nothing
 * else records which one it was -- so it takes the full width rather than
 * being squeezed into a half-column beside Zalo.
 */
const CONTACT_FIELDS = [
	{
		field: "phoneNumber",
		labelKey: "workerVoiceForm.fields.contact.phone",
		kind: "phone",
	},
	{
		field: "whatsapp",
		labelKey: "workerVoiceForm.fields.contact.whatsapp",
		kind: "phone",
	},
	{
		field: "viber",
		labelKey: "workerVoiceForm.fields.contact.viber",
		kind: "phone",
	},
	{
		field: "telegram",
		labelKey: "workerVoiceForm.fields.contact.telegram",
		kind: "phone",
	},
	{
		field: "facebook",
		labelKey: "workerVoiceForm.fields.contact.facebook",
		kind: "handle",
	},
	{
		field: "line",
		labelKey: "workerVoiceForm.fields.contact.line",
		kind: "handle",
	},
	{
		field: "zalo",
		labelKey: "workerVoiceForm.fields.contact.zalo",
		kind: "number",
	},
	{
		field: "otherContact",
		labelKey: "workerVoiceForm.fields.contact.other",
		kind: "other",
	},
] as const;

/**
 * The two blocks the layout uses, derived from `CONTACT_FIELDS` rather than
 * listed again, so adding a contact method above puts it in the right block
 * automatically and the two can never drift apart.
 */
const CONTACT_GROUPS = [
	CONTACT_FIELDS.filter((entry) => entry.kind === "phone"),
	CONTACT_FIELDS.filter((entry) => entry.kind !== "phone"),
] as const;

const PLACEHOLDER_KEY = {
	handle: "workerVoiceForm.fields.contact.handlePlaceholder",
	number: "workerVoiceForm.fields.contact.numberPlaceholder",
	other: "workerVoiceForm.fields.contact.otherPlaceholder",
} as const;

const Step2WorkerInfo: React.FC<StepProps> = ({
	formData,
	update,
	missing,
}) => {
	const { t } = useTranslation();

	return (
		<StepShell title={t("workerVoiceForm.steps.workerInfo")}>
			<Field label={t("workerVoiceForm.fields.workerInformation.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("workerInformation", value)}
						placeholder={t(
							"workerVoiceForm.fields.workerInformation.placeholder",
						)}
						rows={3}
						value={formData.workerInformation}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.workerName.label")}>
				{(controlId) => (
					<TextInput
						controlId={controlId}
						onChange={(value) => update("workerName", value)}
						placeholder={t("workerVoiceForm.fields.workerName.placeholder")}
						value={formData.workerName}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.gender.label")}>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("genderId", value)}
						options={GENDER_OPTIONS.map((option) => ({
							id: option.id,
							name: t(option.labelKey),
						}))}
						placeholder={t("workerVoiceForm.fields.gender.placeholder")}
						value={formData.genderId}
					/>
				)}
			</Field>

			<fieldset className="rounded-md border border-gray-200 px-4 pt-2 pb-4 dark:border-gray-700">
				<legend className="px-1 text-sm font-bold">
					{t("workerVoiceForm.fields.contact.legend")}
				</legend>
				{CONTACT_GROUPS.map((group, groupIndex) => (
					<div
						className={
							groupIndex === 0
								? "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
								: "mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-2 dark:border-gray-800"
						}
						key={group[0].field}
					>
						{group.map(({ field, labelKey, kind }) => (
							<div
								className={kind === "other" ? "sm:col-span-2" : undefined}
								key={field}
							>
								<Field label={t(labelKey)}>
									{(controlId) =>
										kind === "phone" ? (
											<PhoneInput
												codeLabel={t(
													"workerVoiceForm.fields.contact.countryCode",
												)}
												controlId={controlId}
												noMatchesLabel={t(
													"workerVoiceForm.fields.contact.noCountry",
												)}
												onChange={(value) => update(field, value)}
												placeholder={t(
													"workerVoiceForm.fields.contact.numberPlaceholder",
												)}
												searchPlaceholder={t(
													"workerVoiceForm.fields.contact.countrySearch",
												)}
												value={formData[field]}
											/>
										) : (
											<TextInput
												controlId={controlId}
												onChange={(value) => update(field, value)}
												placeholder={t(PLACEHOLDER_KEY[kind])}
												value={formData[field]}
											/>
										)
									}
								</Field>
							</div>
						))}
					</div>
				))}
			</fieldset>

			<LocationSelect
				error={errorFor(
					missing,
					"workerVoiceForm.fields.originCountry.label",
					t("workerVoiceForm.validation.required"),
				)}
				label={t("workerVoiceForm.fields.originCountry.label")}
				onChange={({ countryId, provinceId, districtId }) => {
					update("originCountryId", countryId);
					update("originProvinceId", provinceId);
					update("originDistrictId", districtId);
				}}
				required
				value={{
					countryId: formData.originCountryId,
					provinceId: formData.originProvinceId,
					districtId: formData.originDistrictId,
				}}
			/>

			<LocationSelect
				label={t("workerVoiceForm.fields.crossingCountry.label")}
				onChange={({ countryId, provinceId, districtId }) => {
					update("crossingCountryId", countryId);
					update("crossingProvinceId", provinceId);
					update("crossingDistrictId", districtId);
				}}
				value={{
					countryId: formData.crossingCountryId,
					provinceId: formData.crossingProvinceId,
					districtId: formData.crossingDistrictId,
				}}
			/>
		</StepShell>
	);
};

export default Step2WorkerInfo;
