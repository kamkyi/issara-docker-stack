import { CheckIcon } from "@radix-ui/react-icons";
import React from "react";

interface StepperProps {
	steps: string[];
	currentStep: number;
	onStepChange?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
	steps,
	currentStep,
	onStepChange,
}) => {
	return (
		<div className="w-full">
			<div className="flex w-full items-start justify-between">
				{steps.map((step, index) => (
					<React.Fragment key={index}>
						{/* Step wrapper with fixed height for consistent alignment */}
						<div
							className="flex w-full max-w-[92px] cursor-pointer flex-col items-center sm:max-w-[100px]"
							onClick={() => onStepChange?.(index)}
						>
							{/* Step circle with number or check */}
							<div
								className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 ${
									index < currentStep
										? "bg-green-500 border-green-500 text-white"
										: index === currentStep
											? "border-blue-500 bg-blue-500 text-white"
											: "step-circle-inactive"
								}`}
							>
								{index < currentStep ? (
									<CheckIcon className="w-4 h-4 sm:w-4 sm:h-4" />
								) : (
									<span className="text-xs sm:text-md font-bold">
										{index + 1}
									</span>
								)}
							</div>

							{/* Label with fixed height and proper text wrapping */}
							<div className="flex items-start mt-2">
								<span
									className={
										index === currentStep
											? "step-label-active text-center text-[10px] leading-tight sm:text-xs"
											: "step-label text-center text-[10px] leading-tight sm:text-xs"
									}
								>
									{step}
								</span>
							</div>
						</div>

						{/* Connector line between steps */}
						{index < steps.length - 1 && (
							<div
								className={`flex-1 h-[2px] mx-1 sm:mx-2 mt-4 ${
									index < currentStep
										? "step-connector-completed"
										: "step-connector"
								}`}
							/>
						)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};
