import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect, useState } from "react";
import type { GenderDropdownProps, GenderOption } from "$src/types/dropdowns";

const GenderDropdown: React.FC<GenderDropdownProps> = ({
	onSelect,
	defaultValue,
	placeholder = "Select Gender",
	className = "",
}) => {
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";

	// Gender options - using "placeholder" as the value for the placeholder option
	// instead of empty string to avoid the Radix UI error
	const genderOptions: GenderOption[] = [
		{ value: "placeholder", name: placeholder },
		{ value: 1, name: "Male" },
		{ value: 2, name: "Female" },
		{ value: 3, name: "Other" },
		{ value: 4, name: "Non-Binary" },
	];

	const handleValueChange = (value: string) => {
		if (value === "placeholder") {
			onSelect(null);
			return;
		}

		const selectedOption = genderOptions.find(
			(option) => option.value.toString() === value,
		);

		onSelect(selectedOption || null);
	};

	const getDefaultValue = (): string => {
		if (defaultValue === undefined || defaultValue === null)
			return "placeholder";
		return defaultValue.toString();
	};
	const [selectedValue, setSelectedValue] = useState<string>(getDefaultValue());

	useEffect(() => {
		setSelectedValue(getDefaultValue());
	}, [defaultValue]);

	const handleSelectChange = (value: string) => {
		setSelectedValue(value);
		handleValueChange(value);
	};

	return (
		<div className={`relative w-full ${className}`}>
			<Select.Root onValueChange={handleSelectChange} value={selectedValue}>
				<Select.Trigger
					aria-label="Gender"
					className={`flex items-center justify-between w-full px-4 py-2 text-sm rounded-xs border ${
						isDarkMode
							? ""
							: "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
					} outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
				>
					<Select.Value className="text-sm" placeholder={placeholder} />
					<Select.Icon className="text-gray-400">
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>

				<Select.Portal>
					<Select.Content
						className={`z-50 overflow-hidden rounded-xs shadow-lg w-(--radix-select-trigger-width) ${
							isDarkMode
								? "bg-gray-800 border border-gray-700 text-gray-200"
								: "bg-white border border-gray-200 text-gray-700"
						}`}
						position="popper"
						sideOffset={5}
					>
						<Select.ScrollUpButton className="flex items-center justify-center h-6 bg-inherit text-gray-500 cursor-default">
							<ChevronUpIcon />
						</Select.ScrollUpButton>

						<Select.Viewport className="p-1">
							{genderOptions.map((option) => (
								<Select.Item
									className={`relative flex items-center h-8 px-8 py-2 text-sm rounded-xs select-none outline-none ${
										option.value === "placeholder"
											? isDarkMode
												? "text-gray-500"
												: "text-gray-400"
											: isDarkMode
												? "data-highlighted:bg-gray-700 data-[state=checked]:font-medium"
												: "data-highlighted:bg-gray-100 data-[state=checked]:font-medium"
									} ${option.value !== "placeholder" ? "cursor-pointer" : "cursor-default"}`}
									disabled={option.value === "placeholder"}
									key={option.value}
									value={option.value.toString()}
								>
									<Select.ItemText>{option.name}</Select.ItemText>
								</Select.Item>
							))}
						</Select.Viewport>

						<Select.ScrollDownButton className="flex items-center justify-center h-6 bg-inherit text-gray-500 cursor-default">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
};

export default GenderDropdown;
