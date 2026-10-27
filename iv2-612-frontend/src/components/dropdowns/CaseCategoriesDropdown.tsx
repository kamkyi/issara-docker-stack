import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useRef, useState } from "react";
import {
	type CaseCategory,
	useCaseCategories,
} from "../../queries/caseCategories";
import "./CaseCategoriesDropdown.css"; // Use the dedicated CSS file

interface CaseCategoriesDropdownProps {
	onSelect: (category: CaseCategory | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	language?: string;
}

const CaseCategoriesDropdown: React.FC<CaseCategoriesDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select Case/Call Type",
	className = "",
	language = "en",
}) => {
	// Track if component is mounted to prevent state updates after unmount
	const isMounted = useRef(true);

	// Fetch case categories using React Query
	const { data, isLoading, error } = useCaseCategories(language);

	// Local state for selected value - initialized with placeholder or default
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "placeholder",
	);
	const categories = (data as CaseCategory[]) || [];
	// Effect to set initial value from props when categories are loaded
	useEffect(() => {
		if (defaultValue && categories.length > 0) {
			const category = categories.find((c) => c.id === defaultValue);
			if (category) {
				setSelectedValue(String(category.id));
				// Only call onSelect if this is not the initial mount
				if (isMounted.current) {
					onSelect(category);
				}
			}
		}

		// Mark component as fully mounted after initial setup
		isMounted.current = true;

		// Cleanup on unmount
		return () => {
			isMounted.current = false;
		};
	}, [categories, defaultValue, onSelect]);

	// Handle selection change
	const handleValueChange = (value: string) => {
		setSelectedValue(value);

		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const category = categories.find((c) => c.id === selectedId) || null;
				onSelect(category);
			} catch (err) {
				console.error("Error selecting case category:", err);
			}
		}
	};

	// If there's an error, show it
	if (error) {
		return <div className="text-red-500">Error loading case categories</div>;
	}

	return (
		<div className="case-categories-dropdown-container">
			<Select.Root
				defaultValue="placeholder"
				onValueChange={handleValueChange}
				value={selectedValue}
			>
				<Select.Trigger
					aria-label={placeholder}
					className={`case-categories-trigger ${className}`}
				>
					<Select.Value placeholder={placeholder}>
						{selectedValue !== "placeholder"
							? categories.find((c) => c.id === parseInt(selectedValue, 10))
									?.name
							: placeholder}
					</Select.Value>
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>

				<Select.Portal>
					<Select.Content
						align="start"
						avoidCollisions={false}
						className="case-categories-content"
						position="item-aligned"
						sideOffset={5}
					>
						<Select.ScrollUpButton className="case-categories-scroll-button">
							<ChevronUpIcon />
						</Select.ScrollUpButton>

						<Select.Viewport className="p-1">
							{isLoading ? (
								<div className="flex items-center justify-center py-2">
									Loading...
								</div>
							) : (
								categories.map((category) => (
									<Select.Item
										className="case-categories-item"
										key={category.id}
										value={String(category.id)}
									>
										<Select.ItemText>{category.name}</Select.ItemText>
									</Select.Item>
								))
							)}
						</Select.Viewport>

						<Select.ScrollDownButton className="case-categories-scroll-button">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
};

export default CaseCategoriesDropdown;
