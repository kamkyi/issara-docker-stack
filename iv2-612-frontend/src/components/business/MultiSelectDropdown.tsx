import { CheckIcon, ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import * as Popover from "@radix-ui/react-popover";

interface MultiSelectProps {
	items: { id: number; name: string }[];
	selectedIds: number[];
	onChange: (selected: number[]) => void;
	placeholder?: string;
	label?: string;
}

export const MultiSelectDropdown = ({
	items,
	selectedIds,
	onChange,
	placeholder = "Select items",
	label,
}: MultiSelectProps) => {
	const toggleItem = (id: number) => {
		if (selectedIds.includes(id)) {
			onChange(selectedIds.filter((i) => i !== id));
		} else {
			onChange([...selectedIds, id]);
		}
	};

	const selectedNames = items
		.filter((i) => selectedIds.includes(i.id))
		.map((i) => i.name);

	// Handler to clear all selections
	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange([]);
	};

	return (
		<div className="w-full">
			{label && (
				<label
					className="text-sm block mb-1 text-gray-600"
					htmlFor={"item-multiselect-dropdown"}
				>
					{label}
				</label>
			)}
			<Popover.Root>
				<Popover.Trigger
					className="w-full border border-[#148696] px-3 py-2 h-[40px] rounded-[5px] flex justify-between items-center text-sm h-[32px] transition-colors"
					id={"item-multiselect-dropdown"}
				>
					<span className="flex-1 flex flex-wrap gap-1 overflow-hidden">
						{selectedNames.length === 0 ? (
							<span className="truncate text-gray-400 text-[14px]">
								{placeholder}
							</span>
						) : selectedNames.length === 1 ? (
							<span className="truncate text-[14px]">{selectedNames[0]}</span>
						) : (
							<span className="flex items-center gap-1.5 min-w-0">
								<span className="truncate text-[14px]">{selectedNames[0]}</span>
								<span className="shrink-0 rounded-full bg-[#148696] px-1.5 py-0.5 text-[11px] font-semibold text-white leading-none">
									+{selectedNames.length - 1}
								</span>
							</span>
						)}
					</span>
					<span className="flex items-center gap-1 ml-2">
						{selectedNames.length > 0 && (
							<button
								aria-label="Clear selection"
								className="p-1 rounded hover:bg-gray-200 transition-colors"
								onClick={handleClear}
								tabIndex={-1}
								type="button"
							>
								<Cross2Icon className="w-3 h-3 text-[#148696]" />
							</button>
						)}
						<ChevronDownIcon className="w-4 h-4 text-[#148696]" />
					</span>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content sideOffset={4}>
						<div className="rounded-[5px] border border-[#148696] shadow-lg max-h-60 overflow-auto z-50 p-1 min-w-[200px] bg-white">
							{items.map((item, index) => (
								<div
									className={`flex items-center gap-3 cursor-pointer px-3 py-2 hover:bg-gray-50 text-[14px] transition-colors ${
										index === 0 ? "rounded-t-[4px]" : ""
									} ${index === items.length - 1 ? "rounded-b-[4px]" : ""}`}
									key={item.id}
									onClick={() => toggleItem(item.id)}
								>
									<div
										className={`h-4 w-4 border-2 rounded flex items-center justify-center transition-colors ${
											selectedIds.includes(item.id)
												? "bg-[#148696] border-[#148696] text-white"
												: "border-gray-300 hover:border-[#148696]"
										}`}
									>
										{selectedIds.includes(item.id) && (
											<CheckIcon className="w-3 h-3" />
										)}
									</div>
									<span className="flex-1 font-medium">{item.name}</span>
								</div>
							))}
						</div>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
};
