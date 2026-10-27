import { Box } from "@radix-ui/themes";
import type { TFunction } from "i18next";
import moment from "moment";
import { useId, useState } from "react";
import SupplierKpiGrievanceComponent from "$src/components/Grievance/SupplierKpiGrievanceComponent";
import type {
	CollapsibleColumn,
	CollapsibleRowData,
} from "$src/components/tables/CollapsibleDataTable";
import RemediationNotesSummary from "$src/components/ui/RemediationNotesSummary";
import type { SupplierKPI } from "$src/hooks/useSupplyChain";
import { useRemediationDraft } from "$src/store/grievanceDraftStore";
import type { KPI } from "$src/types/components";
import { useMockData } from "$src/utils/config";
import { kpiUtils } from "$src/utils/kpiUtils";

// Placeholder narrative for the KPI-detail panel, used ONLY in mock-data mode
// (see useMockData()). "Issue summary reported by workers" is demo/visual copy
// mirroring the revamp reference. Against live data this must never render —
// a fabricated worker report shown next to a real KPI is worse than an omitted
// section — so the block is hidden when the backend supplies no text.
const ISSUE_SUMMARY_PLACEHOLDER =
	"The workers in the packing line reported issues with very high temperature in their work area, and poor ventilation. They noted that they never had this problem before and wondered if something recently broke. But when they told their line supervisor, he told them that everything was fine. They said they felt too intimidated to report the issue to HR.";
const ISSARA_ACTION_PLACEHOLDER =
	"We had been trying to get in touch with HR for a few days because they are not on CASCADE, and they finally responded yesterday. We will regroup by/before Friday for next steps. Also we will try to get the supplier onto CASCADE due to ongoing communication issues via phone, email, etc.";

/**
 * "Action from the supplier" block that reflects the supplier's remediation
 * updates live. Subscribes to the front-end draft store, so text typed into the
 * grievance form's Step 3 appears here instantly (before any Save Draft /
 * Submit). Renders every entry with non-empty text, numbered and timestamped —
 * matching the revamp behaviour.
 */
function SupplierActionUpdates({
	isClosed = false,
	supplierKpiId,
	supplierAction,
	t,
}: {
	isClosed?: boolean;
	supplierKpiId: number;
	supplierAction?: string | null;
	t: TFunction;
}) {
	const entries = useRemediationDraft(supplierKpiId);
	const visible = entries.filter((entry) => entry.description?.trim());

	if (isClosed && visible.length === 0 && !supplierAction) {
		return null;
	}

	return (
		<div>
			<p className="font-semibold text-[#148696] mb-1.5">
				{t("workerReportedIssues.details.supplierAction", {
					defaultValue: "Action from the supplier",
				})}
				:
			</p>
			{visible.length > 0 ? (
				<div className="space-y-2">
					{visible.map((entry, index) => (
						<div className="text-slate-600" key={entry.id ?? `sup-${index}`}>
							<span className="font-medium text-slate-700">
								{t("workerReportedIssues.details.remediationUpdate", {
									defaultValue: "Remediation Update",
								})}{" "}
								{index + 1}
							</span>
							{entry.updated_at && (
								<span className="text-slate-400 text-xs ml-1.5">
									{moment(entry.updated_at).format("DD MMM YYYY, HH:mm")}
								</span>
							)}
							<p className="mt-0.5 whitespace-pre-wrap">{entry.description}</p>
						</div>
					))}
				</div>
			) : supplierAction ? (
				<p className="text-slate-600 whitespace-pre-wrap">{supplierAction}</p>
			) : (
				<p className="text-slate-400 italic text-xs">
					{t("workerReportedIssues.details.supplierActionEmpty", {
						defaultValue:
							"No remediation updates yet. Updates entered in Step 3 will appear here.",
					})}
				</p>
			)}
		</div>
	);
}

/**
 * Shared building blocks for the "Worker-reported Violations" KPI tables so that
 * every surface that shows these issues — the Worker-reported Issues page and
 * the Company Dashboard "Open Cases Received for Escalation" table — renders the
 * exact same columns, expanded detail and status legend. Only the row set
 * differs (e.g. the dashboard filters to escalated cases).
 */

export type MainKpiCategory = "Labor" | "Recruitment" | "Wages";

export type IndicatorTag = {
	id: number;
	name: string;
	description?: string | null;
};

