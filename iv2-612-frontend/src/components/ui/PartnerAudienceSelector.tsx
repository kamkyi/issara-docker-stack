import {
	ChevronDownIcon,
	Cross2Icon,
	MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type StrategicPartner,
	useStrategicPartners,
} from "$src/hooks/useStrategicPartner";
import type { FilterBarFilters } from "./FilterBar";

export type AudienceValue =
	| { kind: "all" }
	| { kind: "group"; grouping: string; partnerIds: number[] | null }
	| { kind: "custom"; partnerIds: number[] };

const GROUPING_CURRENT = "Current CASCADE Partners";
const GROUPING_PROSPECTIVE = "Prospective CASCADE Partners";
const GROUPINGS = [GROUPING_CURRENT, GROUPING_PROSPECTIVE] as const;

type Scope = "all" | (typeof GROUPINGS)[number];

const SCOPE_SHORT: Record<Scope, string> = {
	all: "All",
	[GROUPING_CURRENT]: "Current CASCADE Partners",
	[GROUPING_PROSPECTIVE]: "Prospective CASCADE Partners",
};

const ORG_COLORS = [
	"#004A60",
	"#148696",
	"#6F2E97",
	"#FB8379",
	"#B26A1A",
	"#2C7A50",
	"#3f7e8c",
	"#9a4fc0",
];

const initialsOf = (name: string): string =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0] ?? "")
		.join("")
		.toUpperCase() || "?";

const colorOf = (id: number): string => ORG_COLORS[id % ORG_COLORS.length];

interface PartnerAudienceSelectorProps {
	id?: string;
	filters: FilterBarFilters;
	onChange: (patch: Partial<FilterBarFilters>) => void;
}

