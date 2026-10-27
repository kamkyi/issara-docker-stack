import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "$src/components/toast/toastUtil";
import {
	type CreateWorkerFeedbackPayload,
	createWorkerFeedback,
	fetchWorkerFeedbackById,
	updateWorkerFeedback,
	type WorkerFeedbackAttachment,
	type WorkerFeedbackRecord,
} from "$src/services/workerFeedbackService";
import type { AuthUser } from "$src/types/auth";
import { parseStoredJson } from "$src/utils/auth-utils";
import type { CaseCategory } from "../../../queries/caseCategories";
import type { ClientType } from "../../../queries/clientTypes";
import { useKPIs } from "../../../queries/kpis";
import type { Nationality } from "../../../queries/nationalities";
import type { User } from "../../../queries/users";
import { SuccessModal } from "../../modals/SuccessModal";
import {
	EmployeeFeedbackStep,
	EmployeeInfoStep,
	EmployeeSupportStep,
	InteractionInfoStep,
	RequiredStep,
} from "./FormSteps";
import { Stepper } from "./Stepper";

interface FormDataType {
	nationality?: Nationality;
	caseCategory?: CaseCategory;
	clientType?: ClientType;
	required?: string;
	staff?: User;
	interactionDate?: Date;
	caseCallType?: number | null;
	contactReasonId?: number;
	channel?: { id: number; name: string };
	summary?: string;
	clientName?: string;
	employeeId?: string;
	phoneNumber?: string;
	lineId?: string;
	whatsapp?: string;
	zalo?: string;
	gender?: { value: number | string; name: string };
	employeeDepartment?: string;
	feedbackDescription?: string;
	workersAffected?: number;
	workersAffectedDescription?: string;
	situationImproving?: string;
	situationImprovingDescription?: string;
	issueCategory?: number;
	selectedKpis?: Record<number, number[]>;
	case_status?: { id: number; name: string };
	next_steps?: string;
	next_steps_issara_staff?: User;
	dead_line_date?: Date | string;
	final_remarks?: string;
	risk_assessment?: string;
	safeguard_remarks?: string;
	additionalAttachments?: File[];
	existingAdditionalAttachments?: WorkerFeedbackAttachment[];
	interactionInfo?: string;
	employeeInfo?: string;
	employeeFeedback?: string;
	employeeSupport?: string;
	[key: string]: unknown;
}

interface StepperFormProps {
	editId?: number;
}

const formatDateToApi = (dateValue?: Date | string): string => {
	if (!dateValue) {
		return new Date().toISOString().slice(0, 10);
	}

	const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return new Date().toISOString().slice(0, 10);
	}

	return date.toISOString().slice(0, 10);
};

const getAuthUserContext = () => {
	const authUser = parseStoredJson<AuthUser>("auth_user");

	const hrStaffId = authUser?.id ? Number(authUser.id) : null;
	const supplierId = authUser?.supplier ? Number(authUser.supplier) : null;

	return {
		hrStaffId: Number.isFinite(hrStaffId) ? hrStaffId : null,
		supplierId: Number.isFinite(supplierId) ? supplierId : null,
	};
};

const getRelationId = (
	value?: number | string | { id?: number | string | null } | null,
) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : undefined;
	}

	if (typeof value === "string") {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) ? parsedValue : undefined;
	}

	if (value && typeof value === "object") {
		const parsedValue = Number(value.id);
		return Number.isFinite(parsedValue) ? parsedValue : undefined;
	}

	return undefined;
};

const toFormUser = (
	user?: WorkerFeedbackRecord["hr_staff"],
	fallbackId?: number | null,
) => {
	if (!user && !Number.isFinite(Number(fallbackId))) {
		return undefined;
	}

	return {
		id: user?.id ?? Number(fallbackId),
		username: user?.username || user?.email || user?.full_name || "",
		email: user?.email || "",
		first_name: user?.first_name || "",
		last_name: user?.last_name || "",
		groups: [],
		partner: null,
		supplier: null,
		organization: 0,
		is_active: true,
	} as User;
};

