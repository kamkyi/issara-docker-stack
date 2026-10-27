import { Card, Flex, Text } from "@radix-ui/themes";
import type React from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { CaseCategory } from "../../../queries/caseCategories";
import type { ClientType } from "../../../queries/clientTypes";
import type { InteractionChannel } from "../../../queries/interactionChannels";
import { useInteractionChannels } from "../../../queries/interactionChannels";
import type { InteractionReason } from "../../../queries/interactionReasons";
import type { Nationality } from "../../../queries/nationalities";
import type { User } from "../../../queries/users";
import CaseCallTypeDropdown from "../../dropdowns/CaseCallTypeDropdown";
import CaseStatusesDropdown from "../../dropdowns/CaseStatusesDropdown";
import GenderDropdown from "../../dropdowns/GenderDropdown";
import MockHRStaffDropdown, {
	type HrDropdownUser,
} from "../../dropdowns/MockHRStaffDropdown";
import NationalitiesDropdown from "../../dropdowns/NationalitiesDropdown";
import WorkerVoiceChannelDropdown from "../../dropdowns/WorkerVoiceChannelDropdown";
import AppDatePicker from "../../inputs/AppDatePicker";
import KPISelector from "../../selectors/KPISelector";
import "./FormSteps.css";

import {
	ArrowLeftIcon,
	ArrowRightIcon,
	PaperPlaneIcon,
} from "@radix-ui/react-icons";

import CascadeButton from "$src/components/button/button";
import type { WorkerContactReason } from "$src/services/workerContactReasonsService";
import type { WorkerFeedbackAttachment } from "$src/services/workerFeedbackService";

interface FormDataType {
	nationality?: Nationality;
	caseCategory?: CaseCategory;
	clientType?: ClientType;
	required?: string;
	staff?: User;
	interactionInfo?: string;
	summary?: string;
	interactionDate?: Date;
	clientName?: string;
	employeeId?: string;
	phoneNumber?: string;
	lineId?: string;
	whatsapp?: string;
	zalo?: string;
	gender?: { value: number | string; name: string };
	employeeInfo?: string;
	employeeFeedback?: string;
	feedbackDescription?: string;
	workersAffected?: number;
	workersAffectedDescription?: string;
	situationImproving?: string;
	situationImprovingDescription?: string;
	feedbackLinks?: string[];
	employeeSupport?: string;
	channel?: InteractionChannel;
	interactionReason?: InteractionReason;
	selectedKpis?: Record<number, number[]>;
	issueCategory?: number;
	vot_needs?: string;
	client_share_info_consent?: string;
	case_status?: { id: number; name: string };
	referral_action?: { id: number; name: string };
	refer_to_org?: { id: number; name: string };
	referral_notes?: string;
	next_steps?: string;
	next_steps_issara_staff?: User;
	dead_line_date?: Date | string;
	final_remarks?: string;
	risk_assessment?: string;
	other_services_support?: string;
	caseCallType?: number | null;
	contactReasonId?: number;
	employeeDepartment?: string;
	clientInformation?: string;
	mockHRStaff?: string;
	safeguard_remarks?: string;
	additionalAttachments?: File[];
	existingAdditionalAttachments?: WorkerFeedbackAttachment[];
	[key: string]: unknown;
}

interface StepProps {
	formData: FormDataType;
	updateFormData: (data: Partial<FormDataType>) => void;
	onNext?: () => void;
	onBack?: () => void;
	onSubmit?: () => Promise<void> | void;
	isFormValid?: () => boolean;
	isSubmitting?: boolean;
}

const toFormUser = (user: HrDropdownUser | null): User | undefined => {
	if (!user) {
		return undefined;
	}

	return {
		id: user.id,
		username: user.username,
		email: user.email,
		first_name: user.first_name,
		last_name: user.last_name,
		groups: [],
		partner: null,
		supplier: null,
		organization: 0,
		is_active: true,
	};
};

const toDropdownUser = (user?: User): HrDropdownUser | undefined => {
	if (!user || typeof user.id !== "number") {
		return undefined;
	}

	const fullName = [user.first_name, user.last_name]
		.filter(Boolean)
		.join(" ")
		.trim();

	return {
		id: user.id,
		username: user.username || user.email || fullName,
		first_name: user.first_name || "",
		last_name: user.last_name || "",
		full_name: fullName || user.username || user.email || "",
		email: user.email || "",
	};
};

