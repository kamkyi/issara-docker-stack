import type { GridColDef } from "@mui/x-data-grid";
import * as Dialog from "@radix-ui/react-dialog";
import { EyeOpenIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useId, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { sunrisepalette } from "$src/assets/mock/common-data";
import DataTable from "$src/components/tables/DataTable";
import {
	FilterBar,
	type FilterBarFilters,
	type FilterBarOption,
} from "$src/components/ui/FilterBar";
import { InfoTip } from "$src/components/ui/InfoTip";
import { useSupplyChains } from "$src/hooks/useSupplyChain";
import {
	type ErMetricsCountData,
	type UseErMetricsCountParams,
	useErMetricsCount,
} from "$src/queries/useErMetricsCount";
import {
	type FieldworkActivityApiItem,
	useOutreachEffectiveness,
} from "$src/queries/useOutreachEffectiveness";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import styles from "../../routes/our-workplace.module.css";

// ─── Trend helpers (mirror the Driving Ethical Supply Chains tab) ────────────

function calculatePercentChange(current: number, previous: number): number {
	if (
		!Number.isFinite(current) ||
		!Number.isFinite(previous) ||
		previous === 0
	) {
		return 0;
	}
	return ((current - previous) / previous) * 100;
}

function TrendBadge({
	value,
	className = "",
}: {
	value: number;
	className?: string;
}) {
	const positive = value > 0;
	const zero = value === 0;
	const abs = Math.abs(value);
	const display = abs >= 1000 ? ">999%" : `${abs.toFixed(1)}%`;
	return (
		<div
			className={`flex items-center gap-1 font-semibold text-sm ${className}`}
		>
			<span
				className={positive || zero ? "text-emerald-600" : "text-[#FB8379]"}
			>
				{positive ? "↑" : zero ? "→" : "↓"} {display}
			</span>
			<span className="text-[#8A979C] font-normal">vs. previous year</span>
		</div>
	);
}

// Sum of workers reached for a single fieldwork activity row.
// Combines the two distinct reach buckets recorded per activity.
function activityWorkers(a: FieldworkActivityApiItem): number {
	const workersReached = Number(
		a.total_workers_reached ??
			a.total_worker ??
			a.total_workers ??
			a.workers_reached ??
			0,
	);
	const peopleReached = Number(a.total_people_reached ?? 0);
	return workersReached + peopleReached;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type FieldActivityRow = {
	id: number;
	date: string;
	organization: string;
	type: string;
	suppliers: string;
	recruiters: string;
	location: string;
	target: string;
	notes: string;
	links: string;
	totalWorker: number | string;
	createdBy: string;
	raw: FieldworkActivityApiItem;
};

// ─── Column definition for the Field Activities table ───────────────────────

const FIELD_ACTIVITY_COLUMNS: GridColDef[] = [
	{ field: "id", headerName: "ID", width: 70 },
	{ field: "date", headerName: "Date", flex: 0.8, minWidth: 110 },
	{
		field: "organization",
		headerName: "Organization",
		flex: 1.2,
		minWidth: 160,
	},
	{ field: "type", headerName: "Type", flex: 2.5, minWidth: 320 },
	{ field: "suppliers", headerName: "Suppliers", flex: 1.2, minWidth: 160 },
	{ field: "recruiters", headerName: "Recruiters", flex: 1.2, minWidth: 160 },
	{ field: "location", headerName: "Location", flex: 1.1, minWidth: 140 },
	{ field: "target", headerName: "Target", flex: 0.8, minWidth: 110 },
	{ field: "notes", headerName: "Notes", flex: 1, minWidth: 140 },
	{
		field: "links",
		headerName: "Links",
		flex: 1,
		minWidth: 120,
		renderCell: (params) => {
			const linkText = String(params.value ?? "-");
			if (!linkText || linkText === "-") return "-";
			return (
				<a
					className="text-[#148696] underline underline-offset-2"
					href={linkText}
					rel="noreferrer"
					target="_blank"
				>
					{linkText}
				</a>
			);
		},
	},
	{
		field: "totalWorker",
		headerName: "Total Worker",
		flex: 0.8,
		minWidth: 130,
	},
	{ field: "createdBy", headerName: "Created By", flex: 1, minWidth: 140 },
	{
		field: "view",
		headerName: "",
		width: 44,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
	},
];

// const normalizeTextList = (value: unknown, fallback = "-") => {
// 	if (Array.isArray(value)) {
// 		const filtered = value
// 			.filter((item): item is string => typeof item === "string")
// 			.map((item) => item.trim())
// 			.filter(Boolean);
// 		return filtered.length > 0 ? filtered.join(", ") : fallback;
// 	}

// 	if (typeof value === "string" && value.trim()) {
// 		return value;
// 	}

// 	return fallback;
// };

const normalizeTextList = (value: unknown, fallback = "-") => {
	if (Array.isArray(value)) {
		const filtered = value
			.filter((item): item is string => typeof item === "string")
			.map((item) => item.trim())
			.filter(Boolean);
		return filtered.length > 0 ? filtered.join(", ") : fallback;
	}

	if (typeof value === "string" && value.trim()) {
		return value;
	}

	return fallback;
};

const getNestedName = (value: unknown) => {
	if (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		typeof value.name === "string"
	) {
		return value.name;
	}

	return undefined;
};

function SectionTitle({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <h2 className={`heading-display ${className}`}>{children}</h2>;
}

// ─── Community Outreach & Empowerment — dynamic fieldwork category cards ──────

interface CategoryStat {
	id: number;
	name: string;
	workers: number;
	count: number;
	trend: number;
}

function CommunityOutreachSection({
	stats,
	onSelect,
}: {
	stats: CategoryStat[];
	onSelect: (cat: { id: number; name: string }) => void;
}) {
	return (
		<section className="mb-8">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-l">
				{stats.map((s) => (
					<button
						className={`${styles.chartCard} hover:shadow-md flex flex-col gap-2 text-left cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]`}
						key={s.id}
						onClick={() => onSelect({ id: s.id, name: s.name })}
						title={`View all ${s.name} activities`}
						type="button"
					>
						<p className="text-md font-medium text-[#8A979C] tracking-wide leading-tight">
							{s.name} Activities
						</p>
						<p className="text-5xl font-black tracking-tight text-[#148696]">
							{s.workers.toLocaleString()}
						</p>
						<p className="text-sm text-[#8A979C]">
							Total No. of Activities: {s.count.toLocaleString()}
						</p>
						<TrendBadge value={s.trend} />
					</button>
				))}
			</div>
		</section>
	);
}

// ─── Category drill-down modal ───────────────────────────────────────────────

function CategoryActivitiesModal({
	category,
	activities,
	onClose,
}: {
	category: { id: number; name: string } | null;
	activities: FieldworkActivityApiItem[];
	onClose: () => void;
}) {
	const rows = useMemo(() => {
		if (!category) return [];
		return activities.filter((a) => a.fieldwork_category_id === category.id);
	}, [category, activities]);

	return (
		<Dialog.Root onOpenChange={(open) => !open && onClose()} open={!!category}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-4xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl flex flex-col">
					<div className="flex items-center justify-between border-b border-[#D2D2D2] px-l py-m">
						<Dialog.Title className="text-lg font-semibold text-[#56666C]">
							{category?.name} Activities
							<span className="ml-2 text-sm font-normal text-[#8A979C]">
								{rows.length} records
							</span>
						</Dialog.Title>
						<Dialog.Close className="text-[#8A979C] hover:text-[#56666C] text-xl leading-none">
							×
						</Dialog.Close>
					</div>
					<div className="overflow-auto px-l py-m">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-[#8A979C] border-b border-[#D2D2D2]">
									<th className="py-2 pr-3 font-medium">Date</th>
									<th className="py-2 pr-3 font-medium">Type</th>
									<th className="py-2 pr-3 font-medium">Suppliers</th>
									<th className="py-2 pr-3 font-medium">Location</th>
									<th className="py-2 pr-3 font-medium text-right">
										Participants
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((a, i) => {
									const location = [
										a.district_name,
										a.province_name,
										a.country_name,
									]
										.filter(Boolean)
										.join(", ");
									return (
										<tr
											className="border-b border-[#D2D2D2] align-top"
											key={a.id ?? i}
										>
											<td className="py-2 pr-3 whitespace-nowrap">
												{a.fieldwork_date?.split("T")[0] ?? "—"}
											</td>
											<td className="py-2 pr-3">
												{a.fieldwork_type_name ?? getNestedName(a.type) ?? "—"}
											</td>
											<td className="py-2 pr-3">{a.supplier_names || "-"}</td>
											<td className="py-2 pr-3">{location || "—"}</td>
											<td className="py-2 pr-3 text-right">
												{activityWorkers(a).toLocaleString()}
											</td>
										</tr>
									);
								})}
								{rows.length === 0 && (
									<tr>
										<td className="py-6 text-center text-[#8A979C]" colSpan={5}>
											No activities in this category for the current filters.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// ─── Total Fieldwork Activities Breakdown — Issara vs Partners ───────────────

interface OrgStat {
	workers: number;
	count: number;
	trend: number;
}

function FieldworkBreakdownCard({
	issara,
	partners,
}: {
	issara: OrgStat;
	partners: OrgStat;
}) {
	const rows: { label: string; stat: OrgStat; color: string }[] = [
		{ label: "Issara", stat: issara, color: "#148696" },
		{ label: "Partners", stat: partners, color: "#148696" },
	];
	return (
		<div className={`${styles.chartCard} hover:shadow-md h-full`}>
			<p className="text-[#8A979C] mb-3 tracking-wide font-medium">
				Total Fieldwork Activities Breakdown
			</p>
			{rows.map((r, i) => (
				<div
					className={`flex flex-col gap-1 py-4 ${
						i > 0 ? "border-t border-[#D2D2D2]" : ""
					}`}
					key={r.label}
				>
					<p className="font-semibold text-[#56666C]">{r.label}</p>
					<p
						className="text-4xl font-black tracking-tight"
						style={{ color: r.color }}
					>
						{r.stat.workers.toLocaleString()}
					</p>
					<p className="text-xs text-[#8A979C]">
						Total No. of Activities: {r.stat.count.toLocaleString()}
					</p>
					<TrendBadge value={r.stat.trend} />
				</div>
			))}
		</div>
	);
}

// ─── Section 2 — Correlation Chart ───────────────────────────────────────────

// Bucket key for activities with no fieldwork category.
const UNCATEGORIZED_KEY = 0;

interface MonthlyOutreachPoint {
	month: string;
	visitsByCategory: Record<number, number>;
	workersReached: number;
}

interface CorrelationChartSectionProps {
	data: MonthlyOutreachPoint[];
	categories: { id: number; name: string }[];
	selectedCategory: string;
	onSelectCategory: (value: string) => void;
}

// Stable palette for the stacked category bars (distinct from the line color).
const CATEGORY_COLORS = sunrisepalette;
const WORKERS_LINE_COLOR = "#4ede8f";

function CorrelationChartSection({
	data,
	categories,
	selectedCategory,
	onSelectCategory,
}: CorrelationChartSectionProps) {
	const categorySelectId = useId();

	// The category bar series shown: all of them, or just the selected one.
	const shownCategories = useMemo(() => {
		const withUncategorized = [
			...categories,
			{ id: UNCATEGORIZED_KEY, name: "Uncategorized" },
		];
		if (selectedCategory === "all") return categories;
		const catId = Number(selectedCategory);
		return withUncategorized.filter((c) => c.id === catId);
	}, [categories, selectedCategory]);

	const barSeries = shownCategories.map((c) => ({
		name: c.name,
		type: "bar" as const,
		data: data.map((d) => d.visitsByCategory[c.id] ?? 0),
	}));
	const series = [
		...barSeries,
		{
			name: "Workers Reached",
			type: "line" as const,
			data: data.map((d) => d.workersReached),
		},
	];
	// 0 width for every bar series, 3 for the trailing line series.
	const strokeWidths = [...barSeries.map(() => 0), 3];
	const colors = [
		...shownCategories.map(
			(_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length],
		),
		WORKERS_LINE_COLOR,
	];

	return (
		<div className={`${styles.chartCard} hover:shadow-md h-full`}>
			<div className="flex items-center justify-between mb-3 gap-m">
				<p className="text-[#8A979C] tracking-wide font-medium">
					Correlation between Fieldwork Activities &amp; Reach by Month
				</p>
				<fieldset className="relative rounded-lg border border-gray-300 px-2 pb-1 pt-0.5 min-w-[150px] focus-within:border-[#148696] transition-colors">
					<legend className="px-1 text-xs text-[#8A979C]">
						<label htmlFor={categorySelectId}>Fieldwork Category</label>
					</legend>
					<select
						className="w-full appearance-none bg-transparent pr-6 py-0.5 text-sm font-medium text-[#56666C] focus:outline-none cursor-pointer"
						id={categorySelectId}
						onChange={(e) => onSelectCategory(e.target.value)}
						value={selectedCategory}
					>
						<option value="all">All</option>
						{categories.map((c) => (
							<option key={c.id} value={String(c.id)}>
								{c.name}
							</option>
						))}
					</select>
					<svg
						aria-hidden="true"
						className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A979C]"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						viewBox="0 0 24 24"
					>
						<path
							d="M6 9l6 6 6-6"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</fieldset>
			</div>
			<ReactApexChart
				height={260}
				options={{
					chart: {
						type: "bar",
						stacked: true,
						toolbar: { show: false },
						zoom: { enabled: false },
					},
					plotOptions: {
						bar: {
							borderRadius: 4,
							borderRadiusApplication: "end",
							columnWidth: "50%",
						},
					},
					stroke: {
						width: strokeWidths,
						curve: "smooth",
					},
					xaxis: {
						categories: data.map((d) => d.month),
						labels: {
							style: {
								fontFamily: "DM Sans",
								colors: ["#718096"],
								fontSize: "12px",
							},
						},
					},
					yaxis: [
						{
							seriesName: shownCategories.map((c) => c.name),
							title: {
								text: "Num. of Field Visits",
								style: {
									fontFamily: "DM Sans",
									fontWeight: 500,
									color: "#718096",
								},
							},
							labels: {
								style: { fontFamily: "DM Sans", colors: ["#718096"] },
							},
						},
						{
							seriesName: "Workers Reached",
							opposite: true,
							title: {
								text: "Num. of Field Workers Reached",
								style: {
									fontFamily: "DM Sans",
									fontWeight: 500,
									color: "#718096",
								},
							},
							labels: {
								style: { fontFamily: "DM Sans", colors: ["#718096"] },
							},
						},
					],
					colors: colors,
					legend: {
						show: true,
						position: "bottom",
						fontFamily: "DM Sans",
					},
					tooltip: {
						shared: true,
						intersect: false,
					},
					dataLabels: { enabled: false },
				}}
				series={series}
				type="bar"
			/>
		</div>
	);
}

// ─── Section 3 — Top 5 Fieldwork Activities ──────────────────────────────────
// Hidden in the redesign but kept (commented) for future reuse. To restore:
// uncomment this block, re-add the `Top5Activity` interface, the `Lightbulb`
// import, and `statusColorPalette` from common-data, then render
// <Top5ActivitiesSection activities={top5Activities} /> in the main component.
//
//
// type ImpactMetric = "totalKpisResolved" | "totalWorkerBenefited";
//
// interface Top5ActivitiesSectionProps {
// 	activities: Top5Activity[];
// }
//
// // biome-ignore lint/correctness/noUnusedVariables: retained for reference; hidden in the redesign
// function Top5ActivitiesSection({ activities }: Top5ActivitiesSectionProps) {
// 	const [metric, setMetric] = useState<ImpactMetric>("totalKpisResolved");
// 	const impactMetricId = useId();
//
// 	const metricLabels: Record<ImpactMetric, string> = {
// 		totalKpisResolved: "Total no. of KPIs resolved",
// 		totalWorkerBenefited: "Total no. of workers benefited",
// 	};
//
// 	const sorted = useMemo(
// 		() => [...activities].sort((a, b) => b[metric] - a[metric]),
// 		[activities, metric],
// 	);
//
// 	return (
// 		<section className="mb-8">
// 			<div className="flex items-center justify-between mb-4">
// 				<SectionTitle>
// 					Top 5 Fieldwork Activities by Impact
// 					<Lightbulb className="inline-block ml-2 text-[#8A979C] text-yellow-400" />
// 				</SectionTitle>
// 				<div className="flex items-center gap-2 text-sm">
// 					<label
// 						className="text-xs text-[#8A979C] font-medium"
// 						htmlFor={impactMetricId}
// 					>
// 						Type of impact
// 					</label>
// 					<select
// 						className="rounded-lg border border-[#D2D2D2] px-3 py-1.5 text-sm font-medium text-[#004A60] bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] cursor-pointer"
// 						id={impactMetricId}
// 						onChange={(e) => setMetric(e.target.value as ImpactMetric)}
// 						value={metric}
// 					>
// 						{Object.entries(metricLabels).map(([val, label]) => (
// 							<option key={val} value={val}>
// 								{label}
// 							</option>
// 						))}
// 					</select>
// 				</div>
// 			</div>
//
// 			<div className={`${styles.chartCard} flex flex-col gap-3`}>
// 				{sorted.map((activity, i) => {
// 					const metricValue = activity[metric];
//
// 					return (
// 						<div
// 							className="flex items-center gap-4 py-4 border-b border-[#D2D2D2] last:border-b-0"
// 							key={activity.rank}
// 						>
// 							{/* Rank badge */}
// 							<div
// 								className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-black"
// 								style={{ backgroundColor: statusColorPalette[0] }}
// 							>
// 								{i + 1}
// 							</div>
//
// 							{/* Activity info */}
// 							<div className="flex-1 min-w-0">
// 								<p className="text-lg font-semibold text-[#56666C] truncate">
// 									{activity.grouping}
// 								</p>
// 								<p className="text-sm text-[#8A979C] mt-0.5">
// 									<b>Number Of Activities: </b>
// 									<span className="text-[#148696]">
// 										{activity.totalNumOfActivities}
// 									</span>
// 									{", "}
// 									<b>Suppliers: </b>
// 									<span className="text-[#148696]">
// 										{activity.uniqueSupplerReached}
// 									</span>
// 									{", "}
// 									{metric === "totalKpisResolved" && (
// 										<>
// 											<b>Total Workers Benefited: </b>
// 											<span className="text-[#148696]">
// 												{activity.totalWorkerBenefited}
// 											</span>
// 										</>
// 									)}
// 									{metric === "totalWorkerBenefited" && (
// 										<>
// 											<b>Total KPIs Resolved: </b>
// 											<span className="text-[#148696]">
// 												{activity.totalKpisResolved}
// 											</span>
// 										</>
// 									)}
// 								</p>
// 								{/* Progress bar */}
// 								{/* <div className="mt-1.5 h-1.5 rounded-full bg-gray-100">
// 									<div
// 										className="h-1.5 rounded-full transition-all duration-500"
// 										style={{
// 											width: barWidth,
// 											backgroundColor: RANK_COLORS[i] ?? "#148696",
// 										}}
// 									/>
// 								</div> */}
// 							</div>
//
// 							{/* KPI count badge */}
// 							<div
// 								className="flex-shrink-0 px-3 py-1.5 rounded-lg text-white text-sm font-black min-w-[48px] text-center text-xl"
// 								style={{ backgroundColor: "#f59e0b" }}
// 							>
// 								{metricValue?.toLocaleString()}
// 							</div>
// 						</div>
// 					);
// 				})}
// 			</div>
// 		</section>
// 	);
// }

// ─── Field Activities table ──────────────────────────────────────────────────

function FieldActivitiesSection({
	fieldActivities,
}: {
	fieldActivities: FieldActivityRow[];
}) {
	// Per-column search terms keyed by column field.
	const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
		{},
	);
	// Row selected for the detail preview modal.
	const [previewRow, setPreviewRow] = useState<FieldActivityRow | null>(null);

	// Augment each filterable column with a search input rendered under its title.
	const columns = useMemo<GridColDef[]>(() => {
		return FIELD_ACTIVITY_COLUMNS.map((col) => {
			if (col.field === "view") {
				return {
					...col,
					renderCell: (params) => (
						<button
							aria-label="Preview activity"
							className="text-[#148696] hover:text-[#004A60]"
							onClick={() => setPreviewRow(params.row as FieldActivityRow)}
							type="button"
						>
							<EyeOpenIcon className="w-4 h-4" />
						</button>
					),
				};
			}
			if (col.filterable === false) return col;
			return {
				...col,
				renderHeader: (params) => (
					<div className="flex flex-col gap-1 w-full py-1">
						<span className="font-bold leading-tight text-white">
							{params.colDef.headerName}
						</span>
						<input
							className="w-full border-0 border-b border-white/50 bg-transparent px-0.5 py-0.5 text-xs font-normal text-white placeholder:text-white/60 focus:outline-none focus:border-white"
							onChange={(e) =>
								setColumnFilters((prev) => ({
									...prev,
									[col.field]: e.target.value,
								}))
							}
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
							placeholder="Search…"
							value={columnFilters[col.field] ?? ""}
						/>
					</div>
				),
			};
		});
	}, [columnFilters]);

	// Default to newest activities first, then apply per-column search terms.
	const filteredRows = useMemo(() => {
		const sorted = [...fieldActivities].sort((a, b) =>
			String(b.date ?? "").localeCompare(String(a.date ?? "")),
		);
		const active = Object.entries(columnFilters).filter(([, v]) => v.trim());
		if (active.length === 0) return sorted;
		return sorted.filter((row) =>
			active.every(([field, term]) =>
				String((row as Record<string, unknown>)[field] ?? "")
					.toLowerCase()
					.includes(term.trim().toLowerCase()),
			),
		);
	}, [fieldActivities, columnFilters]);

	return (
		<section className="mb-8">
			<div className={`${styles.chartCard}`}>
				<div className="mb-3 flex justify-between items-center">
					<h2 className="heading-display">Field Activities</h2>
					<span className="bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-full font-medium">
						{filteredRows.length} records
					</span>
				</div>
				<DataTable
					columnHeaderHeight={72}
					columns={columns}
					dense
					pageSize={10}
					rows={filteredRows}
				/>
			</div>
			<FieldActivityPreviewModal
				onClose={() => setPreviewRow(null)}
				row={previewRow}
			/>
		</section>
	);
}

// ─── Field Activity detail preview modal ─────────────────────────────────────

// Format a numeric reach value, preserving null/undefined as a dash.
function fmtReach(value: unknown): string {
	if (value === null || value === undefined || value === "") return "-";
	const n = Number(value);
	return Number.isFinite(n) ? n.toLocaleString() : "-";
}

// Extract display names from an array of { name } objects (e.g. suppliers /
// recruiters). Avoids splitting on commas, which can appear inside a single
function namesFromArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((v) =>
			v && typeof v === "object" && "name" in v
				? String((v as { name: unknown }).name ?? "")
				: "",
		)
		.map((s) => s.trim())
		.filter(Boolean);
}

function PreviewStat({
	label,
	value,
	list,
}: {
	label: string;
	value?: string;
	list?: string[];
}) {
	return (
		<div className="rounded-lg border border-[#D2D2D2] bg-white px-3 py-2">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A979C]">
				{label}
			</p>
			{list && list.length > 0 ? (
				<ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm font-medium text-[#56666C]">
					{list.map((it) => (
						<li className="break-words" key={it}>
							{it}
						</li>
					))}
				</ul>
			) : (
				<p className="mt-1 text-sm font-medium text-[#56666C] break-words">
					{value ?? "-"}
				</p>
			)}
		</div>
	);
}

const WORKERS_TOOLTIP = (
	<>
		<p className="text-white">
			<strong>Workers reached</strong> means the number of{" "}
			<em>migrant or frontline workers</em> (e.g. factory workers, fishing crew,
			domestic workers) who were directly present at this activity — such as a
			worksite visit, community outreach, or pre-departure training.
		</p>
		<p className="mt-2 text-white">
			The nationality breakdown below shows which countries those workers came
			from.
		</p>
		<p className="mt-2 text-white">
			⚠️ This is a <em>separate count</em> from “People Reached” below — the same
			person should not be counted twice.
		</p>
	</>
);
const PEOPLE_TOOLTIP = (
	<>
		<p className="text-white">
			<strong>People reached</strong> means everyone else who attended or
			participated — for example, government officials, NGO staff, CSO
			representatives, recruiters, business managers, or community members who
			are <em>not</em> frontline workers themselves.
		</p>
		<p className="mt-2 text-white">
			This is used for activities like meetings, trainings, multi-stakeholder
			forums, or workshops where the audience is broader than just workers.
		</p>
		<p className="mt-2 text-white">
			⚠️ This is a <em>separate count</em> from “Workers Reached” above — the
			same person should not be counted twice.
		</p>
	</>
);

const NATIONALITY_REACH_FIELDS: { label: string; key: string }[] = [
	{ label: "Bangladeshi", key: "bangladeshi_workers_reached" },
	{ label: "Cambodian", key: "cambodian_workers_reached" },
	{ label: "Filipino", key: "filipino_workers_reached" },
	{ label: "Indian", key: "indian_workers_reached" },
	{ label: "Indonesian", key: "indonesian_workers_reached" },
	{ label: "Lao", key: "lao_workers_reached" },
	{ label: "Malaysian", key: "malaysian_workers_reached" },
	{ label: "Myanmar", key: "myanmar_workers_reached" },
	{ label: "Nepalese", key: "nepalese_workers_reached" },
	{ label: "Pakistani", key: "pakistani_workers_reached" },
	{ label: "Sri Lankan", key: "sri_lankan_workers_reached" },
	{ label: "Taiwanese", key: "taiwanese_workers_reached" },
	{ label: "Thai", key: "thai_workers_reached" },
	{ label: "Vietnamese", key: "vietnamese_workers_reached" },
];

function SectionHeading({
	children,
	tooltip,
}: {
	children: React.ReactNode;
	tooltip?: React.ReactNode;
}) {
	return (
		<h3 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-[#56666C]">
			{children}
			{tooltip && (
				<span className="group/tip relative inline-flex">
					<InfoCircledIcon className="h-4 w-4 cursor-help text-[#004A60]" />
					<span className="pointer-events-none absolute left-6 top-1/2 z-50 hidden w-80 max-w-[80vw] -translate-y-1/2 rounded-lg bg-gray-700 p-4 text-sm font-normal leading-relaxed text-white shadow-xl group-hover/tip:block [&_em]:text-white [&_strong]:text-white">
						{tooltip}
					</span>
				</span>
			)}
		</h3>
	);
}

function FieldActivityPreviewModal({
	row,
	onClose,
}: {
	row: FieldActivityRow | null;
	onClose: () => void;
}) {
	const item = row?.raw;
	const linkUrl = row?.links && row.links !== "-" ? row.links : undefined;

	return (
		<Dialog.Root onOpenChange={(open) => !open && onClose()} open={!!row}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-3xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-gray-50 shadow-xl flex flex-col">
					{/* Header */}
					<div className="relative bg-white px-l py-5 border-b border-[#D2D2D2]">
						<p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A979C]">
							Fieldwork Activity Detail
						</p>
						<Dialog.Title className="mt-1 text-2xl font-bold text-[#56666C]">
							{row?.type ?? "Activity"}
						</Dialog.Title>
						<p className="mt-1 text-sm text-[#8A979C]">
							#{row?.id} | {row?.date} | {row?.organization}
						</p>
						<Dialog.Close className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#D2D2D2] text-[#8A979C] hover:bg-gray-100 text-xl leading-none">
							×
						</Dialog.Close>
					</div>

					<div className="overflow-auto px-l py-5 space-y-5">
						{/* Top summary cards */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<PreviewStat label="Date" value={row?.date ?? "-"} />
							<PreviewStat
								label="Organization"
								value={row?.organization ?? "-"}
							/>
							<PreviewStat
								label="Suppliers"
								list={namesFromArray(item?.suppliers)}
								value="-"
							/>
							<PreviewStat
								label="Recruiters"
								list={namesFromArray(item?.recruiters)}
								value="-"
							/>
						</div>

						{/* Activity Details */}
						<div className="rounded-xl bg-white p-4 shadow-sm">
							<SectionHeading>Activity Details</SectionHeading>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<PreviewStat
									label="Fieldwork Activity ID"
									value={String(row?.id ?? "-")}
								/>
								<PreviewStat label="Fieldwork Date" value={row?.date ?? "-"} />
								<PreviewStat
									label="Organization"
									value={row?.organization ?? "-"}
								/>
								<PreviewStat label="Fieldwork Type" value={row?.type ?? "-"} />
								<PreviewStat
									label="Supplier Names"
									list={namesFromArray(item?.suppliers)}
									value="-"
								/>
								<PreviewStat
									label="Recruiter Names"
									list={namesFromArray(item?.recruiters)}
									value="-"
								/>
								<PreviewStat
									label="District"
									value={item?.district_name ?? "-"}
								/>
								<PreviewStat
									label="Province"
									value={item?.province_name ?? "-"}
								/>
								<PreviewStat
									label="Country"
									value={item?.country_name ?? "-"}
								/>
								<PreviewStat
									label="Outreach Target"
									value={row?.target ?? "-"}
								/>
								<PreviewStat label="Created By" value={row?.createdBy ?? "-"} />
								<PreviewStat
									label="Nationality"
									value={item?.nationality_name ?? "-"}
								/>
							</div>
						</div>

						{/* Estimated Workers Reached */}
						<div className="rounded-xl bg-white p-4 shadow-sm">
							<SectionHeading tooltip={WORKERS_TOOLTIP}>
								Estimated Workers Reached
							</SectionHeading>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<PreviewStat
									label="Total"
									value={fmtReach(item?.total_workers_reached)}
								/>
								<PreviewStat
									label="Female"
									value={fmtReach(item?.female_workers_reached)}
								/>
								<PreviewStat
									label="Male"
									value={fmtReach(item?.male_workers_reached)}
								/>
							</div>
							<p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A979C]">
								By Nationality
							</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								{NATIONALITY_REACH_FIELDS.map((f) => (
									<PreviewStat
										key={f.key}
										label={`${f.label} Workers Reached`}
										value={fmtReach(item?.[f.key])}
									/>
								))}
							</div>
						</div>

						{/* Estimated People Reached */}
						<div className="rounded-xl bg-white p-4 shadow-sm">
							<SectionHeading tooltip={PEOPLE_TOOLTIP}>
								Estimated People Reached
							</SectionHeading>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<PreviewStat
									label="Total"
									value={fmtReach(item?.total_people_reached)}
								/>
								<PreviewStat
									label="Female"
									value={fmtReach(item?.female_reached)}
								/>
								<PreviewStat
									label="Male"
									value={fmtReach(item?.male_reached)}
								/>
							</div>
						</div>

						{/* Notes */}
						<div className="rounded-xl bg-white p-4 shadow-sm">
							<SectionHeading>Notes</SectionHeading>
							<p className="text-sm text-[#56666C] whitespace-pre-line break-words">
								{row?.notes ?? "-"}
							</p>
						</div>

						{/* Links */}
						<div className="rounded-xl bg-white p-4 shadow-sm">
							<SectionHeading>Links</SectionHeading>
							{linkUrl ? (
								<a
									className="text-sm text-[#148696] underline underline-offset-2 break-all"
									href={linkUrl}
									rel="noreferrer"
									target="_blank"
								>
									{linkUrl}
								</a>
							) : (
								<p className="text-sm text-[#56666C]">-</p>
							)}
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// ─── Trainings — 3 stat cards with an independent date filter ─────────────────

interface TrainingsSectionProps {
	workerLeadersTrained: number;
	suppliersTrained: number;
	recruitmentAgenciesTrained: number;
	filters: FilterBarFilters;
	onFiltersChange: (filters: FilterBarFilters) => void;
	defaultFrom: string;
	defaultTo: string;
}

function TrainingsSection({
	workerLeadersTrained,
	suppliersTrained,
	recruitmentAgenciesTrained,
	filters,
	onFiltersChange,
	defaultFrom,
	defaultTo,
}: TrainingsSectionProps) {
	return (
		<section className="mb-8">
			<div className="flex items-center justify-between mb-m gap-m flex-wrap">
				<SectionTitle>Trainings</SectionTitle>
				<FilterBar
					defaultFrom={defaultFrom}
					defaultTo={defaultTo}
					filters={filters}
					onChange={onFiltersChange}
					showCountry={false}
					showDateRange
					showIndustry={false}
				/>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-l">
				<div className={`${styles.chartCard} hover:shadow-md`}>
					<p className="font-medium text-[#8A979C] tracking-wide leading-tight mb-1">
						Worker Leaders / Ambassadors Trained
						<InfoTip title="Worker Leaders / Ambassadors Trained">
							<p>
								<strong>Criteria to become a mobilizer:</strong> interested in
								empowering others by sharing labor rights knowledge and
								promoting worker voice channels including the Golden Dreams app.
							</p>
							<p className="mt-3">
								Willing to learn, respect ethical principles, volunteer time for
								outreach, use smartphones/social media, and act as a change
								agent.
							</p>
							<p className="mt-3">
								Preferred qualities include leadership and communication skills,
								proactiveness, and interest in helping others.
							</p>
						</InfoTip>
					</p>
					<p className="text-4xl font-black text-[#148696]">
						{workerLeadersTrained?.toLocaleString()}
					</p>
				</div>
				<div className={`${styles.chartCard} hover:shadow-md`}>
					<p className="font-medium text-[#8A979C] tracking-wide leading-tight mb-1">
						Suppliers Trained
						<InfoTip title="Suppliers Trained">
							<p>
								The figures represent the unique number of supplier participants
								joining the Issara Academy, either in person or online.
							</p>
							<p className="mt-3">
								These numbers refer to <em>individual participants</em>, not the
								number of supplier companies joining the trainings for the first
								time.
							</p>
						</InfoTip>
					</p>
					<p className="text-4xl font-black text-[#148696]">
						{suppliersTrained?.toLocaleString()}
					</p>
				</div>
				<div className={`${styles.chartCard} hover:shadow-md`}>
					<p className="font-medium text-[#8A979C] tracking-wide leading-tight mb-1">
						Recruitment Agencies Trained
						<InfoTip title="Recruitment Agencies Trained">
							<p>
								The figures represent the unique number of recruitment agency
								participants joining the Issara Academy, either in person or
								online.
							</p>
							<p className="mt-3">
								These numbers refer to <em>individual participants</em> joining
								the trainings for the first time, not the number of RA
								companies.
							</p>
						</InfoTip>
					</p>
					<p className="text-4xl font-black text-[#148696]">
						{recruitmentAgenciesTrained?.toLocaleString()}
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Section 5 — Workers Reached in Pre-Departure ────────────────────────────

interface PreDepartureSectionProps {
	data: ErMetricsCountData;
}

function PreDepartureWorkersSection({ data }: PreDepartureSectionProps) {
	const countryData = [
		{ code: "MM", name: "Myanmar", value: data.workers_pre_departure_mm ?? 0 },
		{ code: "NE", name: "Nepal", value: data.workers_pre_departure_ne ?? 0 },
		{ code: "KH", name: "Cambodia", value: data.workers_pre_departure_kh ?? 0 },
		{ code: "VN", name: "Vietnam", value: data.workers_pre_departure_vn ?? 0 },
		{ code: "TH", name: "Thailand", value: data.workers_pre_departure_th ?? 0 },
	];

	return (
		<section className="mb-8">
			<SectionTitle className="mb-3">
				Workers Reached in Pre-Departure
				<InfoTip title="Workers Reached in Pre-Departure">
					<p>
						This figure presents the number of workers reached and trained by
						Issara staff and its partners during the pre-departure training in
						origin countries.
					</p>
				</InfoTip>
			</SectionTitle>
			<div className="grid grid-cols-2 md:grid-cols-5 gap-l">
				{countryData.map(({ code, name, value }) => (
					<div
						className={`${styles.chartCard} hover:shadow-md flex flex-col gap-2`}
						key={code}
					>
						<p className="text-[#8A979C] text-md font-medium tracking-wide leading-tight">
							{name}
						</p>
						<p
							className={`text-4xl font-black tracking-tight ${
								value === 0 ? "text-[#8A979C]" : "text-[#148696]"
							}`}
						>
							{value.toLocaleString()}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface OutreachEffectivenessProps {
	filters?: FilterBarFilters;
	onFiltersChange?: (filters: FilterBarFilters) => void;
	defaultFrom?: string;
	defaultTo?: string;
}

export default function OutreachEffectiveness({
	filters,
	onFiltersChange,
	defaultFrom = "",
	defaultTo = "",
}: OutreachEffectivenessProps) {
	const { supplierId, partnerId, isSupplier, isGlobalPartner, isTestUser } =
		getUserIdentifiers();

	const { data: supplyChains = [] } = useSupplyChains();

	const supplierIds = useMemo(() => {
		if (isSupplier && supplierId) return [supplierId];
		if (isGlobalPartner && partnerId && supplyChains.length > 0) {
			const partnerScs = supplyChains.filter(
				(sc: any) =>
					sc.strategic_partner === partnerId ||
					sc.strategic_partner_id === partnerId ||
					sc.partner_id === partnerId,
			);
			let suppliers: any[] = [];
			partnerScs.forEach((sc: any) => {
				if (sc.suppliers && Array.isArray(sc.suppliers))
					suppliers = suppliers.concat(sc.suppliers);
			});
			const seen = new Set();
			return suppliers
				.filter((s: any) => {
					const id = s.id || s.supplier;
					if (!id || seen.has(id)) return false;
					seen.add(id);
					return true;
				})
				.map((s: any) => s.id || s.supplier);
		}
		if (isTestUser) return supplierId ? [supplierId] : [];
		return [];
	}, [
		isSupplier,
		isGlobalPartner,
		isTestUser,
		supplierId,
		partnerId,
		supplyChains,
	]);

	const selectedSupplierIds =
		filters?.suppliers?.map((value) => Number(value)).filter(Number.isFinite) ??
		[];
	const effectiveSupplierIds =
		selectedSupplierIds.length > 0 ? selectedSupplierIds : supplierIds;
	const selectedCountries = (filters?.countries ?? []).filter(Boolean);
	const selectedIndustries = (filters?.industries ?? []).filter(Boolean);
	const countryFilter =
		selectedCountries.length > 0 ? selectedCountries.join(",") : undefined;
	const industryFilter =
		selectedIndustries.length > 0 ? selectedIndustries.join(",") : undefined;
	const selectedProvinces = (filters?.provinces ?? []).filter(Boolean);
	const provinceFilter =
		selectedProvinces.length > 0 ? selectedProvinces.join(",") : undefined;
	const selectedDistricts = (filters?.districts ?? []).filter(Boolean);
	const districtFilter =
		selectedDistricts.length > 0 ? selectedDistricts.join(",") : undefined;
	// Only the explicit FilterBar supplier selection scopes the outreach query;
	// identity-derived `supplierIds` is for access control, not a content filter
	// (the endpoint historically returns all activities for Issara staff).
	const supplierFilter =
		selectedSupplierIds.length > 0 ? selectedSupplierIds.join(",") : undefined;
	const fromDate = filters?.from?.trim() || undefined;
	const toDate = filters?.to?.trim() || undefined;

	const queryParams = {
		supplierId: effectiveSupplierIds.length > 0 ? effectiveSupplierIds : null,
		country: countryFilter,
		industry: industryFilter,
		startTime: fromDate,
		endTime: toDate,
	};

	const { data, isLoading, error } = useWorkplaceStats(queryParams);

	const outreachParams = {
		from: fromDate,
		to: toDate,
		country: countryFilter,
		province: provinceFilter,
		district: districtFilter,
		supplierId: supplierFilter,
	};
	const { data: outreachData } = useOutreachEffectiveness(outreachParams);

	// Immediately preceding, equal-length window for period-over-period trends.
	const { previousFrom, previousTo } = useMemo(() => {
		if (!fromDate || !toDate) {
			return { previousFrom: fromDate, previousTo: toDate };
		}
		const startMs = new Date(fromDate).getTime();
		const endMs = new Date(toDate).getTime();
		if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
			return { previousFrom: fromDate, previousTo: toDate };
		}
		const oneDayMs = 24 * 60 * 60 * 1000;
		const durationMs = endMs - startMs;
		const prevEndMs = startMs - oneDayMs;
		const prevStartMs = prevEndMs - durationMs;
		const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
		return { previousFrom: toIso(prevStartMs), previousTo: toIso(prevEndMs) };
	}, [fromDate, toDate]);

	const { data: previousOutreachData } = useOutreachEffectiveness({
		...outreachParams,
		from: previousFrom,
		to: previousTo,
	});

	// Trainings + Pre-Departure share the page-wide date range.
	const erMetricsParams = useMemo(
		() =>
			({
				startTimestamp: fromDate,
				endTimestamp: toDate,
			}) as UseErMetricsCountParams,
		[fromDate, toDate],
	);
	const { data: erMetricsData } = useErMetricsCount(erMetricsParams);
	// ── Derived data ────────────────────────────────────────────────────────
	const fieldActivities = useMemo(() => {
		const mapToTableRow = (item: FieldworkActivityApiItem, idx: number) => {
			const createdByEmail =
				item.created_by_email ?? item.created_by_name ?? item.created_by ?? "-";
			const districtName = item.district_name ?? getNestedName(item.district);
			const provinceName = item.province_name ?? getNestedName(item.province);
			const countryName = item.country_name ?? getNestedName(item.country);
			const locationParts = [districtName, provinceName, countryName].filter(
				(part): part is string => typeof part === "string" && part.length > 0,
			);

			return {
				id: item.id ?? idx,
				date: item.fieldwork_date?.split("T")[0] ?? "—",
				organization:
					normalizeTextList(item.organization_name) || "Issara Institute",
				type: item.fieldwork_type_name ?? getNestedName(item.type) ?? "—",
				suppliers: normalizeTextList(item.supplier_names) || "-",
				recruiters: normalizeTextList(item.recruiter_names) || "-",
				location: locationParts.join(", ") || "—",
				target:
					item.outreach_target != null ? String(item.outreach_target) : "-",
				notes: item.notes || "-",
				links: normalizeTextList(item.links, item.link_url ?? "-"),
				totalWorker: activityWorkers(item),
				createdBy: createdByEmail,
				raw: item,
			} satisfies FieldActivityRow;
		};

		const fieldActivitiesData = outreachData?.fieldActivities ?? [];
		if (fieldActivitiesData && fieldActivitiesData.length > 0) {
			const rows = fieldActivitiesData.map(mapToTableRow);
			// Deduplicate by id to prevent repeating rows
			const seen = new Set<string | number>();
			return rows.filter((row) => {
				if (seen.has(row.id)) {
					return false;
				}
				seen.add(row.id);
				return true;
			});
		}

		return [];
	}, [outreachData]);

	const categories = useMemo(
		() => outreachData?.categories ?? [],
		[outreachData],
	);

	// Cascading geo dropdown options drawn from the data: provinces are scoped to
	// the selected countries, districts to the selected provinces.
	const geo = outreachData?.geo;
	const countryOptions = useMemo<FilterBarOption[]>(
		() =>
			(geo?.countries ?? []).map((c) => ({
				value: String(c.id),
				label: c.name,
			})),
		[geo],
	);
	const provinceOptions = useMemo<FilterBarOption[]>(() => {
		const countrySet = new Set(selectedCountries);
		return (geo?.provinces ?? [])
			.filter(
				(p) => countrySet.size === 0 || countrySet.has(String(p.countryId)),
			)
			.map((p) => ({ value: String(p.id), label: p.name }));
	}, [geo, selectedCountries]);
	const districtOptions = useMemo<FilterBarOption[]>(() => {
		const provinceSet = new Set(selectedProvinces);
		return (geo?.districts ?? [])
			.filter(
				(d) => provinceSet.size === 0 || provinceSet.has(String(d.provinceId)),
			)
			.map((d) => ({ value: String(d.id), label: d.name }));
	}, [geo, selectedProvinces]);

	// Category whose activities are shown in the drill-down modal (null = closed).
	const [modalCategory, setModalCategory] = useState<{
		id: number;
		name: string;
	} | null>(null);

	// Per-category cards: total workers reached + activity count + trend.
	const categoryStats = useMemo<CategoryStat[]>(() => {
		const current = outreachData?.fieldActivities ?? [];
		const previous = previousOutreachData?.fieldActivities ?? [];

		const aggregate = (rows: FieldworkActivityApiItem[]) => {
			const map = new Map<number, { workers: number; count: number }>();
			for (const a of rows) {
				const id = a.fieldwork_category_id;
				if (id == null) continue;
				const entry = map.get(id) ?? { workers: 0, count: 0 };
				entry.workers += activityWorkers(a);
				entry.count += 1;
				map.set(id, entry);
			}
			return map;
		};

		const cur = aggregate(current);
		const prev = aggregate(previous);

		return categories
			.map((c) => {
				const now = cur.get(c.id) ?? { workers: 0, count: 0 };
				const before = prev.get(c.id) ?? { workers: 0, count: 0 };
				return {
					id: c.id,
					name: c.name,
					workers: now.workers,
					count: now.count,
					trend: calculatePercentChange(now.workers, before.workers),
				};
			})
			.sort((a, b) => b.workers - a.workers);
	}, [outreachData, previousOutreachData, categories]);

	// Issara vs Partners breakdown (by creating user's organization).
	const orgStats = useMemo(() => {
		const aggregate = (rows: FieldworkActivityApiItem[], bucket: string) =>
			rows
				.filter((a) => (a.org_bucket ?? "Issara") === bucket)
				.reduce(
					(acc: { workers: number; count: number }, a) => {
						acc.workers += activityWorkers(a);
						acc.count += 1;
						return acc;
					},
					{ workers: 0, count: 0 },
				);

		const current = outreachData?.fieldActivities ?? [];
		const previous = previousOutreachData?.fieldActivities ?? [];

		const build = (bucket: string): OrgStat => {
			const now = aggregate(current, bucket);
			const before = aggregate(previous, bucket);
			return {
				workers: now.workers,
				count: now.count,
				trend: calculatePercentChange(now.workers, before.workers),
			};
		};

		return { issara: build("Issara"), partners: build("Partners") };
	}, [outreachData, previousOutreachData]);

	// Fieldwork Category dropdown for the correlation chart.
	const [selectedCategory, setSelectedCategory] = useState<string>("all");

	// Monthly correlation data: group activities by month if API data present
	const monthlyData = useMemo<MonthlyOutreachPoint[]>(() => {
		let raw = outreachData?.fieldActivities ?? [];
		if (selectedCategory !== "all") {
			const catId = Number(selectedCategory);
			raw = raw.filter((a) => a.fieldwork_category_id === catId);
		}
		if (raw.length === 0) return [];

		const byMonth: Record<
			string,
			{ visitsByCategory: Record<number, number>; workers: number }
		> = {};
		raw.forEach((a) => {
			const month = (a.fieldwork_date as string)?.slice(0, 7) ?? "Unknown";
			if (!byMonth[month])
				byMonth[month] = { visitsByCategory: {}, workers: 0 };
			const catId = a.fieldwork_category_id ?? UNCATEGORIZED_KEY;
			byMonth[month].visitsByCategory[catId] =
				(byMonth[month].visitsByCategory[catId] ?? 0) + 1;
			byMonth[month].workers += activityWorkers(a);
		});

		return Object.entries(byMonth)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, { visitsByCategory, workers }]) => ({
				month: new Date(month + "-01").toLocaleString("default", {
					month: "short",
				}),
				visitsByCategory,
				workersReached: workers,
			}));
	}, [outreachData, selectedCategory]);

	// Top 5 Fieldwork Activities by Impact is hidden in the redesign; its data
	// derivation lives with the (now-unused) Top5ActivitiesSection component.

	const preDepartureData = useMemo<ErMetricsCountData>(() => {
		return erMetricsData ?? ({} as ErMetricsCountData);
	}, [erMetricsData]);

	// ── Render ────────────────────────────────────────────────────────────

	if (isLoading) return <div className="p-8 text-center">Loading...</div>;

	if (error && !data)
		return (
			<div className="p-8 text-center text-[#FB8379]">
				Failed to load outreach data.
			</div>
		);

	return (
		<>
			<div className={`${styles.containerPadding}`}>
				<FilterBar
					className="mb-l"
					countryOptions={countryOptions}
					defaultFrom={defaultFrom}
					defaultTo={defaultTo}
					districtOptions={districtOptions}
					filters={filters ?? {}}
					onChange={(next) => onFiltersChange?.(next)}
					provinceOptions={provinceOptions}
					showCountry
					showDateRange
					showDistrict
					showIndustry={false}
					showProvince
					showSupplier
					supplierServerSearch
				/>

				<h2 className="heading-display uppercase mb-m">
					Community Outreach &amp; Empowerment
				</h2>
				<CommunityOutreachSection
					onSelect={setModalCategory}
					stats={categoryStats}
				/>

				<section className="mb-8">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-l">
						<div className="md:col-span-2">
							<FieldworkBreakdownCard
								issara={orgStats.issara}
								partners={orgStats.partners}
							/>
						</div>
						<div className="md:col-span-3">
							<CorrelationChartSection
								categories={categories}
								data={monthlyData}
								onSelectCategory={setSelectedCategory}
								selectedCategory={selectedCategory}
							/>
						</div>
					</div>
				</section>

				<FieldActivitiesSection fieldActivities={fieldActivities} />

				<TrainingsSection
					defaultFrom={defaultFrom}
					defaultTo={defaultTo}
					filters={filters ?? {}}
					onFiltersChange={(next) => onFiltersChange?.(next)}
					recruitmentAgenciesTrained={
						erMetricsData?.recruitment_agencies_trained ?? 0
					}
					suppliersTrained={erMetricsData?.suppliers_trained ?? 0}
					workerLeadersTrained={erMetricsData?.workers_trained ?? 0}
				/>

				<PreDepartureWorkersSection data={preDepartureData} />
			</div>

			<CategoryActivitiesModal
				activities={outreachData?.fieldActivities ?? []}
				category={modalCategory}
				onClose={() => setModalCategory(null)}
			/>
		</>
	);
}
