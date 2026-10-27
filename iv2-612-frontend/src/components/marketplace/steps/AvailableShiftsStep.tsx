import { Box, Select, Text } from "@radix-ui/themes";
import { InputField } from "$src/components/inputs/InputField";
import { useCurrencies } from "$src/hooks/useCurrencies";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface AvailableShiftsStepProps {
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

const daysOfWeek = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

const overtimeOptions = [
	"Regularly",
	"From time to time",
	"Infrequently",
	"Never",
];

const shiftOptions = ["Day", "Swing", "Night", "Rotating", "Variable"];

export const AvailableShiftsStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
	isLoading = false,
}: AvailableShiftsStepProps) => {
	const { data: currencies } = useCurrencies();
	const currencyCode = currencies?.find((c) => c.id === data.currency)?.code;
	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Available Shifts</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Define working hours, overtime expectations, and day-off policies.
				</Text>
			</div>

			{/* Available Shift */}
			<div className="space-y-2">
				<Text as="label" className="flex" size="3" weight="medium">
					Available Shift *
				</Text>
				<div>
					<Select.Root
						onValueChange={(value) => updateData({ availableShift: value })}
						value={data.availableShift}
					>
						<Select.Trigger
							placeholder="Select shift type"
							style={{
								width: "100%",
								height: 40,
							}}
						/>
						<Select.Content>
							{shiftOptions.map((option) => (
								<Select.Item key={option} value={option}>
									{option}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			{/* Overtime Expectation */}
			<div className="space-y-2">
				<Text as="label" className="flex" size="3" weight="medium">
					Overtime Expectation *
				</Text>
				<Select.Root
					onValueChange={(value) => updateData({ overtimeExpectation: value })}
					value={data.overtimeExpectation}
				>
					<Select.Trigger
						placeholder="Select overtime frequency"
						style={{
							width: "100%",
							height: 40,
						}}
					/>
					<Select.Content>
						{overtimeOptions.map((option) => (
							<Select.Item key={option} value={option}>
								{option}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Day of Week Off */}
			<div className="space-y-2">
				<Text as="label" className="flex" size="3" weight="medium">
					Day of Week Off
				</Text>
				<Select.Root
					onValueChange={(value) => updateData({ dayOfWeekOff: value })}
					value={data.dayOfWeekOff}
				>
					<Select.Trigger
						className="w-full"
						placeholder="Select day off"
						style={{
							width: "100%",
							height: 40,
						}}
					/>
					<Select.Content>
						{daysOfWeek.map((day) => (
							<Select.Item key={day} value={day}>
								{day}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* Minimum Working Hours */}
			<InputField
				label="Minimum Working Hours (per week)"
				max="168"
				min="1"
				onChange={(e) =>
					updateData({ minimumWorkingHours: Number(e.target.value) || 40 })
				}
				placeholder="e.g. 40"
				type="number"
				value={data.minimumWorkingHours.toString()}
			/>

			{/* Regular Overtime Rate */}
			<InputField
				label={`Regular Overtime (${currencyCode}/hour)`}
				min="0"
				onChange={(e) =>
					updateData({ regularOT: parseFloat(e.target.value) || 0 })
				}
				placeholder="e.g. 25.00"
				step="0.01"
				type="number"
				value={data.regularOT.toString()}
			/>

			{/* Day-Off Rate */}
			<InputField
				label={`Day-Off Rate (${currencyCode}/hour)`}
				min="0"
				onChange={(e) =>
					updateData({ dayOffRate: parseFloat(e.target.value) || 0 })
				}
				placeholder="e.g. 30.00"
				step="0.01"
				type="number"
				value={data.dayOffRate.toString()}
			/>

			{/* Holiday Overtime Rate */}
			<InputField
				label={`Holiday Overtime (${currencyCode}/hour)`}
				min="0"
				onChange={(e) =>
					updateData({ holidayOT: parseFloat(e.target.value) || 0 })
				}
				placeholder="e.g. 35.00"
				step="0.01"
				type="number"
				value={data.holidayOT.toString()}
			/>

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