export type KpiTableRow = CollapsibleRowData & {
	id: string | number;
	display_id?: string | number;
	supplier?: number;
	supplier_name: string;
	category: MainKpiCategory;
	description: string;
	level: string | number;
	opened_at?: string;
	closed_at?: string;
	days_active?: number;
	affected_workers?: number;
	// Scalar TextField on the backend; some payloads have historically carried
	// an array. Normalize with toSpRecommendations before rendering.
	remediation_sp_recommendation?: string | string[] | null;
	status: number;
	status_name?: string;
	original_category?: string;
	source?: string;
	closed_quality?: string;
	closed_notes?: string;
	remediation_notes?: string;
	remediation_action?: string;
	remediation_validation?: string;
	remediation_results?: string;
	kpi?: number;
	resource_id?: number;
	notes?: string;
	worker_issue_summary?: string;
	issara_action?: string;
	supplier_action?: string;
	// ILO forced-labor / LkSG indicator tags inherited from the parent Kpi
	// (cascade-api GET /kpi nests them on each KPI).
	ilo_indicators?: IndicatorTag[];
	lksg_indicators?: IndicatorTag[];
	// Escalation flag emitted by the Django SupplierKpiSerializer (fields="__all__").
	issue_escalated_to_buyer?: boolean;
};

/** True when a row carries at least one ILO forced-labor indicator. */
export const hasIloIndicators = (row: {
	ilo_indicators?: IndicatorTag[] | null;
}): boolean =>
	Array.isArray(row.ilo_indicators) && row.ilo_indicators.length > 0;

/**
 * Render an indicator column cell. Indicators live in an array on the row
 * rather than in a scalar cell value, so the columns below read from `row`
 * instead of the cell `value`. Rows with no mapping (e.g. worker-feedback
 * submissions) render an empty cell.
 */
export const formatIndicatorCell = (
	indicators?: IndicatorTag[] | null,
): string =>
	Array.isArray(indicators)
		? indicators.map((indicator) => indicator.name).join(", ")
		: "";

/** Column definitions for the ILO / LkSG indicator columns, shared by every table. */
export const buildIndicatorColumns = (t: TFunction): CollapsibleColumn[] => [
	{
		id: "ilo_indicators",
		label: t("workerReportedIssues.columns.iloIndicator", {
			defaultValue: "ILO Indicator",
		}),
		minWidth: 160,
		format: (_value, row) =>
			formatIndicatorCell((row as KpiTableRow).ilo_indicators),
		searchValue: (row) =>
			formatIndicatorCell((row as KpiTableRow).ilo_indicators),
	},
	{
		id: "lksg_indicators",
		label: t("workerReportedIssues.columns.lksgIndicator", {
			defaultValue: "LkSG Indicator",
		}),
		minWidth: 160,
		format: (_value, row) =>
			formatIndicatorCell((row as KpiTableRow).lksg_indicators),
		searchValue: (row) =>
			formatIndicatorCell((row as KpiTableRow).lksg_indicators),
	},
];

/**
 * Drop the LkSG column. No Level 2 KPI carries an LkSG mapping, so the Early
 * Warning tables would otherwise render an entirely blank column.
 */
export const withoutLksgColumn = (
	columns: CollapsibleColumn[],
): CollapsibleColumn[] =>
	columns.filter((column) => column.id !== "lksg_indicators");

export const STATUS_OPEN = new Set([1, 2]);
// Closed is status 3 only. Status 4 ("Old, unresolved case") is deliberately in
// neither set, so those rows are shown in no bucket — matching cascade-api,
// which excludes 4 from both the LkSG treemap and the timeline chart.
export const STATUS_CLOSED = new Set([3]);

export const dedupeKpisById = <T extends { id?: string | number }>(
	rows: T[],
): T[] => {
	const uniqueIds = new Set<string>();
	return rows.filter((row) => {
		if (row.id === null || row.id === undefined || row.id === "") {
			return false;
		}
		const uniqueKey = String(row.id);
		if (uniqueIds.has(uniqueKey)) {
			return false;
		}
		uniqueIds.add(uniqueKey);
		return true;
	});
};

/**
 * `remediation_sp_recommendation` is a scalar TextField on both SupplierKpi and
 * SupplierKpiUpdate, but some payloads have historically carried an array.
 * Collapse either shape into the string list RemediationNotesSummary expects.
 */
export const toSpRecommendations = (
	value?: string | string[] | null,
): string[] => {
	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => Boolean(entry?.trim()));
	}
	return value?.trim() ? [value] : [];
};

export const normalizeMainCategory = (
	category?: string | null,
	metaCategory?: string | null,
): MainKpiCategory | null => {
	if (metaCategory) {
		const normMeta = metaCategory.trim();
		if (
			normMeta === "Recruitment" ||
			normMeta === "Wages" ||
			normMeta === "Labor"
		) {
			return normMeta;
		}
	}
	if (!category) return null;
	const normalized = category.trim().toLowerCase();
	if (normalized.includes("recruit")) return "Recruitment";
	if (normalized.includes("wage") || normalized.includes("payment")) {
		return "Wages";
	}
	return "Labor";
};

/**
 * Map raw `/supplierkpis` rows into the shape both tables render. Mirrors the
 * normalization the Worker-reported Issues page has always used.
 */
