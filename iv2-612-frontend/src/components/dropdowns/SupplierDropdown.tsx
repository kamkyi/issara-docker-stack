import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupBase, OptionsOrGroups, StylesConfig } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import "./SupplierDropdown.css";
import { type Supplier, useInfiniteSuppliers } from "../../queries/suppliers";

interface SupplierDropdownProps {
	onSelect: (supplier: Supplier | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	isRadix?: boolean; // Flag to switch between Radix UI and AsyncPaginate
}

interface AsyncOption {
	value: number;
	label: string;
	supplier: Supplier;
}

interface AdditionalParams {
	page: number;
	search: string;
}

const getSupplierDisplayName = (supplier: Supplier): string =>
	supplier.status === "inactive"
		? `${supplier.name} (inactive)`
		: supplier.name;

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

const SupplierDropdown: React.FC<SupplierDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select supplier",
	className = "",
	isRadix = false, // Default to AsyncPaginate for search and pagination support
}) => {
	// Track if component is mounted to prevent state updates after unmount
	const isMounted = useRef(false);

	// For search functionality
	const [searchTerm, setSearchTerm] = useState<string>("");

	// For Radix UI select component
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "placeholder",
	);

	// For AsyncPaginate component
	const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
		null,
	);

	// Use infinite query for both modes
	const {
		data: infiniteData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		error,
		refetch: refetchInfinite,
	} = useInfiniteSuppliers(searchTerm);

	// Process supplier data using useMemo to prevent dependencies changing on every render
	const suppliers = useMemo(() => {
		return infiniteData?.pages?.flatMap((page) => page.results) || [];
	}, [infiniteData?.pages]);

	// Set isMounted only on mount/unmount
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	// Set default selected supplier when data is loaded
	useEffect(() => {
		if (defaultValue && suppliers.length > 0) {
			const defaultSupplier = suppliers.find((s) => s.id === defaultValue);

			if (defaultSupplier) {
				if (isRadix) {
					// For Radix UI component
					setSelectedValue(String(defaultSupplier.id));
				} else {
					// For AsyncPaginate component
					setSelectedSupplier(defaultSupplier);
				}

				// Only call onSelect if component is mounted
				if (isMounted.current) {
					onSelect(defaultSupplier);
				}
			}
		}
	}, [defaultValue, suppliers, onSelect, isRadix]);

	// Handle selection for Radix UI Select
	const handleRadixValueChange = (value: string) => {
		setSelectedValue(value);

		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const supplier = suppliers.find((s) => s.id === selectedId) || null;
				onSelect(supplier);
			} catch (err) {
				console.error("Error selecting supplier:", err);
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

		// If the search term has changed
		if (search !== searchTerm) {
			setSearchTerm(search);
			// We need to refetch with the new search term
			await refetchInfinite();
		}

		// If we need to load more data
		if (page > 1 && hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
		}

		// Return current data
		return {
			options: suppliers.map((supplier) => ({
				value: supplier.id,
				label: getSupplierDisplayName(supplier),
				supplier,
			})),
			hasMore: !!hasNextPage,
			additional: {
				page: hasNextPage ? page + 1 : page,
				search,
			},
		};
	};

	// Handle selection for AsyncPaginate
	const handleAsyncChange = (option: AsyncOption | null) => {
		if (option) {
			const selectedSupp = option.supplier;
			setSelectedSupplier(selectedSupp);
			onSelect(selectedSupp);
		} else {
			setSelectedSupplier(null);
			onSelect(null);
		}
	};

	// Handle search input change for Radix UI
	const handleRadixSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	// If there's an error, show it
	if (error) {
		return <div className="text-red-500">Error loading suppliers</div>;
	}

	if (isRadix) {
		// Render Radix UI Select component
		return (
			<div className="supplier-dropdown-container">
				<input
					className="search-input mb-2 w-full p-2 border border-gray-300 rounded"
					onChange={handleRadixSearch}
					placeholder="Search suppliers..."
					type="text"
					value={searchTerm}
				/>

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
								? (() => {
										const selected = suppliers.find(
											(s) => s.id === parseInt(selectedValue, 10),
										);
										return selected
											? getSupplierDisplayName(selected)
											: placeholder;
									})()
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
								{isLoading ? (
									<div className="flex items-center justify-center py-2">
										Loading...
									</div>
								) : (
									<>
										<Select.Item className="dropdown-item" value="placeholder">
											<Select.ItemText>-- Select --</Select.ItemText>
										</Select.Item>
										{suppliers.map((supplier) => (
											<Select.Item
												className="dropdown-item"
												key={supplier.id}
												value={String(supplier.id)}
											>
												<Select.ItemText>
													{getSupplierDisplayName(supplier)}
												</Select.ItemText>
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
			className={`supplier-dropdown-container supplier-async-paginate ${className}`}
		>
			<AsyncPaginate
				additional={{
					page: 1,
					search: "",
				}}
				debounceTimeout={300}
				isClearable
				isLoading={isLoading || isFetchingNextPage}
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
					selectedSupplier
						? {
								value: selectedSupplier.id,
								label: getSupplierDisplayName(selectedSupplier),
								supplier: selectedSupplier,
							}
						: null
				}
			/>
		</div>
	);
};

export default SupplierDropdown;