const mapFormDataToPayload = (
	formData: FormDataType,
): CreateWorkerFeedbackPayload => {
	const selectedKpis = formData.selectedKpis || {};
	const kpiCategories = Object.keys(selectedKpis)
		.map((categoryId) => Number(categoryId))
		.filter((categoryId) => Number.isFinite(categoryId));
	const selectedKpiValues = Object.values(selectedKpis).flat();
	const parsedWorkersAffected = Number(formData.workersAffected);
	const { hrStaffId, supplierId } = getAuthUserContext();

	return {
		nationality: formData.nationality?.id ?? null,
		case_call_type: formData.caseCallType ?? null,
		supplier: supplierId,
		worker_voice_channel: formData.channel?.id ?? null,
		interaction_date: formatDateToApi(formData.interactionDate),
		summary: formData.summary || "",
		client_name: formData.clientName || "",
		employee_id: formData.employeeId || "",
		phone_number: formData.phoneNumber || "",
		line_id: formData.lineId || "",
		whatsapp: formData.whatsapp || "",
		zalo: formData.zalo || "",
		gender: formData.gender?.value ?? null,
		employee_department: formData.employeeDepartment || "",
		feedback_description: formData.feedbackDescription || "",
		workers_affected: Number.isFinite(parsedWorkersAffected)
			? parsedWorkersAffected
			: null,
		workers_affected_description: formData.workersAffectedDescription || "",
		situation_improving: formData.situationImproving || "",
		situation_improving_description:
			formData.situationImprovingDescription || "",
		issue_categories: formData.issueCategory ? [formData.issueCategory] : [],
		kpi_categories: kpiCategories,
		selected_kpis: selectedKpiValues,
		case_status: formData.case_status?.id ?? null,
		next_steps: formData.next_steps || "",
		urgent_needs_of_employee: formData.risk_assessment || "",
		deadline: formatDateToApi(
			formData.dead_line_date || formData.interactionDate,
		),
		final_remarks: formData.final_remarks || "",
		safeguards_remarks: formData.safeguard_remarks || "",
		next_steps_for_company_staff_ids: formData.next_steps_issara_staff?.id
			? [formData.next_steps_issara_staff.id]
			: [],
		hr_staff_id:
			typeof formData.staff?.id === "number" ? formData.staff.id : hrStaffId,
		contact_reason_id: formData.contactReasonId ?? null,
	};
};

const mapWorkerFeedbackRecordToFormData = (
	record: WorkerFeedbackRecord,
	kpiCategoryById: Map<number, number>,
): FormDataType => {
	const selectedKpis = (record.selected_kpis || []).reduce<
		Record<number, number[]>
	>((accumulator, kpiId) => {
		const categoryId =
			kpiCategoryById.get(kpiId) || record.kpi_categories?.[0] || undefined;

		if (!categoryId) {
			return accumulator;
		}

		if (!accumulator[categoryId]) {
			accumulator[categoryId] = [];
		}

		accumulator[categoryId].push(kpiId);

		return accumulator;
	}, {});

	const nextStepsStaff = record.next_steps_for_company_staff?.[0];
	const contactReasonId = getRelationId(
		record.contact_reason as
			| number
			| string
			| { id?: number | string | null }
			| null
			| undefined,
	);

	return {
		nationality: record.nationality
			? ({ id: record.nationality } as Nationality)
			: undefined,
		caseCallType: contactReasonId ?? record.case_call_type ?? null,
		contactReasonId: contactReasonId ?? getRelationId(record.case_call_type),
		staff: toFormUser(record.hr_staff, record.hr_staff_id),
		interactionDate: record.interaction_date
			? new Date(record.interaction_date)
			: undefined,
		channel: record.worker_voice_channel
			? ({ id: Number(record.worker_voice_channel), name: "" } as {
					id: number;
					name: string;
				})
			: undefined,
		summary: record.summary || "",
		clientName: record.client_name || "",
		employeeId: record.employee_id || "",
		phoneNumber: record.phone_number || "",
		lineId: record.line_id || "",
		whatsapp: record.whatsapp || "",
		zalo: record.zalo || "",
		gender:
			record.gender != null ? { value: record.gender, name: "" } : undefined,
		employeeDepartment: record.employee_department || "",
		feedbackDescription: record.feedback_description || "",
		workersAffected: record.workers_affected ?? undefined,
		workersAffectedDescription: record.workers_affected_description || "",
		situationImproving: record.situation_improving || "",
		situationImprovingDescription: record.situation_improving_description || "",
		issueCategory: record.issue_categories?.[0],
		selectedKpis,
		case_status: record.case_status
			? ({ id: Number(record.case_status), name: "" } as {
					id: number;
					name: string;
				})
			: undefined,
		next_steps: record.next_steps || "",
		next_steps_issara_staff: toFormUser(nextStepsStaff),
		dead_line_date: record.deadline || undefined,
		final_remarks: record.final_remarks || "",
		risk_assessment: record.urgent_needs_of_employee || "",
		safeguard_remarks: record.safeguards_remarks || "",
		existingAdditionalAttachments: record.additional_attachments || [],
	};
};

