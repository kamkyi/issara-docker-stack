import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import axios from "axios";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect, useState } from "react";
import {
	saveAndPublishPoll,
	savePollDraft,
	updatePoll,
} from "$src/services/pollManagementService";
import { getUserIdentifiers } from "$utils/getUserIdentifiers";
import { Stepper } from "../workerFeedback/stepperForm/Stepper";
import {
	BasicInfoStep,
	getDefaultAnswerOptions,
	type PollFormData,
	QuestionStep,
	ReviewStep,
	TargetGroupStep,
} from "./pollSteps";
import { SuccessModal } from "./SuccessModal";

interface CreatePollStepperModalProps {
	open: boolean;
	onClose: () => void;
	initialData?: Partial<PollFormData>;
	pollId?: number | string | null;
	useMockMode?: boolean;
}

const CreatePollStepperModal: React.FC<CreatePollStepperModalProps> = ({
	open,
	onClose,
	initialData,
	pollId,
	useMockMode = false,
}) => {
	const steps = ["Basic Info", "Target Group", "Question", "Review"];
	const userIdentifiers = getUserIdentifiers();
	const pollTargetContext = userIdentifiers.supplierId
		? {
				targetId: userIdentifiers.supplierId,
				targetType: "supplier" as const,
			}
		: null;

	const [currentStep, setCurrentStep] = useState(0);
	const [statusModal, setStatusModal] = useState<{
		open: boolean;
		variant: "success" | "error";
		title: string;
		message: string;
		actionLabel: string;
	}>({
		open: false,
		variant: "success",
		title: "",
		message: "",
		actionLabel: "OK",
	});
	const [formData, setFormData] = useState<PollFormData>({
		title: "",
		description: "",
		isScheduled: false,
		startDate: "",
		endDate: "",
		targetGroup: "",
		selectedGenders: [],
		selectedNationalities: [],
		ageRange: [18, 65],
		question: "",
		inputType: "single",
		answerOptions: getDefaultAnswerOptions("single"),
	});

	useEffect(() => {
		if (open) {
			setCurrentStep(0);
			setFormData({
				title: "",
				description: "",
				isScheduled: false,
				startDate: "",
				endDate: "",
				targetGroup: "",
				selectedGenders: [],
				selectedNationalities: [],
				ageRange: [18, 65],
				question: "",
				inputType: "single",
				answerOptions: getDefaultAnswerOptions("single"),
				...(initialData ?? {}),
			});
		}
	}, [open]);

	const updateFormData = (data: Partial<PollFormData>) => {
		setFormData((prevData) => ({ ...prevData, ...data }));
	};

	const handleNext = () => {
		setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
	};

	const handleBack = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	const handleStepChange = (step: number) => {
		setCurrentStep(step);
	};

	const resetFormState = () => {
		setFormData({
			title: "",
			description: "",
			isScheduled: false,
			startDate: "",
			endDate: "",
			targetGroup: "",
			selectedGenders: [],
			selectedNationalities: [],
			ageRange: [18, 65],
			question: "",
			inputType: "single",
			answerOptions: getDefaultAnswerOptions("single"),
		});
		setCurrentStep(0);
	};

	const openCreatePollSuccessModal = () => {
		setStatusModal({
			open: true,
			variant: "success",
			title: "Poll Created",
			message:
				"Your poll has been created successfully and is now available to participants.",
			actionLabel: "Continue",
		});
	};

	const openSaveDraftSuccessModal = () => {
		setStatusModal({
			open: true,
			variant: "success",
			title: "Draft Saved",
			message: "Your poll draft has been saved successfully.",
			actionLabel: "Continue",
		});
	};

	const openCreatePollErrorModal = (message: string) => {
		setStatusModal({
			open: true,
			variant: "error",
			title: "Poll Creation Failed",
			message,
			actionLabel: "Close",
		});
	};

	const handleCloseStatusModal = () => {
		const wasSuccess = statusModal.variant === "success";
		setStatusModal((prev) => ({ ...prev, open: false }));
		if (wasSuccess) {
			resetFormState();
			onClose();
		}
	};

	const handleSaveDraft = async () => {
		if (useMockMode) {
			openSaveDraftSuccessModal();
			return;
		}

		try {
			const response = pollId
				? await updatePoll(pollId, formData, "draft", pollTargetContext)
				: await savePollDraft(formData, pollTargetContext);
			if (response.status === 201 || response.status === 200) {
				onClose();
				return;
			}
			openCreatePollErrorModal(
				`Unable to save draft right now. The server returned status ${response.status}. Please try again.`,
			);
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 500) {
				openCreatePollErrorModal(
					"Internal server error while saving draft. Please contact the development team.",
				);
				return;
			}
			openCreatePollErrorModal(
				"Unable to save draft. Please try again. If the issue persists, please contact the development team.",
			);
		}
	};

	const handleSaveAndPublishPost = async () => {
		if (useMockMode) {
			openCreatePollSuccessModal();
			return;
		}

		try {
			const response = pollId
				? await updatePoll(pollId, formData, "published", pollTargetContext)
				: await saveAndPublishPoll(formData, pollTargetContext);
			if (response.status === 201 || response.status === 200) {
				openCreatePollSuccessModal();
				return;
			}
			openCreatePollErrorModal(
				`Unable to create the poll right now. The server returned status ${response.status}. Please try again, and contact the development team if this continues.`,
			);
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 500) {
				openCreatePollErrorModal(
					"Internal server error while creating the poll. Please contact the development team.",
				);
				return;
			}
			openCreatePollErrorModal(
				"Unable to create the poll. Please try again. If the issue persists, please contact the development team.",
			);
		}
	};

	const handleCancel = () => {
		resetFormState();
		onClose();
	};

	const renderCurrentStep = () => {
		switch (currentStep) {
			case 0:
				return (
					<BasicInfoStep
						formData={formData}
						onCancel={handleCancel}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 1:
				return (
					<TargetGroupStep
						formData={formData}
						onBack={handleBack}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 2:
				return (
					<QuestionStep
						formData={formData}
						onBack={handleBack}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 3:
				return (
					<ReviewStep
						formData={formData}
						onBack={handleBack}
						onSaveAndPublishPost={handleSaveAndPublishPost}
						onSaveDraft={handleSaveDraft}
					/>
				);
			default:
				return null;
		}
	};

	const { theme } = useTheme();

	return (
		<Dialog.Root onOpenChange={onClose} open={open}>
			<Dialog.Content
				className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-x-hidden overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-3rem)] sm:p-6"
				style={{
					background: theme === "dark" ? "#004A60" : "#fff",
				}}
			>
				<Flex align="start" className="mb-4 sm:mb-6" justify="between">
					<Dialog.Title className="mb-0 text-xl font-bold sm:text-2xl">
						{pollId ? "Edit Poll" : "Create New Poll"}
					</Dialog.Title>
					<Dialog.Close>
						<Button
							className="rounded-full"
							onClick={onClose}
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>

				<div className="mb-5 overflow-x-auto pb-1 sm:mb-8">
					<Stepper
						currentStep={currentStep}
						onStepChange={handleStepChange}
						steps={steps}
					/>
				</div>

				<div className="min-h-[320px] sm:min-h-[360px]">
					{renderCurrentStep()}
				</div>
			</Dialog.Content>
			<SuccessModal
				actionLabel={statusModal.actionLabel}
				isOpen={statusModal.open}
				message={statusModal.message}
				onClose={handleCloseStatusModal}
				title={statusModal.title}
				variant={statusModal.variant}
			/>
		</Dialog.Root>
	);
};

export default CreatePollStepperModal;
