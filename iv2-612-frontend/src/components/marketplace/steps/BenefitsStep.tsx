import { Box, Checkbox, RadioGroup, Text } from "@radix-ui/themes";
import { InputField } from "$src/components/inputs/InputField";
import { useBenefitCategories, useBenefits } from "$src/hooks/useBenefits";
import { useGDNationalities } from "$src/queries/nationalities";
import type { Benefit, BenefitCategory } from "$src/services/benefitsService";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface BenefitsStepProps {
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

export const BenefitsStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: BenefitsStepProps) => {
	const { data: benefits = [] as Benefit[], isLoading: benefitsLoading } =
		useBenefits();
	const {
		data: benefitCategories = [] as BenefitCategory[],
		isLoading: categoriesLoading,
	} = useBenefitCategories();
	const { data: nationalities } = useGDNationalities();

	const handleBenefitChange = (benefitId: number, checked: boolean) => {
		const currentSelected = data.selectedBenefits || [];
		let updatedSelected: number[];

		if (checked) {
			updatedSelected = [...currentSelected, benefitId];
		} else {
			updatedSelected = currentSelected.filter((id) => id !== benefitId);
		}

		updateData({ selectedBenefits: updatedSelected });
	};

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Benefits</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Define the benefits and leave policies for this position.
				</Text>
			</div>

			{/* Leave Benefits */}
			<div className="space-y-4">
				<Text className="mb-3 block" size="4" weight="bold">
					Leave Benefits
				</Text>

				<div className="grid grid-cols-2 gap-4">
					<InputField
						label="How many days of paid annual leave are provided per year?"
						min="0"
						onChange={(e) =>
							updateData({ paidAnnualLeave: Number(e.target.value) || 0 })
						}
						placeholder="e.g. 14"
						type="number"
						value={data.paidAnnualLeave.toString()}
					/>

					<InputField
						label="How many days of paid sick leave are provided per year?"
						min="0"
						onChange={(e) =>
							updateData({ paidSickLeave: Number(e.target.value) || 0 })
						}
						placeholder="e.g. 30"
						type="number"
						value={data.paidSickLeave.toString()}
					/>

					<InputField
						label="How many days of paid business leave are provided per year?"
						min="0"
						onChange={(e) =>
							updateData({ paidBusinessLeave: Number(e.target.value) || 0 })
						}
						placeholder="e.g. 3"
						type="number"
						value={data.paidBusinessLeave.toString()}
					/>

					<InputField
						label="How many days of paid national holidays are provided per year?"
						min="0"
						onChange={(e) =>
							updateData({
								paidNationalHolidays: Number(e.target.value) || 0,
							})
						}
						placeholder="e.g. 13"
						type="number"
						value={data.paidNationalHolidays.toString()}
					/>
				</div>
			</div>

			{/* Social Security Benefits */}
			<div className="space-y-3">
				<Text size="4" weight="bold">
					Social Security Benefits
				</Text>
				<label className="block mb-2" htmlFor="social-security-benefits">
					<Text size="3" weight="medium">
						Are social security and maternity leave benefits provided as
						required by law?
					</Text>
				</label>
				<RadioGroup.Root
					onValueChange={(value) =>
						updateData({ socialSecurityBenefits: value === "yes" })
					}
					value={data.socialSecurityBenefits ? "yes" : "no"}
				>
					<div className="flex items-center gap-2">
						<RadioGroup.Item id={"social-yes"} value="yes" />
						<Text as="label" htmlFor="social-yes" size="3">
							Yes - these benefits are provided
						</Text>
					</div>
					<div className="flex items-center gap-2">
						<RadioGroup.Item id={"social-no"} value="no" />
						<Text as="label" htmlFor="social-no" size="3">
							No - these benefits benefits not provided
						</Text>
					</div>
				</RadioGroup.Root>
			</div>

			{/* Benefits by Categories - API Data */}
			{benefitsLoading || categoriesLoading ? (
				<div className="p-4 text-center">
					<Text color="gray" size="2">
						Loading benefits and categories...
					</Text>
				</div>
			) : (
				<div className="space-y-6">
					{benefitCategories
						?.filter((bc) => bc.benefit_category === 1)
						.map((category) => {
							const categoryBenefits = benefits?.filter(
								(benefit) => benefit.category_id === category.benefit_category,
							);

							if (categoryBenefits?.length === 0) return null;

							return (
								<div className="space-y-4" key={category.benefit_category}>
									<Text className="mb-3 block" size="4" weight="bold">
										{category.name}
									</Text>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										{categoryBenefits?.map((benefit) => (
											<label
												className="flex cursor-pointer items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
												htmlFor={`benefit-${benefit.id}`}
												key={benefit.id}
											>
												<Checkbox
													checked={(data.selectedBenefits || []).includes(
														benefit.id,
													)}
													id={`benefit-${benefit.id}`}
													onCheckedChange={(checked) =>
														handleBenefitChange(benefit.id, checked === true)
													}
												/>
												<div className="flex-1">
													<Text
														as="label"
														htmlFor={`benefit-${benefit.id}`}
														size="3"
														weight="medium"
													>
														{benefit.name}
													</Text>
													{benefit.type && (
														<Text
															className="mt-1 block opacity-70"
															color="gray"
															size="1"
														>
															Type: {benefit.type}
														</Text>
													)}
												</div>
											</label>
										))}
									</div>
								</div>
							);
						})}

					{!benefitsLoading &&
						!categoriesLoading &&
						benefitCategories?.length === 0 && (
							<div className="p-4 text-center bg-gray-50 rounded-md">
								<Text color="gray" size="2">
									No benefit categories available
								</Text>
							</div>
						)}
				</div>
			)}

			{/* Benefits Details by Nationality */}
			{(data.selectedBenefits || []).length > 0 &&
				(data.openToNationalities || []).length > 0 && (
					<div className="space-y-4">
						<Text className="mb-3 block" size="4" weight="bold">
							Benefits Details by Nationality
						</Text>
						<Text className="mb-4 block" color="gray" size="3">
							Provide additional details about benefits for each target
							nationality.
						</Text>

						{(data.openToNationalities || []).map((nationId) => {
							const nationalityName =
								nationalities?.find((n) => n.nationality === nationId)?.name ||
								`Nation-${nationId}`;
							const translation = data.jobTranslations?.find(
								(t) => Number(t.language) === Number(nationId),
							);

							return (
								<div
									className="p-4 border border-gray-200 rounded-md"
									key={nationId}
								>
									<Text className="mb-3 block" size="3" weight="medium">
										Benefits Details for {nationalityName}:
									</Text>
									<textarea
										className="border w-full border-gray-200 rounded-xs p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
										onChange={(e) => {
											const jobTranslations = data.jobTranslations || [];
											const existingIndex = jobTranslations.findIndex(
												(t) => Number(t.language) === Number(nationId),
											);

											let updatedTranslations: typeof jobTranslations;
											if (existingIndex >= 0) {
												// Update existing translation (preserve id)
												updatedTranslations = [...jobTranslations];
												updatedTranslations[existingIndex] = {
													...updatedTranslations[existingIndex],
													benefits_details: e.target.value,
												};
											} else {
												// Create new translation entry
												updatedTranslations = [
													...jobTranslations,
													{
														language: Number(nationId), // Ensure language is a number
														benefits_details: e.target.value,
													},
												];
											}

											updateData({ jobTranslations: updatedTranslations });
										}}
										placeholder={`Enter benefits details in ${nationalityName} language`}
										rows={4}
										value={translation?.benefits_details || ""}
									/>
								</div>
							);
						})}
					</div>
				)}

			{/* Benefits Summary */}
			<div className="p-4 bg-green-50 border border-green-200 rounded-md">
				<Text className="mb-2 block" size="3" weight="medium">
					Benefits Summary:
				</Text>
				<div className="space-y-1">
					{data.paidAnnualLeave > 0 && (
						<Text size="3">• {data.paidAnnualLeave} days annual leave</Text>
					)}
					{data.paidSickLeave > 0 && (
						<Text size="3">• {data.paidSickLeave} days sick leave</Text>
					)}
					{data.socialSecurityBenefits && (
						<Text size="3">• Social security & maternity benefits</Text>
					)}
					{(data.selectedBenefits || []).length > 0 && (
						<>
							{benefits
								?.filter((b) => (data.selectedBenefits || []).includes(b.id))
								.map((benefit) => (
									<Text key={benefit.id} size="3">
										• {benefit.name}
									</Text>
								))}
							<Text
								className="mt-2 block"
								color="green"
								size="3"
								weight="medium"
							>
								Total: {(data.selectedBenefits || []).length} additional
								benefits selected
							</Text>
						</>
					)}
				</div>
			</div>

			{/* Validation */}
			{(data.paidAnnualLeave < 0 ||
				data.paidSickLeave < 0 ||
				data.paidBusinessLeave < 0 ||
				data.paidNationalHolidays < 0) && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-md">
					<Text color="red" size="3">
						⚠️ Please enter valid values for all leave benefits (0 or greater).
					</Text>
				</div>
			)}

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				isLoading={isLoading}
				nextDisabled={
					data.paidAnnualLeave < 0 ||
					data.paidSickLeave < 0 ||
					data.paidBusinessLeave < 0 ||
					data.paidNationalHolidays < 0
				}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
