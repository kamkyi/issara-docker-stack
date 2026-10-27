import { Box, Select, Text } from "@radix-ui/themes";
import { forwardRef } from "react";
import CascadeDatePicker from "$src/components/inputs/CascadeDatePicker";
import { InputField } from "$src/components/inputs/InputField";
import { useGDIndustries, useGDSubIndustries } from "$src/hooks/useIndustries";
import { useJobPositionCategories } from "$src/hooks/useJobPositionCategories";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface JobInformationStepProps {
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

const jobTypes = ["Full-time", "Part-time"];

const ExpiryDateInput = forwardRef<
	HTMLButtonElement,
	{
		value?: string;
		onClick?: () => void;
	}
>(({ value, onClick }, ref) => {
	return (
		<button
			className="flex h-[44px] w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-base text-gray-900 transition-all duration-200 hover:border-[#148696] "
			onClick={onClick}
			ref={ref}
			type="button"
		>
			<div className="flex min-w-0 flex-col">
				<span className={value ? "text-gray-900" : "text-gray-400"}>
					{value || "Choose expiry date"}
				</span>
			</div>
			<svg
				aria-hidden="true"
				className="h-5 w-5 shrink-0 text-[#148696]"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.75}
				/>
			</svg>
		</button>
	);
});

ExpiryDateInput.displayName = "ExpiryDateInput";

export const JobInformationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: JobInformationStepProps) => {
	const { data: industries } = useGDIndustries();
	const { data: subIndustries } = useGDSubIndustries();
	const { data: positionCategories, isLoading: categoriesLoading } =
		useJobPositionCategories("en");
	const modifiedIndustriesData = subIndustries?.map((si) => ({
		id: si.id,
		name:
			industries?.find((i) => i.industry === si.industry_id)?.name +
			": " +
			si.name,
	}));

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Job Information</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Provide details about the job position and requirements.
				</Text>
			</div>

			{/* Job Title */}
			<InputField
				label="Job Title *"
				onChange={(e) => updateData({ jobTitle: e.target.value })}
				placeholder="e.g. Packaging wokers, Sewing Supervisor"
				required
				value={data.jobTitle}
			/>

			{/* Industry */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Industry *
				</Text>
				<Select.Root
					onValueChange={(value) => updateData({ employerIndustry: value })}
					value={data.employerIndustry}
				>
					<Select.Trigger
						className="w-full"
						placeholder="Select industry"
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{modifiedIndustriesData?.map((ind) => (
							<Select.Item key={ind.id} value={ind.id}>
								{ind.name}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Position Category */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Position Category *
				</Text>
				<Select.Root
					onValueChange={(value) => {
						const selectedCategory = positionCategories?.find(
							(c) => c.id === Number(value),
						);
						updateData({
							positionCategory: selectedCategory?.id.toString() || "",
						});
					}}
					value={data.positionCategory?.toString()}
				>
					<Select.Trigger
						className="w-full"
						placeholder={
							categoriesLoading
								? "Loading categories..."
								: "Select position category"
						}
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{categoriesLoading
							? null
							: positionCategories?.map((category) => (
									<Select.Item
										key={category.id}
										value={category.id?.toString()}
									>
										{category.name}
									</Select.Item>
								))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Job Type */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Job Type *
				</Text>
				<Select.Root
					onValueChange={(value) => updateData({ jobType: value })}
					value={data.jobType}
				>
					<Select.Trigger
						className="w-full"
						placeholder="Select job type"
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{jobTypes.map((type) => (
							<Select.Item key={type} value={type}>
								{type}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Expiry Date */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Expiry Date *
				</Text>
				<Text color="gray" size="2">
					Choose the last date candidates can apply for this role.
				</Text>
				<CascadeDatePicker
					customInput={<ExpiryDateInput />}
					minDate={new Date()}
					onChange={(date: Date | null) => {
						if (date) {
							updateData({ expiryDate: date.toISOString() });
						}
					}}
					placeholderText="Select expiry date"
					selected={data.expiryDate ? new Date(data.expiryDate) : null}
				/>
			</div>

			{/* Headcount Needed */}
			<InputField
				label="Headcount Needed *"
				min="1"
				onChange={(e) =>
					updateData({ headcountNeeded: Number(e.target.value) || 1 })
				}
				placeholder="Number of positions available"
				required
				type="number"
				value={data.headcountNeeded?.toString()}
			/>

			{/* Contract Duration */}
			<InputField
				label="Contract Duration (months) *"
				min="1"
				onChange={(e) =>
					updateData({ contractDuration: Number(e.target.value) || 12 })
				}
				placeholder="Duration in months"
				required
				type="number"
				value={data.contractDuration?.toString()}
			/>

			{/* Validation */}
			{(!data.jobTitle ||
				!data.employerIndustry ||
				!data.positionCategory ||
				!data.jobType ||
				!data.expiryDate ||
				data.headcountNeeded <= 0 ||
				data.contractDuration <= 0) && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-md">
					<Text color="red" size="3">
						⚠️ Please fill in all required fields to continue.
					</Text>
				</div>
			)}

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				isLoading={isLoading}
				nextDisabled={
					!data.jobTitle ||
					!data.employerIndustry ||
					!data.positionCategory ||
					!data.jobType ||
					!data.expiryDate ||
					data.headcountNeeded <= 0 ||
					data.contractDuration <= 0
				}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
