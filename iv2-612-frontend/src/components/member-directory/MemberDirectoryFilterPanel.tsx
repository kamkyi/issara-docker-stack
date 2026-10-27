import { useEffect, useMemo, useState } from "react";
import { MultiSelectDropdown } from "$src/components/business/MultiSelectDropdown";
import { SingleSelectDropdown } from "$src/components/business/SingleSelectDropdown";
import { showToast } from "$src/components/toast/toastUtil";

export interface MemberDirectoryFilterOption {
	id: string | number;
	label: string;
	value?: unknown;
}

export interface MemberDirectoryFilterSection {
	title?: string;
	options: MemberDirectoryFilterOption[];
	selectedIds: (string | number)[];
	onChange: (selectedIds: (string | number)[]) => void;
	multiSelect?: boolean;
	type?: "single-select" | "multi-select" | "radio";
	searchable?: boolean;
	searchPlaceholder?: string;
	placeholder?: string;
}

interface MemberDirectoryFilterLabels {
	reset?: string;
	selectAll?: string;
	deselectAll?: string;
	apply?: string;
	searchPlaceholder?: string;
}

interface MemberDirectoryFilterPanelProps {
	sections: MemberDirectoryFilterSection[];
	title: string;
	onClearAll: () => void;
	labels: MemberDirectoryFilterLabels;
}

const areAllOptionsSelected = (
	section: MemberDirectoryFilterSection,
	selectedIds: (string | number)[],
) => {
	if (section.options.length === 0) return false;

	const selected = new Set(selectedIds.map(String));
	return section.options.every((option) => selected.has(String(option.id)));
};

const getAllOptionIds = (section: MemberDirectoryFilterSection) =>
	section.options.map((option) => option.id);

export default function MemberDirectoryFilterPanel({
	sections,
	title,
	onClearAll,
	labels,
}: MemberDirectoryFilterPanelProps) {
	const [pendingSelections, setPendingSelections] = useState<
		(string | number)[][]
	>(() => sections.map((section) => [...section.selectedIds]));
	const [searchQueries, setSearchQueries] = useState<string[]>(() =>
		sections.map(() => ""),
	);

	const externalKey = sections
		.map((section) => [...section.selectedIds].sort().join(","))
		.join("|");

	useEffect(() => {
		setPendingSelections(sections.map((section) => [...section.selectedIds]));
		setSearchQueries((previous) =>
			sections.map((_, index) => previous[index] || ""),
		);
	}, [externalKey, sections]);

	const updatePending = (sectionIndex: number, ids: (string | number)[]) => {
		setPendingSelections((previous) => {
			const next = [...previous];
			next[sectionIndex] = ids;
			return next;
		});
	};

	const handleRadioChange = (
		sectionIndex: number,
		optionId: string | number,
		checked: boolean,
	) => {
		updatePending(sectionIndex, checked ? [optionId] : []);
	};

	const areAllSectionsSelected = sections.every((section, index) =>
		areAllOptionsSelected(section, pendingSelections[index] ?? []),
	);
	const bulkActionLabel = areAllSectionsSelected
		? (labels.deselectAll ?? "Deselect All")
		: (labels.selectAll ?? "Select All");

	const handleBulkAction = () => {
		if (areAllSectionsSelected) {
			setPendingSelections(sections.map(() => []));
			return;
		}

		setPendingSelections(sections.map(getAllOptionIds));
	};

	const handleApply = () => {
		sections.forEach((section, index) => {
			section.onChange(pendingSelections[index] ?? []);
		});
		showToast.success("Filters applied");
	};

	const filteredOptions = useMemo(
		() =>
			sections.map((section, index) => {
				const query = (searchQueries[index] || "").trim().toLowerCase();
				if (!query) return section.options;

				return section.options.filter((option) =>
					option.label.toLowerCase().includes(query),
				);
			}),
		[searchQueries, sections],
	);

	return (
		<aside className="rounded-lg border border-gray-200 bg-white p-5 text-sm shadow-sm">
			<div className="mb-4">
				<h3 className="heading-display">{title}</h3>
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<button
						className="cursor-pointer rounded-md border border-[#148696] px-2 py-1 text-xs font-medium text-[#148696] transition-colors hover:bg-[rgba(20,134,150,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
						onClick={() => {
							onClearAll();
							showToast.info("Filters reset");
						}}
						type="button"
					>
						{labels.reset}
					</button>
					<button
						className="cursor-pointer rounded-md border border-[#148696] px-2 py-1 text-xs font-medium text-[#148696] transition-colors hover:bg-[rgba(20,134,150,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
						onClick={handleBulkAction}
						type="button"
					>
						{bulkActionLabel}
					</button>
				</div>
			</div>

			<div className="space-y-4">
				{sections.map((section, sectionIndex) => {
					const sectionOptions = filteredOptions[sectionIndex] ?? [];
					const searchValue = searchQueries[sectionIndex] || "";
					const pendingSelection = pendingSelections[sectionIndex] || [];
					const showSearch =
						section.type === "multi-select" && section.searchable === true;

					return (
						<section key={section.title || sectionIndex}>
							{section.title && (
								<h3 className="mb-2 text-xs font-semibold text-gray-900">
									{section.title}:
								</h3>
							)}

							{section.type === "radio" && (
								<div className="space-y-2">
									{section.options.map((option) => (
										<label
											className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
											key={option.id}
										>
											<input
												checked={(
													pendingSelections[sectionIndex] || []
												).includes(option.id)}
												className="h-4 w-4 accent-[#148696]"
												name={`member-directory-filter-${sectionIndex}`}
												onChange={(event) =>
													handleRadioChange(
														sectionIndex,
														option.id,
														event.target.checked,
													)
												}
												type="radio"
											/>
											<span>{option.label}</span>
										</label>
									))}
								</div>
							)}

							{section.type === "single-select" && (
								<SingleSelectDropdown
									items={sectionOptions.map((option) => ({
										id: Number(option.id),
										name: option.label,
									}))}
									onChange={(ids) => updatePending(sectionIndex, ids)}
									placeholder={
										section.placeholder ||
										`Select ${section.title?.toLowerCase()}`
									}
									selectedIds={pendingSelection.map((id) => Number(id))}
								/>
							)}

							{section.type === "multi-select" && (
								<div className="space-y-2">
									{showSearch && (
										<input
											className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
											onChange={(event) => {
												setSearchQueries((previous) => {
													const next = [...previous];
													next[sectionIndex] = event.target.value;
													return next;
												});
											}}
											placeholder={
												section.searchPlaceholder ||
												labels.searchPlaceholder ||
												"Search filters"
											}
											value={searchValue}
										/>
									)}
									<MultiSelectDropdown
										items={sectionOptions.map((option) => ({
											id: Number(option.id),
											name: option.label,
										}))}
										label=""
										onChange={(ids) => updatePending(sectionIndex, ids)}
										placeholder={
											section.placeholder ||
											`Select ${section.title?.toLowerCase()}`
										}
										selectedIds={pendingSelection.map((id) => Number(id))}
									/>
								</div>
							)}
						</section>
					);
				})}
			</div>

			<button
				className="mt-4 w-full cursor-pointer rounded-md bg-[#004A60] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
				onClick={handleApply}
				type="button"
			>
				{labels.apply}
			</button>
		</aside>
	);
}
