import { Select } from "@radix-ui/themes";
import type React from "react";
import { useEffect, useState } from "react";
import type {
	CaseStatus,
	CaseStatusesDropdownProps,
} from "$src/types/dropdowns";

const CaseStatusesDropdown: React.FC<CaseStatusesDropdownProps> = ({
	onSelect,
	defaultValue,
	placeholder = "Select...",
	className = "",
	label,
}) => {
	const caseStatuses: CaseStatus[] = [
		{ id: 1, name: "Yes - this is an open case" },
		{ id: 3, name: "There has been some progress on this case" },
		{
			id: 2,
			name: "No - this case can be closed, upon confirmation from the employee",
		},
	];
	const [selectedValue, setSelectedValue] = useState<string | undefined>(
		defaultValue ? String(defaultValue) : undefined,
	);

	useEffect(() => {
		setSelectedValue(defaultValue ? String(defaultValue) : undefined);
	}, [defaultValue]);

	const handleSelect = (value: string) => {
		setSelectedValue(value);
		const selectedId = Number(value);
		const selected = caseStatuses.find(
			(caseStatus) => caseStatus.id === selectedId,
		);
		onSelect(selected || null);
	};

	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			{label && (
				<label className="text-sm font-bold" htmlFor={"case-status-input"}>
					{label}
				</label>
			)}
			<Select.Root onValueChange={handleSelect} value={selectedValue}>
				<Select.Trigger
					className="w-full case-statuses-trigger"
					id={"case-status-input"}
					placeholder={placeholder}
				/>
				<Select.Content className="case-statuses-content">
					{caseStatuses.map((caseStatus) => (
						<Select.Item
							className="case-statuses-item"
							key={caseStatus.id}
							value={String(caseStatus.id)}
						>
							{caseStatus.name}
						</Select.Item>
					))}
				</Select.Content>
			</Select.Root>
		</div>
	);
};

export default CaseStatusesDropdown;
