import { useEffect, useMemo, useRef, useState } from "react";
import type { StrategicPartner } from "$src/hooks/useStrategicPartner";
import { I } from "./icons";

export type AudienceValue =
	| { kind: "all" }
	| { kind: "group"; grouping: string; partnerIds: number[] | null }
	| { kind: "custom"; partnerIds: number[] };

const GROUPING_CURRENT = "Current CASCADE Partners";
const GROUPING_PROSPECTIVE = "Prospective CASCADE Partners";
const GROUPINGS = [GROUPING_CURRENT, GROUPING_PROSPECTIVE] as const;

// Scope keys mirror the design: "all" plus one per grouping. We key scopes by
// the full grouping string so they map straight onto strategic_partner_grouping.
type Scope = "all" | (typeof GROUPINGS)[number];

const SCOPE_FULL: Record<Scope, string> = {
	all: "All strategic partners",
	[GROUPING_CURRENT]: GROUPING_CURRENT,
	[GROUPING_PROSPECTIVE]: GROUPING_PROSPECTIVE,
};

const SCOPE_SHORT: Record<Scope, string> = {
	all: "All",
	[GROUPING_CURRENT]: GROUPING_CURRENT,
	[GROUPING_PROSPECTIVE]: GROUPING_PROSPECTIVE,
};

// Avatar palette borrowed from the design (data.js ORG_COLORS).
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

const contactOf = (p: StrategicPartner): string => p.focal_point_name ?? "";

function sortByName<T extends { name: string }>(arr: T[]): T[] {
	return [...arr].sort((a, b) => a.name.localeCompare(b.name));
}

interface Props {
	partners: StrategicPartner[];
	value: AudienceValue;
	onChange: (v: AudienceValue) => void;
}

export function audienceLabel(
	value: AudienceValue,
	partners: StrategicPartner[],
): { main: string; sub: string | null; empty: boolean } {
	const scope = scopeOf(value);
	const inScope = orgsInScope(partners, scope);
	const selected = selectedIdsOf(value, partners);
	if (selected.size === 0)
		return { main: "Select audience…", sub: null, empty: true };
	if (selected.size === inScope.length)
		return {
			main: SCOPE_FULL[scope],
			sub: `${selected.size} partners`,
			empty: false,
		};
	return {
		main: `${selected.size} of ${inScope.length} selected`,
		sub: scope === "all" ? "Custom selection" : SCOPE_FULL[scope],
		empty: false,
	};
}

function scopeOf(value: AudienceValue): Scope {
	if (value.kind === "group") return value.grouping as Scope;
	return "all";
}

function orgsInScope(
	partners: StrategicPartner[],
	scope: Scope,
): StrategicPartner[] {
	if (scope === "all") return partners;
	return partners.filter((p) => p.strategic_partner_grouping === scope);
}

function selectedIdsOf(
	value: AudienceValue,
	partners: StrategicPartner[],
): Set<number> {
	if (value.kind === "all") return new Set(partners.map((p) => p.id));
	if (value.kind === "group") {
		const inGroup = partners.filter(
			(p) => p.strategic_partner_grouping === value.grouping,
		);
		if (value.partnerIds === null) return new Set(inGroup.map((p) => p.id));
		return new Set(value.partnerIds);
	}
	return new Set(value.partnerIds);
}

// Tri-state checkbox: empty / dash (some) / check (all).
function Box({ st }: { st: "none" | "some" | "all" }) {
	return (
		<span
			className={`ck${st === "all" ? " on" : ""}${st === "some" ? " ind" : ""}`}
		>
			{st === "all" && <I.check />}
			{st === "some" && <span className="dash" />}
		</span>
	);
}

function OrgRow({
	o,
	selected,
	onToggle,
}: {
	o: StrategicPartner;
	selected: boolean;
	onToggle: (id: number) => void;
}) {
	return (
		<button
			className={`aud-opt${selected ? " sel" : ""}`}
			onClick={() => onToggle(o.id)}
			type="button"
		>
			<Box st={selected ? "all" : "none"} />
			<span className="aud-av" style={{ background: colorOf(o.id) }}>
				{initialsOf(o.name)}
			</span>
			<span className="aud-opt-txt">{o.name}</span>
		</button>
	);
}

