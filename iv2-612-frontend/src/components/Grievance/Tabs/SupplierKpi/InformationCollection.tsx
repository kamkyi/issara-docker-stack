import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Text } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface InformationCollectionProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
}

const normalizeCheckWithHrValue = (value: unknown): string => {
	if (
		value &&
		typeof value === "object" &&
		"value" in value &&
		(value as { value?: unknown }).value !== value
	) {
		return normalizeCheckWithHrValue((value as { value?: unknown }).value);
	}

	if (
		value &&
		typeof value === "object" &&
		"label" in value &&
		typeof (value as { label?: unknown }).label !== "undefined"
	) {
		return normalizeCheckWithHrValue((value as { label?: unknown }).label);
	}

	if (
		value &&
		typeof value === "object" &&
		"name" in value &&
		typeof (value as { name?: unknown }).name !== "undefined"
	) {
		return normalizeCheckWithHrValue((value as { name?: unknown }).name);
	}

	if (typeof value === "boolean") {
		return value ? "yes" : "no";
	}

	if (typeof value === "number") {
		if (value === 1) return "yes";
		if (value === 0) return "no";
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return "yes";
		if (normalized === "false") return "no";
		return normalized;
	}

	return "";
};

const InformationCollection: React.FC<InformationCollectionProps> = ({
	context,
	data,
	onDataChange,
}) => {
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

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			{/* Q1: issara_context */}
			<Text as="label" className="question block mb-2" weight="bold">
				{context.t(
					"Please review the information shared in ILM. Do you want to talk to Issara to get more context on the worker-reported issue?",
				)}
			</Text>
			{renderRadioGroup(
				"issara_context",
				data.issara_context || "",
				[
					{ value: "no need", label: context.t("No Need") },
					{
						value: "wantMoreInfo",
						label: context.t(
							"Yes, I want more information from my Issara focal",
						),
					},
					{
						value: "alreadyReachedOut",
						label: context.t("Yes, I already reached out to my Issara focal"),
					},
				],
				(val) => onDataChange({ issara_context: val }),
			)}

			{/* Q2: check_with_hr */}
			<Text
				as="label"
				className="question next_question block mb-2"
				weight="bold"
			>
				{context.t(
					"Have you checked with the HR team to see if similar worker-reported issues have been filed and/or solved recently?",
				)}
			</Text>
			{renderRadioGroup(
				"check_with_hr",
				normalizeCheckWithHrValue(data.check_with_hr),
				[
					{ value: "yes", label: context.t("Yes") },
					{ value: "no", label: context.t("No") },
				],
				(val) => onDataChange({ check_with_hr: val }),
			)}

			{/* Q3: repeat_issue */}
			<Text
				as="label"
				className="question next_question block mb-2"
				weight="bold"
			>
				{context.t(
					"Is this worker-reported issue a repeat issue, meaning that there might be a root cause that needs to be identified and addressed?",
				)}
			</Text>
			{renderRadioGroup(
				"repeat_issue",
				String(data.repeat_issue),
				[
					{ value: "true", label: context.t("Yes") },
					{ value: "false", label: context.t("No") },
				],
				(val) => onDataChange({ repeat_issue: val }),
			)}
		</Box>
	);
};

export default InformationCollection;
