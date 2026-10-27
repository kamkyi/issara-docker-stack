import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useRef, useState } from "react";
import { AsyncPaginate, type LoadOptions } from "react-select-async-paginate";
import "./NationalitiesDropdown.css"; // Reusing the same CSS
import {
	type User,
	useInfiniteIssaraStaff,
	useIssaraStaff,
} from "../../queries/users";

interface IssaraStaffDropdownProps {
	onSelect: (staff: User | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	isRadix?: boolean;
}

// Custom styles for AsyncPaginate
const customStyles = {
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

interface AsyncOption {
	value: number;
	label: string;
	staff: User;
}

interface AdditionalParams {
	page: number;
}

const IssaraStaffDropdown: React.FC<IssaraStaffDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select staff",
	className = "",
	isRadix = false, // Default to AsyncPaginate for pagination support
}) => {
	// Track if component is mounted to prevent state updates after unmount
	const isMounted = useRef(true);

	// For Radix UI select component
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "placeholder",
	);

	// For AsyncPaginate component
	const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

	// Use the appropriate query based on the component mode
	const {
		data: issaraStaff,
		isLoading: isLoadingSimple,
		error: simpleError,
	} = useIssaraStaff();

	const {
		data: infiniteData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isLoadingInfinite,
		error: infiniteError,
	} = useInfiniteIssaraStaff();

	// Process staff data
	const staffMembers = useMemo(() => {
		return isRadix
			? issaraStaff || []
			: infiniteData?.pages.flatMap((page) => page.results) || [];
	}, [isRadix, issaraStaff, infiniteData?.pages]);

	// Set default selected staff when data is loaded
	useEffect(() => {
		if (defaultValue && staffMembers.length > 0) {
			const defaultStaff = staffMembers.find(
				(staff) => staff.id === defaultValue,
			);

			if (defaultStaff) {
				if (isRadix) {
					// For Radix UI component
					setSelectedValue(String(defaultStaff.id));
				} else {
					// For AsyncPaginate component
					setSelectedStaff(defaultStaff);
				}

				// Only call onSelect if component is mounted
				if (isMounted.current) {
					onSelect(defaultStaff);
				}
			}
		}

		// Cleanup on unmount
		return () => {
			isMounted.current = false;
		};
	}, [defaultValue, staffMembers, onSelect, isRadix]);

	// Get display name for a user
	const getDisplayName = (user: User): string => {
		return user.first_name && user.last_name
			? `${user.first_name} ${user.last_name}`
			: user.email || user.username;
	};

	// Handle selection for Radix UI Select
	const handleRadixValueChange = (value: string) => {
		setSelectedValue(value);

		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const staff = staffMembers.find((s) => s.id === selectedId) || null;
				onSelect(staff);
			} catch (err) {
				console.error("Error selecting staff:", err);
			}
		}
	};

	// AsyncPaginate load options function - with search and pagination support
	const loadOptions: LoadOptions<AsyncOption, any, AdditionalParams> = async (
		search,
		_loadedOptions,
		additional,
	) => {
		const page = additional?.page || 1;
		// If we're searching, filter the existing staff client-side
		if (search) {
			const filteredOptions = staffMembers.filter((staff) => {
				const displayName = getDisplayName(staff).toLowerCase();
				return displayName.includes(search.toLowerCase());
			});

			return {
				options: filteredOptions.map((staff) => ({
					value: staff.id,
					label: getDisplayName(staff),
					staff,
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
			options: staffMembers.map((staff) => ({
				value: staff.id,
				label: getDisplayName(staff),
				staff,
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
			const selectedStaffMember = option.staff;
			setSelectedStaff(selectedStaffMember);
			onSelect(selectedStaffMember);
		} else {
			setSelectedStaff(null);
			onSelect(null);
		}
	};

	// If there's an error, show it
	if (simpleError || infiniteError) {
		return <div className="text-red-500">Error loading staff members</div>;
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
								? (() => {
										const staff = staffMembers.find(
											(s) => s.id === parseInt(selectedValue, 10),
										);
										return staff ? getDisplayName(staff) : placeholder;
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
								{isLoadingSimple ? (
									<div className="flex items-center justify-center py-2">
										Loading...
									</div>
								) : (
									<>
										<Select.Item className="dropdown-item" value="placeholder">
											<Select.ItemText>-- Select --</Select.ItemText>
										</Select.Item>
										{staffMembers.map((staff) => (
											<Select.Item
												className="dropdown-item"
												key={staff.id}
												value={String(staff.id)}
											>
												<Select.ItemText>
													{getDisplayName(staff)}
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
					selectedStaff
						? {
								value: selectedStaff.id,
								label: getDisplayName(selectedStaff),
								staff: selectedStaff,
							}
						: null
				}
			/>
		</div>
	);
};

export default IssaraStaffDropdown;