export const normalizeSupplierKpiRows = (
	sourceRows: SupplierKPI[],
	kpiMap: Map<number, KPI>,
): KpiTableRow[] => {
	const uniqueRows = dedupeKpisById(sourceRows.filter((kpi) => !kpi.hide));
	return uniqueRows
		.map((kpi) => {
			// `kpi` is the SupplierKpi case id on cascade-api's
			// /legacy-labor/supplierkpis, so it must not be used as the catalogue key.
			// Prefer the explicit catalogue id; fall back to `kpi` for Django's
			// /supplierkpis, where `kpi` already is the catalogue id.
			const catalogueId = kpi.kpi_catalogue_id ?? kpi.kpi;
			const localizedKpi =
				typeof catalogueId === "number" ? kpiMap.get(catalogueId) : undefined;
			const category = normalizeMainCategory(
				kpi.category,
				(kpi as any).meta_category,
			);
			if (!category) return null;

			const daysActive = kpi.opened_at
				? kpiUtils.getDaysActive(kpi.opened_at)
				: 0;
			return {
				...kpi,
				id: kpi.id,
				display_id: kpi.kpi ?? kpi.id,
				// The grievance endpoints are keyed on the SupplierKpi id. cascade-api's
				// /legacy-labor/supplierkpis returns the latest *update* id as `id` and
				// exposes the SupplierKpi id as `supplier_kpi_id`; Django's /supplierkpis
				// returns the SupplierKpi id directly as `id`. Prefer the explicit field,
				// fall back to `id`, so both backends resolve to the right KPI.
				resource_id: kpi.supplier_kpi_id ?? kpi.id,
				category,
				original_category: localizedKpi?.kpi_category?.name || kpi.category,
				description: localizedKpi?.description || kpi.description,
				status: Number(kpi.status),
				days_active: daysActive,
				affected_workers: kpi.affected_workers || 0,
				// Stable English identifier; canShowGrievanceForm matches on this
				// keyword. Translate at render time via translateKpiSource().
				source: "Social Responsibility KPI",
				level: kpi.level ?? "-",
				// Prefer indicators nested on the supplier KPI row; fall back to the
				// master KPI (kpiMap), which cascade-api GET /kpi exposes.
				ilo_indicators:
					(kpi as { ilo_indicators?: IndicatorTag[] }).ilo_indicators ??
					(localizedKpi?.ilo_indicators as IndicatorTag[] | undefined) ??
					[],
				lksg_indicators:
					(kpi as { lksg_indicators?: IndicatorTag[] }).lksg_indicators ??
					(localizedKpi?.lksg_indicators as IndicatorTag[] | undefined) ??
					[],
				closed_notes: kpi.closed_notes,
				remediation_notes: kpi.remediation_notes,
				remediation_action: kpi.remediation_action,
				remediation_validation: kpi.remediation_validation,
				remediation_results: kpi.remediation_results,
				remediation_sp_recommendation: kpi.remediation_sp_recommendation,
				notes: kpi.remediation_notes || kpi.closed_notes,
				// remediation_action / _results / _notes are deliberately absent from
				// the chains below: each now renders under its own heading in
				// RemediationNotesSummary, so folding them in here would relabel and
				// duplicate them.
				worker_issue_summary:
					(kpi as any).worker_issue_summary ||
					(kpi as any).issues ||
					kpi.remediation_notes ||
					undefined,
				issara_action:
					(kpi as any).issara_action ||
					(kpi as any).action ||
					kpi.remediation_action ||
					kpi.closed_notes ||
					undefined,
				supplier_action: (kpi as any).supplier_action || undefined,
			} as KpiTableRow;
		})
		.filter(Boolean) as KpiTableRow[];
};

export const translateKpiSource = (t: TFunction, source?: string) => {
	if (source === "Worker Feedback Form")
		return t("workerReportedIssues.sources.workerFeedback");
	if (source === "Social Responsibility KPI" || !source)
		return t("workerReportedIssues.sources.kpi");
	return source;
};

export const buildOpenKpiColumns = (t: TFunction): CollapsibleColumn[] => [
	{
		id: "display_id",
		label: t("workerReportedIssues.columns.id"),
		minWidth: 110,
		sortable: true,
	},
	{
		id: "supplier_name",
		label: t("workerReportedIssues.columns.supplier"),
		minWidth: 170,
		sortable: true,
	},
	{
		id: "category",
		label: t("workerReportedIssues.columns.category"),
		minWidth: 120,
		sortable: true,
		format: (value) =>
			t(`workerReportedIssues.categories.${String(value)}`, {
				defaultValue: String(value || ""),
			}),
	},
	{
		id: "description",
		label: t("workerReportedIssues.columns.description"),
		minWidth: 260,
		format: (value) => {
			const text = String(value || "");
			const translated = t(text, { defaultValue: text });
			return translated.length > 80
				? `${translated.slice(0, 80)}...`
				: translated;
		},
	},
	...buildIndicatorColumns(t),
	{
		id: "days_active",
		label: t("workerReportedIssues.columns.daysActive"),
		minWidth: 110,
		align: "right",
		sortable: true,
	},
	{
		id: "remediation_sp_recommendation",
		label: t("workerReportedIssues.columns.recommendationForSp"),
		minWidth: 170,
		format: (value) => {
			const hasRecommendations = Array.isArray(value)
				? value.length > 0
				: Boolean(value);
			return hasRecommendations ? t("workerReportedIssues.values.yes") : "";
		},
	},
	{
		id: "status",
		label: t("workerReportedIssues.columns.status"),
		minWidth: 100,
		format: (value, row) => {
			const statusId = Number(value);
			const daysActive = Number(row.days_active) || 0;
			const statusText = kpiUtils.getStatusString(daysActive, statusId);
			const color = kpiUtils.getStatusColor(daysActive, statusId);
			return (
				<div
					className="h-3 w-3 rounded-full"
					style={{ background: color }}
					title={t(statusText, { defaultValue: statusText })}
				/>
			);
		},
	},
];

