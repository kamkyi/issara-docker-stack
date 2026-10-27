import { Box, Checkbox, Text } from "@radix-ui/themes";
import type React from "react";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface TrainingsProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	issara_trainings: unknown[];
	onDataChange: (update: Record<string, unknown>) => void;
	handlePreview: () => void;
	summary?: {
		assignedStaff?: string[];
		deadline?: string;
		nextSteps?: string;
	};
}

const Trainings: React.FC<TrainingsProps> = ({
	context,
	data,
	issara_trainings,
	onDataChange,
	summary,
}) => {
	const assignedStaff = Array.isArray(summary?.assignedStaff)
		? summary.assignedStaff.filter((value) => value.trim().length > 0)
		: [];

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
		<Box className="space-y-8 px-4 pt-1 md:px-8 md:pt-3">
			<h3
				style={{
					color: "#3f51d6",
					fontSize: "1.15rem",
					fontWeight: 500,
					letterSpacing: "0.01em",
					margin: 0,
				}}
			>
				{context.t("workerFeedbackGrievance.trainings.title")}
			</h3>
			<Text className="block pt-2 text-[15px] leading-snug text-gray-700">
				{context.t("workerFeedbackGrievance.trainings.description")}
			</Text>
			<div className="grid gap-x-20 gap-y-8 pt-2 md:grid-cols-2">
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
						<span className="text-[15px] leading-snug">
							{training as string}
						</span>
					</label>
				))}
			</div>
			<div className="space-y-4 pt-8">
				<h4 className="text-[1.05rem] font-semibold text-gray-900">
					{context.t("workerFeedbackGrievance.trainings.currentActionItems")}
				</h4>
				<div className="grid gap-6 text-[15px] text-gray-900 md:grid-cols-[1.4fr_1fr]">
					<div className="space-y-4">
						<p>
							<span className="font-semibold">
								{context.t("workerFeedbackGrievance.trainings.assignedStaff")}:
							</span>{" "}
							{assignedStaff.length > 0
								? assignedStaff.join(", ")
								: context.t("workerFeedbackGrievance.trainings.notSpecified")}
						</p>
						<p>
							<span className="font-semibold">
								{context.t("workerFeedbackGrievance.trainings.nextSteps")}:
							</span>{" "}
							{summary?.nextSteps?.trim()
								? summary.nextSteps
								: context.t("workerFeedbackGrievance.trainings.noNextSteps")}
						</p>
					</div>
					<p>
						<span className="font-semibold">
							{context.t("workerFeedbackGrievance.trainings.deadline")}:
						</span>{" "}
						{summary?.deadline?.trim()
							? summary.deadline
							: context.t("workerFeedbackGrievance.trainings.noDeadline")}
					</p>
				</div>
			</div>
		</Box>
	);
};

export default Trainings;
