import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";

interface EnsuringAnEthicalInvestigationProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	data: Record<string, any>;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
}

const EnsuringAnEthicalInvestigation: React.FC<
	EnsuringAnEthicalInvestigationProps
> = ({ context, data, onDataChange, handleOnClick }) => {
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
				{context.t("workerFeedbackGrievance.ethicalInvestigation.title")}
			</h3>
			<Text
				as="label"
				className="block pt-2 text-[15px] leading-snug text-gray-600"
			>
				{context.t("workerFeedbackGrievance.ethicalInvestigation.reviewedPlan")}
			</Text>
			{renderYesNoGroup("ethical_reviewed", data.ethical_reviewed?.value)}
			<Text as="label" className="block text-[15px] leading-snug text-gray-600">
				{context.t("workerFeedbackGrievance.ethicalInvestigation.professional")}
			</Text>
			{renderYesNoGroup(
				"professional_ensured",
				data.professional_ensured?.value,
			)}
			<Text as="label" className="block text-[15px] leading-snug text-gray-600">
				{context.t("workerFeedbackGrievance.ethicalInvestigation.impartial")}
			</Text>
			{renderYesNoGroup("impartial_ensured", data.impartial_ensured?.value)}
			<Text as="label" className="block text-[15px] leading-snug text-gray-600">
				{context.t("workerFeedbackGrievance.ethicalInvestigation.inclusive")}
			</Text>
			{renderYesNoGroup(
				"inclusive_and_accessible",
				data.inclusive_and_accessible?.value,
			)}
			<Text as="label" className="block text-[15px] leading-snug text-gray-600">
				{context.t("workerFeedbackGrievance.ethicalInvestigation.timely")}
			</Text>
			{renderYesNoGroup(
				"timely_and_effective",
				data.timely_and_effective?.value,
			)}
			<Text as="label" className="block text-[15px] font-medium text-gray-600">
				{context.t("workerFeedbackGrievance.ethicalInvestigation.notes")}
			</Text>
			<TextArea
				className="mt-3 w-full"
				name="ethical_investigation_notes"
				onChange={(e) =>
					onDataChange({
						ethical_investigation_notes: { value: e.target.value },
					})
				}
				placeholder={context.t(
					"workerFeedbackGrievance.ethicalInvestigation.notesPlaceholder",
				)}
				rows={3}
				value={
					data.ethical_investigation_notes
						? data.ethical_investigation_notes.value
						: ""
				}
			/>
			<PrevTextDataComponent
				context={context}
				data={
					data.list_of_text_fields
						? data.list_of_text_fields.ethical_investigation_notes
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

export default EnsuringAnEthicalInvestigation;
