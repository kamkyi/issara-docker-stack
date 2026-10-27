import { Button, Card, Text } from "@radix-ui/themes";
import type React from "react";
import { useGDNationalities } from "$queries/nationalities";
import {
	getDisplayAnswerOptions,
	getDisplayGenderLabel,
	POLL_INPUT_TYPE_LABELS,
	type PollFormData,
} from "./types";

interface ReviewStepProps {
	formData: PollFormData;
	onBack: () => void;
	onSaveDraft: () => void;
	onSaveAndPublishPost: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
	formData,
	onBack,
	onSaveDraft,
	onSaveAndPublishPost,
}) => {
	const { data: gdNationalities } = useGDNationalities();
	const displayOptions = getDisplayAnswerOptions(
		formData.inputType,
		formData.answerOptions,
	);

	const getTargetGroupDisplay = () => {
		if (formData.targetGroup === "all") {
			return "All Employees";
		}
		const groups: string[] = [];
		if (formData.selectedGenders.length > 0) {
			groups.push(
				`Genders: ${formData.selectedGenders
					.map(getDisplayGenderLabel)
					.join(", ")}`,
			);
		}
		if (formData.selectedNationalities.length > 0) {
			const nationalityLabels = formData.selectedNationalities.map((id) => {
				const match = gdNationalities?.find(
					(n) => String(n.nationality) === id,
				);
				return match ? match.name : id;
			});
			groups.push(`Nationalities: ${nationalityLabels.join(", ")}`);
		}
		return groups.length > 0
			? groups.join(" | ")
			: "Specific Groups (none selected)";
	};

	return (
		<div>
			<div className="space-y-4">
				{/* Basic Info Review */}
				<Card className="p-4">
					<Text className="block mb-3" size="3" weight="medium">
						Basic Information
					</Text>
					<div className="space-y-2 text-sm">
						<div>
							<strong>Title:</strong> {formData.title}
						</div>
						{formData.description && (
							<div>
								<strong>Description:</strong> {formData.description}
							</div>
						)}
						<div>
							<strong>Scheduled:</strong> {formData.isScheduled ? "Yes" : "No"}
						</div>
						{formData.isScheduled && (
							<>
								{formData.startDate && (
									<div>
										<strong>Start Date:</strong>{" "}
										{new Date(formData.startDate).toLocaleString()}
									</div>
								)}
								{formData.endDate && (
									<div>
										<strong>End Date:</strong>{" "}
										{new Date(formData.endDate).toLocaleString()}
									</div>
								)}
							</>
						)}
					</div>
				</Card>

				{/* Target Group Review */}
				<Card className="p-4">
					<Text className="block mb-3" size="3" weight="medium">
						Target Group
					</Text>
					<div className="text-sm break-words">
						<strong>Target:</strong> {getTargetGroupDisplay()}
					</div>
				</Card>

				{/* Question Review */}
				<Card className="p-4">
					<Text className="block mb-3" size="3" weight="medium">
						Question
					</Text>
					<div className="space-y-2 text-sm">
						<div>
							<strong>Question:</strong> {formData.question}
						</div>
						<div>
							<strong>Answer Type:</strong>{" "}
							{POLL_INPUT_TYPE_LABELS[formData.inputType]}
						</div>
						<div>
							<strong>Options:</strong>
						</div>
						<ul className="list-disc list-inside ml-4">
							{displayOptions.map((option) => (
								<li key={option.id}>{option.text}</li>
							))}
						</ul>
					</div>
				</Card>
			</div>

			<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between sm:pt-6">
				<Button className="w-full sm:w-auto" onClick={onBack} variant="outline">
					Back
				</Button>
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
					<Button
						className="w-full sm:w-auto"
						onClick={onSaveDraft}
						variant="outline"
					>
						Save Draft
					</Button>
					<Button
						className="w-full sm:w-auto"
						onClick={onSaveAndPublishPost}
						style={{ background: "#148696" }}
					>
						Save and Publish Post
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ReviewStep;
