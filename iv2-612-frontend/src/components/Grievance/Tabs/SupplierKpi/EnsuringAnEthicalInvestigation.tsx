import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Text } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";

interface EnsuringAnEthicalInvestigationProps {
	context: { t: (x: string) => string };
	data: Record<string, any>;
	onDataChange: (update: Record<string, unknown>) => void;
}

const QUESTIONS: { name: string; label: string }[] = [
	{
		name: "ethical_reviewed",
		label:
			"Ethical. Have you reviewed all possible individuals to be involved in the investigation, including interpreters, and ensured that all are fully committed to 'do no harm' and maintaining worker safeguards at all times?",
	},
	{
		name: "professional_ensured",
		label:
			"Professional. Have you ensured that responsible persons in the grievance process are knowledgeable, qualified, and trained to serve impartially in the grievance process?",
	},
	{
		name: "impartial_ensured",
		label:
			"Impartial. Have you ensured that responsible persons in the grievance process have no biases and can refrain from making snap judgments when hearing the perspectives of workers versus other worksite staff?",
	},
	{
		name: "inclusive_and_accessible",
		label:
			"Inclusive and Accessible. Have you identified all the language, gender, and literacy considerations for effective communication with the worker, and have you communicated with the worker the range of ways they can get in touch with you?",
	},
	{
		name: "timely_and_effective",
		label:
			"Timely and Effective. Have you established responsible timelines and goals for investigation and remediation that take into account both the interests of the business and the worker?",
	},
];

const EnsuringAnEthicalInvestigation: React.FC<
	EnsuringAnEthicalInvestigationProps
> = ({ context, data, onDataChange }) => {
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
			{QUESTIONS.map((q, idx) => (
				<div className={idx === 0 ? "mb-4 pt-2" : "mb-4"} key={q.name}>
					<Text as="label" className="question block" weight="bold">
						{context.t(q.label)}
					</Text>
					{renderRadioGroup(
						q.name,
						data[q.name]?.value || "",
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
								[q.name]: {
									value: val,
									description: data[q.name]?.description || "",
								},
							}),
					)}
				</div>
			))}
		</Box>
	);
};

export default EnsuringAnEthicalInvestigation;
