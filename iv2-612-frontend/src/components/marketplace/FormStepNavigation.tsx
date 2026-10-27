import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import { statusColorPalette } from "$src/assets/mock/common-data";
import CascadeButton from "$src/components/button/button";

interface FormStepNavigationProps {
	onPrevious: () => void;
	onNext: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	isLoading?: boolean;
	nextDisabled?: boolean;
	previousText?: string;
	nextText?: string;
	completeText?: string;
}

export const FormStepNavigation = ({
	onPrevious,
	onNext,
	isFirstStep,
	isLastStep,
	isLoading = false,
	nextDisabled = false,
	previousText = "Previous",
	nextText = "Next",
	completeText = "Complete",
}: FormStepNavigationProps) => {
	return (
		<Flex className="pt-6" justify="between">
			<div>
				{!isFirstStep && (
					<CascadeButton
						buttonText={previousText}
						className="rounded-full"
						color={statusColorPalette[10]}
						disabled={isLoading}
						handleOnClick={onPrevious}
						iconLeft={<ArrowLeftIcon />}
						size="4"
					/>
				)}
			</div>

			<CascadeButton
				buttonText={isLastStep ? completeText : nextText}
				disabled={isLoading || nextDisabled}
				handleOnClick={onNext}
				iconRight={<ArrowRightIcon />}
				size="4"
			/>
		</Flex>
	);
};
