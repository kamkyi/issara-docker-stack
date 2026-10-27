import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	NACE_LEVEL,
	type NaceCode,
	type NaceLevel,
	useNaceCodes,
} from "$src/queries/naceCodes";

/**
 * Drill-down NACE Rev. 2.1 picker — a single dropdown that reveals one level at
 * a time, the way the classification is published: section → division → group →
 * class.
 *
 * The menu always shows the children of wherever the user currently is. Opening
 * a branch replaces the list and pushes a breadcrumb, so the 1047 entries are
 * never all on screen at once (the widest list is 24 items).
 *
 * Any level is a valid answer: a CSO that only knows it works in
 * "Manufacturing" can tick the section without drilling four levels down.
 * Typing switches the same menu to a flat search across every level.
 */

/** How many search hits to render before asking the user to narrow down. */
const MAX_SEARCH_RESULTS = 50;

/** Level names, so a search hit says whether it is a section, a class, etc. */
const LEVEL_LABEL_KEY: Record<NaceLevel, string> = {
	[NACE_LEVEL.SECTION]: "naceCascadingSelect.section",
	[NACE_LEVEL.DIVISION]: "naceCascadingSelect.division",
	[NACE_LEVEL.GROUP]: "naceCascadingSelect.group",
	[NACE_LEVEL.CLASS]: "naceCascadingSelect.class",
};

interface NaceCascadingSelectProps {
	/** Currently selected NACE codes. */
	value: string[];
	onChange: (codes: string[]) => void;
	/** Deepest level the user may drill to. Defaults to class. */
	maxLevel?: NaceLevel;
	/** Allow only one selection. */
	isMulti?: boolean;
	isDisabled?: boolean;
	className?: string;
	/** Ties the trigger to an external <label htmlFor>. */
	inputId?: string;
}

