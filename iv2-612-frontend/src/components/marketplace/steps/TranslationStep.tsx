import { Box, RadioGroup, Text, TextArea } from "@radix-ui/themes";
import { InputField } from "$src/components/inputs/InputField";
import { useGDNationalities } from "$src/queries/nationalities";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface TranslationStepProps {
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

const contactJobTitles = [
	{ value: "HR_ASSISTANT", label: "HR Assistant" },
	{ value: "HR_INTERPRETER", label: "HR Interpreter" },
	{ value: "HR_MANAGER", label: "HR Manager" },
	{ value: "HR_OFFICER", label: "HR Officer" },
];

// Burmese language IDs - Burmese requires two translations
const BURMESE_ZAWGYI_LANGUAGE_ID = 2;
const BURMESE_UNICODE_LANGUAGE_ID = 4;

// Check if nationality is Burmese
const isBurmeseNationality = (nationalityName: string): boolean => {
	return (
		nationalityName.toLowerCase().includes("burmese") ||
		nationalityName.toLowerCase().includes("myanmar")
	);
};

// Function to get country flag emoji
const getCountryFlag = (country: string): string => {
	const flagMap: Record<string, string> = {
		Employer: "🏢", // Building emoji for employer
		Supplier: "🏭", // Factory emoji for supplier
		Bangladeshi: "🇧🇩",
		Nepalese: "🇳🇵",
		Burmese: "🇲🇲",
		Khmer: "🇰🇭",
		Thai: "🇹🇭",
	};

	return flagMap[country] || "🌍"; // Default to world emoji if country not found
};

export const TranslationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: TranslationStepProps) => {
	// Get the selected nations from openToNationalities field
	const selectedNations = data.openToNationalities || [];
	const { data: nationalities } = useGDNationalities();

	// If no nations selected, show message
	if (selectedNations.length === 0) {
		return (
			<Box className="space-y-6">
				<div>
					<h3 className="mb-2 block text-2xl">Translation</h3>
					<Text className="mb-6 block" color="gray" size="4">
						Provide job posting translations for different target audiences.
					</Text>
				</div>

				<div className="p-6 bg-yellow-50 border border-yellow-200 rounded-md text-center">
					<Text className="mb-2 block" size="4" weight="medium">
						No Target Audience Selected
					</Text>
					<Text color="gray" size="3">
						Please go back to Basic Information and select who this job posting
						is open to (Employer/Supplier) to configure translations.
					</Text>
				</div>

				<FormStepNavigation
					isFirstStep={isFirstStep}
					isLastStep={isLastStep}
					isLoading={isLoading}
					onNext={onNext}
					onPrevious={onPrevious}
				/>
			</Box>
		);
	}

	const handleTranslationUpdate = (
		languageId: number,
		field: string,
		value: string,
		nationalityName: string,
	) => {
		const jobTranslations = data.jobTranslations || [];
		const isBurmese = isBurmeseNationality(nationalityName);

		// For Burmese, we need to update both Zawgyi (2) and Unicode (4) entries
		const languageIdsToUpdate = isBurmese
			? [BURMESE_ZAWGYI_LANGUAGE_ID, BURMESE_UNICODE_LANGUAGE_ID]
			: [languageId];

		const updatedTranslations = [...jobTranslations];

		languageIdsToUpdate.forEach((langId) => {
			// Find existing translation for this language
			const existingIndex = updatedTranslations.findIndex((t) => {
				return Number(t.language) === Number(langId);
			});

			if (existingIndex >= 0) {
				// Update existing translation (preserve id if it exists)
				updatedTranslations[existingIndex] = {
					...updatedTranslations[existingIndex],
					[field]: value,
				};
			} else {
				// Create new translation entry
				updatedTranslations.push({
					language: Number(langId),
					[field]: value,
				});
			}
		});

		updateData({
			jobTranslations: updatedTranslations,
		});
	};

	return (
		<Box className="space-y-8">
			<div>
				<Text className="mb-2 block" size="6" weight="bold">
					Translation
				</Text>
				<Text className="mb-6 block" color="gray" size="4">
					Provide job posting details for each target audience. Complete all
					sections for better reach.
				</Text>
			</div>

			{selectedNations.map((nationId) => {
				const nationality = nationalities?.find(
					(n) => n.nationality === nationId,
				);
				const nationalityName = nationality?.name || `Nation-${nationId}`;
				const languageId = nationality?.language || nationId;

				const isBurmese = isBurmeseNationality(nationalityName);

				// For Burmese, use Unicode (4) as the primary display, but save to both
				// For other nationalities, use their respective language ID
				const displayLanguageId = isBurmese
					? BURMESE_UNICODE_LANGUAGE_ID
					: languageId;

				// Find translation for this language in the array
				const nationTranslations = data.jobTranslations?.find(
					(t) => Number(t.language) === Number(displayLanguageId),
				) || {
					language: displayLanguageId,
					title: "",
					job_position_details: "",
					description: "",
					requirements: "",
					contact_name: "",
					contact_phone_number: "",
					contact_job_title: "",
				};

				return (
					<div
						className="p-6 border border-gray-200 rounded-md bg-gray-50"
						key={nationId}
					>
						<Text className="mb-4 block text-blue-700" size="4" weight="bold">
							{getCountryFlag(nationalityName)} {nationalityName} Job Posting
							Details
						</Text>
						{isBurmese && (
							<div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
								<Text color="blue" size="1">
									ℹ️ Burmese translations will be saved in both Unicode and
									Zawgyi formats
								</Text>
							</div>
						)}

						<div className="space-y-4">
							{/* Job Title */}
							<InputField
								label="Job Title *"
								onChange={(e) =>
									handleTranslationUpdate(
										languageId,
										"title",
										e.target.value,
										nationalityName,
									)
								}
								placeholder="Enter job title for this audience"
								required
								value={nationTranslations.title || ""}
							/>

							{/* Position Details */}
							<InputField
								label="Position Details *"
								onChange={(e) =>
									handleTranslationUpdate(
										languageId,
										"job_position_details",
										e.target.value,
										nationalityName,
									)
								}
								placeholder="Brief position summary or key details"
								required
								value={nationTranslations.job_position_details || ""}
							/>

							{/* Job Description */}
							<div className="space-y-2">
								<Text as="label" size="3" weight="medium">
									Job Description *
								</Text>
								<TextArea
									className="w-full"
									onChange={(e) =>
										handleTranslationUpdate(
											languageId,
											"description",
											e.target.value,
											nationalityName,
										)
									}
									placeholder="Detailed job description, responsibilities, and requirements..."
									rows={4}
									value={nationTranslations.description || ""}
								/>
							</div>

							{/* Applicant Requirements */}
							<div className="space-y-2">
								<Text as="label" size="3" weight="medium">
									Applicant Requirements *
								</Text>
								<TextArea
									className="w-full"
									onChange={(e) =>
										handleTranslationUpdate(
											languageId,
											"requirements",
											e.target.value,
											nationalityName,
										)
									}
									placeholder="Required qualifications, skills, experience, certifications..."
									rows={3}
									value={nationTranslations.requirements || ""}
								/>
							</div>

							{/* Contact Information Section */}
							<div className="mt-6 pt-4 border-t border-gray-300">
								<Text className="mb-4 block" size="4" weight="bold">
									📞 Contact Information
								</Text>

								<div className="grid grid-cols-2 gap-4">
									{/* Contact Name */}
									<InputField
										label="Contact Name *"
										onChange={(e) =>
											handleTranslationUpdate(
												languageId,
												"contact_name",
												e.target.value,
												nationalityName,
											)
										}
										placeholder="Full name of contact person"
										required
										value={nationTranslations.contact_name || ""}
									/>

									{/* Phone Number */}
									<InputField
										label="Phone Number *"
										onChange={(e) =>
											handleTranslationUpdate(
												languageId,
												"contact_phone_number",
												e.target.value,
												nationalityName,
											)
										}
										placeholder="e.g. +1-555-123-4567"
										required
										type="tel"
										value={nationTranslations.contact_phone_number || ""}
									/>
								</div>

								{/* Contact Job Title */}
								<div className="space-y-3 mt-4">
									<Text as="label" size="3" weight="medium">
										Contact Job Title *
									</Text>
									<RadioGroup.Root
										className="grid grid-cols-2 gap-2"
										onValueChange={(value) =>
											handleTranslationUpdate(
												languageId,
												"contact_job_title",
												value,
												nationalityName,
											)
										}
										value={nationTranslations.contact_job_title || ""}
									>
										{contactJobTitles.map((title) => (
											<div
												className="flex items-center gap-2"
												key={title.value}
											>
												<RadioGroup.Item
													id={`${nationId}-${title.value.toLowerCase()}`}
													value={title.value}
												/>
												<Text
													as="label"
													htmlFor={`${nationId}-${title.value.toLowerCase()}`}
													size="3"
												>
													{title.label}
												</Text>
											</div>
										))}
									</RadioGroup.Root>
								</div>
							</div>
						</div>

						{/* Translation Progress */}
						<div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
							<Text className="mb-1 block" size="3" weight="medium">
								Translation Progress for {getCountryFlag(nationalityName)}{" "}
								{nationalityName}:
							</Text>
							<div className="flex flex-wrap gap-2">
								{nationTranslations.title && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Job Title
									</span>
								)}
								{nationTranslations.job_position_details && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Position Details
									</span>
								)}
								{nationTranslations.description && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Job Description
									</span>
								)}
								{nationTranslations.requirements && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Requirements
									</span>
								)}
								{nationTranslations.contact_name && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Contact Name
									</span>
								)}
								{nationTranslations.contact_phone_number && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Phone
									</span>
								)}
								{nationTranslations.contact_job_title && (
									<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
										✓ Contact Title
									</span>
								)}
							</div>
						</div>
					</div>
				);
			})}

			{/* Overall Translation Summary */}
			<div className="p-4 bg-green-50 border border-green-200 rounded-md">
				<Text className="mb-2 block" size="3" weight="medium">
					Translation Summary:
				</Text>
				<div className="space-y-1">
					<Text size="3">
						• {selectedNations.length} target audience
						{selectedNations.length > 1 ? "s" : ""}:{" "}
						{selectedNations
							.map(
								(nationId) =>
									nationalities?.find((n) => n.nationality === nationId)
										?.name || `Nation-${nationId}`,
							)
							.join(", ")}
					</Text>
					{selectedNations.map((nationId) => {
						const nationality = nationalities?.find(
							(n) => n.nationality === nationId,
						);
						const nationalityName = nationality?.name || `Nation-${nationId}`;
						const languageId = nationality?.language || nationId;
						const isBurmese = isBurmeseNationality(nationalityName);

						// For Burmese, check Unicode translation; for others, check their language
						const checkLanguageId = isBurmese
							? BURMESE_UNICODE_LANGUAGE_ID
							: languageId;

						const translations = data.jobTranslations?.find(
							(t) => Number(t.language) === Number(checkLanguageId),
						);
						const completedFields = translations
							? [
									translations.title,
									translations.job_position_details,
									translations.description,
									translations.requirements,
									translations.contact_name,
									translations.contact_phone_number,
									translations.contact_job_title,
								].filter(Boolean).length
							: 0;
						const totalFields = 7;

						return (
							<Text key={nationId} size="3">
								• {getCountryFlag(nationalityName)} {nationalityName}:{" "}
								{completedFields}/{totalFields} fields completed
								{isBurmese && " (saved in Unicode & Zawgyi)"}
							</Text>
						);
					})}
				</div>
			</div>

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
