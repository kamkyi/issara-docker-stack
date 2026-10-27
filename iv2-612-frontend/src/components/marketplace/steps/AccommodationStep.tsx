import { Box, Checkbox, Text, TextArea } from "@radix-ui/themes";
import { useGDNationalities } from "$src/queries/nationalities";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface AccommodationStepProps {
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

const accommodationOptions = [
	{
		key: "accommodationOnSite",
		label: "Accommodation is on site",
		translationField: "accommodation_details",
	},
	{
		key: "familyMembersCanLiveTogether",
		label: "Family members can live together",
		translationField: null,
	},
	{
		key: "rentUtilitiesAutoDeducted",
		label: "Rent/utilities auto deducted from payroll",
		translationField: "is_rent_utilites_auto_deducted_details",
	},
];

const otherOptions = [
	{
		key: "safeGrievanceMechanism",
		label: "Safe, grievance mechanism",
		translationField: "safe_grievance_mechanism_details",
	},
	{
		key: "probationPeriod",
		label: "Probation period",
		translationField: "probation_period_details",
	},
];

export const AccommodationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: AccommodationStepProps) => {
	const { data: nationalities } = useGDNationalities();
	const selectedNations = data.openToNationalities || [];

	const handleOptionChange = (key: string, checked: boolean) => {
		updateData({ [key]: checked } as Partial<JobPostingData>);
	};

	const handleTranslationUpdate = (
		languageId: number,
		field: string,
		value: string,
	) => {
		const jobTranslations = data.jobTranslations || [];
		const existingIndex = jobTranslations.findIndex(
			(t) => t.language === languageId,
		);

		let updatedTranslations: typeof jobTranslations;
		if (existingIndex >= 0) {
			// Update existing translation (preserve id)
			updatedTranslations = [...jobTranslations];
			updatedTranslations[existingIndex] = {
				...updatedTranslations[existingIndex],
				[field]: value,
			};
		} else {
			// Create new translation entry
			updatedTranslations = [
				...jobTranslations,
				{
					language: Number(languageId), // Ensure language is a number
					[field]: value,
				},
			];
		}

		updateData({
			jobTranslations: updatedTranslations,
		});
	};

	const getTranslationValue = (languageId: number, field: string): string => {
		const translation = data.jobTranslations?.find(
			(t) => Number(t.language) === Number(languageId),
		);
		return (translation?.[field as keyof typeof translation] as string) || "";
	};

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Accommodation & Other Policies</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Define accommodation arrangements and other important policies.
				</Text>
			</div>

			{/* Accommodation */}
			<div className="space-y-4">
				<Text className="block" mb={"2"} size="4" weight="bold">
					Accommodation
				</Text>

				<div className="space-y-3">
					{accommodationOptions.map((option) => {
						const translationField = option.translationField;
						return (
							<label
								className="cursor-pointer block"
								htmlFor={option.key}
								key={option.key}
							>
								<div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50">
									<Checkbox
										checked={
											data[option.key as keyof JobPostingData] as boolean
										}
										className="mt-0.5"
										id={option.key}
										onCheckedChange={(checked) =>
											handleOptionChange(option.key, checked === true)
										}
									/>
									<div className="flex-1">
										<Text
											as="label"
											htmlFor={option.key}
											size="3"
											weight="medium"
										>
											{option.label}
										</Text>
										{option.key === "accommodationOnSite" && (
											<Text
												className="mt-1 block opacity-70"
												color="gray"
												size="1"
											>
												Workers will live at or very close to the workplace
											</Text>
										)}
										{option.key === "familyMembersCanLiveTogether" && (
											<Text
												className="mt-1 block opacity-70"
												color="gray"
												size="1"
											>
												Spouses and children can stay in the same accommodation
											</Text>
										)}
										{option.key === "rentUtilitiesAutoDeducted" && (
											<Text
												className="mt-1 block opacity-70"
												color="gray"
												size="1"
											>
												Housing costs will be automatically deducted from salary
											</Text>
										)}
									</div>
								</div>

								{/* Translation-based details for each nationality */}
								{translationField &&
									data[option.key] === true &&
									selectedNations.length > 0 && (
										<div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-200">
											{selectedNations.map((nationId) => {
												const nationalityName =
													nationalities?.find((n) => n.nationality === nationId)
														?.name || `Nation-${nationId}`;
												return (
													<div key={nationId}>
														<Text
															className="mb-2 block"
															size="3"
															weight="medium"
														>
															Details for {nationalityName}:
														</Text>
														<TextArea
															className="w-full"
															onChange={(e) =>
																handleTranslationUpdate(
																	nationId,
																	translationField,
																	e.target.value,
																)
															}
															placeholder={`Enter details in ${nationalityName} language`}
															rows={3}
															value={getTranslationValue(
																nationId,
																translationField,
															)}
														/>
													</div>
												);
											})}
										</div>
									)}
							</label>
						);
					})}
				</div>
			</div>

			{/* Other Policies */}
			<div className="space-y-4">
				<Text className="block" mb={"2"} size="4" weight="bold">
					Other Policies
				</Text>

				<div className="space-y-3">
					{otherOptions.map((option) => {
						const translationField = option.translationField;
						return (
							<label
								className="cursor-pointer block"
								htmlFor={option.key}
								key={option.key}
							>
								<div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50">
									<Checkbox
										checked={
											data[option.key as keyof JobPostingData] as boolean
										}
										id={option.key}
										onCheckedChange={(checked) =>
											handleOptionChange(option.key, checked === true)
										}
									/>
									<div className="flex-1">
										<Text
											as="label"
											htmlFor={option.key}
											size="3"
											weight="medium"
										>
											{option.label}
										</Text>
										{option.key === "safeGrievanceMechanism" && (
											<Text
												className="mt-1 block opacity-70"
												color="gray"
												size="1"
											>
												Safe channels for workers to report concerns or
												complaints
											</Text>
										)}
										{option.key === "probationPeriod" && (
											<Text
												className="mt-1 block opacity-70"
												color="gray"
												size="1"
											>
												New employees will have a probationary period
											</Text>
										)}
									</div>
								</div>

								{/* Translation-based details for each nationality */}
								{translationField &&
									data[option.key] === true &&
									selectedNations.length > 0 && (
										<div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-200">
											{selectedNations.map((nationId) => {
												const nationalityName =
													nationalities?.find((n) => n.nationality === nationId)
														?.name || `Nation-${nationId}`;
												return (
													<div key={nationId}>
														<Text
															className="mb-2 block"
															size="3"
															weight="medium"
														>
															Details for {nationalityName}:
														</Text>
														<TextArea
															className="w-full"
															onChange={(e) =>
																handleTranslationUpdate(
																	nationId,
																	translationField,
																	e.target.value,
																)
															}
															placeholder={`Enter details in ${nationalityName} language`}
															rows={3}
															value={getTranslationValue(
																nationId,
																translationField,
															)}
														/>
													</div>
												);
											})}
										</div>
									)}
							</label>
						);
					})}
				</div>
			</div>

			{/* Policy Summary */}
			{(accommodationOptions.some(
				(opt) => data[opt.key as keyof JobPostingData],
			) ||
				otherOptions.some((opt) => data[opt.key as keyof JobPostingData])) && (
				<div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
					<Text className="mb-2 block" size="3" weight="medium">
						Policy Summary:
					</Text>
					<div className="space-y-1">
						{data.accommodationOnSite && (
							<Text size="3">• On-site accommodation provided</Text>
						)}
						{data.familyMembersCanLiveTogether && (
							<Text size="3">• Family accommodation available</Text>
						)}
						{data.rentUtilitiesAutoDeducted && (
							<Text size="3">• Housing costs auto-deducted from payroll</Text>
						)}
						{data.safeGrievanceMechanism && (
							<Text size="3">• Safe grievance mechanism in place</Text>
						)}
						{data.probationPeriod && (
							<Text size="3">• Probation period applies</Text>
						)}
					</div>
				</div>
			)}

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				isLoading={isLoading}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