/** Sections arrive ALL CAPS from the source; soften them for display. */
function toTitleCase(text: string): string {
	return text
		.toLowerCase()
		.replace(
			/(^|[\s(/-])([a-z])/g,
			(_match, prefix, letter: string) => `${prefix}${letter.toUpperCase()}`,
		);
}

function displayLabel(naceCode: NaceCode): string {
	return naceCode.level === NACE_LEVEL.SECTION
		? toTitleCase(naceCode.label)
		: naceCode.label;
}

function matches(naceCode: NaceCode, search: string): boolean {
	const term = search.trim().toLowerCase();
	if (!term) return true;
	return (
		naceCode.code.toLowerCase().includes(term) ||
		naceCode.label.toLowerCase().includes(term)
	);
}

const NaceCascadingSelect: React.FC<NaceCascadingSelectProps> = ({
	value,
	onChange,
	maxLevel = NACE_LEVEL.CLASS,
	isMulti = true,
	isDisabled = false,
	className = "",
	inputId = "nace-cascading",
}) => {
	const { t } = useTranslation();
	const { data, isLoading, error } = useNaceCodes();

	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	// The branch the menu is currently showing, shallowest first. Empty = root.
	const [trail, setTrail] = useState<NaceCode[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	// Clicking outside closes the menu, like any other dropdown on the page.
	useEffect(() => {
		if (!isOpen) return;
		const handlePointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, [isOpen]);

	const byCode = useMemo(
		() => new Map((data ?? []).map((code) => [code.code, code])),
		[data],
	);

	const byParent = useMemo(() => {
		const map = new Map<string, NaceCode[]>();
		for (const code of data ?? []) {
			if (code.level > maxLevel) continue;
			const key = code.parent_code ?? "";
			const bucket = map.get(key) ?? [];
			bucket.push(code);
			map.set(key, bucket);
		}
		// The API returns official order already, so no re-sorting is needed.
		return map;
	}, [data, maxLevel]);

	const hasChildren = (code: string) => (byParent.get(code)?.length ?? 0) > 0;

	/** The branch the menu is currently inside, or null at the root. */
	const currentBranch: NaceCode | null =
		trail.length > 0 ? trail[trail.length - 1] : null;

	/** What the menu lists right now: the children of the deepest crumb. */
	const currentOptions = useMemo(() => {
		const parent = trail.length > 0 ? trail[trail.length - 1] : null;
		return byParent.get(parent?.code ?? "") ?? [];
	}, [byParent, trail]);

	const { searchResults, hiddenCount } = useMemo(() => {
		if (!search.trim()) return { searchResults: [], hiddenCount: 0 };
		const matched = (data ?? []).filter(
			(code) => code.level <= maxLevel && matches(code, search),
		);
		return {
			searchResults: matched.slice(0, MAX_SEARCH_RESULTS),
			hiddenCount: Math.max(0, matched.length - MAX_SEARCH_RESULTS),
		};
	}, [data, maxLevel, search]);

	const isSearching = search.trim().length > 0;

	const handleToggle = (code: string) => {
		if (!isMulti) {
			onChange(value.includes(code) ? [] : [code]);
			setIsOpen(false);
			setSearch("");
			return;
		}
		onChange(
			value.includes(code)
				? value.filter((entry) => entry !== code)
				: [...value, code],
		);
	};

	/** Open a branch: the menu replaces its list with that branch's children. */
	const handleDrillIn = (naceCode: NaceCode) => {
		setSearch("");
		setTrail([...trail, naceCode]);
	};

	/** Jump back to a crumb; -1 is the root. */
	const handleCrumb = (index: number) => {
		setSearch("");
		setTrail(trail.slice(0, index + 1));
	};

	/** A search hit drills the menu to that code's branch, so context is kept. */
	const handleSearchHit = (naceCode: NaceCode) => {
		const ancestors: NaceCode[] = [];
		let cursor = naceCode.parent_code
			? byCode.get(naceCode.parent_code)
			: undefined;
		while (cursor) {
			ancestors.unshift(cursor);
			cursor = cursor.parent_code ? byCode.get(cursor.parent_code) : undefined;
		}
		setTrail(ancestors);
		setSearch("");
		handleToggle(naceCode.code);
	};

	if (error) {
		return (
			<div className="text-red-500 text-sm">{t("naceCodeDropdown.error")}</div>
		);
	}

	const triggerText = isLoading
		? t("naceCodeDropdown.loading")
		: value.length === 0
			? t("naceCodeDropdown.placeholder")
			: value.length === 1
				? `${value[0]} — ${byCode.get(value[0])?.label ?? ""}`
				: t("naceCascadingSelect.selectedCount", { count: value.length });

	const renderRow = (naceCode: NaceCode, showPath: boolean) => {
		const checked = value.includes(naceCode.code);
		const drillable = !showPath && hasChildren(naceCode.code);

		return (
			<li className="flex items-stretch" key={naceCode.code}>
				{/* The tick box is its own target so a branch can be chosen without
				    drilling into it. */}
				<button
					aria-label={t("naceCascadingSelect.selectThisLevel", {
						code: naceCode.code,
					})}
					aria-pressed={checked}
					className={`shrink-0 px-2 text-sm hover:bg-gray-100 ${
						checked ? "bg-blue-50 text-blue-600" : "text-gray-300"
					}`}
					onClick={() => handleToggle(naceCode.code)}
					type="button"
				>
					{checked ? "☑" : "☐"}
				</button>
				{/* Clicking the row opens the level below it; leaves just get ticked. */}
				<button
					className={`flex flex-1 items-start gap-2 py-2 pr-2 text-left text-sm hover:bg-gray-100 ${
						checked ? "bg-blue-50 text-blue-800" : "text-gray-700"
					}`}
					onClick={() => {
						if (showPath) return handleSearchHit(naceCode);
						if (drillable) return handleDrillIn(naceCode);
						handleToggle(naceCode.code);
					}}
					type="button"
				>
					<span>
						<span className="font-medium">{naceCode.code}</span>{" "}
						{displayLabel(naceCode)}
						{showPath && (
							<span className="ml-2 text-xs text-gray-400">
								{t(LEVEL_LABEL_KEY[naceCode.level])}
							</span>
						)}
					</span>
				</button>
				{drillable && (
					<button
						aria-label={`${t("naceCascadingSelect.openBranch")} ${naceCode.code}`}
						className="px-3 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
						onClick={() => handleDrillIn(naceCode)}
						type="button"
					>
						›
					</button>
				)}
			</li>
		);
	};

	return (
		<div className={`relative ${className}`} ref={containerRef}>
			<button
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
				disabled={isDisabled || isLoading}
				id={inputId}
				onClick={() => setIsOpen(!isOpen)}
				type="button"
			>
				<span className={value.length === 0 ? "text-gray-400" : ""}>
					{triggerText}
				</span>
				<span className="text-gray-400">▾</span>
			</button>

			{isOpen && (
				<div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
					<div className="border-b border-gray-100 p-2">
						<input
							className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
							onChange={(event) => setSearch(event.target.value)}
							placeholder={t("naceCodeDropdown.placeholder")}
							type="text"
							value={search}
						/>
					</div>

					{/* Breadcrumb: where the drill-down currently is. */}
					{!isSearching && (
						<div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-3 py-2 text-xs text-gray-500">
							<button
								className="hover:text-blue-600 hover:underline"
								onClick={() => handleCrumb(-1)}
								type="button"
							>
								{t("naceCascadingSelect.allActivities")}
							</button>
							{trail.map((crumb, index) => (
								<span className="flex items-center gap-1" key={crumb.code}>
									<span>/</span>
									<button
										className="hover:text-blue-600 hover:underline"
										onClick={() => handleCrumb(index)}
										type="button"
									>
										{crumb.code}
									</button>
								</span>
							))}
						</div>
					)}

					{/* Let the current branch itself be picked, not only its children. */}
					{!isSearching && currentBranch && (
						<button
							className="w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-blue-700 hover:bg-blue-50"
							onClick={() => handleToggle(currentBranch.code)}
							type="button"
						>
							{value.includes(currentBranch.code)
								? t("naceCascadingSelect.alreadyAdded")
								: t("naceCascadingSelect.selectThisLevel", {
										code: currentBranch.code,
									})}
						</button>
					)}

					<ul className="max-h-72 overflow-y-auto py-1">
						{isSearching ? (
							searchResults.length === 0 ? (
								<li className="px-3 py-2 text-sm text-gray-400">
									{t("naceCodeDropdown.noResults")}
								</li>
							) : (
								searchResults.map((code) => renderRow(code, true))
							)
						) : (
							currentOptions.map((code) => renderRow(code, false))
						)}
						{isSearching && hiddenCount > 0 && (
							<li className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
								{t("naceCodeDropdown.moreResults", { count: hiddenCount })}
							</li>
						)}
					</ul>
				</div>
			)}

			{isMulti && value.length > 0 && (
				<ul className="mt-2 flex flex-wrap gap-2">
					{value.map((code) => (
						<li
							className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800"
							key={code}
						>
							<span>
								{code} — {byCode.get(code)?.label ?? code}
							</span>
							<button
								aria-label={`${t("naceCascadingSelect.remove")} ${code}`}
								className="text-blue-500 hover:text-blue-800 disabled:opacity-50"
								disabled={isDisabled}
								onClick={() => handleToggle(code)}
								type="button"
							>
								×
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default NaceCascadingSelect;
