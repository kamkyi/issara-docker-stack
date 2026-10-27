import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import {
	fetchWorkerContactReasons,
	type WorkerContactReason,
} from "$src/services/workerContactReasonsService";

interface CaseCallTypeDropdownProps {
	onSelect: (type: WorkerContactReason | null) => void;
	defaultValue?: number;
	placeholder?: string;
	className?: string;
}

const CaseCallTypeDropdown: React.FC<CaseCallTypeDropdownProps> = ({
	onSelect,
	defaultValue,
	placeholder = "Select Case/Call Type",
	className = "",
}) => {
	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue?.toString() || "",
	);
	const lang = useActiveLanguage();

	const { data: workerContactReasons = [], isLoading } = useQuery({
		queryKey: ["workerContactReasons", lang],
		queryFn: () => fetchWorkerContactReasons(lang),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});

	useEffect(() => {
		setSelectedValue(defaultValue?.toString() || "");
	}, [defaultValue]);

	const handleValueChange = (value: string) => {
		setSelectedValue(value);
		if (!value) {
			onSelect(null);
		} else {
			const selectedReason = workerContactReasons.find(
				(reason) => reason.id.toString() === value,
			);
			onSelect(selectedReason || null);
		}
	};

	return (
		<div className="case-call-type-dropdown-container">
			<Select.Root
				disabled={isLoading || workerContactReasons.length === 0}
				onValueChange={handleValueChange}
				value={selectedValue}
			>
				<Select.Trigger
					aria-label={placeholder}
					className={`case-call-type-trigger ${className}`}
				>
					<Select.Value placeholder={placeholder} />
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Content className="case-call-type-content" sideOffset={4}>
						<Select.ScrollUpButton className="case-call-type-scroll-button">
							<ChevronUpIcon />
						</Select.ScrollUpButton>
						<Select.Viewport className="p-1">
							{isLoading ? (
								<Select.Item
									className="case-call-type-item"
									disabled
									value="loading"
								>
									<Select.ItemText>Loading...</Select.ItemText>
								</Select.Item>
							) : (
								workerContactReasons.map((option) => (
									<Select.Item
										className="case-call-type-item"
										key={option.id}
										value={option.id.toString()}
									>
										<Select.ItemText>{option.name}</Select.ItemText>
									</Select.Item>
								))
							)}

							{!isLoading && workerContactReasons.length === 0 && (
								<Select.Item
									className="case-call-type-item"
									disabled
									value="none"
								>
									<Select.ItemText>No case/call types found</Select.ItemText>
								</Select.Item>
							)}
						</Select.Viewport>
						<Select.ScrollDownButton className="case-call-type-scroll-button">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
};

export default CaseCallTypeDropdown;
