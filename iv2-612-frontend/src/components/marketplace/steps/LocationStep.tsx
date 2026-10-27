import { Box, Select, Text } from "@radix-ui/themes";
import { useCities, useCountries } from "$src/hooks/useCommonData";
import { useStates } from "$src/hooks/useStates";
import { FormStepNavigation } from "../FormStepNavigation";
import type { JobPostingData } from "../JobPostingForm";

interface LocationStepProps {
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

// Mock data - in real app, these would come from APIs

export const LocationStep = ({
	data,
	updateData,
	onNext,
	onPrevious,
	isFirstStep,
	isLastStep,
}: LocationStepProps) => {
	const { data: countries } = useCountries();
	const { data: states } = useStates();
	const { data: cities } = useCities();

	const availableStates = data.country
		? states?.filter((state) => state.country === data.country) || []
		: [];

	const availableCities = data.country
		? data.state
			? cities?.filter(
					(city) => city.state === data.state && city.country === data.country,
				) || []
			: cities?.filter((city) => city.country === data.country) || []
		: [];

	// Check if selected country has states
	const countryHasStates = data.country && availableStates.length > 0;

	// Check if selected state has cities (or if country has cities when no state)
	const shouldShowCity =
		data.country &&
		(countryHasStates
			? data.state && availableCities.length > 0 // If country has states, need state selected and cities available
			: availableCities.length > 0); // If no states, just need cities available

	const handleCountryChange = (country: string) => {
		updateData({
			country,
			state: "", // Reset state when country changes
			city: "", // Reset city when country changes
		});
	};

	const handleStateChange = (state: string) => {
		updateData({
			state,
			city: "", // Reset city when state changes
		});
	};

	return (
		<Box className="space-y-6">
			<div>
				<h3 className="mb-2 block text-2xl">Location</h3>
				<Text className="mb-6 block" color="gray" size="4">
					Specify where the job will be located.
				</Text>
			</div>

			{/* Country */}
			<div className="space-y-2 flex flex-col">
				<Text as="label" size="3" weight="medium">
					Country *
				</Text>
				<Select.Root onValueChange={handleCountryChange} value={data.country}>
					<Select.Trigger
						className="w-full"
						placeholder="Select country"
						style={{
							height: 40,
						}}
					/>
					<Select.Content>
						{countries?.map((country) => (
							<Select.Item key={country.country} value={country.country}>
								{country.name}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</div>

			{/* State - Only show if country has states */}
			{countryHasStates && (
				<div className="space-y-2 flex flex-col">
					<Text as="label" size="3" weight="medium">
						State/Province *
					</Text>
					<Select.Root
						disabled={!data.country}
						onValueChange={handleStateChange}
						value={data.state}
					>
						<Select.Trigger
							className="w-full"
							placeholder={
								data.country ? "Select state/province" : "Select country first"
							}
							style={{
								height: 40,
							}}
						/>
						<Select.Content>
							{availableStates?.map((state) => (
								<Select.Item key={state.state} value={state.state}>
									{state.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</div>
			)}

			{/* City - Only show if state has cities OR if country has no states */}
			{shouldShowCity && (
				<div className="space-y-2 flex flex-col">
					<Text as="label" size="3" weight="medium">
						City *
					</Text>
					<Select.Root
						disabled={countryHasStates ? !data.state : !data.country}
						onValueChange={(city) => updateData({ city })}
						value={data.city}
					>
						<Select.Trigger
							className="w-full"
							placeholder={
								countryHasStates
									? data.state
										? "Select city"
										: "Select state first"
									: data.country
										? "Select city"
										: "Select country first"
							}
							style={{
								height: 40,
							}}
						/>
						<Select.Content>
							{availableCities?.map((city) => (
								<Select.Item key={city.city} value={city.city}>
									{city.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</div>
			)}

			{/* Navigation */}
			<FormStepNavigation
				isFirstStep={isFirstStep}
				isLastStep={isLastStep}
				onNext={onNext}
				onPrevious={onPrevious}
			/>
		</Box>
	);
};