const formatAttachmentSize = (size?: string) => {
	if (!size) {
		return "";
	}

	const parsedSize = Number(size);
	if (!Number.isFinite(parsedSize) || parsedSize <= 0) {
		return size;
	}

	if (parsedSize >= 1024 * 1024) {
		return `${(parsedSize / (1024 * 1024)).toFixed(1)} MB`;
	}

	if (parsedSize >= 1024) {
		return `${Math.round(parsedSize / 1024)} KB`;
	}

	return `${parsedSize} B`;
};

const AttachmentUploadField: React.FC<{
	existingAttachments?: WorkerFeedbackAttachment[];
	files?: File[];
	onChange: (files: File[]) => void;
}> = ({ existingAttachments = [], files = [], onChange }) => {
	const inputId = useId();
	const { t } = useTranslation();

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const nextFiles = Array.from(event.target.files || []);
		if (!nextFiles.length) {
			return;
		}

		onChange([...files, ...nextFiles]);
		event.target.value = "";
	};

	const removeFile = (index: number) => {
		onChange(files.filter((_, fileIndex) => fileIndex !== index));
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<label className="text-sm font-bold" htmlFor={inputId}>
					{t("workerFeedbackForm.attachments.label")}
				</label>
				<p className="text-sm text-gray-500">
					{t("workerFeedbackForm.attachments.description")}
				</p>
				<p className="text-xs text-gray-500">
					{t("workerFeedbackForm.attachments.supportedFormats")}
				</p>
			</div>

			<label
				className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition-colors duration-200 hover:border-[#148696] hover:bg-[#148696]/5"
				htmlFor={inputId}
			>
				<span className="text-sm font-medium text-gray-700">
					{t("workerFeedbackForm.attachments.clickToUpload")}
				</span>
				<span className="mt-1 text-xs text-gray-500">
					{t("workerFeedbackForm.attachments.uploadHint")}
				</span>
			</label>
			<input
				accept=".pdf,.png,.jpg,.jpeg"
				className="hidden"
				id={inputId}
				multiple
				onChange={handleFileChange}
				type="file"
			/>

			{existingAttachments.length > 0 && (
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-gray-700">
						{t("workerFeedbackForm.attachments.existing")}
					</p>
					<div className="flex flex-col gap-2">
						{existingAttachments.map((attachment) => {
							const size = formatAttachmentSize(attachment.size);
							return (
								<div
									className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
									key={attachment.id}
								>
									{attachment.name}
									{size ? ` (${size})` : ""}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{files.length > 0 && (
				<div className="flex flex-col gap-2">
					<p className="text-sm font-medium text-gray-700">
						{t("workerFeedbackForm.attachments.new")}
					</p>
					<div className="flex flex-col gap-2">
						{files.map((file, index) => (
							<div
								className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
								key={`${file.name}-${file.size}-${index}`}
							>
								<span className="truncate pr-3">
									{file.name} ({formatAttachmentSize(String(file.size))})
								</span>
								<button
									className="text-[#148696] transition-opacity duration-200 hover:opacity-70"
									onClick={() => removeFile(index)}
									type="button"
								>
									{t("workerFeedbackForm.attachments.remove")}
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export const RequiredStep: React.FC<StepProps> = ({
	formData,
	updateFormData,
	onNext,
}) => {
	const { t } = useTranslation();
	const { data: interactionChannelsData } = useInteractionChannels();

	const handleNationalitySelect = (nationality: Nationality | null) => {
		updateFormData({
			...formData,
			nationality: nationality || undefined,
		});
	};

	const handleCaseCallTypeSelect = (type: WorkerContactReason | null) => {
		const rawId = type?.id;
		const numericId =
			rawId === undefined || rawId === null ? null : Number(rawId);
		updateFormData({
			...formData,
			caseCallType: numericId,
			contactReasonId: rawId ?? undefined,
		});
	};

	const handleMockHRStaffSelect = (user: HrDropdownUser | null) => {
		updateFormData({
			staff: toFormUser(user),
		});
	};

	const handleChannelSelect = (channel: InteractionChannel | null) => {
		updateFormData({
			channel: channel || undefined,
		});
	};

	const workerVoiceChannelOptions = interactionChannelsData?.results ?? [];

	const handleDateChange = (date: Date | null) => {
		updateFormData({ interactionDate: date || undefined });
	};

	const handleNext = () => {
		onNext?.();
	};

	return (
		<Card className="p-4">
			<Text className="mb-4" size="5" weight="bold">
				{t("workerFeedbackForm.requiredStep.title")}
			</Text>
			<Text className="mb-4" color="red" size="2">
				{t("workerFeedbackForm.requiredStep.allFieldsRequired")}
			</Text>
			<Flex direction="column" gap="3">
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="nationality">
						{t("workerFeedbackForm.requiredStep.labels.nationality")}{" "}
						<span style={{ color: "red" }}>*</span>
					</label>
					<NationalitiesDropdown
						className="w-full"
						defaultValue={
							typeof formData.nationality?.id === "number"
								? formData.nationality.id
								: undefined
						}
						onSelect={handleNationalitySelect}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.nationality",
						)}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="caseCallType">
						{t("workerFeedbackForm.requiredStep.labels.caseCallType")}{" "}
						<span style={{ color: "red" }}>*</span>
					</label>
					<CaseCallTypeDropdown
						className="w-full"
						defaultValue={formData.contactReasonId}
						onSelect={handleCaseCallTypeSelect}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.caseCallType",
						)}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="staff">
						{t("workerFeedbackForm.requiredStep.labels.staff")}{" "}
						<span style={{ color: "red" }}>*</span>
					</label>
					<MockHRStaffDropdown
						className="w-full"
						defaultUser={toDropdownUser(formData.staff)}
						defaultUserId={
							typeof formData.staff?.id === "number"
								? formData.staff.id
								: undefined
						}
						onSelect={handleMockHRStaffSelect}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.staff",
						)}
						source="supplier-hr"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="channel">
						{t("workerFeedbackForm.requiredStep.labels.channel")}{" "}
						<span style={{ color: "red" }}>*</span>
					</label>
					<WorkerVoiceChannelDropdown
						className="w-full"
						defaultValue={
							typeof formData.channel?.id === "number"
								? formData.channel.id
								: undefined
						}
						offlineOnly={true}
						onSelect={handleChannelSelect}
						options={workerVoiceChannelOptions}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.channel",
						)}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="interactionDate">
						{t("workerFeedbackForm.requiredStep.labels.interactionDate")}{" "}
						<span style={{ color: "red" }}>*</span>
					</label>
					<AppDatePicker
						calendarClassName="cascade-datepicker"
						className="form-input"
						dropdownMode="select"
						id={"interactionDate"}
						onChange={handleDateChange}
						placeholderText={t(
							"workerFeedbackForm.requiredStep.placeholders.interactionDate",
						)}
						selected={formData.interactionDate}
						showMonthDropdown={true}
						showYearDropdown={true}
					/>
				</div>
				<Flex justify="end">
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.next")}
						className="next-button"
						handleOnClick={handleNext}
						iconRight={<ArrowRightIcon />}
						size="4"
					/>
				</Flex>
			</Flex>
		</Card>
	);
};

export const InteractionInfoStep: React.FC<StepProps> = ({
	formData,
	updateFormData,
	onNext,
	onBack,
}) => {
	const { t } = useTranslation();
	const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		updateFormData({ summary: e.target.value });
	};

	return (
		<Card className="p-4">
			<Text className="mb-4" size="5" weight="bold">
				{t("workerFeedbackForm.caseSummaryStep.title")}
			</Text>
			<Flex direction="column" gap="3">
				<div className="flex flex-col gap-2">
					{/* <label className="text-sm font-bold" htmlFor="summary">
						Summary of Worker Feedback
					</label> */}
					<textarea
						className="form-textarea"
						id={"summary"}
						onChange={handleSummaryChange}
						placeholder={t(
							"workerFeedbackForm.caseSummaryStep.placeholders.summary",
						)}
						rows={4}
						value={formData.summary || ""}
					/>
				</div>

				<Flex justify="between">
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.back")}
						handleOnClick={onBack as () => void}
						iconLeft={<ArrowLeftIcon />}
						size="4"
						variant="outline"
					/>
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.next")}
						handleOnClick={onNext as () => void}
						iconRight={<ArrowRightIcon />}
						size="4"
					/>
				</Flex>
			</Flex>
		</Card>
	);
};

export const EmployeeInfoStep: React.FC<StepProps> = ({
	formData,
	updateFormData,
	onNext,
	onBack,
}) => {
	const { t } = useTranslation();
	const handleGenderSelect = (
		gender: { value: number | string; name: string } | null,
	) => {
		updateFormData({
			gender: gender || undefined,
		});
	};

	const handleTextChange =
		(field: string) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			updateFormData({ [field]: e.target.value });
		};

	return (
		<Card className="p-4">
			<Text className="mb-3" size="5" weight="bold">
				{t("workerFeedbackForm.employeeInfoStep.title")}
			</Text>
			<Flex direction="column" gap="3">
				<textarea
					className="form-textarea mb-3"
					id={"clientInformation"}
					onChange={handleTextChange("clientInformation")}
					placeholder={t(
						"workerFeedbackForm.employeeInfoStep.placeholders.clientInformation",
					)}
					rows={4}
					style={{ minHeight: 80 }}
					value={formData.clientInformation || ""}
				/>
				<div className="form-grid gap-3 mb-3">
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="clientName">
							{t("workerFeedbackForm.employeeInfoStep.labels.clientName")}
						</label>
						<input
							className="form-input"
							id={"clientName"}
							onChange={handleTextChange("clientName")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.clientName",
							)}
							type="text"
							value={formData.clientName || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label
							className="text-sm font-bold mb-0_5"
							htmlFor="employeeDepartment"
						>
							{t(
								"workerFeedbackForm.employeeInfoStep.labels.employeeDepartment",
							)}
						</label>
						<input
							className="form-input"
							id={"employeeDepartment"}
							onChange={handleTextChange("employeeDepartment")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.employeeDepartment",
							)}
							type="text"
							value={formData.employeeDepartment || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="employeeId">
							{t("workerFeedbackForm.employeeInfoStep.labels.employeeId")}
						</label>
						<input
							className="form-input"
							id={"employeeId"}
							onChange={handleTextChange("employeeId")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.employeeId",
							)}
							type="text"
							value={formData.employeeId || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="phoneNumber">
							{t("workerFeedbackForm.employeeInfoStep.labels.phoneNumber")}
						</label>
						<input
							className="form-input"
							id={"phoneNumber"}
							onChange={handleTextChange("phoneNumber")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.phoneNumber",
							)}
							type="tel"
							value={formData.phoneNumber || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="gender">
							{t("workerFeedbackForm.employeeInfoStep.labels.gender")}
						</label>
						<GenderDropdown
							className="w-full"
							defaultValue={
								typeof formData.gender?.value === "number"
									? formData.gender.value
									: undefined
							}
							onSelect={handleGenderSelect}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.gender",
							)}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="lineId">
							{t("workerFeedbackForm.employeeInfoStep.labels.lineId")}
						</label>
						<input
							className="form-input"
							id={"lineId"}
							onChange={handleTextChange("lineId")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.lineId",
							)}
							type="text"
							value={formData.lineId || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="whatsapp">
							WhatsApp
						</label>
						<input
							className="form-input"
							id={"whatsapp"}
							onChange={handleTextChange("whatsapp")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.whatsapp",
							)}
							type="text"
							value={formData.whatsapp || ""}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-sm font-bold mb-0_5" htmlFor="zalo">
							Zalo
						</label>
						<input
							className="form-input"
							id={"zalo"}
							onChange={handleTextChange("zalo")}
							placeholder={t(
								"workerFeedbackForm.employeeInfoStep.placeholders.zalo",
							)}
							type="text"
							value={formData.zalo || ""}
						/>
					</div>
				</div>
				<Flex className="mt-4" justify="between">
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.back")}
						handleOnClick={onBack as () => void}
						iconLeft={<ArrowLeftIcon />}
						size="4"
						variant="outline"
					/>
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.next")}
						handleOnClick={onNext as () => void}
						iconRight={<ArrowRightIcon />}
						size="4"
					/>
				</Flex>
			</Flex>
		</Card>
	);
};

