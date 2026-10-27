import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Cap how many option rows are mounted at once. Long lists (e.g. the full
// supplier list) otherwise render thousands of DOM nodes, making every
// keystroke in the search box janky. Users narrow the list via search.
const MAX_VISIBLE_OPTIONS = 100;

interface MultiSelectProps {
	id: string;
	options: { value: string; label: string }[];
	values: string[];
	onChange: (values: string[]) => void;
	placeholder: string;
	disabled?: boolean;
	// When provided, the search box is server-driven: typing fires
	// onSearchChange (debounced) instead of filtering `options` locally.
	onSearchChange?: (search: string) => void;
	loading?: boolean;
}

export function MultiSelect({
	id,
	options,
	values,
	onChange,
	placeholder,
	disabled = false,
	onSearchChange,
	loading = false,
}: MultiSelectProps) {
	const serverSide = typeof onSearchChange === "function";
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	// Remember label for every value ever seen, so selected items still show
	// their name even after the (server-side) option list changes under search.
	const labelCacheRef = useRef<Map<string, string>>(new Map());
	for (const o of options) labelCacheRef.current.set(o.value, o.label);

	// Debounce the search term up to the server when in server-side mode.
	// biome-ignore lint/correctness/useExhaustiveDependencies: onSearchChange is stable enough; debounce keyed on search
	useEffect(() => {
		if (!serverSide) return;
		const t = setTimeout(() => onSearchChange?.(search), 300);
		return () => clearTimeout(t);
	}, [search, serverSide]);
	// pendingValues tracks in-progress selections; committed on Apply or click-outside
	const [pendingValues, setPendingValues] = useState<string[]>(values);
	const ref = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const pendingRef = useRef(pendingValues);
	pendingRef.current = pendingValues;

	// Sync pendingValues when parent resets values while dropdown is closed
	useEffect(() => {
		if (!open) {
			setPendingValues(values);
		}
		// intentionally excludes `open` so in-progress selections are preserved
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [values]);

	// Commit pending values to parent; called on Apply or click-outside
	const commit = useCallback(() => {
		onChange(pendingRef.current);
		setOpen(false);
		setSearch("");
	}, [onChange]);

	const clear = () => {
		setPendingValues([]);
	};

	// Click-outside closes dropdown and commits
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				if (open) commit();
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [commit, open]);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (open) {
			setTimeout(() => searchInputRef.current?.focus(), 0);
		}
	}, [open]);

	const handleButtonClick = () => {
		if (disabled) return;
		setOpen((prev) => {
			if (prev) commit();
			return !prev;
		});
	};

	useEffect(() => {
		if (disabled && open) {
			setOpen(false);
			setSearch("");
		}
	}, [disabled, open]);

	const toggle = (value: string) => {
		setPendingValues((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
		);
	};

	const filteredOptions = useMemo(() => {
		// Server-side mode: `options` are already the search results — don't filter.
		if (serverSide) return options;
		const q = search.trim().toLowerCase();
		return q
			? options.filter((o) => o.label.toLowerCase().includes(q))
			: options;
	}, [options, search, serverSide]);

	// Only mount a bounded slice; the rest stay searchable but unrendered.
	const visibleOptions = useMemo(
		() => filteredOptions.slice(0, MAX_VISIBLE_OPTIONS),
		[filteredOptions],
	);
	const hiddenCount = filteredOptions.length - visibleOptions.length;

	// Display reflects pending state when open so user sees instant feedback
	const displayValues = open ? pendingValues : values;
	const displayLabel =
		displayValues.length === 0
			? placeholder
			: displayValues.length === 1
				? (labelCacheRef.current.get(displayValues[0] ?? "") ??
					options.find((o) => o.value === displayValues[0])?.label ??
					placeholder)
				: `${displayValues.length} selected`;

	const hasPendingChanges =
		JSON.stringify([...pendingValues].sort()) !==
		JSON.stringify([...values].sort());

	return (
		<div className="relative" id={id} ref={ref}>
			<button
				className={`text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition w-full flex items-center justify-between gap-2 ${
					disabled ? "opacity-60 cursor-not-allowed bg-gray-100" : ""
				}`}
				disabled={disabled}
				onClick={handleButtonClick}
				type="button"
			>
				<span
					className={`flex-1 truncate ${
						displayValues.length === 0 ? "text-gray-400" : "font-medium"
					}`}
					title={displayLabel}
				>
					{displayLabel}
				</span>
				<ChevronDownIcon
					className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<div className="absolute z-50 top-full left-0 mt-1 flex min-w-60 flex-col rounded-xl border border-gray-200 bg-white shadow-xl">
					{/* Search input */}
					<div className="p-2 border-b border-gray-100">
						<input
							className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white placeholder-gray-400"
							onChange={(e) => setSearch(e.target.value)}
							onClick={(e) => e.stopPropagation()}
							placeholder="Search…"
							ref={searchInputRef}
							type="text"
							value={search}
						/>
					</div>
					{/* Options list */}
					<div className="overflow-y-auto max-h-48">
						{loading ? (
							<p className="px-3 py-3 text-sm text-gray-400 text-center">
								Searching…
							</p>
						) : filteredOptions.length === 0 ? (
							<p className="px-3 py-3 text-sm text-gray-400 text-center">
								No results
							</p>
						) : (
							visibleOptions.map((opt) => (
								<label
									className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 select-none"
									key={opt.value}
								>
									<input
										checked={pendingValues.includes(opt.value)}
										className="accent-[#148696]"
										onChange={() => toggle(opt.value)}
										type="checkbox"
									/>
									{opt.label}
								</label>
							))
						)}
						{hiddenCount > 0 && (
							<p className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
								{hiddenCount} more — refine your search
							</p>
						)}
					</div>
					{/* Apply footer */}
					<div className="p-2 border-t border-gray-100 flex items-center justify-between gap-2">
						<span className="text-xs text-gray-400">
							{pendingValues.length > 0
								? `${pendingValues.length} selected`
								: "None selected"}
						</span>

						<div className="flex items-center gap-2">
							{pendingValues.length > 0 && (
								<button
									className="text-xs font-medium text-gray-500 hover:text-[#148696] transition-colors"
									onClick={clear}
									type="button"
								>
									Clear
								</button>
							)}

							<button
								className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-all ${
									hasPendingChanges
										? "bg-[#148696] text-white hover:bg-[#004A60] shadow-sm"
										: "bg-gray-100 text-gray-400 cursor-default"
								}`}
								disabled={!hasPendingChanges}
								onClick={commit}
								type="button"
							>
								Apply
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