export const StepperForm: React.FC<StepperFormProps> = ({ editId }) => {
	const { t } = useTranslation();
	const steps = [
		t("workerFeedbackForm.steps.keyData"),
		t("workerFeedbackForm.steps.caseSummary"),
		t("workerFeedbackForm.steps.employeeInfo"),
		t("workerFeedbackForm.steps.employeeFeedback"),
		t("workerFeedbackForm.steps.supportActions"),
	];

	const [currentStep, setCurrentStep] = useState(0);
	const [formData, setFormData] = useState<FormDataType>({});
	const [showModal, setShowModal] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const initializedEditRef = useRef<number | null>(null);
	const { data: kpis = [] } = useKPIs();
	const {
		data: editRecord,
		isLoading: isEditLoading,
		error: editError,
	} = useQuery({
		queryKey: ["workerFeedback", editId],
		queryFn: () => fetchWorkerFeedbackById(editId as number),
		enabled: Boolean(editId),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});

	useEffect(() => {
		if (!editId) {
			if (initializedEditRef.current !== null) {
				setFormData({});
				setCurrentStep(0);
			}
			initializedEditRef.current = null;
			return;
		}

		if (!editRecord || initializedEditRef.current === editId) {
			return;
		}

		if ((editRecord.selected_kpis?.length || 0) > 0 && kpis.length === 0) {
			return;
		}

		const kpiCategoryById = new Map(
			kpis.map((kpi) => [kpi.id, kpi.kpi_category.id]),
		);

		setFormData(mapWorkerFeedbackRecordToFormData(editRecord, kpiCategoryById));
		initializedEditRef.current = editId;
	}, [editId, editRecord, kpis]);

	const updateFormData = (data: Partial<FormDataType>) => {
		setFormData((prevData) => ({ ...prevData, ...data }));
	};

	// Validation for RequiredStep (Step 0)
	const getMissingRequiredFields = () => {
		const missing: string[] = [];
		if (!formData.nationality)
			missing.push(t("workerFeedbackForm.requiredFields.nationality"));
		if (formData.caseCallType == null)
			missing.push(t("workerFeedbackForm.requiredFields.caseCallType"));
		if (!formData.staff)
			missing.push(t("workerFeedbackForm.requiredFields.hrOfficer"));
		if (!formData.channel)
			missing.push(t("workerFeedbackForm.requiredFields.feedbackChannel"));
		if (!formData.interactionDate)
			missing.push(t("workerFeedbackForm.requiredFields.interactionDate"));
		return missing;
	};

	const isRequiredStepValid = () => getMissingRequiredFields().length === 0;

	const handleNext = () => {
		// If on RequiredStep (step 0), validate before proceeding
		if (currentStep === 0) {
			const missing = getMissingRequiredFields();
			if (missing.length > 0) {
				alert(
					t("workerFeedbackForm.validation.fillIn", {
						fields: missing.join(", "),
					}),
				);
				return;
			}
		}
		setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
	};

	const handleBack = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 0));
	};

	const handleStepChange = (step: number) => {
		// Only allow jumping to other steps if RequiredStep is valid
		if (step > 0 && !isRequiredStepValid()) {
			alert(t("workerFeedbackForm.validation.completeKeyData"));
			return;
		}
		setCurrentStep(step);
	};

	const handleSubmit = async () => {
		try {
			setIsSubmitting(true);
			const payload = mapFormDataToPayload(formData);

			if (editId) {
				await updateWorkerFeedback(
					editId,
					payload,
					formData.additionalAttachments,
				);
			} else {
				await createWorkerFeedback(payload, formData.additionalAttachments);
			}

			setShowModal(true);
			if (!editId) {
				setFormData({});
			}
		} catch (error) {
			console.error("Failed to submit worker feedback", error);
			showToast.error(
				t(
					editId
						? "workerFeedbackForm.feedback.updateError"
						: "workerFeedbackForm.feedback.submitError",
				),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCloseModal = () => {
		setShowModal(false);
		if (editId) {
			window.history.back();
			return;
		}
		// Reset to first step after modal is closed
		setCurrentStep(0);
	};

	if (editId && isEditLoading) {
		return (
			<div className="p-4 text-sm text-gray-500">
				{t("workerFeedbackForm.feedback.loading")}
			</div>
		);
	}

	if (editId && editError) {
		return (
			<div className="p-4 text-sm text-red-600">
				{t("workerFeedbackForm.feedback.editLoadError")}
			</div>
		);
	}

	const renderCurrentStep = () => {
		switch (currentStep) {
			case 0:
				return (
					<RequiredStep
						formData={formData}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 1:
				return (
					<InteractionInfoStep
						formData={formData}
						onBack={handleBack}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 2:
				return (
					<EmployeeInfoStep
						formData={formData}
						onBack={handleBack}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 3:
				return (
					<EmployeeFeedbackStep
						formData={formData}
						onBack={handleBack}
						onNext={handleNext}
						updateFormData={updateFormData}
					/>
				);
			case 4:
				return (
					<EmployeeSupportStep
						formData={formData}
						isSubmitting={isSubmitting}
						onBack={handleBack as () => void}
						onSubmit={handleSubmit}
						updateFormData={updateFormData}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="w-full mb-6">
			<Stepper
				currentStep={currentStep}
				onStepChange={handleStepChange}
				steps={steps}
			/>
			<div className="mt-6 w-full">{renderCurrentStep()}</div>

			<SuccessModal
				actionLabel={t("workerFeedbackForm.success.actionLabel")}
				isOpen={showModal}
				message={t(
					editId
						? "workerFeedbackForm.success.updatedMessage"
						: "workerFeedbackForm.success.submittedMessage",
				)}
				onClose={handleCloseModal}
				title={t("workerFeedbackForm.success.title")}
			/>
		</div>
	);
};