export const EmployeeFeedbackStep: React.FC<StepProps> = ({
	formData,
	updateFormData,
	onNext,
	onBack,
}) => {
	const { t } = useTranslation();
	const handleChange =
		(field: string) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			updateFormData({ [field]: e.target.value });
		};

	// const addLink = () => {
	// 	const currentLinks = formData.feedbackLinks || [""];
	// 	updateFormData({ feedbackLinks: [...currentLinks, ""] });
	// };

	// const removeLink = (index: number) => {
	// 	if (formData.feedbackLinks && Array.isArray(formData.feedbackLinks)) {
	// 		const updatedLinks = [...formData.feedbackLinks];
	// 		updatedLinks.splice(index, 1);
	// 		updateFormData({ feedbackLinks: updatedLinks });
	// 	}
	// };

	// const handleLinkChange =
	// 	(index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
	// 		if (formData.feedbackLinks && Array.isArray(formData.feedbackLinks)) {
	// 			const updatedLinks = [...formData.feedbackLinks];
	// 			updatedLinks[index] = e.target.value;
	// 			updateFormData({ feedbackLinks: updatedLinks });
	// 		}
	// 	};

	const handleSelectKpi = (categoryId: number, kpiId: number) => {
		const currentSelectedKpis = formData.selectedKpis || {};
		const currentCategoryKpis = currentSelectedKpis[categoryId] || [];

		let updatedCategoryKpis: number[];

		if (currentCategoryKpis.includes(kpiId)) {
			updatedCategoryKpis = currentCategoryKpis.filter((id) => id !== kpiId);
		} else {
			updatedCategoryKpis = [...currentCategoryKpis, kpiId];
		}

		updateFormData({
			selectedKpis: {
				...currentSelectedKpis,
				[categoryId]: updatedCategoryKpis,
			},
		});
	};

	const handleSelectIssueCategory = (categoryId: number) => {
		updateFormData({ issueCategory: categoryId });
	};

	return (
		<Card className="p-4">
			<Text className="mb-4" size="5" weight="bold">
				{t("workerFeedbackForm.employeeFeedbackStep.title")}
			</Text>
			<Flex direction="column" gap="3">
				{/* <div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="employeeFeedback">
						Employee Feedback Summary
					</label>
					<input
						className="form-input"
						id={"employeeFeedback"}
						onChange={handleChange("employeeFeedback")}
						placeholder="Enter brief feedback summary"
						type="text"
						value={formData.employeeFeedback || ""}
					/>
				</div> */}

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="feedbackDescription">
						{t(
							"workerFeedbackForm.employeeFeedbackStep.labels.feedbackDescription",
						)}
					</label>
					<textarea
						className="form-textarea"
						id={"feedbackDescription"}
						onChange={handleChange("feedbackDescription")}
						placeholder={t(
							"workerFeedbackForm.employeeFeedbackStep.placeholders.feedbackDescription",
						)}
						rows={4}
						value={formData.feedbackDescription || ""}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="workersAffected">
						{t(
							"workerFeedbackForm.employeeFeedbackStep.labels.workersAffected",
						)}
					</label>
					<input
						className="form-input"
						id={"workersAffected"}
						min="0"
						onChange={handleChange("workersAffected")}
						placeholder={t(
							"workerFeedbackForm.employeeFeedbackStep.placeholders.workersAffected",
						)}
						type="number"
						value={formData.workersAffected || ""}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label
						className="text-sm font-bold"
						htmlFor="workersAffectedDescription"
					>
						{t(
							"workerFeedbackForm.employeeFeedbackStep.labels.workersAffectedDescription",
						)}
					</label>
					<textarea
						className="form-textarea"
						id={"workersAffectedDescription"}
						onChange={handleChange("workersAffectedDescription")}
						placeholder={t(
							"workerFeedbackForm.employeeFeedbackStep.placeholders.workersAffectedDescription",
						)}
						rows={3}
						value={formData.workersAffectedDescription || ""}
					/>
				</div>

				<div className="flex flex-col gap-3 mt-2">
					<p className="text-sm font-bold">
						{t(
							"workerFeedbackForm.employeeFeedbackStep.labels.situationImproving",
						)}
					</p>
					<div className="flex gap-4">
						<div className="flex items-center">
							<input
								checked={formData.situationImproving === "yes"}
								className="mr-2"
								id={"situationImproving-yes"}
								name="situationImproving"
								onChange={() => updateFormData({ situationImproving: "yes" })}
								type="radio"
								value="yes"
							/>
							<label htmlFor="situationImproving-yes">
								{t("workerFeedbackForm.employeeFeedbackStep.options.yes")}
							</label>
						</div>

						<div className="flex items-center">
							<input
								checked={formData.situationImproving === "no"}
								className="mr-2"
								id={"situationImproving-no"}
								name="situationImproving"
								onChange={() => updateFormData({ situationImproving: "no" })}
								type="radio"
								value="no"
							/>
							<label htmlFor="situationImproving-no">
								{t("workerFeedbackForm.employeeFeedbackStep.options.no")}
							</label>
						</div>

						<div className="flex items-center">
							<input
								checked={formData.situationImproving === "same"}
								className="mr-2"
								id={"situationImproving-same"}
								name="situationImproving"
								onChange={() => updateFormData({ situationImproving: "same" })}
								type="radio"
								value="same"
							/>
							<label htmlFor="situationImproving-same">
								{t("workerFeedbackForm.employeeFeedbackStep.options.unknown")}
							</label>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<label
						className="text-sm font-bold"
						htmlFor="situationImprovingDescription"
					>
						{t(
							"workerFeedbackForm.employeeFeedbackStep.labels.situationImprovingDescription",
						)}
					</label>
					<textarea
						className="form-textarea"
						id={"situationImprovingDescription"}
						onChange={handleChange("situationImprovingDescription")}
						placeholder={t(
							"workerFeedbackForm.employeeFeedbackStep.placeholders.situationImprovingDescription",
						)}
						rows={3}
						value={formData.situationImprovingDescription || ""}
					/>
				</div>

				{/* <div className="flex flex-col gap-2 mt-2">
					<p className="text-sm font-bold">Feedback Links</p>

					{formData.feedbackLinks &&
						Array.isArray(formData.feedbackLinks) &&
						formData.feedbackLinks.map((link, index) => (
							<div className="flex items-center gap-2" key={index}>
								<input
									className="form-input flex-grow"
									onChange={handleLinkChange(index)}
									placeholder="Enter feedback link here"
									type="text"
									value={link}
								/>
								{formData.feedbackLinks &&
									formData.feedbackLinks.length > 1 && (
										<button
											aria-label="Remove link"
											className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
											onClick={() => removeLink(index)}
											type="button"
										>
											<svg
												fill="none"
												height="16"
												stroke="currentColor"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												viewBox="0 0 24 24"
												width="16"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path d="M3 6h18"></path>
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
												<path d="M8 6V4a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2v2"></path>
											</svg>
										</button>
									)}
							</div>
						))}

					<button
						className="self-start px-3 py-1 mt-2 bg-blue-500 text-white rounded hover:bg-blue-600"
						onClick={addLink}
						type="button"
					>
						Add More Links
					</button>
				</div> */}

				<div className="flex flex-col gap-2 mt-4">
					<KPISelector
						issueCategory={formData.issueCategory}
						onSelectIssueCategory={handleSelectIssueCategory}
						onSelectKpi={handleSelectKpi}
						selectedKpis={formData.selectedKpis || {}}
					/>
				</div>

				<Flex className="mt-4" justify="between">
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.back")}
						// className="back-button"
						handleOnClick={onBack as () => void}
						iconLeft={<ArrowLeftIcon />}
						size="4"
						variant="outline"
					/>
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.next")}
						// className="next-button"
						handleOnClick={onNext as () => void}
						iconRight={<ArrowRightIcon />}
						size="4"
					/>
				</Flex>
			</Flex>
		</Card>
	);
};

