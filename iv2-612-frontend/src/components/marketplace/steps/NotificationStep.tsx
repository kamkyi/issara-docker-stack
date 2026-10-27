import { ArrowLeftIcon, RocketIcon } from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import { statusColorPalette } from "$src/assets/mock/common-data";
import CascadeButton from "$src/components/button/button";
import { InputField } from "$src/components/inputs/InputField";
import type { JobPostingData } from "../JobPostingForm";

interface NotificationStepProps {
	data: JobPostingData;
	updateData: (updates: Partial<JobPostingData>) => void;
	onNext: () => void;
	onPrevious: () => void;
	onSaveDraft?: () => void;
	onSubmit?: () => void;
	onPreview?: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	isLoading?: boolean;
}

export const NotificationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	onSubmit,
	onPreview,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: NotificationStepProps) => {
	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const handleSubmit = async () => {
		if (!data.notificationEmail || !isValidEmail(data.notificationEmail)) {
			alert(
				"Please enter a valid email address for notifications before submitting your job posting.",
			);
			return;
		}

		// Submit the final job posting
		if (onSubmit) {
			onSubmit();
		}
	};

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Notification</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Provide an email address to receive notifications about applications
					and updates.
				</Text>
			</div>

			{/* Email for Notifications */}
			<InputField
				label="Email for Notifications *"
				onChange={(e) => updateData({ notificationEmail: e.target.value })}
				placeholder="Enter email address for job posting notifications (e.g., name@example.com)"
				required
				type="email"
				value={data.notificationEmail}
			/>

			{data.notificationEmail && !isValidEmail(data.notificationEmail) && (
				<Text color="red" size="3">
					Please enter a valid email address.
				</Text>
			)}

			{/* Notification Info */}
			{/* <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
				<Text className="mb-2 block" size="3" weight="medium">
					You will receive notifications for:
				</Text>
				<div className="flex flex-col space-y-1">
					<Text size="3">• New job applications</Text>
					<Text size="3">• Application status updates</Text>
					<Text size="3">• Job posting expiration reminders</Text>
					<Text size="3">• System updates and announcements</Text>
				</div>
			</div> */}

			{/* Form Summary */}
			<div className="p-6 bg-gray-50 border border-gray-200 rounded-md">
				<Text size="4" weight="bold">
					Job Posting Summary
				</Text>
				<div className="grid grid-cols-2 gap-4 text-sm mt-4">
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Job Title:
						</Text>
						<Text color="gray" size="3">
							{data.jobTitle || "Not specified"}
						</Text>
					</Flex>
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Industry:
						</Text>
						<Text color="gray" size="3">
							{data.employerIndustry || "Not specified"}
						</Text>
					</Flex>
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Location:
						</Text>
						<Text color="gray" size="3">
							{data.city && data.state && data.country
								? `${data.city}, ${data.state}, ${data.country}`
								: "Not specified"}
						</Text>
					</Flex>
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Salary:
						</Text>
						<Text color="gray" size="3">
							{data.salary > 0
								? `${data.currency} ${data.salary.toLocaleString()}/month`
								: "Not specified"}
						</Text>
					</Flex>
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Job Type:
						</Text>
						<Text color="gray" size="3">
							{data.jobType || "Not specified"}
						</Text>
					</Flex>
					<Flex gap="1" justify={"between"}>
						<Text size="3" weight="bold">
							Headcount:
						</Text>
						<Text color="gray" size="3">
							{data.headcountNeeded || "Not specified"}
						</Text>
					</Flex>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex justify-end gap-3 mb-6">
				{onPreview && (
					<CascadeButton
						buttonText="Preview Job Posting"
						handleOnClick={onPreview}
						size="2"
						variant="soft"
					/>
				)}
			</div>

			{/* Navigation */}
			<Flex className="pt-6 border-t border-gray-200" justify="between">
				<CascadeButton
					buttonText="Previous"
					color={statusColorPalette[10]}
					disabled={isFirstStep || isLoading}
					handleOnClick={onPrevious}
					iconLeft={<ArrowLeftIcon />}
					size="4"
				/>
				<CascadeButton
					buttonText={isLoading ? "Creating..." : isLastStep ? "Post" : "Next"}
					disabled={
						(isLastStep &&
							(!data.notificationEmail ||
								!isValidEmail(data.notificationEmail))) ||
						isLoading
					}
					handleOnClick={isLastStep ? handleSubmit : onNext}
					iconRight={<RocketIcon />}
					size="4"
				/>
			</Flex>
		</Box>
	);
};