export const WORKER_VIOLATION_STATUS_LEGENDS = [
	{ label: "Active Under 15 days", color: "#16A34A" },
	{ label: "Some Progress (16-59 days)", color: "#D97706" },
	{ label: "No Progress (31-59 days)", color: "#9333EA" },
	{ label: "Some Progress (60+ days)", color: "#D97706" },
	{ label: "No Progress (60+ days)", color: "#DC2626" },
] as const;

const getWorkerViolationStatusColor = (
	daysActive: number,
	statusId: number,
): string => {
	if (daysActive <= 15) return "#16A34A";
	if (statusId === 2) return "#D97706";
	if (statusId === 1 && daysActive >= 60) return "#DC2626";
	if (statusId === 1 && daysActive >= 31) return "#9333EA";
	return "#8A979C";
};

/**
 * The compact open-violations layout used by the worker-reported issues pages.
 * Status is intentionally presented beside the SP recommendation, matching the
 * established eight-column CASCADE table while preserving the underlying row
 * fields for filtering and sorting.
 */
export const buildWorkerViolationsColumns = (
	t: TFunction,
): CollapsibleColumn[] =>
	buildOpenKpiColumns(t)
		.filter((column) => column.id !== "status")
		.map((column) => {
			if (column.id === "level") {
				return {
					...column,
					format: (value) => (
						<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-50 px-2 text-xs font-bold text-orange-700">
							{String(value || "-")}
						</span>
					),
				};
			}

			if (column.id === "remediation_sp_recommendation") {
				return {
					...column,
					format: (value, row) => {
						const hasRecommendations = Array.isArray(value)
							? value.length > 0
							: Boolean(value);
						const daysActive = Number(row.days_active) || 0;
						const statusId = Number(row.status);
						const statusText = kpiUtils.getStatusString(daysActive, statusId);
						const color = getWorkerViolationStatusColor(daysActive, statusId);

						return (
							<div
								className="inline-flex items-center gap-1.5"
								title={t(statusText, { defaultValue: statusText })}
							>
								<span
									aria-hidden="true"
									className="h-2 w-2 shrink-0 rounded-full"
									style={{ backgroundColor: color }}
								/>
								<span>
									{hasRecommendations
										? t("workerReportedIssues.values.yes")
										: t("workerReportedIssues.values.no", {
												defaultValue: "No",
											})}
								</span>
							</div>
						);
					},
				};
			}

			return column;
		});

interface KpiExpandedContentArgs {
	row: CollapsibleRowData;
	isClosed?: boolean;
	isSupplierContext: boolean;
	t: TFunction;
	/** "card" (default) renders the details as a floating white card — used by
	 * the Company Dashboard's escalation table. "metaBar" renders the compact,
	 * full-width slate-50 meta row used by the Worker-reported Issues table. */
	variant?: "card" | "metaBar";
}