export const EmployeeSupportStep: React.FC<StepProps> = ({
	formData,
	updateFormData,
	onBack,
	onSubmit,
	isSubmitting = false,
}) => {
	const { t } = useTranslation();
	const handleChange =
		(field: string) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			updateFormData({ [field]: e.target.value });
		};

	const handleCaseStatusSelect = (
		caseStatus: { id: number; name: string } | null,
	) => {
		updateFormData({
			case_status: caseStatus || undefined,
		});
	};

	// const handleReferralActionSelect = (
	//   referralAction: { id: number; name: string } | null,
	// ) => {
	//   updateFormData({
	//     referral_action: referralAction || undefined,
	//   })
	// }

	const handleNextStepsStaffSelect = (user: HrDropdownUser | null) => {
		updateFormData({
			next_steps_issara_staff: toFormUser(user),
		});
	};

	const handleDeadlineDateChange = (date: Date | null) => {
		updateFormData({ dead_line_date: date || undefined });
	};

	const handleAdditionalAttachmentsChange = (files: File[]) => {
		updateFormData({ additionalAttachments: files });
	};

	return (
		<Card className="p-4">
			<Text className="mb-4" size="5" weight="bold">
				{t("workerFeedbackForm.supportStep.title")}
			</Text>
			<Flex direction="column" gap="3">
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="risk_assessment">
						{t("workerFeedbackForm.supportStep.labels.riskAssessment")}
					</label>
					<textarea
						className="form-textarea"
						id={"risk_assessment"}
						onChange={handleChange("risk_assessment")}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.riskAssessment",
						)}
						rows={3}
						value={formData.risk_assessment || ""}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="other_services_support">
						{t("workerFeedbackForm.supportStep.labels.otherServicesSupport")}
					</label>
					<textarea
						className="form-textarea"
						id={"other_services_support"}
						onChange={handleChange("other_services_support")}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.otherServicesSupport",
						)}
						rows={3}
						value={formData.other_services_support || ""}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<CaseStatusesDropdown
						className="w-full"
						defaultValue={
							typeof formData.case_status?.id === "number"
								? formData.case_status.id
								: undefined
						}
						label={t(
							"workerFeedbackForm.supportStep.labels.caseStatusAssessment",
						)}
						onSelect={handleCaseStatusSelect}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.caseStatus",
						)}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="next_steps">
						{t("workerFeedbackForm.supportStep.labels.nextSteps")}
					</label>
					<textarea
						className="form-textarea"
						id={"next_steps"}
						onChange={handleChange("next_steps")}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.nextSteps",
						)}
						rows={3}
						value={formData.next_steps || ""}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label
						className="text-sm font-bold"
						htmlFor="next_steps_issara_staff"
					>
						{t("workerFeedbackForm.supportStep.labels.nextStepsStaff")}
					</label>
					{/* <IssaraStaffDropdown
						className="w-full"
						defaultValue={
							typeof formData.next_steps_issara_staff?.id === "number"
								? formData.next_steps_issara_staff.id
								: undefined
						}
						onSelect={handleNextStepsStaffSelect}
						placeholder="Select staff member"
					/> */}
					<MockHRStaffDropdown
						className="w-full"
						defaultUser={toDropdownUser(formData.next_steps_issara_staff)}
						defaultUserId={
							typeof formData.next_steps_issara_staff?.id === "number"
								? formData.next_steps_issara_staff.id
								: undefined
						}
						onSelect={handleNextStepsStaffSelect}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.nextStepsStaff",
						)}
						source="company-staff"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="dead_line_date">
						{t("workerFeedbackForm.supportStep.labels.deadlineDate")}
					</label>
					<AppDatePicker
						className="form-input"
						id={"dead_line_date"}
						onChange={handleDeadlineDateChange}
						placeholderText={t(
							"workerFeedbackForm.supportStep.placeholders.deadlineDate",
						)}
						selected={
							formData.dead_line_date ? new Date(formData.dead_line_date) : null
						}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="final_remarks">
						{t("workerFeedbackForm.supportStep.labels.finalRemarks")}
					</label>
					<textarea
						className="form-textarea"
						id={"final_remarks"}
						onChange={handleChange("final_remarks")}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.finalRemarks",
						)}
						rows={3}
						value={formData.final_remarks || ""}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-sm font-bold" htmlFor="safeguard_remarks">
						{t("workerFeedbackForm.supportStep.labels.safeguardRemarks")}
					</label>
					<textarea
						className="form-textarea"
						id={"safeguard_remarks"}
						onChange={handleChange("safeguard_remarks")}
						placeholder={t(
							"workerFeedbackForm.supportStep.placeholders.safeguardRemarks",
						)}
						rows={3}
						value={formData.safeguard_remarks || ""}
					/>
				</div>

				<AttachmentUploadField
					existingAttachments={formData.existingAdditionalAttachments}
					files={formData.additionalAttachments}
					onChange={handleAdditionalAttachmentsChange}
				/>

				<Flex justify="between">
					<CascadeButton
						buttonText={t("workerFeedbackForm.buttons.back")}
						handleOnClick={onBack as () => void}
						size="4"
						variant="outline"
					/>
					<CascadeButton
						buttonText={
							isSubmitting
								? t("workerFeedbackForm.buttons.submitting")
								: t("workerFeedbackForm.buttons.submit")
						}
						disabled={isSubmitting}
						handleOnClick={() => onSubmit?.()}
						iconRight={isSubmitting ? undefined : <PaperPlaneIcon />}
						size="4"
					/>
				</Flex>
			</Flex>
		</Card>
	);
};
