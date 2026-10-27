import type React from "react";
import { useTranslation } from "react-i18next";
import { useContractTypes, useDocumentTypes } from "$src/queries/caseLookups";
import type { YesNo } from "$src/services/workerVoiceCaseService";
import {
	ChoiceGroup,
	Field,
	LookupSelect,
	NumberInput,
	TextArea,
} from "../fields";
import { errorFor, type StepProps, StepShell } from "./StepShell";

const Step3RecruitmentInfo: React.FC<StepProps> = ({
	formData,
	update,
	missing,
}) => {
	const { t } = useTranslation();
	const requiredMessage = t("workerVoiceForm.validation.required");
	const { data: contractTypes = [] } = useContractTypes();
	const { data: documentTypes = [] } = useDocumentTypes();

	const yesNoOptions: Array<{ value: YesNo; label: string }> = [
		{ value: "Yes", label: t("workerVoiceForm.options.yesNo.yes") },
		{ value: "No", label: t("workerVoiceForm.options.yesNo.no") },
	];

	return (
		<StepShell title={t("workerVoiceForm.steps.recruitmentInfo")}>
			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.monthsAtWorkplace.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.monthsAtWorkplace.label")}
				required
			>
				{(controlId) => (
					<NumberInput
						controlId={controlId}
						onChange={(value) => update("monthsAtWorkplace", value)}
						placeholder="0"
						value={formData.monthsAtWorkplace}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.employerDebtBondage.label")}>
				{() => (
					<div className="flex flex-col gap-2">
						<ChoiceGroup
							name="employerDebtBondage"
							onChange={(value) => update("employerDebtBondage", value)}
							options={yesNoOptions}
							value={formData.employerDebtBondage}
						/>
						{formData.employerDebtBondage === "Yes" && (
							<div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
								<Field
									label={t("workerVoiceForm.fields.debtBondageDetail.label")}
								>
									{(detailId) => (
										<TextArea
											controlId={detailId}
											onChange={(value) =>
												update("employerDebtBondageDetail", value)
											}
											placeholder={t(
												"workerVoiceForm.fields.debtBondageDetail.placeholder",
											)}
											rows={3}
											value={formData.employerDebtBondageDetail}
										/>
									)}
								</Field>
							</div>
						)}
					</div>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.brokerDebtBondage.label")}>
				{() => (
					<div className="flex flex-col gap-2">
						<ChoiceGroup
							name="brokerDebtBondage"
							onChange={(value) => update("brokerDebtBondage", value)}
							options={yesNoOptions}
							value={formData.brokerDebtBondage}
						/>
						{formData.brokerDebtBondage === "Yes" && (
							<div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
								<Field
									label={t("workerVoiceForm.fields.debtBondageDetail.label")}
								>
									{(detailId) => (
										<TextArea
											controlId={detailId}
											onChange={(value) =>
												update("brokerDebtBondageDetail", value)
											}
											placeholder={t(
												"workerVoiceForm.fields.debtBondageDetail.placeholder",
											)}
											rows={3}
											value={formData.brokerDebtBondageDetail}
										/>
									)}
								</Field>
							</div>
						)}
					</div>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.contractType.label",
					requiredMessage,
				)}
				label={t("workerVoiceForm.fields.contractType.label")}
				required
			>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("contractTypeId", value)}
						options={contractTypes}
						placeholder={t("workerVoiceForm.fields.contractType.placeholder")}
						value={formData.contractTypeId}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.documentType.label")}>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("documentTypeId", value)}
						options={documentTypes}
						placeholder={t("workerVoiceForm.fields.documentType.placeholder")}
						value={formData.documentTypeId}
					/>
				)}
			</Field>
		</StepShell>
	);
};

export default Step3RecruitmentInfo;
