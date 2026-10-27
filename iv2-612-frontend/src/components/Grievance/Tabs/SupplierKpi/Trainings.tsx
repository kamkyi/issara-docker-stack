import { Box, Checkbox, Flex, Text } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface TrainingsProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	issara_trainings: unknown[];
	onDataChange: (update: Record<string, unknown>) => void;
	handlePreview: () => void;
}

const Trainings: React.FC<TrainingsProps> = ({
	context,
	data,
	issara_trainings,
	onDataChange,
	handlePreview,
}) => {
	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, checked } = event.target;
		if (checked) {
			onDataChange({ trainings: [...(data.trainings as string[]), name] });
		} else {
			onDataChange({
				trainings: (data.trainings as string[]).filter(
					(training) => training !== name,
				),
			});
		}
	};

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			<Text as="label" className="question block" weight="bold">
				{context.t(
					"Please review the list of trainings below and indicate if you would like to request any of them from Issara.",
				)}
			</Text>
			<div className="grid gap-x-20 gap-y-4 pt-2 md:grid-cols-2">
				{issara_trainings.map((training) => (
					<label
						className="flex items-center gap-3 text-[#1f6feb]"
						htmlFor={training as string}
						key={training as string}
					>
						<Checkbox
							checked={(data.trainings as string[]).includes(
								training as string,
							)}
							id={training as string}
							name={training as string}
							onCheckedChange={(checked) =>
								handleChange({
									target: { name: training as string, checked: !!checked },
								} as React.ChangeEvent<HTMLInputElement>)
							}
						/>
						<span className="answer_checkbox">
							{context.t(training as string)}
						</span>
					</label>
				))}
			</div>
			<Flex justify="end" mt="6">
				<button
					className="bg-crimson-500 text-white px-4 py-2 rounded hover:bg-crimson-600"
					onClick={handlePreview}
				>
					{context.t("Preview & Submit")}
				</button>
			</Flex>
		</Box>
	);
};

export default Trainings;
