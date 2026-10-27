import { CheckIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";

interface Step {
	id: number;
	title: string;
}

interface JobPostingStepsProps {
	steps: Step[];
	currentStep: number;
	onStepClick: (stepId: number) => void;
	canClickStep?: (stepId: number) => boolean;
	saveDraftButton: React.ReactNode;
	mode: "create" | "edit";
}

export const JobPostingSteps = ({
	steps,
	currentStep,
	onStepClick,
	canClickStep,
	saveDraftButton,
	mode,
}: JobPostingStepsProps) => {
	return (
		<div className="space-y-1">
			<Flex align={"center"} justify={"between"} mb="3">
				<h3 className="text-white text-2xl">Progress</h3>
				{saveDraftButton}
			</Flex>

			{steps.map((step, index) => {
				const isCompleted = step.id < currentStep || mode === "edit";
				const isCurrent = step.id === currentStep;
				const isClickable = canClickStep
					? canClickStep(step.id)
					: step.id <= currentStep;

				return (
					<div className="relative" key={step.id}>
						{/* Connector Line */}
						{index < steps.length - 1 && (
							<div
								className={`absolute left-4 top-8 w-0.5 h-5 ms-3 mt-4 ${
									isCompleted ? "bg-green-500" : "bg-gray-300"
								}`}
							/>
						)}

						{/* Step Item */}
						<button
							className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
								isCurrent
									? "bg-blue-50 border border-blue-200"
									: isCompleted
										? "hover:bg-gray-50/20"
										: "hover:bg-none"
							} ${!isClickable ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
							disabled={!isClickable}
							onClick={() => isClickable && onStepClick(step.id)}
						>
							{/* Step Number/Check */}
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
									isCompleted
										? "bg-green-400 text-white"
										: isCurrent
											? "bg-teal-500 text-white"
											: "bg-gray-300 text-gray-600"
								}`}
							>
								{isCompleted ? <CheckIcon className="w-4 h-4" /> : step.id}
							</div>

							{/* Step Title */}
							<Text
								className={`${
									isCurrent
										? "text-green-700"
										: isCompleted
											? "text-white"
											: "text-gray-300"
								}`}
								size="3"
								weight={isCurrent ? "bold" : "medium"}
							>
								{step.title}
							</Text>
						</button>
					</div>
				);
			})}
		</div>
	);
};
