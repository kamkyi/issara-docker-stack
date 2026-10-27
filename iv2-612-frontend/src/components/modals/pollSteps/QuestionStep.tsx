import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Button, Card, Flex, RadioGroup, Text } from "@radix-ui/themes";
import type React from "react";
import { useRef } from "react";
import type { PollAnswerOption, PollFormData, PollInputType } from "./types";
import {
	getDefaultAnswerOptions,
	normalizeAnswerOptionsForType,
	POLL_INPUT_TYPE_LABELS,
} from "./types";

interface QuestionStepProps {
	formData: PollFormData;
	updateFormData: (data: Partial<PollFormData>) => void;
	onNext: () => void;
	onBack: () => void;
}

const QuestionStep: React.FC<QuestionStepProps> = ({
	formData,
	updateFormData,
	onNext,
	onBack,
}) => {
	const lastCustomOptionsRef = useRef<PollAnswerOption[]>(
		normalizeAnswerOptionsForType("single", formData.answerOptions),
	);

	const handleInputTypeChange = (nextInputType: PollInputType) => {
		if (nextInputType === formData.inputType) {
			return;
		}

		if (formData.inputType !== "yesno") {
			lastCustomOptionsRef.current = normalizeAnswerOptionsForType(
				formData.inputType,
				formData.answerOptions,
			);
		}

		if (nextInputType === "yesno") {
			updateFormData({
				inputType: nextInputType,
				answerOptions: getDefaultAnswerOptions("yesno"),
			});
			return;
		}

		const restoredOptions =
			lastCustomOptionsRef.current.length > 0
				? lastCustomOptionsRef.current
				: getDefaultAnswerOptions(nextInputType);

		updateFormData({
			inputType: nextInputType,
			answerOptions: normalizeAnswerOptionsForType(
				nextInputType,
				restoredOptions,
			),
		});
	};

	const addAnswerOption = () => {
		const newOptions = [
			...formData.answerOptions,
			{ id: Date.now().toString(), text: "" },
		];
		updateFormData({ answerOptions: newOptions });
	};

	const removeAnswerOption = (optionId: string) => {
		const newOptions = formData.answerOptions.filter(
			(opt) => opt.id !== optionId,
		);
		updateFormData({ answerOptions: newOptions });
	};

	const updateAnswerOption = (optionId: string, text: string) => {
		const newOptions = formData.answerOptions.map((opt) =>
			opt.id === optionId ? { ...opt, text } : opt,
		);
		updateFormData({ answerOptions: newOptions });
	};

	const isYesNo = formData.inputType === "yesno";
	const hasValidCustomOptions =
		formData.answerOptions.length >= 2 &&
		formData.answerOptions.every((opt) => opt.text.trim() !== "");
	const isValid =
		formData.question.trim() !== "" && (isYesNo || hasValidCustomOptions);

	return (
		<div>
			<div>
				<Text className="block" mb={"4"} size="4" weight="bold">
					Question Setup
				</Text>

				<Card className="p-4">
					<div className="space-y-4">
						{/* Question Text */}
						<div>
							<Text as="label" className="block mb-2" size="2" weight="medium">
								Question <span className="text-[#FB8379]">*</span>
							</Text>
							<textarea
								className="h-24 w-full resize-none rounded-xs border-1 border-[#148696] p-3"
								onChange={(e) => updateFormData({ question: e.target.value })}
								placeholder="Enter your question..."
								value={formData.question}
							/>
						</div>

						{/* Input Type */}
						<div>
							<Text as="label" className="block mb-2" size="2">
								Answer Type
							</Text>
							<RadioGroup.Root
								onValueChange={(value) =>
									handleInputTypeChange(value as PollInputType)
								}
								value={formData.inputType}
							>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
									{(
										[
											"single",
											"multiple",
											"ranking",
											"yesno",
										] as PollInputType[]
									).map((type) => (
										<Flex align="center" gap="2" key={type}>
											<RadioGroup.Item value={type} />
											<Text size="2">{POLL_INPUT_TYPE_LABELS[type]}</Text>
										</Flex>
									))}
								</div>
							</RadioGroup.Root>
						</div>

						{/* Answer Options */}
						<div>
							<Text as="label" className="block mb-2" size="2">
								Answer Options <span className="text-[#FB8379]">*</span>
							</Text>
							{isYesNo ? (
								<div className="space-y-2">
									{getDefaultAnswerOptions("yesno").map(
										(option, optionIndex) => (
											<Flex align="center" gap="2" key={option.id}>
												<Text className="w-8 text-gray-500" size="1">
													{optionIndex + 1}.
												</Text>
												<input
													className="w-full p-2 border-1 border-[#148696] rounded-xs bg-gray-100"
													disabled
													type="text"
													value={option.text}
												/>
											</Flex>
										),
									)}
									<Text className="text-gray-500" size="1">
										Yes / No uses fixed options and cannot be edited.
									</Text>
								</div>
							) : (
								<div className="space-y-2">
									{formData.answerOptions.map((option, optionIndex) => (
										<Flex
											align="start"
											className="sm:items-center"
											gap="2"
											key={option.id}
										>
											<Text className="w-8 text-gray-500" size="1">
												{optionIndex + 1}.
											</Text>
											<input
												className="w-full p-2 border-1 border-[#148696] rounded-xs"
												onChange={(e) =>
													updateAnswerOption(option.id, e.target.value)
												}
												placeholder={`Option ${optionIndex + 1}`}
												type="text"
												value={option.text}
											/>
											{formData.answerOptions.length > 2 && (
												<Button
													className="shrink-0"
													color="red"
													onClick={() => removeAnswerOption(option.id)}
													size="1"
													variant="ghost"
												>
													<TrashIcon />
												</Button>
											)}
										</Flex>
									))}
									<Button
										className="mt-2"
										onClick={addAnswerOption}
										size="2"
										variant="ghost"
									>
										<PlusIcon /> Add Option
									</Button>
								</div>
							)}
						</div>
					</div>
				</Card>
			</div>

			<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between sm:pt-6">
				<Button className="w-full sm:w-auto" onClick={onBack} variant="outline">
					Back
				</Button>
				<Button
					className="w-full sm:w-auto"
					disabled={!isValid}
					onClick={onNext}
					style={{ background: "#148696" }}
				>
					Next
				</Button>
			</div>
		</div>
	);
};

export default QuestionStep;
