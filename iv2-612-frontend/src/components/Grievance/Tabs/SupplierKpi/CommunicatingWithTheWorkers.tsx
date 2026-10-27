import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface CommunicatingWithTheWorkersProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
	hideActions?: boolean;
}

const CommunicatingWithTheWorkers: React.FC<
	CommunicatingWithTheWorkersProps
> = ({ context, data, onDataChange, handleOnClick, hideActions = false }) => {
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

	const wellbeing = data.investigation_their_wellbeing as
		| { value: string; description: string }
		| undefined;
	const needHelp = data.need_help_with_complex_consequences;

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			{/* Q1: investigation_their_wellbeing (3-option) */}
			<div className="mb-4 pt-2">
				<Text as="label" className="question block" weight="bold">
					{context.t(
						"Throughout the investigation and upon its conclusion, have you stayed in touch with the worker to check on their well-being and whether the investigation has had any positive or negative impacts on them?",
					)}
				</Text>
				{renderRadioGroup(
					"investigation_their_wellbeing",
					wellbeing?.value || "",
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
							investigation_their_wellbeing: {
								value: val,
								description: wellbeing?.description || "",
							},
						}),
				)}
				{wellbeing?.value === "not_necessary" && (
					<div className="mt-3">
						<Text
							as="label"
							className="block text-[14px] font-medium text-gray-600"
						>
							{context.t("Please describe why?")}
						</Text>
						<TextArea
							className="mt-2 w-full"
							onChange={(e) =>
								onDataChange({
									investigation_their_wellbeing: {
										value: wellbeing?.value || "",
										description: e.target.value,
									},
								})
							}
							rows={3}
							value={wellbeing?.description || ""}
						/>
					</div>
				)}
			</div>

			{/* Q2: need_help_with_complex_consequences (Y/N radio, NOT checkbox) */}
			<div className="mb-4">
				<Text as="label" className="question block" weight="bold">
					{context.t(
						"Do you need help with any more complex consequences arising from the worker-reported issue, such as psychosocial support for the worker, the need to quickly repatriate a worker, etc.?",
					)}
				</Text>
				{renderRadioGroup(
					"need_help_with_complex_consequences",
					needHelp === true ? "true" : needHelp === false ? "false" : "",
					[
						{ value: "true", label: context.t("Yes") },
						{ value: "false", label: context.t("No") },
					],
					(val) =>
						onDataChange({
							need_help_with_complex_consequences: val === "true",
						}),
				)}
				{needHelp === true && (
					<Box
						className="mt-4 rounded border border-blue-300 bg-blue-50 p-3"
						role="alert"
					>
						<Text className="block text-[13px] text-blue-800" size="2">
							{context.t(
								"The Issara team will be notified of this and will reach out to you soon! Issara Institute has trained trauma-informed counselors, teams working in the origin countries of the workers, and a network of trusted service providers, all which are happy to help with complex cases and service needs.",
							)}
						</Text>
					</Box>
				)}
			</div>

			{/* Additional Notes */}
			<div className="mb-4">
				<Text as="label" className="question block" weight="bold">
					{context.t("Additional Notes (Internal Only)")}
				</Text>
				<TextArea
					className="mt-3 w-full"
					name="communication_notes"
					onChange={(e) =>
						onDataChange({ communication_notes: { value: e.target.value } })
					}
					rows={3}
					value={(data.communication_notes as any)?.value || ""}
				/>
				<PrevTextDataComponent
					context={context}
					data={
						data.list_of_text_fields
							? (data.list_of_text_fields as any).communication_notes
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

export default CommunicatingWithTheWorkers;
