import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useState } from "react";
import type { GroupBase, OptionsOrGroups, StylesConfig } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import "./NationalitiesDropdown.css";
import {
	type Nationality,
	useInfiniteNationalities,
	useNationalities,
} from "../../queries/nationalities";

interface NationalitiesDropdownProps {
	onSelect: (nationality: Nationality | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	isRadix?: boolean; // Flag to switch between Radix UI and AsyncPaginate
}

interface AsyncOption {
	value: number;
	label: string;
	nationality: Nationality;
}

// Custom styles for AsyncPaginate
const customStyles: StylesConfig<AsyncOption, false> = {
	control: (provided) => ({
		...provided,
		borderRadius: "0.375rem",
		border: "1px solid #d1d5db",
		padding: "0.25rem",
		boxShadow: "none",
		"&:hover": {
			borderColor: "#9ca3af",
		},
	}),
	menu: (provided) => ({
		...provided,
		borderRadius: "0.375rem",
		boxShadow:
			"0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
		zIndex: 9999,
	}),
	option: (provided, state) => ({
		...provided,
		backgroundColor: state.isSelected
			? "#2563eb"
			: state.isFocused
				? "#e5e7eb"
				: undefined,
		color: state.isSelected ? "white" : "#374151",
		cursor: "pointer",
		":active": {
			backgroundColor: "#dbeafe",
		},
	}),
	menuPortal: (base) => ({
		...base,
		zIndex: 9999,
	}),
};

interface AdditionalParams {
	page: number;
}

const NationalitiesDropdown: React.FC<NationalitiesDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select nationality",
	className = "",
	isRadix = false, // Default to AsyncPaginate for pagination support
}) => {
	// For Radix UI select component
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "placeholder",
	);

	// For AsyncPaginate component
	const [selectedNationality, setSelectedNationality] =
		useState<Nationality | null>(null);

	// Use the appropriate query based on the component mode
	const {
		data: nationalitiesData,
		isLoading: isLoadingSimple,
		error: simpleError,
	} = useNationalities();

	const {
		data: infiniteData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isLoadingInfinite,
		error: infiniteError,
	} = useInfiniteNationalities();

	// Process nationality data using useMemo to prevent dependencies changing on every render
	const nationalities = useMemo(() => {
		return isRadix
			? nationalitiesData?.results || []
			: infiniteData?.pages.flatMap((page) => page.results) || [];
	}, [isRadix, nationalitiesData?.results, infiniteData?.pages]);

	// Set default selected nationality when data is loaded (only if not already selected)
	useEffect(() => {
		if (
			defaultValue &&
			nationalities.length > 0 &&
			((isRadix && selectedValue === "placeholder") ||
				(!isRadix && !selectedNationality))
		) {
			const defaultNationality = nationalities.find(
				(n) => n.id === defaultValue,
			);
			if (defaultNationality) {
				if (isRadix) {
					setSelectedValue(String(defaultNationality.id));
				} else {
					setSelectedNationality(defaultNationality);
				}
				onSelect(defaultNationality);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultValue, nationalities, isRadix]);

	// Handle selection for Radix UI Select
	const handleRadixValueChange = (value: string) => {
		setSelectedValue(value);

		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const nationality =
					nationalities.find((n) => n.id === selectedId) || null;
				onSelect(nationality);
			} catch (err) {
				console.error("Error selecting nationality:", err);
			}
		}
	};

	// AsyncPaginate load options function - with search and pagination support
	const loadOptions = async (
		search: string,
		_loadedOptions: OptionsOrGroups<AsyncOption, GroupBase<AsyncOption>>,
		additional?: AdditionalParams,
	) => {
		const page = additional?.page || 1;

		// If we're searching, filter the existing nationalities client-side
		if (search) {
			const filteredOptions = nationalities.filter((nationality) =>
				nationality.name.toLowerCase().includes(search.toLowerCase()),
			);

			return {
				options: filteredOptions.map((nationality) => ({
					value: nationality.id,
					label: nationality.name,
					nationality,
				})),
				hasMore: false,
				additional: { page },
			};
		}

		// If we need to load more data
		if (page > 1 && hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
		}

		// Return current data
		return {
			options: nationalities.map((nationality) => ({
				value: nationality.id,
				label: nationality.name,
				nationality,
			})),
			hasMore: hasNextPage,
			additional: {
				page: hasNextPage ? page + 1 : page,
			},
		};
	};

	// Handle selection for AsyncPaginate
	const handleAsyncChange = (option: AsyncOption | null) => {
		if (option) {
			const selectedNat = option.nationality;
			setSelectedNationality(selectedNat);
			onSelect(selectedNat);
		} else {
			setSelectedNationality(null);
			onSelect(null);
		}
	};

	// If there's an error, show it
	if (simpleError || infiniteError) {
		return <div className="text-red-500">Error loading nationalities</div>;
	}

	if (isRadix) {
		// Render Radix UI Select component
		return (
			<div className="nationalities-dropdown-container">
				<Select.Root
					defaultValue="placeholder"
					onValueChange={handleRadixValueChange}
					value={selectedValue}
				>
					<Select.Trigger
						aria-label={placeholder}
						className={`dropdown-trigger ${className}`}
					>
						<Select.Value placeholder={placeholder}>
							{selectedValue !== "placeholder"
								? nationalities.find(
										(n) => n.id === parseInt(selectedValue, 10),
									)?.name
								: placeholder}
						</Select.Value>
						<Select.Icon>
							<ChevronDownIcon />
						</Select.Icon>
					</Select.Trigger>

					<Select.Portal>
						<Select.Content
							className="dropdown-content z-50"
							position="popper"
							sideOffset={5}
						>
							<Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default">
								<ChevronUpIcon />
							</Select.ScrollUpButton>

							<Select.Viewport className="p-1">
								{isLoadingSimple ? (
									<div className="flex items-center justify-center py-2">
										Loading...
									</div>
								) : (
									<>
										<Select.Item className="dropdown-item" value="placeholder">
											<Select.ItemText>-- {placeholder} --</Select.ItemText>
										</Select.Item>
										{nationalities.map((nationality) => (
											<Select.Item
												className="dropdown-item"
												key={nationality.id}
												value={String(nationality.id)}
											>
												<Select.ItemText>{nationality.name}</Select.ItemText>
											</Select.Item>
										))}
									</>
								)}
							</Select.Viewport>

							<Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-default">
								<ChevronDownIcon />
							</Select.ScrollDownButton>
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</div>
		);
	}

	// Render AsyncPaginate component (default)
	return (
		<div
			className={`nationalities-dropdown-container nationalities-async-paginate ${className}`}
		>
			<AsyncPaginate
				additional={{
					page: 1,
				}}
				debounceTimeout={300}
				isClearable
				isLoading={isLoadingInfinite || isFetchingNextPage}
				loadOptions={loadOptions}
				menuPortalTarget={document.body}
				menuPosition={"fixed"}
				onChange={handleAsyncChange}
				placeholder={placeholder}
				shouldLoadMore={(
					scrollHeight: number,
					clientHeight: number,
					scrollTop: number,
				) => {
					// Load more when user scrolls to 80% of the available height
					return scrollHeight - clientHeight - scrollTop < scrollHeight * 0.2;
				}}
				styles={customStyles}
				value={
					selectedNationality
						? {
								value: selectedNationality.id,
								label: selectedNationality.name,
								nationality: selectedNationality,
							}
						: null
				}
			/>
		</div>
	);
};

export default NationalitiesDropdown;