export const renderKpiExpandedContent = ({
	row,
	isClosed = false,
	isSupplierContext,
	t,
	variant = "card",
}: KpiExpandedContentArgs) => {
	const kpiRow = row as KpiTableRow;
	const supplierKpiId = Number(kpiRow.resource_id);
	const isClosedRow = isClosed || STATUS_CLOSED.has(Number(kpiRow.status));
	const canShowGrievanceForm =
		isSupplierContext &&
		Number.isFinite(supplierKpiId) &&
		kpiRow.source === "Social Responsibility KPI" &&
		STATUS_OPEN.has(Number(kpiRow.status));

	// Demo copy is allowed to stand in only when the whole page is running on
	// mock data; against live data an absent field renders nothing at all.
	const showPlaceholders = useMockData();
	const issueSummaryText =
		kpiRow.worker_issue_summary ||
		(kpiRow as any).issues ||
		kpiRow.remediation_notes ||
		(showPlaceholders ? ISSUE_SUMMARY_PLACEHOLDER : undefined);
	const issaraActionText =
		kpiRow.issara_action ||
		(kpiRow as any).action ||
		kpiRow.remediation_action ||
		kpiRow.closed_notes ||
		(showPlaceholders ? ISSARA_ACTION_PLACEHOLDER : undefined);
	const supplierActionText = kpiRow.supplier_action || undefined;

	if (variant === "metaBar") {
		const notAvailable = t("workerReportedIssues.values.notAvailable");
		const statusColor = kpiUtils.getStatusColor(
			Number(kpiRow.days_active) || 0,
			Number(kpiRow.status),
		);
		const metaBarContent = (
			<div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-sm leading-relaxed">
				<h4 className="text-sm font-bold text-slate-700 mb-2">
					{t("workerReportedIssues.details.kpiTitle")}
				</h4>
				<div className="flex flex-wrap gap-x-6 gap-y-1 mb-3">
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.category")}:
						</span>
						<span className="font-medium text-slate-700">
							{t(`workerReportedIssues.categories.${kpiRow.category}`)}
						</span>
					</div>
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.level")}:
						</span>
						<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
							{kpiRow.level || "-"}
						</span>
					</div>
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.affectedWorkers")}:
						</span>
						<span className="font-medium text-slate-700">
							{kpiUtils.getAffectedWorkersRangeForSupplier(
								kpiRow.affected_workers,
							)}
						</span>
					</div>
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.status")}:
						</span>
						<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
							<span
								className="w-2 h-2 rounded-full inline-block"
								style={{ backgroundColor: statusColor }}
							/>
							{kpiRow.status_name || kpiRow.status}
						</span>
					</div>
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.opened")}:
						</span>
						<span className="font-medium text-slate-700">
							{kpiRow.opened_at
								? moment(kpiRow.opened_at).format("YYYY-MM-DD")
								: notAvailable}
						</span>
					</div>
					<div className="flex gap-1.5">
						<span className="text-slate-400">
							{t("workerReportedIssues.details.closed")}:
						</span>
						<span className="font-medium text-slate-700">
							{kpiRow.closed_at
								? moment(kpiRow.closed_at).format("YYYY-MM-DD")
								: notAvailable}
						</span>
					</div>
				</div>

				<div className="mb-2">
					<span className="font-semibold text-slate-600">
						{t("workerReportedIssues.details.description")}:{" "}
					</span>
					<span className="text-slate-700">
						{kpiRow.description || notAvailable}
					</span>
				</div>

				<div className="space-y-2.5">
					{issueSummaryText && (
						<div>
							<p className="font-semibold text-[#148696] mb-0.5">
								{t("workerReportedIssues.details.issueSummary")}:
							</p>
							<p className="text-slate-600 whitespace-pre-wrap">
								{issueSummaryText}
							</p>
						</div>
					)}
					{issaraActionText && (
						<div>
							<p className="font-semibold text-[#148696] mb-0.5">
								{t("workerReportedIssues.details.issaraAction", {
									defaultValue: "Action from Issara",
								})}
								:
							</p>
							<p className="text-slate-600 whitespace-pre-wrap">
								{issaraActionText}
							</p>
						</div>
					)}
					<SupplierActionUpdates
						isClosed={isClosedRow}
						supplierAction={supplierActionText}
						supplierKpiId={supplierKpiId}
						t={t}
					/>
				</div>
			</div>
		);

		return (
			<Box>
				{metaBarContent}
				{canShowGrievanceForm && (
					<div className="p-5">
						<SupplierKpiGrievanceComponent
							context={{ t }}
							data={{
								id: supplierKpiId,
								description: kpiRow.description,
								opened_at: kpiRow.opened_at,
								closed_at: kpiRow.closed_at,
								affected_workers: kpiRow.affected_workers,
								level: kpiRow.level,
								status: kpiRow.status_name || String(kpiRow.status),
								remediation_notes:
									kpiRow.remediation_notes || kpiRow.description,
								remediation_action: kpiRow.remediation_action,
								remediation_validation: kpiRow.remediation_validation,
								remediation_results: kpiRow.remediation_results,
							}}
							getDaysActive={(openedAt) => kpiUtils.getDaysActive(openedAt)}
							getStatusColor={(daysActive, status) =>
								kpiUtils.getStatusColor(daysActive, Number(status))
							}
						/>
					</div>
				)}
			</Box>
		);
	}

	const detailsContent = (
		<>
			<div className="text-lg font-semibold text-[#111827]">
				{t("workerReportedIssues.details.kpiTitle")}
			</div>
			<div className="space-y-2 text-sm">
				<div>
					<strong>{t("workerReportedIssues.details.source")}:</strong>{" "}
					{translateKpiSource(t, kpiRow.source)}
				</div>
				<div>
					<strong>{t("workerReportedIssues.details.category")}:</strong>{" "}
					{t(`workerReportedIssues.categories.${kpiRow.category}`)}
				</div>
				<div>
					<strong>{t("workerReportedIssues.details.opened")}:</strong>{" "}
					{kpiRow.opened_at
						? moment(kpiRow.opened_at).format("YYYY-MM-DD")
						: t("workerReportedIssues.values.notAvailable")}
				</div>
				<div>
					<strong>{t("workerReportedIssues.details.closed")}:</strong>{" "}
					{kpiRow.closed_at
						? moment(kpiRow.closed_at).format("YYYY-MM-DD")
						: t("workerReportedIssues.values.notAvailable")}
				</div>
				<div>
					<strong>{t("workerReportedIssues.details.status")}:</strong>{" "}
					{kpiRow.status_name || kpiRow.status}
				</div>
				<div>
					<strong>{t("workerReportedIssues.details.affectedWorkers")}:</strong>{" "}
					{kpiUtils.getAffectedWorkersRangeForSupplier(kpiRow.affected_workers)}
				</div>
				<div className="pt-2">
					<strong>{t("workerReportedIssues.details.description")}:</strong>
					<p className="mt-1 whitespace-pre-wrap">
						{kpiRow.description ||
							t("workerReportedIssues.values.notAvailable")}
					</p>
				</div>
				{hasIloIndicators(kpiRow) && (
					<div className="pt-2">
						<strong>
							{t("workerReportedIssues.details.iloIndicators", {
								defaultValue: "ILO forced-labor indicators",
							})}
							:
						</strong>
						<div className="mt-1 flex flex-wrap gap-1.5">
							{kpiRow.ilo_indicators?.map((indicator) => (
								<span
									className="break-words rounded-full bg-[#FDE7D6] px-2.5 py-0.5 text-xs font-medium text-[#c77724]"
									key={indicator.id}
									title={indicator.description || indicator.name}
								>
									{indicator.name}
								</span>
							))}
						</div>
					</div>
				)}
				{Array.isArray(kpiRow.lksg_indicators) &&
					kpiRow.lksg_indicators.length > 0 && (
						<div className="pt-2">
							<strong>
								{t("workerReportedIssues.details.lksgIndicators", {
									defaultValue: "LkSG indicators",
								})}
								:
							</strong>
							<div className="mt-1 flex flex-wrap gap-1.5">
								{kpiRow.lksg_indicators.map((indicator) => (
									<span
										className="break-words rounded-full bg-[#DCEAF3] px-2.5 py-0.5 text-xs font-medium text-[#004A60]"
										key={indicator.id}
										title={indicator.description || indicator.name}
									>
										{indicator.name}
									</span>
								))}
							</div>
						</div>
					)}
			</div>
			{canShowGrievanceForm || isSupplierContext ? (
				<div className="space-y-2.5 text-sm">
					{issueSummaryText && (
						<div>
							<p className="font-semibold text-[#148696] mb-0.5">
								{t("workerReportedIssues.details.issueSummary")}:
							</p>
							<p className="whitespace-pre-wrap text-gray-700">
								{issueSummaryText}
							</p>
						</div>
					)}
					{issaraActionText && (
						<div>
							<p className="font-semibold text-[#148696] mb-0.5">
								{t("workerReportedIssues.details.issaraAction", {
									defaultValue: "Action from Issara",
								})}
								:
							</p>
							<p className="whitespace-pre-wrap text-gray-700">
								{issaraActionText}
							</p>
						</div>
					)}
					<SupplierActionUpdates
						isClosed={isClosedRow}
						supplierAction={supplierActionText}
						supplierKpiId={supplierKpiId}
						t={t}
					/>
				</div>
			) : isClosedRow ? null : (
				<RemediationNotesSummary
					action={kpiRow.remediation_action}
					issaraAction={issaraActionText}
					issues={issueSummaryText}
					result={kpiRow.remediation_results}
					spRecommendations={toSpRecommendations(
						kpiRow.remediation_sp_recommendation,
					)}
					supplierAction={supplierActionText}
					title=""
					workerValidation={kpiRow.remediation_validation}
				/>
			)}
		</>
	);

	return (
		<Box className="p-2">
			{canShowGrievanceForm ? (
				<div className="space-y-5">
					<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
						<div className="space-y-4">{detailsContent}</div>
					</div>
					<div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
						<SupplierKpiGrievanceComponent
							context={{ t }}
							data={{
								id: supplierKpiId,
								description: kpiRow.description,
								opened_at: kpiRow.opened_at,
								closed_at: kpiRow.closed_at,
								affected_workers: kpiRow.affected_workers,
								level: kpiRow.level,
								status: kpiRow.status_name || String(kpiRow.status),
								remediation_notes:
									kpiRow.remediation_notes || kpiRow.description,
								remediation_action: kpiRow.remediation_action,
								remediation_validation: kpiRow.remediation_validation,
								remediation_results: kpiRow.remediation_results,
							}}
							getDaysActive={(openedAt) => kpiUtils.getDaysActive(openedAt)}
							getStatusColor={(daysActive, status) =>
								kpiUtils.getStatusColor(daysActive, Number(status))
							}
						/>
					</div>
				</div>
			) : (
				<div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
					<div className="space-y-4">{detailsContent}</div>
				</div>
			)}
		</Box>
	);
};

