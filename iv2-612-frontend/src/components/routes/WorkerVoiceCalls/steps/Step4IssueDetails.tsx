import type React from "react";
import { useTranslation } from "react-i18next";
import type { SituationImproving } from "$src/services/workerVoiceCaseService";
import { ChoiceGroup, Field, NumberInput, TextArea } from "../fields";
import { ISSUE_REPORT_REASON_ID } from "../formModel";
import IssueCategoryKpiTabs from "../IssueCategoryKpiTabs";
import { errorFor, type StepProps, StepShell } from "./StepShell";

const Step4IssueDetails: React.FC<StepProps> = ({
	formData,
	update,
	missing,
}) => {
	const { t } = useTranslation();

	// The KPI tabs categorize an issue, and only one reason on step 1 says the
	// worker reported one. Step 1 clears the selection when the officer moves
	// off that reason, so nothing hidden here is left behind to be saved.
	const isIssueReport = formData.reasonId === ISSUE_REPORT_REASON_ID;

	const improvingOptions: Array<{ value: SituationImproving; label: string }> =
		[
			{ value: "Yes", label: t("workerVoiceForm.options.yesNo.yes") },
			{ value: "No", label: t("workerVoiceForm.options.yesNo.no") },
			{
				value: "About the same",
				label: t("workerVoiceForm.options.improving.aboutTheSame"),
			},
		];

	const toggleKpi = (categoryId: number, kpiId: number) => {
		const current = formData.selectedKpis[categoryId] ?? [];
		const next = current.includes(kpiId)
			? current.filter((id) => id !== kpiId)
			: [...current, kpiId];

		const selectedKpis = { ...formData.selectedKpis };
		if (next.length === 0) {
			delete selectedKpis[categoryId];
		} else {
			selectedKpis[categoryId] = next;
		}
		update("selectedKpis", selectedKpis);
	};

	return (
		<StepShell title={t("workerVoiceForm.steps.issueDetails")}>
			<Field label={t("workerVoiceForm.fields.issueDescription.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("issueDescription", value)}
						placeholder={t(
							"workerVoiceForm.fields.issueDescription.placeholder",
						)}
						value={formData.issueDescription}
					/>
				)}
			</Field>

			<Field
				error={errorFor(
					missing,
					"workerVoiceForm.fields.workersAffected.label",
					t("workerVoiceForm.validation.required"),
				)}
				label={t("workerVoiceForm.fields.workersAffected.label")}
				required
			>
				{(controlId) => (
					<NumberInput
						controlId={controlId}
						invalid={missing.includes(
							"workerVoiceForm.fields.workersAffected.label",
						)}
						min={1}
						onChange={(value) => update("workersAffected", value)}
						placeholder="1"
						value={formData.workersAffected}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.situationImproving.label")}>
				{() => (
					<div className="flex flex-col gap-2">
						<ChoiceGroup
							name="situationImproving"
							onChange={(value) => update("situationImproving", value)}
							options={improvingOptions}
							value={formData.situationImproving}
						/>
						{formData.situationImproving === "Yes" && (
							<div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
								<Field
									label={t(
										"workerVoiceForm.fields.situationImprovingDescription.label",
									)}
								>
									{(detailId) => (
										<TextArea
											controlId={detailId}
											onChange={(value) =>
												update("situationImprovingDescription", value)
											}
											placeholder={t(
												"workerVoiceForm.fields.situationImprovingDescription.placeholder",
											)}
											rows={3}
											value={formData.situationImprovingDescription}
										/>
									)}
								</Field>
							</div>
						)}
					</div>
				)}
			</Field>

			{isIssueReport && (
				<Field label={t("workerVoiceForm.fields.issueCategories.label")}>
					{() => (
						<IssueCategoryKpiTabs
							onToggleKpi={toggleKpi}
							selectedKpis={formData.selectedKpis}
						/>
					)}
				</Field>
			)}
		</StepShell>
	);
};

export default Step4IssueDetails;
