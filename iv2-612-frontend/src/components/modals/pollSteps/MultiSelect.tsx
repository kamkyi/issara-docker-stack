import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useState } from "react";

interface MultiSelectProps {
	options: { value: string; label: string }[];
	selectedValues: string[];
	onChange: (value: string) => void;
	placeholder: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
	options,
	selectedValues,
	onChange,
	placeholder,
}) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative">
			<div
				className="w-full p-2 border rounded-xs cursor-pointer min-h-[40px] flex items-center justify-between"
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex flex-wrap gap-1">
					{selectedValues.length === 0 ? (
						<span className="text-gray-500">{placeholder}</span>
					) : (
						selectedValues.map((value) => {
							const option = options.find((opt) => opt.value === value);
							return (
								<span
									className="bg-blue-100 text-blue-800 px-2 py-1 rounded-xs text-sm flex items-center gap-1"
									key={value}
								>
									{option?.label}
									<button
										className="text-blue-600 hover:text-blue-800"
										onClick={(e) => {
											e.stopPropagation();
											onChange(value);
										}}
									>
										×
									</button>
								</span>
							);
						})
					)}
				</div>
				<ChevronDownIcon
					className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</div>

			{isOpen && (
				<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xs shadow-lg max-h-60 overflow-y-auto">
					{options.map((option) => (
						<div
							className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 "
							key={option.value}
							onClick={() => onChange(option.value)}
						>
							<div
								className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center ${
									selectedValues.includes(option.value)
										? "bg-blue-500 border-blue-500"
										: ""
								}`}
							>
								{selectedValues.includes(option.value) && (
									<CheckIcon className="w-3 h-3 text-white" />
								)}
							</div>
							<span>{option.label}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default MultiSelect;