/**
 * Forced-labor risk is Level 3 & 4; Level 2 and level-less ("-") rows are
 * early-warning risk. This deliberately does NOT key off the presence of ILO
 * indicators: every KPI in the catalogue maps to at least one ILO indicator
 * (all 29 Level 2 KPIs included), so that test would mark every row as forced
 * labor and leave the Early Warning tables empty.
 */
export const isForcedLaborRisk = (row: KpiTableRow) => {
	const lvl = Number(row.level);
	return lvl === 3 || lvl === 4;
};

export type TopMetrics = {
	criticalTotal: number;
	criticalEarlyWarning: number;
	criticalForcedLabor: number;
	ewResRate: number;
	flResRate: number;
	ewOpen: number;
	ewClosed: number;
	flOpen: number;
	flClosed: number;
};

/**
 * Top-line figures for the Worker-reported Issues metric cards. Kept here rather
 * than in either route so the partner and supplier pages can never drift apart
 * on how "critical" or "resolution rate" is counted.
 */
export const buildTopMetrics = ({
	openKpiRows,
	earlyWarningOpenRows,
	earlyWarningClosedRows,
	forcedLaborOpenRows,
	forcedLaborClosedRows,
}: {
	openKpiRows: KpiTableRow[];
	earlyWarningOpenRows: KpiTableRow[];
	earlyWarningClosedRows: KpiTableRow[];
	forcedLaborOpenRows: KpiTableRow[];
	forcedLaborClosedRows: KpiTableRow[];
}): TopMetrics => {
	const criticalOpenRows = openKpiRows.filter(
		(row) => Number(row.days_active || 0) >= 60,
	);

	const ewTotal = earlyWarningOpenRows.length + earlyWarningClosedRows.length;
	const flTotal = forcedLaborOpenRows.length + forcedLaborClosedRows.length;

	return {
		criticalTotal: criticalOpenRows.length,
		criticalEarlyWarning: criticalOpenRows.filter(
			(row) => !isForcedLaborRisk(row),
		).length,
		criticalForcedLabor: criticalOpenRows.filter((row) =>
			isForcedLaborRisk(row),
		).length,
		ewResRate:
			ewTotal === 0
				? 0
				: Math.round((earlyWarningClosedRows.length / ewTotal) * 100),
		flResRate:
			flTotal === 0
				? 0
				: Math.round((forcedLaborClosedRows.length / flTotal) * 100),
		ewOpen: earlyWarningOpenRows.length,
		ewClosed: earlyWarningClosedRows.length,
		flOpen: forcedLaborOpenRows.length,
		flClosed: forcedLaborClosedRows.length,
	};
};

