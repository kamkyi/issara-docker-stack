import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useState } from "react";
import {
	type ReferralAction,
	useReferralActions,
} from "../../queries/referralActions";
import "./ReferralActionsDropdown.css";

interface ReferralActionsDropdownProps {
	onSelect: (referralAction: ReferralAction | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	language?: string;
}

const ReferralActionsDropdown: React.FC<ReferralActionsDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select referral action",
	className = "",
	language = "en",
}) => {
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "",
	);

	const {
		data: referralActions,
		isLoading,
		error,
	} = useReferralActions(language);

	useEffect(() => {
		if (defaultValue && referralActions && referralActions.length > 0) {
			const defaultAction = referralActions.find(
				(action) => action.id === defaultValue,
			);
			if (defaultAction) {
				onSelect(defaultAction);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultValue, referralActions]);

	const handleValueChange = (value: string) => {
		setSelectedValue(value);
		if (!value) {
			onSelect(null);
			return;
		}
		const selectedId = parseInt(value, 10);
		const action = referralActions?.find((a) => a.id === selectedId) || null;
		onSelect(action);
	};

	if (error) {
		return <div className="text-red-500">Error loading referral actions</div>;
	}

	return (
		<div className={`referral-actions-dropdown-container ${className}`}>
			<Select.Root
				onValueChange={handleValueChange}
				value={selectedValue || undefined}
			>
				<Select.Trigger
					aria-label={placeholder}
					className="referral-actions-trigger"
					disabled={isLoading}
				>
					<Select.Value placeholder={isLoading ? "Loading..." : placeholder}>
						{selectedValue && referralActions
							? referralActions.find(
									(a) => a.id === parseInt(selectedValue, 10),
								)?.name
							: placeholder}
					</Select.Value>
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>

				<Select.Portal>
					<Select.Content
						className="referral-actions-content"
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
								referralActions?.map((action) => (
									<Select.Item
										className="referral-actions-item"
										key={action.id}
										value={String(action.id)}
									>
										<Select.ItemText>{action.name}</Select.ItemText>
									</Select.Item>
								))
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
};

export default ReferralActionsDropdown;
