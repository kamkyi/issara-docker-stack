import { Box, Select, Text } from "@radix-ui/themes";
import { InputField } from "$src/components/inputs/InputField";
import { useCurrencies } from "$src/hooks/useCurrencies";
import type { Currency } from "$src/services/currencyService";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface ContractInformationStepProps {
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

const termsOfPaymentOptions = [
	{ code: "Monthly", label: "Monthly" },
	{ code: "Daily", label: "Daily Wage Rate" },
];

const timingOfPaymentOptions = [
	"Once A Month",
	"Twice A Month",
	"Every Week",
	"Every 10 Days",
	"Other",
];

export const ContractInformationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: ContractInformationStepProps) => {
	const { data: currencies = [] as Currency[], isLoading: currenciesLoading } =
		useCurrencies();

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Contract Information: PAY</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Define the payment terms and salary information.
				</Text>
			</div>

			{/* Terms of Payment */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Terms of Payment *
				</Text>
				<Select.Root
					onValueChange={(value) =>
						updateData({
							termsOfPayment: value === "Daily Wage Rate" ? "Daily" : value,
						})
					}
					value={data.termsOfPayment}
				>
					<Select.Trigger
						className="w-full"
						placeholder="Select payment terms"
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{termsOfPaymentOptions?.map((term) => (
							<Select.Item key={term.code} value={term.code}>
								{term.label}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Timing of Payment */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Timing of Payment *
				</Text>
				<Select.Root
					onValueChange={(value) => updateData({ timingOfPayment: value })}
					value={data.timingOfPayment}
				>
					<Select.Trigger
						className="w-full"
						placeholder="Select payment timing"
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{timingOfPaymentOptions?.map((timing) => (
							<Select.Item key={timing} value={timing}>
								{timing}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Currency */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Currency *
				</Text>
				<Select.Root
					onValueChange={(value) => {
						const selectedCurrency = currencies?.find(
							(c) => c.id === Number(value),
						);
						updateData({
							currency: selectedCurrency?.id || Number(value),
						});
					}}
					value={data.currency?.toString()}
				>
					<Select.Trigger
						className="w-full"
						placeholder={
							currenciesLoading ? "Loading currencies..." : "Select currency"
						}
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{currencies?.map((currency) => (
							<Select.Item key={currency.id} value={currency.id.toString()}>
								{currency.code}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Monthly Salary */}
			{data.termsOfPayment === "Monthly" ? (
				<InputField
					label={`Monthly Salary (${currencies?.find((c) => c.id === data.currency)?.code || "Currency"}/month)*`}
					maxLength={5}
					min="0"
					onChange={(e) => updateData({ salary: parseFloat(e.target.value) })}
					placeholder="Enter monthly salary amount"
					required
					// step="0.01"
					type="number"
					value={data.salary ? String(data.salary) : ""}
				/>
			) : (
				<InputField
					label={`Daily Wage (${currencies?.find((c) => c.id === data.currency)?.code || "Currency"}/day)*`}
					min="0"
					onChange={(e) =>
						updateData({ dailyWageRate: parseFloat(e.target.value) })
					}
					placeholder="Enter Daily wage amount"
					required
					// step="0.01"
					type="number"
					value={data.dailyWageRate ? String(data.dailyWageRate) : ""}
				/>
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