/** One Open/Closed pair inside an Early Warning / Forced Labor panel. */
const RiskSplitPanel = ({
	title,
	subtitle,
	openCount,
	closedCount,
	t,
}: {
	title: string;
	subtitle?: string;
	openCount: number;
	closedCount: number;
	t: TFunction;
}) => (
	<div className="rounded-2xl border border-[#D2D2D2]/60 bg-white p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
		<div className="text-sm font-black tracking-wider text-[#004A60]">
			{title}
			{subtitle ? (
				<>
					{" "}
					<span className="font-normal text-[#56666C]">{subtitle}</span>
				</>
			) : null}
		</div>
		<hr className="my-3.5 border-t border-[#D2D2D2]/60" />
		<div className="grid grid-cols-2 gap-4 divide-x divide-[#D2D2D2]/60">
			<div className="text-center">
				<p className="text-6xl font-black text-[#ca0680]">{openCount}</p>
				<span className="mt-2 block text-base font-semibold text-[#56666C]">
					{t("workerReportedIssues.values.statusOpen", {
						defaultValue: "Open",
					})}
				</span>
			</div>
			<div className="text-center pl-4">
				<p className="text-6xl font-black text-[#004A60]">{closedCount}</p>
				<span className="mt-2 block text-base font-semibold text-[#56666C]">
					{t("workerReportedIssues.values.statusClosed", {
						defaultValue: "Closed",
					})}
				</span>
			</div>
		</div>
	</div>
);

/** A single centred "big number over caption" card. */
const MetricCard = ({
	value,
	label,
	subtitle,
}: {
	value: string;
	label: string;
	subtitle: string;
}) => (
	<div className="flex min-h-[145px] flex-col items-center justify-center rounded-2xl border border-[#D2D2D2]/60 bg-white p-5 text-center shadow-xs transition-shadow duration-200 hover:shadow-md">
		<p className="text-6xl font-black text-[#148696]">{value}</p>
		<span className="mt-2 text-base font-bold text-[#004A60]">{label}</span>
		<span className="text-xs font-semibold text-[#8A979C]">{subtitle}</span>
	</div>
);

