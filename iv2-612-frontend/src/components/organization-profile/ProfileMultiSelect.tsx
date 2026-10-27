import { ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ProfileMultiSelectProps {
	id: string;
	options: { value: string; label: string }[];
	values: string[];
	onChange: (values: string[]) => void;
	placeholder: string;
}

/** Multi-select matching the profile prototype: removable chips plus clear-all. */
export default function ProfileMultiSelect({
	id,
	options,
	values,
	onChange,
	placeholder,
}: ProfileMultiSelectProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	// Keep consecutive clicks correct even when React has not committed the
	// parent's controlled value between events yet.
	const latestValuesRef = useRef(values);
	latestValuesRef.current = values;
	const byValue = useMemo(
		() => new Map(options.map((option) => [option.value, option])),
		[options],
	);

	useEffect(() => {
		if (!open) return;
		const close = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
				setSearch("");
			}
		};
		document.addEventListener("mousedown", close);
		return () => document.removeEventListener("mousedown", close);
	}, [open]);

	useEffect(() => {
		if (open) searchInputRef.current?.focus();
	}, [open]);

	const visibleOptions = useMemo(() => {
		const term = search.trim().toLowerCase();
		const filtered = term
			? options.filter((option) => option.label.toLowerCase().includes(term))
			: options;
		if (term) return filtered;
		const selected = values
			.map((value) => byValue.get(value))
			.filter((option): option is { value: string; label: string } =>
				Boolean(option),
			);
		const selectedValues = new Set(selected.map((option) => option.value));
		return [
			...selected,
			...filtered.filter((option) => !selectedValues.has(option.value)),
		];
	}, [byValue, options, search, values]);

	const toggle = (value: string) => {
		const current = latestValuesRef.current;
		const next = current.includes(value)
			? current.filter((selected) => selected !== value)
			: [...current, value];
		latestValuesRef.current = next;
		onChange(next);
	};
	const toggleOpen = () => {
		setOpen((current) => {
			if (current) setSearch("");
			return !current;
		});
	};
	const clearAll = () => {
		latestValuesRef.current = [];
		onChange([]);
	};

	return (
		<div className="relative" id={id} ref={containerRef}>
			<div className="flex min-h-10 w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 transition focus-within:border-[#148696] focus-within:ring-2 focus-within:ring-[#148696]/40">
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
					{values.map((value) => (
						<span
							className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#9DDED5] px-2.5 py-1 text-xs font-semibold text-[#004A60]"
							key={value}
						>
							<span className="truncate">
								{byValue.get(value)?.label ?? value}
							</span>
							<button
								aria-label={t("organizationProfilePage.removeSelection", {
									defaultValue: "Remove selection",
								})}
								className="rounded p-0.5 hover:bg-white"
								onClick={() => toggle(value)}
								type="button"
							>
								<Cross2Icon />
							</button>
						</span>
					))}
					<button
						aria-expanded={open}
						aria-haspopup="listbox"
						className="min-h-7 min-w-12 flex-1 px-1 text-left text-sm text-gray-400"
						onClick={toggleOpen}
						type="button"
					>
						{values.length === 0 ? (
							placeholder
						) : (
							<span className="sr-only">{placeholder}</span>
						)}
					</button>
				</div>
				{values.length > 0 && (
					<button
						aria-label={t("organizationProfilePage.clearAll", {
							defaultValue: "Clear all selections",
						})}
						className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
						onClick={clearAll}
						type="button"
					>
						<Cross2Icon />
					</button>
				)}
				<button
					aria-label={placeholder}
					className="rounded p-1 text-gray-500"
					onClick={toggleOpen}
					type="button"
				>
					<ChevronDownIcon className={open ? "rotate-180" : ""} />
				</button>
			</div>

			{open && (
				<div className="absolute z-50 mt-1 w-full min-w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
					<div className="border-b border-gray-100 p-2">
						<input
							className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
							onChange={(event) => setSearch(event.target.value)}
							placeholder={t("common.search", { defaultValue: "Search…" })}
							ref={searchInputRef}
							value={search}
						/>
					</div>
					<div className="max-h-56 overflow-y-auto" role="listbox">
						{visibleOptions.length === 0 ? (
							<p className="px-3 py-3 text-center text-sm text-gray-400">
								{t("organizationProfilePage.noResults", {
									defaultValue: "No results",
								})}
							</p>
						) : (
							visibleOptions.map((option) => {
								const selected = values.includes(option.value);
								return (
									<label
										className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 ${selected ? "bg-[#9DDED5] font-medium text-[#004A60]" : "hover:bg-gray-50"}`}
										data-selected={selected}
										key={option.value}
									>
										<input
											checked={selected}
											className="accent-[#148696]"
											onChange={() => toggle(option.value)}
											type="checkbox"
										/>
										{option.label}
									</label>
								);
							})
						)}
					</div>
				</div>
			)}
		</div>
	);
}