export function PartnerAudienceSelector({
	id,
	filters,
	onChange,
}: PartnerAudienceSelectorProps) {
	const { data: spData, isLoading } = useStrategicPartners();
	const partners = useMemo(
		() => (Array.isArray(spData) ? spData : []),
		[spData],
	);

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const defaultId = useId();
	const selectId = id || defaultId;

	// Reconstruct AudienceValue from filters state
	const audienceValue = useMemo<AudienceValue>(() => {
		const groupings = filters.strategicPartnerGroupings ?? [];
		const rawPartners = filters.strategicPartners ?? [];

		if (groupings.length === 0 && rawPartners.length === 0) {
			return { kind: "all" };
		}

		if (groupings.length > 0) {
			const groupName = groupings[0];
			if (rawPartners.length === 0) {
				return { kind: "group", grouping: groupName, partnerIds: null };
			}
			const partnerIds = rawPartners.map(Number).filter(Number.isFinite);
			return { kind: "group", grouping: groupName, partnerIds };
		}

		const partnerIds = rawPartners.map(Number).filter(Number.isFinite);
		return { kind: "custom", partnerIds };
	}, [filters.strategicPartnerGroupings, filters.strategicPartners]);

	// Current scope/tab active within the selector panel
	const scope = useMemo<Scope>(() => {
		if (audienceValue.kind === "group") return audienceValue.grouping as Scope;
		return "all";
	}, [audienceValue]);

	const selectedIds = useMemo<Set<number>>(() => {
		if (audienceValue.kind === "all") {
			return new Set(partners.map((p) => p.id));
		}
		if (audienceValue.kind === "group") {
			const inGroup = partners.filter(
				(p) => p.strategic_partner_grouping === audienceValue.grouping,
			);
			if (audienceValue.partnerIds === null) {
				return new Set(inGroup.map((p) => p.id));
			}
			return new Set(audienceValue.partnerIds);
		}
		return new Set(audienceValue.partnerIds);
	}, [audienceValue, partners]);

	// Internal state for pending selections while dropdown is open
	const [localSelectedIds, setLocalSelectedIds] = useState<Set<number>>(
		new Set(),
	);
	const [localScope, setLocalScope] = useState<Scope>("all");

	// Sync local state when dropdown opens
	useEffect(() => {
		if (open) {
			setLocalSelectedIds(selectedIds);
			setLocalScope(scope);
		}
	}, [open, selectedIds, scope]);

	// Keep refs updated for the click-outside handler
	const localSelectedIdsRef = useRef(localSelectedIds);
	const localScopeRef = useRef(localScope);
	localSelectedIdsRef.current = localSelectedIds;
	localScopeRef.current = localScope;

	// Map and emit new filters
	const emitFromSet = useCallback(
		(ids: Set<number>, newScope: Scope) => {
			const cleanIds = Array.from(ids).filter((id) => id !== -1);

			if (newScope === "all") {
				if (cleanIds.length === 0) {
					onChange({
						strategicPartners: ["-1"],
						strategicPartnerGroupings: [],
					});
					return;
				}
				const allIds = partners.map((p) => p.id);
				if (
					cleanIds.length === allIds.length &&
					allIds.every((id) => cleanIds.includes(id))
				) {
					onChange({
						strategicPartners: [],
						strategicPartnerGroupings: [],
					});
					return;
				}
				onChange({
					strategicPartners: cleanIds.map(String),
					strategicPartnerGroupings: [],
				});
				return;
			}

			const groupOrgs = partners.filter(
				(p) => p.strategic_partner_grouping === newScope,
			);
			const groupIds = groupOrgs.map((p) => p.id);
			const selectedInGroup = groupIds.filter((id) => cleanIds.includes(id));

			if (selectedInGroup.length === 0) {
				onChange({
					strategicPartners: ["-1"],
					strategicPartnerGroupings: [newScope],
				});
			} else if (
				selectedInGroup.length === groupIds.length &&
				groupIds.length > 0
			) {
				onChange({
					strategicPartners: [],
					strategicPartnerGroupings: [newScope],
				});
			} else {
				onChange({
					strategicPartners: selectedInGroup.map(String),
					strategicPartnerGroupings: [newScope],
				});
			}
		},
		[partners, onChange],
	);

	const commit = useCallback(() => {
		emitFromSet(localSelectedIdsRef.current, localScopeRef.current);
		setOpen(false);
	}, [emitFromSet]);

	// Close and commit dropdown when clicking outside. Only while the dropdown is
	// actually open: `localSelectedIds` starts empty and is only synced from the
	// real filters on open, so committing on a stray click elsewhere on the page
	// (dragging the map, say) would emit the "nothing selected" sentinel and blank
	// the whole dashboard.
	useEffect(() => {
		if (!open) return;

		const handleOutsideClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				commit();
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [commit, open]);

	// Focus search box when opening
	useEffect(() => {
		if (open) {
			setTimeout(() => searchRef.current?.focus(), 50);
		} else {
			setQuery("");
		}
	}, [open]);

	// Helper functions to get partners under scope
	const orgsInScope = (scopeVal: Scope): StrategicPartner[] => {
		if (scopeVal === "all") return partners;
		return partners.filter((p) => p.strategic_partner_grouping === scopeVal);
	};

	const pickScope = (newScope: Scope) => {
		setQuery("");
		setLocalScope(newScope);
		const scopeOrgs = orgsInScope(newScope);
		setLocalSelectedIds(new Set(scopeOrgs.map((o) => o.id)));
	};

	const toggleOrg = (orgId: number) => {
		setLocalSelectedIds((prev) => {
			const next = new Set(prev);
			next.delete(-1);
			if (next.has(orgId)) {
				next.delete(orgId);
			} else {
				next.add(orgId);
			}
			return next;
		});
	};

	const inScope = orgsInScope(localScope);
	const q = query.trim().toLowerCase();
	const matches = (p: StrategicPartner) =>
		p.name.toLowerCase().includes(q) ||
		(p.focal_point_name ?? "").toLowerCase().includes(q);

	const visibleOrgs = useMemo(() => {
		const filtered = q ? inScope.filter(matches) : inScope;
		return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
	}, [inScope, q]);

	const allVisibleSelected = useMemo(() => {
		return (
			visibleOrgs.length > 0 &&
			visibleOrgs.every((o) => localSelectedIds.has(o.id))
		);
	}, [visibleOrgs, localSelectedIds]);

	const selectAll = () => {
		setLocalSelectedIds((prev) => {
			const next = new Set(prev);
			next.delete(-1);
			if (allVisibleSelected) {
				for (const o of visibleOrgs) {
					next.delete(o.id);
				}
			} else {
				for (const o of visibleOrgs) {
					next.add(o.id);
				}
			}
			return next;
		});
	};

	const sectionState = (orgs: StrategicPartner[]): "none" | "some" | "all" => {
		if (orgs.length === 0) return "none";
		const count = orgs.filter((o) => localSelectedIds.has(o.id)).length;
		return count === 0 ? "none" : count === orgs.length ? "all" : "some";
	};

	const toggleSection = (orgs: StrategicPartner[]) => {
		const ids = orgs.map((o) => o.id);
		setLocalSelectedIds((prev) => {
			const next = new Set(prev);
			next.delete(-1);
			if (sectionState(orgs) === "all") {
				for (const id of ids) next.delete(id);
			} else {
				for (const id of ids) next.add(id);
			}
			return next;
		});
	};

	const sections = useMemo(() => {
		const known = GROUPINGS.map((g) => ({
			label: g as string,
			orgs: partners
				.filter((p) => p.strategic_partner_grouping === g)
				.sort((a, b) => a.name.localeCompare(b.name)),
		}));
		const other = partners
			.filter(
				(p) =>
					!p.strategic_partner_grouping ||
					!GROUPINGS.includes(p.strategic_partner_grouping as any),
			)
			.sort((a, b) => a.name.localeCompare(b.name));

		if (other.length > 0) {
			known.push({ label: "Other", orgs: other });
		}
		return known.filter((s) => s.orgs.length > 0);
	}, [partners]);

	// Display trigger label
	const displayLabel = useMemo(() => {
		if (audienceValue.kind === "all") {
			return "All Strategic Partners";
		}
		if (audienceValue.kind === "group") {
			const groupName = audienceValue.grouping;
			const totalInGroup = partners.filter(
				(p) => p.strategic_partner_grouping === groupName,
			).length;
			if (audienceValue.partnerIds === null) {
				return groupName;
			}
			const validIds = audienceValue.partnerIds.filter((id) => id !== -1);
			return `${validIds.length} of ${totalInGroup} in ${groupName}`;
		}
		const validIds = audienceValue.partnerIds.filter((id) => id !== -1);
		return `${validIds.length} selected`;
	}, [audienceValue, partners]);

	if (isLoading) {
		return (
			<div className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-400 w-60">
				Loading partners…
			</div>
		);
	}

	const cleanSelectedCount = Array.from(localSelectedIds).filter(
		(id) => id !== -1,
	).length;

	return (
		<div className="relative w-60" id={selectId} ref={containerRef}>
			<button
				className={`text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition w-full flex items-center justify-between gap-2`}
				onClick={() => setOpen((prev) => !prev)}
				type="button"
			>
				<span
					className="flex-1 truncate text-left font-medium"
					title={displayLabel}
				>
					{displayLabel}
				</span>
				<ChevronDownIcon
					className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open && (
				<div className="absolute z-50 top-full left-0 mt-1 flex w-80 flex-col rounded-xl border border-gray-200 bg-white shadow-xl max-h-[500px]">
					{/* Scope selector list (message board radio list style) */}
					<div className="flex flex-col border-b border-gray-100 p-2 gap-1.5 bg-white rounded-t-xl">
						{(["all", ...GROUPINGS] as Scope[]).map((s) => {
							const cnt = orgsInScope(s).length;
							const isActive = localScope === s;
							return (
								<button
									className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors text-left ${
										isActive
											? "bg-[#eaf4f6]/50 font-semibold text-[#004A60]"
											: "text-gray-600 hover:bg-gray-50"
									}`}
									key={s}
									onClick={() => pickScope(s)}
									type="button"
								>
									<span
										className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
											isActive ? "border-[#148696]" : "border-gray-300"
										}`}
									>
										{isActive && (
											<span className="w-2.5 h-2.5 rounded-full bg-[#148696]" />
										)}
									</span>
									<span className="truncate">{SCOPE_SHORT[s]}</span>
									<span
										className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
											isActive
												? "bg-[#148696]/10 text-[#148696]"
												: "bg-gray-100 text-gray-500"
										}`}
									>
										{cnt}
									</span>
								</button>
							);
						})}
					</div>

					{/* Search input */}
					<div className="p-3 border-b border-gray-100 relative">
						<MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
						<input
							className="w-full text-sm pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white placeholder-gray-400 transition-all duration-150"
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search organisations..."
							ref={searchRef}
							type="text"
							value={query}
						/>
						{query && (
							<button
								className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
								onClick={() => setQuery("")}
								type="button"
							>
								<Cross2Icon className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{/* Selection options control bar */}
					<div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium bg-gray-50/50">
						<span>
							{q
								? `${visibleOrgs.length} match${visibleOrgs.length === 1 ? "" : "es"}`
								: `${cleanSelectedCount} selected`}
						</span>
						<button
							className="text-[#148696] font-semibold hover:text-[#004A60] transition-colors hover:underline"
							onClick={selectAll}
							type="button"
						>
							{allVisibleSelected ? "Clear all" : "Select all"}
						</button>
					</div>

					{/* Partners options list */}
					<div className="overflow-y-auto max-h-64 divide-y divide-gray-50">
						{visibleOrgs.length === 0 ? (
							<div className="px-3 py-6 text-sm text-gray-400 text-center font-medium">
								No partners match “{query}”
							</div>
						) : q ? (
							visibleOrgs.map((o) => (
								<label
									className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 cursor-pointer text-sm text-gray-700 select-none transition-colors duration-150"
									key={o.id}
								>
									<input
										checked={localSelectedIds.has(o.id)}
										className="accent-[#148696] rounded w-4 h-4 cursor-pointer"
										onChange={() => toggleOrg(o.id)}
										type="checkbox"
									/>
									<span
										className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0"
										style={{ backgroundColor: colorOf(o.id) }}
									>
										{initialsOf(o.name)}
									</span>
									<span className="truncate font-semibold text-gray-800">
										{o.name}
									</span>
								</label>
							))
						) : localScope === "all" ? (
							sections.map((section) => {
								const state = sectionState(section.orgs);
								const countSelected = section.orgs.filter((o) =>
									localSelectedIds.has(o.id),
								).length;
								return (
									<div
										className="flex flex-col animate-fadeIn"
										key={section.label}
									>
										<div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-y border-gray-100/80">
											<label className="flex items-center gap-2 cursor-pointer select-none">
												<input
													checked={state === "all"}
													className="accent-[#148696] rounded w-3.5 h-3.5 cursor-pointer"
													onChange={() => toggleSection(section.orgs)}
													ref={(el) => {
														if (el) el.indeterminate = state === "some";
													}}
													type="checkbox"
												/>
												<span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
													{section.label}
												</span>
											</label>
											<span className="text-[10px] text-gray-400 font-semibold bg-white border border-gray-200 rounded px-1.5 py-0.5">
												{countSelected}/{section.orgs.length}
											</span>
										</div>
										<div className="flex flex-col">
											{section.orgs.map((o) => (
												<label
													className="flex items-center gap-3 pl-8 pr-4 py-2.5 hover:bg-gray-50/80 cursor-pointer text-sm text-gray-700 select-none transition-colors duration-150"
													key={o.id}
												>
													<input
														checked={localSelectedIds.has(o.id)}
														className="accent-[#148696] rounded w-4 h-4 cursor-pointer"
														onChange={() => toggleOrg(o.id)}
														type="checkbox"
													/>
													<span
														className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0"
														style={{ backgroundColor: colorOf(o.id) }}
													>
														{initialsOf(o.name)}
													</span>
													<span className="truncate font-semibold text-gray-800">
														{o.name}
													</span>
												</label>
											))}
										</div>
									</div>
								);
							})
						) : (
							visibleOrgs.map((o) => (
								<label
									className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 cursor-pointer text-sm text-gray-700 select-none transition-colors duration-150"
									key={o.id}
								>
									<input
										checked={localSelectedIds.has(o.id)}
										className="accent-[#148696] rounded w-4 h-4 cursor-pointer"
										onChange={() => toggleOrg(o.id)}
										type="checkbox"
									/>
									<span
										className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0"
										style={{ backgroundColor: colorOf(o.id) }}
									>
										{initialsOf(o.name)}
									</span>
									<span className="truncate font-semibold text-gray-800">
										{o.name}
									</span>
								</label>
							))
						)}
					</div>

					{/* Footer action button */}
					<div className="p-3 border-t border-gray-100 flex justify-end bg-gray-50/50 rounded-b-xl">
						<button
							className="text-xs font-semibold px-5 py-2 rounded-lg bg-[#148696] hover:bg-[#004a60] text-white transition-all duration-150 shadow-sm hover:shadow active:scale-95"
							onClick={commit}
							type="button"
						>
							Apply
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
