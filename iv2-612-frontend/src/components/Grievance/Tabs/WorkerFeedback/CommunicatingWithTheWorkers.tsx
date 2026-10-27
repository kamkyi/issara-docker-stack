import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import { useId } from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface CommunicatingWithTheWorkersProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
}

const CommunicatingWithTheWorkers: React.FC<
	CommunicatingWithTheWorkersProps
> = ({ context, data, onDataChange, handleOnClick }) => {
	const complexConsequencesId = useId();

	const handleChange = (name: string, value: string) => {
		onDataChange({
			[name]: {
				value,
				description: "",
			},
		});
	};

	const renderYesNoGroup = (name: string, value: string) => (
		<div className="mb-4">
			<RadioGroup.Root
				className="mt-6 grid max-w-[36rem] grid-cols-2 gap-6"
				onValueChange={(val) => handleChange(name, val)}
				value={String(value || "")}
			>
				{[
					{
						value: "true",
						label: context.t("workerFeedbackGrievance.common.yes"),
					},
					{
						value: "false",
						label: context.t("workerFeedbackGrievance.common.no"),
					},
				].map((option) => (
					<label
						className="flex items-center gap-3 cursor-pointer text-gray-400"
						htmlFor={`${name}-${option.value}`}
						key={option.value}
					>
						<RadioGroup.Item
							className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-500 data-[state=checked]:border-[#148696] data-[state=checked]:bg-[#148696] standard-input-size"
							id={`${name}-${option.value}`}
							value={option.value}
						>
							<span className="block h-2 w-2 rounded-full bg-white data-[state=checked]:bg-white"></span>
						</RadioGroup.Item>
						<span className="text-base text-gray-400">{option.label}</span>
					</label>
				))}
			</RadioGroup.Root>
		</div>
	);

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			<h3
				style={{
					color: "#3f51d6",
					fontSize: "1.15rem",
					fontWeight: 500,
					letterSpacing: "0.01em",
					margin: 0,
				}}
			>
				{context.t("workerFeedbackGrievance.workerCommunication.title")}
			</h3>

			<Text
				as="label"
				className="block pt-2 text-[15px] leading-snug text-gray-600"
			>
				{context.t("workerFeedbackGrievance.workerCommunication.wellbeing")}
			</Text>
			{renderYesNoGroup(
				"investigation_their_wellbeing",
				(data.investigation_their_wellbeing as { value: string })?.value || "",
			)}

			<Text
				as="label"
				className="block text-[15px] font-semibold leading-snug text-gray-900"
				weight="bold"
			>
				{context.t(
					"workerFeedbackGrievance.workerCommunication.complexConsequences",
				)}
			</Text>
			<label
				className="mt-5 flex items-center gap-3 text-base text-[#1f6feb]"
				htmlFor={complexConsequencesId}
			>
				<input
					checked={data.need_help_with_complex_consequences === true}
					className="h-4 w-4 rounded border border-gray-500 text-[#148696] accent-[#148696]"
					id={complexConsequencesId}
					onChange={(e) =>
						onDataChange({
							need_help_with_complex_consequences: e.target.checked,
						})
					}
					type="checkbox"
				/>
				<span>
					{context.t(
						"workerFeedbackGrievance.workerCommunication.complexConsequencesCheckbox",
					)}
				</span>
			</label>

			<Text as="label" className="block text-[15px] font-medium text-gray-600">
				{context.t("workerFeedbackGrievance.workerCommunication.notes")}
			</Text>
			<TextArea
				className="mt-3 w-full"
				name="communication_notes"
				onChange={(e) =>
					onDataChange({ communication_notes: { value: e.target.value } })
				}
				placeholder={context.t(
					"workerFeedbackGrievance.workerCommunication.notesPlaceholder",
				)}
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
				text_header_1={context.t("workerFeedbackGrievance.common.notePrefix")}
				text_header_2={""}
			/>
			<Flex justify="end" mt="4">
				<button
					className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
					onClick={handleOnClick}
				>
					{context.t("workerFeedbackGrievance.common.next")}
				</button>
			</Flex>
		</Box>
	);
};

export default CommunicatingWithTheWorkers;
