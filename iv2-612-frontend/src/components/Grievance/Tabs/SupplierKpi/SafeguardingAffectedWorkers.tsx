import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";

interface SafeguardingAffectedWorkersProps {
	context: { t: (x: string) => string };
	data: Record<string, any>;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
	hideActions?: boolean;
	/**
	 * Per-field messages for the required answers, keyed by field name. Populated
	 * by SupplierKpiGrievanceForm when a submit is blocked (see
	 * SAFEGUARDING_REQUIRED_FIELDS); empty while the user has not tried to submit.
	 */
	errors?: Record<string, string>;
}

const SafeguardingAffectedWorkers: React.FC<
	SafeguardingAffectedWorkersProps
> = ({
	context,
	data,
	onDataChange,
	handleOnClick,
	hideActions = false,
	errors = {},
}) => {
	/** Marks a question as required, in the caption colour from the design system. */
	const requiredMark = (
		<span aria-hidden className="ml-1 text-[#B3261E]">
			*
		</span>
	);

	const renderError = (field: string) =>
		errors[field] ? (
			<Text
				as="p"
				className="mt-2 text-xs text-[#B3261E]"
				id={`${field}-error`}
				role="alert"
			>
				{errors[field]}
			</Text>
		) : null;

	const renderRadioGroup = (
		name: string,
		value: string,
		options: { value: string; label: string }[],
		onChange: (value: string) => void,
	) => (
		<RadioGroup.Root
			className="mt-3 flex flex-col gap-2"
			onValueChange={onChange}
			value={value || ""}
		>
			{options.map((option) => (
				<label
					className="flex items-center gap-3 cursor-pointer"
					htmlFor={`${name}-${option.value}`}
					key={option.value}
				>
					<RadioGroup.Item
						className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 data-[state=checked]:border-[#148696] data-[state=checked]:bg-[#148696] standard-input-size"
						id={`${name}-${option.value}`}
						value={option.value}
					>
						<span className="block w-2 h-2 rounded-full bg-white"></span>
					</RadioGroup.Item>
					<span className="answer_checkbox">{option.label}</span>
				</label>
			))}
		</RadioGroup.Root>
	);

	const renderAlert = (text: string) => (
		<Box
			className="mt-4 rounded border border-blue-300 bg-blue-50 p-3"
			role="alert"
		>
			<Text className="block text-[13px] text-blue-800" size="2">
				{text}
			</Text>
		</Box>
	);

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			{/* Q1: zero_tolerance */}
			<div className="mb-4 pt-2">
				<Text
					as="label"
					className="question block"
					htmlFor="zero_tolerance_group"
					weight="bold"
				>
					{context.t(
						"Is zero tolerance of retaliation being followed by everyone involved in this case?",
					)}
					{requiredMark}
				</Text>
				{renderRadioGroup(
					"zero_tolerance",
					String(data.zero_tolerance),
					[
						{ value: "true", label: context.t("Yes") },
						{ value: "false", label: context.t("No") },
					],
					(val) => onDataChange({ zero_tolerance: val }),
				)}
				{String(data.zero_tolerance) === "false" &&
					renderAlert(
						context.t(
							"The remediation case is at risk. The Issara team will be following up with your company's focal point to discuss how to safeguard all affected workers from retaliation, and build better systems for zero tolerance against retaliation, and build better systems for zero tolerance against retaliation.",
						),
					)}
				{renderError("zero_tolerance")}
			</div>

			{/* Q2: reviewed_individual */}
			<div className="mb-4">
				<Text
					as="label"
					className="question block"
					htmlFor="reviewed_individual_group"
					weight="bold"
				>
					{context.t(
						"Have you reviewed all the possible individuals identified in the worker-reported issue and conducted a risk assessment to ensure that workers remain safe during the duration of the grievance investigation and remediation?",
					)}
					{requiredMark}
				</Text>
				{renderRadioGroup(
					"reviewed_individual",
					String(data.reviewed_individual),
					[
						{ value: "true", label: context.t("Yes") },
						{ value: "false", label: context.t("No") },
					],
					(val) => onDataChange({ reviewed_individual: val }),
				)}
				{String(data.reviewed_individual) === "false" &&
					renderAlert(
						context.t(
							"The remediation case is at risk. The Issara team will be following up with your company's focal point to discuss how to safeguard all affected workers from retaliation, and build better systems for zero tolerance against retaliation.",
						),
					)}
				{renderError("reviewed_individual")}
			</div>

			{/* Q3: involved_in_grievance */}
			<div className="mb-4">
				<Text
					as="label"
					className="question block"
					htmlFor="involved_in_grievance_group"
					weight="bold"
				>
					{context.t(
						"Have you reviewed all the possible individuals that would be involved in the grievance investigation and remediation process, including interpreters, and ensured that:",
					)}
					{requiredMark}
				</Text>
				<Text className="sub_text block" size="2">
					{context.t(
						"Is there any conflict of interest? Please do not proceed until it is certain that there are no relationships or conflicts of interest between grievance response personnel and the individual(s) who are the subjects of the complaint.",
					)}
				</Text>
				{renderRadioGroup(
					"involved_in_grievance",
					String(data.involved_in_grievance),
					[
						{ value: "true", label: context.t("Yes") },
						{ value: "false", label: context.t("No") },
					],
					(val) => onDataChange({ involved_in_grievance: val }),
				)}
				{String(data.involved_in_grievance) === "true" &&
					renderAlert(
						context.t(
							"Your Issara focal has been notified; they will reach out to you soon.",
						),
					)}
				{renderError("involved_in_grievance")}
			</div>

			{/* Q4: received_the_training */}
			<div className="mb-4">
				<Text as="label" className="question block" weight="bold">
					{context.t(
						"All individuals have received the training ensuring they understand how to prioritize safety, confidentiality, privacy and company protocols for efficient response to worker-reported issues?",
					)}
					{requiredMark}
				</Text>
				{renderRadioGroup(
					"received_the_training",
					String(data.received_the_training),
					[
						{ value: "true", label: context.t("Yes") },
						{ value: "false", label: context.t("No") },
					],
					(val) => onDataChange({ received_the_training: val }),
				)}
				{renderError("received_the_training")}
			</div>

			{/* Q5: has_trained_impartial (3-option with conditional desc) */}
			<div className="mb-4">
				<Text as="label" className="question block" weight="bold">
					{context.t(
						"Has a trained and impartial individual reached out to the worker(s) to introduce themselves as the case focal point, inform them that the company is about to launch an investigation into their grievance, specify the start date, and confirm that there are no conflicts of interest within the investigation team?",
					)}
					{requiredMark}
				</Text>
				{renderRadioGroup(
					"has_trained_impartial",
					data.has_trained_impartial?.value || "",
					[
						{ value: "yes", label: context.t("Yes") },
						{
							value: "not_yet",
							label: context.t("No, not yet, but I will do so"),
						},
						{
							value: "not_necessary",
							label: context.t("No, I do not think that is necessary"),
						},
					],
					(val) =>
						onDataChange({
							has_trained_impartial: {
								value: val,
								description: data.has_trained_impartial?.description || "",
							},
						}),
				)}
				{data.has_trained_impartial?.value === "not_necessary" && (
					<div className="mt-3">
						<Text
							as="label"
							className="block text-[14px] font-medium text-gray-600"
						>
							{context.t("Please describe why?")}
							{requiredMark}
						</Text>
						<TextArea
							className="mt-2 w-full"
							onChange={(e) =>
								onDataChange({
									has_trained_impartial: {
										value: data.has_trained_impartial?.value || "",
										description: e.target.value,
									},
								})
							}
							rows={3}
							value={data.has_trained_impartial?.description || ""}
						/>
						{renderError("has_trained_impartial_description")}
					</div>
				)}
				{renderError("has_trained_impartial")}
			</div>

			{/* Additional Notes */}
			<div className="mb-4">
				<Text as="label" className="question block" weight="bold">
					{context.t("Additional Notes (Internal Only)")}
				</Text>
				<TextArea
					className="mt-3 w-full"
					name="safeguarding_notes"
					onChange={(e) =>
						onDataChange({ safeguarding_notes: { value: e.target.value } })
					}
					rows={3}
					value={data.safeguarding_notes ? data.safeguarding_notes.value : ""}
				/>
				<PrevTextDataComponent
					context={context}
					data={
						data.list_of_text_fields
							? data.list_of_text_fields.safeguarding_notes
							: []
					}
					is_notes={true}
					text_header_1={context.t("Note: ")}
					text_header_2={""}
				/>
			</div>
			{!hideActions && (
				<Flex justify="end" mt="4">
					<button
						className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
						onClick={handleOnClick}
					>
						{context.t("Save as Draft")}
					</button>
				</Flex>
			)}
		</Box>
	);
};

export default SafeguardingAffectedWorkers;
