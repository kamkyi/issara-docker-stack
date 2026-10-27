import { Flex, RadioGroup, Text } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect, useState } from "react";
import { MultiSelectDropdown } from "../business/MultiSelectDropdown";
import CascadeButton from "../button/button";
import CasCheckbox from "../checkBox/checkBox";
import Selector from "../inputs/selector";

// Generic filter option interface
export interface FilterOption {
	id: string | number;
	label: string;
	value?: any;
}

// Filter section interface
export interface FilterSection {
	title?: string;
	options: FilterOption[];
	selectedIds: (string | number)[];
	onChange: (selectedIds: (string | number)[]) => void;
	multiSelect?: boolean;
	type?: "single-select" | "multi-select" | "radio";
	searchable?: boolean;
	searchPlaceholder?: string;
	placeholder?: string;
}

export interface FilterColumnLabels {
	reset?: string;
	selectAll?: string;
	deselectAll?: string;
	apply?: string;
	searchPlaceholder?: string;
}

export interface FilterColumnProps {
	sections: FilterSection[];
	title?: string;
	className?: string;
	onClearAll?: () => void;
	labels?: FilterColumnLabels;
	/** Optional control rendered in the header row, beside the bulk-action button. */
	headerContent?: React.ReactNode;
}

const FilterColumn: React.FC<FilterColumnProps> = ({
	sections,
	title = "Filters",
	className = "",
	onClearAll,
	labels,
	headerContent,
}) => {
	const { theme } = useTheme();

	// Internal pending state — selections are buffered until Apply is clicked
	const [pendingSelections, setPendingSelections] = useState<
		(string | number)[][]
	>(() => sections.map((s) => [...s.selectedIds]));
	const [searchQueries, setSearchQueries] = useState<string[]>(() =>
		sections.map(() => ""),
	);

	// Stable key to detect external resets (e.g. "Clear Filters" from parent)
	const externalKey = sections
		.map((s) => [...s.selectedIds].sort().join(","))
		.join("|");

	// Sync pending state whenever the parent resets selectedIds.
	// externalKey encodes all selectedIds; we intentionally exclude sections/setPendingSelections
	// from the dep array because we only want to re-sync when the key actually changes.
	useEffect(() => {
		setPendingSelections(sections.map((s) => [...s.selectedIds]));
		setSearchQueries((prev) => sections.map((_, index) => prev[index] || ""));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [externalKey]);

	const hasPendingChanges = sections.some(
		(s, i) =>
			(pendingSelections[i] || []).slice().sort().join(",") !==
			[...s.selectedIds].sort().join(","),
	);
	const hasAnyPendingSelection = pendingSelections.some(
		(selectedIds) => selectedIds.length > 0,
	);
	const bulkActionLabel = hasAnyPendingSelection
		? (labels?.deselectAll ?? "Deselect All")
		: (labels?.selectAll ?? "Select All");
	const isBulkSelectableSection = (section: FilterSection) =>
		section.type !== "single-select" && section.type !== "radio";

	const updatePending = (sectionIndex: number, newIds: (string | number)[]) => {
		setPendingSelections((prev) => {
			const updated = [...prev];
			updated[sectionIndex] = newIds;
			return updated;
		});
	};

	const handleOptionChangePending = (
		sectionIndex: number,
		optionId: string | number,
		checked: boolean,
	) => {
		const section = sections[sectionIndex];
		const current = pendingSelections[sectionIndex] || [];
		let newIds: (string | number)[];

		if (section.multiSelect !== false) {
			newIds = checked
				? [...current, optionId]
				: current.filter((id) => id !== optionId);
		} else {
			newIds = checked ? [optionId] : [];
		}

		updatePending(sectionIndex, newIds);
	};

	const handleApply = () => {
		sections.forEach((section, i) => {
			section.onChange(pendingSelections[i] || []);
		});
	};

	const handleBulkAction = () => {
		if (hasAnyPendingSelection) {
			setPendingSelections(sections.map(() => []));
			return;
		}

		const nextSelections = sections.map((section) =>
			isBulkSelectableSection(section)
				? section.options.map((option) => option.id)
				: [],
		);
		setPendingSelections(nextSelections);
	};

	const selectedCount = pendingSelections[0]?.length || 0;

	return (
		<Flex
			className={`p-5 rounded-2xl flex-col text-sm ${className}`}
			style={{
				background: theme === "dark" ? "#004A60" : "#ffffff",
				border:
					theme === "dark"
						? "1px solid #148696"
						: "1px solid rgba(210,210,210,0.6)",
			}}
		>
			<div className="mb-3 flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<h3 className="text-base font-black tracking-wider text-[#004A60] uppercase">
						{title}
					</h3>
					{selectedCount > 0 && (
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#004A60] text-xs font-bold text-white">
							{selectedCount}
						</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{onClearAll && (
						<CascadeButton
							buttonText={labels?.reset ?? "Reset"}
							handleOnClick={onClearAll}
							size={"1"}
							variant="outline"
						/>
					)}
					<CascadeButton
						buttonText={bulkActionLabel}
						handleOnClick={handleBulkAction}
						size="1"
						variant={"outline"}
					/>
					{headerContent}
				</div>
			</div>

			<hr className="mb-3 border-t border-[#D2D2D2]/40" />

			{sections?.map((section, sectionIndex) => (
				<div className="max-h-[195px] overflow-y-auto" key={sectionIndex}>
					<div
						className={`flex flex-col line-clamp-1 ${
							sectionIndex === sections.length - 1 ? "mb-1" : "mb-4"
						}`}
					>
						{section.title ? (
							<Text as="p" mb="2" size="2" weight="bold">
								{section.title}:
							</Text>
						) : null}
						{section.type !== "single-select" &&
							section.type !== "radio" &&
							(section.searchable === true || section.options.length > 8) && (
								<input
									className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#148696] focus:outline-none"
									onChange={(event) => {
										setSearchQueries((prev) => {
											const updated = [...prev];
											updated[sectionIndex] = event.target.value;
											return updated;
										});
									}}
									placeholder={
										section.searchPlaceholder ||
										labels?.searchPlaceholder ||
										`Search ${section.title?.toLowerCase() || "options"}`
									}
									value={searchQueries[sectionIndex] || ""}
								/>
							)}
						{section.type === "multi-select" ? (
							<div className="py-2">
								<MultiSelectDropdown
									items={section.options.map((o) => ({
										id: Number(o.id),
										name: o.label,
									}))}
									label=""
									onChange={(ids) => updatePending(sectionIndex, ids)}
									placeholder={
										section.placeholder ||
										`Select ${section.title?.toLowerCase()}`
									}
									selectedIds={(pendingSelections[sectionIndex] || []).map(
										(id) => Number(id),
									)}
								/>
							</div>
						) : section.type === "radio" ? (
							<RadioGroup.Root
								color="green"
								onValueChange={(value) =>
									updatePending(sectionIndex, value ? [value] : [])
								}
								value={pendingSelections[sectionIndex]?.[0]?.toString() || ""}
							>
								{section.options?.map((option) => (
									<div
										className="flex items-center gap-2 p-2 rounded-xs hover:bg-teal-50"
										key={option.id}
									>
										<RadioGroup.Item
											id={`radio-${option.id}`}
											value={option.id?.toString()}
										/>
										<label
											className="text-sm cursor-pointer flex-1"
											htmlFor={`radio-${option.id}`}
										>
											{option.label}
										</label>
									</div>
								))}
							</RadioGroup.Root>
						) : section.type === "single-select" ? (
							<div className="py-2 w-full">
								<Selector
									allLabel={`Select ${section.title}`}
									fullWidth
									id={`selector-${sectionIndex}`}
									onChange={(value) =>
										updatePending(sectionIndex, value ? [value] : [])
									}
									options={section.options.map((o) => ({
										value: o.id?.toString(),
										label: o.label,
									}))}
									placeholder={`Select ${section.title?.toLowerCase()}`}
									value={pendingSelections[sectionIndex]?.[0]?.toString() || ""}
								/>
							</div>
						) : (
							section.options
								?.filter((option) => {
									const query = (searchQueries[sectionIndex] || "").trim();
									if (!query) return true;
									return option.label
										.toLowerCase()
										.includes(query.toLowerCase());
								})
								.sort((a, b) => a.label.localeCompare(b.label))
								.map((option) => (
									<CasCheckbox
										checked={(pendingSelections[sectionIndex] || []).includes(
											option.id,
										)}
										handleChange={(
											event: React.ChangeEvent<HTMLInputElement>,
										) =>
											handleOptionChangePending(
												sectionIndex,
												option.id,
												event.target.checked,
											)
										}
										key={option.id}
										label={option.label}
									/>
								))
						)}
						{section.type !== "single-select" &&
							section.type !== "radio" &&
							(section.searchable === true || section.options.length > 8) &&
							(section.options || []).filter((option) => {
								const query = (searchQueries[sectionIndex] || "").trim();
								if (!query) return true;
								return option.label.toLowerCase().includes(query.toLowerCase());
							}).length === 0 && (
								<p className="px-1 py-2 text-sm text-gray-500">
									No matching options.
								</p>
							)}
					</div>
				</div>
			))}
			<div className="mt-2 w-full border-t border-gray-100 pt-3">
				<CascadeButton
					buttonText={labels?.apply ?? "Apply"}
					className="!text-white [&_*]:!text-white"
					disabled={!hasPendingChanges}
					fullWidth
					handleOnClick={handleApply}
					size="1"
				/>
			</div>
		</Flex>
	);
};

export default FilterColumn;
