import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupBase, OptionsOrGroups, StylesConfig } from "react-select";
import { AsyncPaginate } from "react-select-async-paginate";
import "./WorkerVoiceChannelDropdown.css"; // Reuse the same CSS file
import {
	type InteractionReason,
	useInfiniteInteractionReasons,
	useInteractionReasons,
} from "../../queries/interactionReasons";

interface ReasonsDropdownProps {
	onSelect: (reason: InteractionReason | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	isRadix?: boolean; // Flag to switch between Radix UI and AsyncPaginate
}

interface AsyncOption {
	value: number;
	label: string;
	reason: InteractionReason;
}

interface AdditionalParams {
	page: number;
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

const ReasonsDropdown: React.FC<ReasonsDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select reason",
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
	const [selectedReason, setSelectedReason] =
		useState<InteractionReason | null>(null);

	// Use the appropriate query based on the component mode
	const {
		data: reasonsData,
		isLoading: isLoadingSimple,
		error: simpleError,
	} = useInteractionReasons();

	const {
		data: infiniteData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isLoadingInfinite,
		error: infiniteError,
	} = useInfiniteInteractionReasons();

	// Process reasons data using useMemo to prevent dependencies changing on every render
	const reasons = useMemo(() => {
		if (isRadix) {
			return reasonsData?.results || [];
		} else {
			// Handle the infinite query data properly
			return infiniteData?.pages.flatMap((page) => page.results) || [];
		}
	}, [isRadix, reasonsData, infiniteData]);

	// Set default selected reason when data is loaded
	useEffect(() => {
		if (defaultValue && reasons.length > 0) {
			const defaultReason = reasons.find((r) => r.id === defaultValue);

			if (defaultReason) {
				if (isRadix) {
					// For Radix UI component
					setSelectedValue(String(defaultReason.id));
				} else {
					// For AsyncPaginate component
					setSelectedReason(defaultReason);
				}

				// Only call onSelect if component is mounted
				if (isMounted.current) {
					onSelect(defaultReason);
				}
			}
		}

		// Cleanup on unmount
		return () => {
			isMounted.current = false;
		};
	}, [defaultValue, reasons, onSelect, isRadix]);

	// Handle selection for Radix UI Select
	const handleRadixValueChange = (value: string) => {
		setSelectedValue(value);

		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const reason = reasons.find((r) => r.id === selectedId) || null;
				onSelect(reason);
			} catch (err) {
				console.error("Error selecting reason:", err);
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

		// If we're searching, filter the existing reasons client-side
		if (search) {
			const filteredOptions = reasons.filter((reason) =>
				reason.name.toLowerCase().includes(search.toLowerCase()),
			);

			return {
				options: filteredOptions.map((reason) => ({
					value: reason.id,
					label: reason.name,
					reason,
				})),
				hasMore: false,
				additional: { page },
			};
		}

		// If we need to load more data and there are more pages
		if (page > 1 && hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
		}

		// Return current data
		return {
			options: reasons.map((reason) => ({
				value: reason.id,
				label: reason.name,
				reason,
			})),
			hasMore: !!hasNextPage,
			additional: {
				page: hasNextPage ? page + 1 : page,
			},
		};
	};

	// Handle selection for AsyncPaginate
	const handleAsyncChange = (option: AsyncOption | null) => {
		if (option) {
			const selectedReasonObj = option.reason;
			setSelectedReason(selectedReasonObj);
			onSelect(selectedReasonObj);
		} else {
			setSelectedReason(null);
			onSelect(null);
		}
	};

	// If there's an error, show it
	if (simpleError || infiniteError) {
		console.error("Error loading reasons:", simpleError || infiniteError);
		return <div className="text-red-500">Error loading reasons</div>;
	}

	if (isRadix) {
		// Render Radix UI Select component
		return (
			<div className="worker-voice-channel-dropdown-container">
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
								? reasons.find((r) => r.id === parseInt(selectedValue, 10))
										?.name
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
										{reasons.map((reason) => (
											<Select.Item
												className="dropdown-item"
												key={reason.id}
												value={String(reason.id)}
											>
												<Select.ItemText>{reason.name}</Select.ItemText>
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
			className={`worker-voice-channel-dropdown-container worker-voice-channel-async-paginate ${className}`}
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
					selectedReason
						? {
								value: selectedReason.id,
								label: selectedReason.name,
								reason: selectedReason,
							}
						: null
				}
			/>
		</div>
	);
};

export default ReasonsDropdown;
