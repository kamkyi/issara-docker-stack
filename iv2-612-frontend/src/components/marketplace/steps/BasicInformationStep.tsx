import { Box, Checkbox, Grid, Text } from "@radix-ui/themes";
import { MultiSelectDropdown } from "$src/components/business/MultiSelectDropdown";
import { useGDNationalities } from "$src/queries/nationalities";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface BasicInformationStepProps {
	data: JobPostingData;
	updateData: (updates: Partial<JobPostingData>) => void;
	onNext: () => void;
	onPrevious: () => void;
	onSaveDraft?: () => void;
	onPreview?: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	isLoading?: boolean;
}

export const BasicInformationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: BasicInformationStepProps) => {
	const { data: nationalities } = useGDNationalities();

	const openToNationalitiesOptions =
		nationalities?.map((nat) => ({
			id: nat.nationality,
			name: nat.name,
		})) || [];

	const selectedIds = openToNationalitiesOptions
		.filter((option) => data.openToNationalities?.includes(option.id))
		.map((option) => option.id);

	const handle_openToNationalitiesChange = (selectedIds: number[]) => {
		const selectedNames = openToNationalitiesOptions
			.filter((option) => selectedIds?.includes(option.id))
			.map((option) => option.id);
		updateData({ openToNationalities: selectedNames });
	};
	const requireDocumentation = [
		{ id: 1, label: "Pink Card" },
		{ id: 2, label: "Passport" },
		{ id: 3, label: "Work Permit" },
		{ id: 4, label: "Visa" },
		{ id: 5, label: "Cancellation Letter" },
	];

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Basic Information</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Let's start with some basic information about your job posting.
				</Text>
			</div>

			{/* Open To */}
			<div className="space-y-2">
				<MultiSelectDropdown
					items={openToNationalitiesOptions}
					label="Open To"
					onChange={handle_openToNationalitiesChange}
					placeholder="Select who can apply (Employer / Supplier)"
					selectedIds={selectedIds}
				/>
			</div>

			{/* Require Documentation */}
			<div>
				<Text as="label" size="3">
					Documentation Requirements
				</Text>
				<Grid columns={"3"} gap="4" mt={"3"}>
					{requireDocumentation?.map((doc) => (
						<label
							className="flex bg-gray-50 border border-gray-200 rounded-md items-center gap-2 cursor-pointer p-2"
							htmlFor={doc.label}
							key={doc.id}
						>
							<Checkbox
								checked={data.requireDocumentation?.includes(doc.label)}
								id={doc.label}
								onCheckedChange={(checked) => {
									let updatedDocs = [...(data.requireDocumentation || [])];
									if (checked) {
										updatedDocs.push(doc.label);
									} else {
										updatedDocs = updatedDocs.filter(
											(item) => item !== doc.label,
										);
									}
									updateData({ requireDocumentation: updatedDocs });
								}}
							/>
							{doc.label}
						</label>
					))}
				</Grid>
			</div>

			{/* Validation */}
			{data.openToNationalities?.length === 0 && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-md">
					<Text color="red" size="3">
						⚠️ Please select at least one target audience to continue.
					</Text>
				</div>
			)}

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				isLoading={isLoading}
				nextDisabled={data.openToNationalities?.length === 0}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
