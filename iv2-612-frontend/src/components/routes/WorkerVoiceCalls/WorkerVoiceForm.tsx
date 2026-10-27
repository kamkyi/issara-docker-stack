/**
 * The finalized five-step Worker Voice call entry form (IV2-582).
 *
 * A submitted form becomes a row in the ILM `cases` table via
 * `/cascade/worker-voice-calls/`, owned by the CSO organization of the
 * signed-in officer.
 */
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	PaperPlaneIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import { SuccessModal } from "$src/components/modals/SuccessModal";
import { showToast } from "$src/components/toast/toastUtil";
import { Stepper } from "$src/components/workerFeedback/stepperForm/Stepper";
import { useKPIs } from "$src/queries/kpis";
import {
	useSaveWorkerVoiceCase,
	useWorkerVoiceCase,
} from "$src/queries/workerVoiceCalls";
import { useWorkerVoiceDraftStore } from "$src/store/workerVoiceDraftStore";
import {
	EMPTY_FORM,
	firstIncompleteStepBefore,
	fromRecord,
	missingFieldsForStep,
	STEP_COUNT,
	toPayload,
	type WorkerVoiceFormData,
} from "./formModel";
import Step1KeyData from "./steps/Step1KeyData";
import Step2WorkerInfo from "./steps/Step2WorkerInfo";
import Step3RecruitmentInfo from "./steps/Step3RecruitmentInfo";
import Step4IssueDetails from "./steps/Step4IssueDetails";
import Step5SupportActions from "./steps/Step5SupportActions";

interface WorkerVoiceFormProps {
	/** Present when editing a call the organization already logged. */
	editId?: number;
}

const STEP_COMPONENTS = [
	Step1KeyData,
	Step2WorkerInfo,
	Step3RecruitmentInfo,
	Step4IssueDetails,
	Step5SupportActions,
];

