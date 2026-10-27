import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Flex, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import { useId } from "react";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";

interface SafeguardingAffectedWorkersProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	data: Record<string, any>;
	onDataChange: (update: Record<string, unknown>) => void;
	handleOnClick: () => void;
}

const REMEDIATION_AT_RISK_ALERT =
	"workerFeedbackGrievance.safeguarding.remediationAtRiskAlert";

const SafeguardingAffectedWorkers: React.FC<
	SafeguardingAffectedWorkersProps
> = ({ context, data, onDataChange, handleOnClick }) => {
	const safeguardingNotesId = useId();

	const handleChange = (name: string, value: string) => {
		onDataChange({
			[name]: value,
		});
	};

	const renderYesNoGroup = (name: string, value: string) => (
		<RadioGroup.Root
			className="mt-6 grid max-w-[36rem] grid-cols-2 gap-6"
			id={`${name}_group`}
			onValueChange={(val) => handleChange(name, val)}
			value={String(value)}
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
					htmlFor={`${name}_${option.value}`}
					key={option.value}
				>
					<RadioGroup.Item
						className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-500 data-[state=checked]:border-[#148696] data-[state=checked]:bg-[#148696] standard-input-size"
						id={`${name}_${option.value}`}
						value={option.value}
					>
						<span className="block w-2 h-2 rounded-full bg-white data-[state=checked]:bg-white"></span>
					</RadioGroup.Item>
					<span className="text-base text-gray-400">{option.label}</span>
				</label>
			))}
		</RadioGroup.Root>
	);

	const renderAtRiskAlert = (visible: boolean) =>
		visible ? (
			<Box
				className="mt-4 rounded border border-blue-300 bg-blue-50 p-3"
				role="alert"
			>
				<Text className="block text-[13px] text-blue-800" size="2">
					{context.t(REMEDIATION_AT_RISK_ALERT)}
				</Text>
			</Box>
		) : null;

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
				{context.t("workerFeedbackGrievance.safeguarding.title")}
			</h3>

			{/* Q1: Zero tolerance */}
			<div className="mb-4 pt-2">
				<Text
					as="label"
					className="block text-[15px] leading-snug text-gray-600"
					htmlFor="zero_tolerance_group"
				>
					{context.t("workerFeedbackGrievance.safeguarding.zeroTolerance")}
				</Text>
				{renderYesNoGroup("zero_tolerance", data.zero_tolerance)}
				{renderAtRiskAlert(String(data.zero_tolerance) === "false")}
			</div>

			{/* Q2: Reviewed individuals */}
			<div className="mb-4">
				<Text
					as="label"
					className="block text-[15px] leading-snug text-gray-600"
					htmlFor="reviewed_individual_group"
				>
					{context.t(
						"workerFeedbackGrievance.safeguarding.reviewedIndividuals",
					)}
				</Text>
				{renderYesNoGroup("reviewed_individual", data.reviewed_individual)}
				{renderAtRiskAlert(String(data.reviewed_individual) === "false")}
			</div>

			{/* Q3: Involved in grievance */}
			<div className="mb-4">
				<Text
					as="label"
					className="block text-[15px] leading-snug text-gray-600"
					htmlFor="involved_in_grievance_group"
				>
					{context.t(
						"workerFeedbackGrievance.safeguarding.involvedInGrievance",
					)}
				</Text>
				{renderYesNoGroup("involved_in_grievance", data.involved_in_grievance)}
			</div>

			{/* Safeguarding Notes */}
			<div className="mb-4">
				<Text
					as="label"
					className="block text-[15px] font-medium text-gray-600"
					htmlFor={safeguardingNotesId}
				>
					{context.t("workerFeedbackGrievance.safeguarding.notes")}
				</Text>
				<TextArea
					className="mt-3 w-full"
					id={safeguardingNotesId}
					name="safeguarding_notes"
					onChange={(e) =>
						onDataChange({ safeguarding_notes: { value: e.target.value } })
					}
					placeholder={context.t(
						"workerFeedbackGrievance.safeguarding.notesPlaceholder",
					)}
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
					text_header_1={context.t("workerFeedbackGrievance.common.notePrefix")}
					text_header_2={""}
				/>
			</div>
			<Flex justify="end" mt="4">
				<button
					className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
					onClick={handleOnClick}
				>
					{context.t("workerFeedbackGrievance.common.saveAsDraft")}
				</button>
			</Flex>
		</Box>
	);
};

export default SafeguardingAffectedWorkers;