/**
 * Critical (60+ days) card. The Early Warning / Forced Labor breakdown opens on
 * hover for mouse users and, because this is a real button, on keyboard focus
 * and on tap as well — hover alone would leave the number unexplained on touch
 * devices and for keyboard navigation.
 */
const CriticalCard = ({
	metrics,
	t,
}: {
	metrics: TopMetrics;
	t: TFunction;
}) => {
	const [open, setOpen] = useState(false);
	const panelId = useId();
	const label = t("workerReportedIssues.summary.criticalLabel", {
		defaultValue: "Critical",
	});
	const subtitle = t("workerReportedIssues.summary.criticalSubtitle", {
		defaultValue: "(60+ days)",
	});

	return (
		<button
			aria-controls={panelId}
			aria-expanded={open}
			className="group relative flex min-h-[145px] flex-col items-center justify-center rounded-2xl border border-[#D2D2D2]/60 bg-white p-5 text-center shadow-xs transition-all duration-200 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
			onBlur={() => setOpen(false)}
			onClick={() => setOpen((previous) => !previous)}
			type="button"
		>
			<p className="text-6xl font-black text-[#ca0680]">
				{metrics.criticalTotal}
			</p>
			<span className="mt-2 text-base font-bold text-[#004A60]">{label}</span>
			<span className="text-xs font-semibold text-[#8A979C]">{subtitle}</span>

			<div
				className={`absolute right-3 top-1/2 -translate-y-1/2 w-52 text-left rounded-xl border border-[#D2D2D2]/60 bg-white p-3 shadow-xl transition-opacity duration-200 z-50 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-visible:opacity-100 ${
					open ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
				id={panelId}
			>
				<div className="text-xs font-bold text-[#004A60] mb-1.5 pb-1 border-b border-gray-100">
					{t("workerReportedIssues.summary.criticalBreakdownTitle", {
						defaultValue: "Critical (60+ days) Breakdown",
					})}
				</div>
				<div className="flex justify-between text-xs py-0.5 text-[#333333]">
					<span>
						{t("workerReportedIssues.summary.earlyWarningRiskLabel", {
							defaultValue: "Early Warning Risk:",
						})}
					</span>
					<span className="font-bold text-[#ca0680]">
						{metrics.criticalEarlyWarning}
					</span>
				</div>
				<div className="flex justify-between text-xs py-0.5 text-[#333333]">
					<span>
						{t("workerReportedIssues.summary.forcedLaborRiskLabel", {
							defaultValue: "Forced Labor Risk:",
						})}
					</span>
					<span className="font-bold text-[#FB8379]">
						{metrics.criticalForcedLabor}
					</span>
				</div>
			</div>
		</button>
	);
};

/**
 * Top-line metrics block shared by both Worker-reported Issues pages: a Critical
 * / Resolution Rate row over the Early Warning vs Forced Labor split, mirroring
 * how the tables below are divided.
 */
export const WorkerReportedTopMetrics = ({
	metrics,
	t,
}: {
	metrics: TopMetrics;
	t: TFunction;
}) => {
	const resolutionRateLabel = t(
		"workerReportedIssues.summary.resolutionRateLabel",
		{ defaultValue: "Resolution Rate" },
	);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<CriticalCard metrics={metrics} t={t} />
				<MetricCard
					label={resolutionRateLabel}
					subtitle={t(
						"workerReportedIssues.summary.resolutionRateEarlyWarningSubtitle",
						{ defaultValue: "(Early Warning Risk)" },
					)}
					value={`${metrics.ewResRate}%`}
				/>
				<MetricCard
					label={resolutionRateLabel}
					subtitle={t(
						"workerReportedIssues.summary.resolutionRateForcedLaborSubtitle",
						{ defaultValue: "(Forced Labor Risk)" },
					)}
					value={`${metrics.flResRate}%`}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<RiskSplitPanel
					closedCount={metrics.ewClosed}
					openCount={metrics.ewOpen}
					subtitle={t("workerReportedIssues.summary.earlyWarningRiskSubtitle", {
						defaultValue: "(Worker-reported Issues)",
					})}
					t={t}
					title={t("workerReportedIssues.summary.earlyWarningRiskTitle", {
						defaultValue: "EARLY WARNING RISK",
					})}
				/>
				<RiskSplitPanel
					closedCount={metrics.flClosed}
					openCount={metrics.flOpen}
					subtitle={t("workerReportedIssues.summary.forcedLaborRiskSubtitle", {
						defaultValue: "(Worker-reported Issues)",
					})}
					t={t}
					title={t("workerReportedIssues.summary.forcedLaborRiskTitle", {
						defaultValue: "FORCED LABOR RISK",
					})}
				/>
			</div>
		</div>
	);
};