const WorkerVoiceForm: React.FC<WorkerVoiceFormProps> = ({ editId }) => {
	const { t } = useTranslation();
	const { draft, setDraft, clearDraft } = useWorkerVoiceDraftStore();

	const [formData, setFormData] = useState<WorkerVoiceFormData>(() => ({
		...EMPTY_FORM,
		...(draft ?? {}),
	}));
	const [currentStep, setCurrentStep] = useState(0);
	const [missing, setMissing] = useState<string[]>([]);
	const [showSuccess, setShowSuccess] = useState(false);

	const { data: kpis } = useKPIs();
	const { data: existingCase, isLoading: isLoadingCase } =
		useWorkerVoiceCase(editId);
	const saveCase = useSaveWorkerVoiceCase();

	// `cases.kpis` is a flat list of KPI ids, but the tabs are keyed by
	// category, so rehydrating an edit needs the KPI -> category mapping.
	const kpiCategoryByKpiId = useMemo(() => {
		const mapping = new Map<number, number>();
		for (const kpi of Array.isArray(kpis) ? kpis : []) {
			if (kpi.kpi_category?.id) {
				mapping.set(kpi.id, kpi.kpi_category.id);
			}
		}
		return mapping;
	}, [kpis]);

	useEffect(() => {
		if (existingCase && kpiCategoryByKpiId.size > 0) {
			setFormData(fromRecord(existingCase, kpiCategoryByKpiId));
		}
	}, [existingCase, kpiCategoryByKpiId]);

	// Keep the in-memory draft current so navigating away and back mid-call
	// does not lose what the officer has already typed.
	useEffect(() => {
		if (!editId) {
			setDraft(formData);
		}
	}, [formData, editId, setDraft]);

	const update = <K extends keyof WorkerVoiceFormData>(
		field: K,
		value: WorkerVoiceFormData[K],
	) => {
		setFormData((previous) => ({ ...previous, [field]: value }));
		setMissing([]);
	};

	const goToStep = (target: number) => {
		// Back is always free; forward is gated on the steps in between, so the
		// officer can never reach Submit with required fields unanswered.
		if (target <= currentStep) {
			setMissing([]);
			setCurrentStep(target);
			return;
		}

		const blockingStep = firstIncompleteStepBefore(formData, target);
		if (blockingStep !== null) {
			const blockingFields = missingFieldsForStep(formData, blockingStep);
			setMissing(blockingFields);
			setCurrentStep(blockingStep);
			showToast.error(
				t("workerVoiceForm.validation.completeBeforeContinuing", {
					fields: blockingFields.map((key) => t(key)).join(", "),
				}),
			);
			return;
		}

		setMissing([]);
		setCurrentStep(target);
	};

	const handleSubmit = async () => {
		const blockingStep = firstIncompleteStepBefore(formData, STEP_COUNT);
		if (blockingStep !== null) {
			goToStep(blockingStep + 1);
			return;
		}

		try {
			await saveCase.mutateAsync({
				payload: toPayload(formData),
				attachments: formData.attachments,
				removedAttachmentIds: formData.removedAttachmentIds,
				id: editId,
			});
			setShowSuccess(true);
			if (!editId) {
				clearDraft();
			}
		} catch (error) {
			console.error("Failed to save worker voice call", error);
			showToast.error(
				t(
					editId
						? "workerVoiceForm.feedback.updateError"
						: "workerVoiceForm.feedback.submitError",
				),
			);
		}
	};

	const handleCloseSuccess = () => {
		setShowSuccess(false);
		if (editId) {
			window.history.back();
			return;
		}
		setFormData({ ...EMPTY_FORM });
		setCurrentStep(0);
	};

	if (editId && isLoadingCase) {
		return (
			<p className="p-4 text-sm text-gray-500">
				{t("workerVoiceForm.feedback.loading")}
			</p>
		);
	}

	const CurrentStep = STEP_COMPONENTS[currentStep];
	const isLastStep = currentStep === STEP_COUNT - 1;

	const stepLabels = [
		t("workerVoiceForm.steps.keyData"),
		t("workerVoiceForm.steps.workerInfo"),
		t("workerVoiceForm.steps.recruitmentInfo"),
		t("workerVoiceForm.steps.issueDetails"),
		t("workerVoiceForm.steps.supportActions"),
	];

	return (
		<div className="worker-voice-form mb-6 w-full">
			<Stepper
				currentStep={currentStep}
				onStepChange={goToStep}
				steps={stepLabels}
			/>

			<div className="mt-6 w-full">
				<CurrentStep formData={formData} missing={missing} update={update} />
			</div>

			<div className="mt-6 flex items-center justify-between">
				{currentStep > 0 ? (
					<CascadeButton
						buttonText={t("workerVoiceForm.actions.back")}
						handleOnClick={() => goToStep(currentStep - 1)}
						iconLeft={<ArrowLeftIcon />}
						size="4"
						variant="outline"
					/>
				) : (
					<span />
				)}

				{isLastStep ? (
					<CascadeButton
						buttonText={
							saveCase.isPending
								? t("workerVoiceForm.actions.submitting")
								: t("workerVoiceForm.actions.submit")
						}
						disabled={saveCase.isPending}
						handleOnClick={handleSubmit}
						iconLeft={<PaperPlaneIcon />}
						size="4"
					/>
				) : (
					<CascadeButton
						buttonText={t("workerVoiceForm.actions.next")}
						handleOnClick={() => goToStep(currentStep + 1)}
						iconRight={<ArrowRightIcon />}
						size="4"
					/>
				)}
			</div>

			<SuccessModal
				actionLabel={t("workerVoiceForm.success.actionLabel")}
				isOpen={showSuccess}
				message={t(
					editId
						? "workerVoiceForm.success.updatedMessage"
						: "workerVoiceForm.success.submittedMessage",
				)}
				onClose={handleCloseSuccess}
				title={t("workerVoiceForm.success.title")}
			/>
		</div>
	);
};

export default WorkerVoiceForm;