export function AudienceSelector({ partners, value, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const ref = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) {
			setQuery("");
			return;
		}
		// Focus the search box when the panel opens (mirrors the design's autofocus).
		searchRef.current?.focus();
		const h = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [open]);

	const scope = scopeOf(value);
	const selectedIds = useMemo(
		() => selectedIdsOf(value, partners),
		[value, partners],
	);

	// Emit the right AudienceValue from a raw set of selected ids, given the
	// current scope (all-in-scope collapses to "all"/"group null").
	const emitFromSet = (ids: Set<number>) => {
		if (scope === "all") {
			const allIds = partners.map((p) => p.id);
			if (ids.size === allIds.length && allIds.every((id) => ids.has(id))) {
				onChange({ kind: "all" });
				return;
			}
			onChange({ kind: "custom", partnerIds: [...ids] });
			return;
		}
		const groupIds = partners
			.filter((p) => p.strategic_partner_grouping === scope)
			.map((p) => p.id);
		const allGroupSelected =
			groupIds.length > 0 && groupIds.every((id) => ids.has(id));
		if (allGroupSelected) {
			onChange({ kind: "group", grouping: scope, partnerIds: null });
		} else {
			onChange({
				kind: "group",
				grouping: scope,
				partnerIds: groupIds.filter((id) => ids.has(id)),
			});
		}
	};

	const pickScope = (k: Scope) => {
		setQuery("");
		if (k === "all") onChange({ kind: "all" });
		else onChange({ kind: "group", grouping: k, partnerIds: null });
	};

	const toggleOrg = (id: number) => {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		emitFromSet(next);
	};

	const inScope = orgsInScope(partners, scope);
	const q = query.trim().toLowerCase();
	const matches = (p: StrategicPartner) =>
		p.name.toLowerCase().includes(q) || contactOf(p).toLowerCase().includes(q);
	const visibleOrgs = q ? sortByName(inScope.filter(matches)) : inScope;

	const allVisibleSelected =
		visibleOrgs.length > 0 && visibleOrgs.every((o) => selectedIds.has(o.id));
	const selectAll = () => {
		const next = new Set(selectedIds);
		if (allVisibleSelected) for (const o of visibleOrgs) next.delete(o.id);
		else for (const o of visibleOrgs) next.add(o.id);
		emitFromSet(next);
	};

	const sectionState = (orgs: StrategicPartner[]): "none" | "some" | "all" => {
		if (orgs.length === 0) return "none";
		const n = orgs.filter((o) => selectedIds.has(o.id)).length;
		return n === 0 ? "none" : n === orgs.length ? "all" : "some";
	};
	const toggleSection = (orgs: StrategicPartner[]) => {
		const ids = orgs.map((o) => o.id);
		const next = new Set(selectedIds);
		if (sectionState(orgs) === "all") for (const id of ids) next.delete(id);
		else for (const id of ids) next.add(id);
		emitFromSet(next);
	};

	const lab = audienceLabel(value, partners);

	// Sections for the grouped (scope=all) view. Always include an "Other"
	// bucket so partners with no grouping set still appear (the DB column can be
	// null until partners are categorised).
	const sections = useMemo(() => {
		const known = GROUPINGS.map((g) => ({
			label: g as string,
			orgs: sortByName(
				partners.filter((p) => p.strategic_partner_grouping === g),
			),
		}));
		const other = sortByName(
			partners.filter(
				(p) =>
					!GROUPINGS.includes(
						p.strategic_partner_grouping as (typeof GROUPINGS)[number],
					),
			),
		);
		if (other.length > 0) known.push({ label: "Other", orgs: other });
		return known.filter((s) => s.orgs.length > 0);
	}, [partners]);

	const renderOrg = (o: StrategicPartner) => (
		<OrgRow
			key={o.id}
			o={o}
			onToggle={toggleOrg}
			selected={selectedIds.has(o.id)}
		/>
	);

	return (
		<div className="aud" ref={ref}>
			<button
				className={`aud-trigger${open ? " open" : ""}`}
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				<span className="aud-ic">
					<I.users />
				</span>
				<span className="aud-lab">
					<span className={`aud-main${lab.empty ? " ph" : ""}`}>
						{lab.main}
					</span>
					{lab.sub && <span className="aud-sub">{lab.sub}</span>}
				</span>
				<I.chev className="aud-chev" />
			</button>

			{open && (
				<div className="aud-panel">
					<div className="aud-scope">
						{(["all", ...GROUPINGS] as Scope[]).map((s) => {
							const cnt = orgsInScope(partners, s).length;
							return (
								<button
									className={`aud-scope-row${scope === s ? " on" : ""}`}
									key={s}
									onClick={() => pickScope(s)}
									type="button"
								>
									<span className={`rk${scope === s ? " on" : ""}`} />
									<span className="aud-scope-lab">{SCOPE_SHORT[s]}</span>
									<span className="aud-count">{cnt}</span>
								</button>
							);
						})}
					</div>

					<div className="aud-search">
						<I.search />
						<input
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search organisations…"
							ref={searchRef}
							type="text"
							value={query}
						/>
						{query && (
							<button
								className="aud-search-x"
								onClick={() => setQuery("")}
								type="button"
							>
								<I.x />
							</button>
						)}
					</div>

					<div className="aud-selbar">
						<span className="aud-selcount">
							{q
								? `${visibleOrgs.length} match${visibleOrgs.length === 1 ? "" : "es"}`
								: `${selectedIds.size} of ${inScope.length} selected`}
						</span>
						<button className="aud-selall" onClick={selectAll} type="button">
							{allVisibleSelected
								? `Clear${q ? " results" : " all"}`
								: `Select${q ? " results" : " all"}`}
						</button>
					</div>

					<div className="aud-orgs">
						{visibleOrgs.length === 0 ? (
							<div className="aud-empty">No organisations match “{query}”</div>
						) : q ? (
							visibleOrgs.map((o) => renderOrg(o))
						) : scope === "all" ? (
							sections.map((section) => {
								const sel = section.orgs.filter((o) =>
									selectedIds.has(o.id),
								).length;
								return (
									<div className="aud-grp" key={section.label}>
										<button
											className="aud-grp-head"
											onClick={() => toggleSection(section.orgs)}
											type="button"
										>
											<Box st={sectionState(section.orgs)} />
											<span className="aud-grp-lab">{section.label}</span>
											<span className="aud-count">
												{sel}/{section.orgs.length}
											</span>
										</button>
										{section.orgs.map((o) => renderOrg(o))}
									</div>
								);
							})
						) : (
							sortByName(inScope).map((o) => renderOrg(o))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
