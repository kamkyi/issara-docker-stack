import { Button, Slider, Text } from "@radix-ui/themes";
import type React from "react";
import ReactSelect from "react-select";
import { useGDNationalities } from "$queries/nationalities";
import { POLL_GENDER_OPTIONS, type PollFormData } from "./types";

interface TargetGroupStepProps {
	formData: PollFormData;
	updateFormData: (data: Partial<PollFormData>) => void;
	onNext: () => void;
	onBack: () => void;
}

const TargetGroupStep: React.FC<TargetGroupStepProps> = ({
	formData,
	updateFormData,
	onNext,
	onBack,
}) => {
	const { data: gdNationalities, isLoading: nationalitiesLoading } =
		useGDNationalities();

	const nationalityOptions =
		gdNationalities?.map((n) => ({
			value: String(n.nationality),
			label: n.name,
		})) ?? [];

	const handleMultiSelectChange = (
		field: "selectedGenders" | "selectedNationalities",
		values: string[],
	) => {
		updateFormData({ [field]: values });
	};

	const handleAgeRangeChange = (value: number[]) => {
		updateFormData({ ageRange: [value[0], value[1]] });
	};

	const selectStyles = {
		control: (base: object) => ({
			...base,
			minHeight: 40,
			borderRadius: 6,
			flexWrap: "wrap" as const,
		}),
		menu: (base: object) => ({ ...base, zIndex: 9999 }),
	};

	return (
		<div>
			<Text className="block" size="4" weight="bold">
				Target Group <span className="text-[#FB8379]">*</span>
			</Text>
			<Text className="block" mb={"6"} size="2">
				Select one or more criteria to target specific groups. Leave all
				unselected to target all employees.
			</Text>

			<div className="space-y-3">
				{/* Gender Selection */}
				<div className="rounded-md">
					<Text as="label" className="block mb-3" size="2" weight="medium">
						Gender
					</Text>
					<ReactSelect
						isMulti
						menuPosition="fixed"
						onChange={(selected) =>
							handleMultiSelectChange(
								"selectedGenders",
								(selected ?? []).map((s) => s.value),
							)
						}
						options={POLL_GENDER_OPTIONS}
						placeholder="Select genders..."
						styles={selectStyles}
						value={POLL_GENDER_OPTIONS.filter((o) =>
							formData.selectedGenders.includes(o.value),
						)}
					/>
				</div>

				{/* Nationality Selection */}
				<div className="rounded-md">
					<Text as="label" className="block mb-3" size="2" weight="medium">
						Nationality
					</Text>
					<ReactSelect
						isLoading={nationalitiesLoading}
						isMulti
						menuPosition="fixed"
						onChange={(selected) =>
							handleMultiSelectChange(
								"selectedNationalities",
								(selected ?? []).map((s) => s.value),
							)
						}
						options={nationalityOptions}
						placeholder={
							nationalitiesLoading
								? "Loading nationalities..."
								: "Select nationalities..."
						}
						styles={selectStyles}
						value={nationalityOptions.filter((o) =>
							formData.selectedNationalities.includes(o.value),
						)}
					/>
				</div>

				{/* Age Range Selection */}
				<div className="rounded-md">
					<Text as="label" className="block" size="2" weight="medium">
						Age Range
					</Text>
					<div className="space-y-3 mt-3">
						<div className="px-2">
							<Slider
								className="w-full"
								max={70}
								min={16}
								onValueChange={handleAgeRangeChange}
								step={1}
								value={formData.ageRange}
							/>
						</div>
						<div className="flex justify-between text-sm text-gray-600">
							<span>Min: {formData.ageRange[0]} years</span>
							<span>Max: {formData.ageRange[1]} years</span>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between sm:pt-6">
				<Button className="w-full sm:w-auto" onClick={onBack} variant="outline">
					Back
				</Button>
				<Button
					className="w-full sm:w-auto"
					onClick={onNext}
					style={{ background: "#148696" }}
				>
					Next
				</Button>
			</div>
		</div>
	);
};

export default TargetGroupStep;
