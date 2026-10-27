import { Box } from "@radix-ui/themes";
import moment from "moment";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import laborMockData from "$src/assets/mock/labor-data.json";
import recruitmentMockData from "$src/assets/mock/recruitment-data.json";
import wagesMockData from "$src/assets/mock/wages-data.json";
import CollapsibleDataTable from "$src/components/tables/CollapsibleDataTable";
import {
	type SupplierKPIParams,
	useSupplierKPIs,
	useSupplyChains,
} from "$src/hooks/useSupplyChain";
import { useKPIs } from "$src/queries/kpis";
import { useViewModeStore } from "$src/store/viewModeStore";
import type { KPI } from "$src/types/components";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { KPI_STATUS_LEGENDS } from "$src/utils/kpiUtils";
import { pinStableOpenKpi } from "$src/utils/refreshMockKPIDates";
import {
	buildOpenKpiColumns,
	type KpiTableRow,
	normalizeSupplierKpiRows,
	renderKpiExpandedContent,
	STATUS_OPEN,
} from "$src/utils/workerReportedKpiTable";

// Escalated mock cases surfaced in the Component-6 table. Chosen from
// STABLE_OPEN_KPIS (see refreshMockKPIDates) so pinStableOpenKpi keeps them open
// with fresh, auto-rolling dates: 1006 = Fish Seafood Co. (Labor, ~6d), 3007 =
// Sunshine Seafood (Wages, ~25d). Two distinct suppliers, two categories.
const ESCALATED_MOCK_KPI_IDS = new Set([1006, 3007]);

// Supplier context sees only its own escalations, so the mock set is scoped to a
// single supplier: 1002 (~13d) and 1006 (~6d) are both Fish Seafood Co. (Labor).
const ESCALATED_MOCK_KPI_IDS_SUPPLIER = new Set([1002, 1006]);

/**
 * Shared source of truth for the "Open Cases Received for Escalation" set:
 * OPEN worker-reported KPIs escalated to the buyer
 * (`issue_escalated_to_buyer === true`), from the SAME `/supplierkpis` data the
 * Worker-reported Issues page uses. Both the Component-6 table and the
 * "Current Active Escalations to Buyers" KPI card consume this so their numbers
 * always agree. Returns the sorted rows plus the distinct-supplier count.
 */
export const useOpenEscalatedCases = () => {
	const { isSupplier, supplierId, partnerId } = getUserIdentifiers();
	const { viewMode } = useViewModeStore();
	const isSupplierContext = isSupplier || viewMode === "supplier-view";
	const useMock = useMockData();

	const { data: kpisRaw = [] } = useKPIs();

	const kpiMap = useMemo(() => {
		const map = new Map<number, KPI>();
		(kpisRaw as KPI[]).forEach((kpi) => {
			map.set(kpi.id, kpi);
		});
		return map;
	}, [kpisRaw]);

	// Mock path — derive the escalated cases from the SAME labor/recruitment/wages
	// mock `supplierKPIs` the Worker-reported Issues page uses, so supplier names,
	// KPI IDs and (auto-rolling) day counts all match that table. `pinStableOpenKpi`
	// keeps the selected KPIs open with fresh dates; `normalizeSupplierKpiRows`
	// gives display_id, days_active, supplier_name and category for free.
	const mockRows = useMemo<KpiTableRow[]>(() => {
		if (!useMock) return [];
		const today = moment();
		const selected = [
			...(laborMockData.supplierKPIs as any[]),
			...(recruitmentMockData.supplierKPIs as any[]),
			...(wagesMockData.supplierKPIs as any[]),
		]
			.filter((kpi) =>
				(isSupplierContext
					? ESCALATED_MOCK_KPI_IDS_SUPPLIER
					: ESCALATED_MOCK_KPI_IDS
				).has(Number(kpi.id)),
			)
			.map((kpi) => ({
				...(pinStableOpenKpi(kpi, today) ?? kpi),
				issue_escalated_to_buyer: true,
			}));
		return normalizeSupplierKpiRows(selected, kpiMap).filter((row) =>
			STATUS_OPEN.has(Number(row.status)),
		);
	}, [useMock, kpiMap, isSupplierContext]);

	const mockSupplierCount = useMemo(() => {
		const ids = new Set<string>();
		mockRows.forEach((row) => {
			const key =
				row.supplier != null ? String(row.supplier) : row.supplier_name;
			if (key) ids.add(key);
		});
		return ids.size;
	}, [mockRows]);

	// The `/supplierkpis` endpoint has no partner filter — only a supplier-id
	// list. In buyer/partner view we therefore resolve the partner's suppliers
	// from its supply chains and scope the query to them (mirrors
	// WorkerReportedIssuesSupplier). Without this the buyer view sends no
	// `suppliers` and the endpoint returns nothing for the partner.
	const { data: apiSupplyChains = [] } = useSupplyChains(
		!isSupplierContext && !useMock
			? { partnerId: partnerId || undefined }
			: undefined,
	);
	const partnerSupplierIds = useMemo(() => {
		const ids = new Set<number>();
		(apiSupplyChains as any[]).forEach((sc) => {
			const matchesPartner =
				!partnerId ||
				sc.strategic_partner === partnerId ||
				sc.strategic_partner_id === partnerId ||
				sc.partner_id === partnerId;
			if (matchesPartner && Array.isArray(sc.suppliers)) {
				sc.suppliers.forEach((s: any) => {
					const id = s.id || s.supplier;
					if (id) ids.add(id);
				});
			}
		});
		return Array.from(ids);
	}, [apiSupplyChains, partnerId]);

	const supplierKPIParams: SupplierKPIParams = {
		has_cases: true,
		show_closed: true,
		// In supplier context without a resolvable supplier id, scope to the empty
		// set rather than omitting `suppliers` — an absent key makes the API return
		// every supplier's escalated cases, which is the opposite of the intent.
		suppliers: isSupplierContext
			? supplierId
				? [supplierId]
				: []
			: partnerSupplierIds,
	};
	const { data: supplierKPIData = { results: [], count: 0 } } = useSupplierKPIs(
		useMock ? undefined : supplierKPIParams,
	);

	const liveRows = useMemo<KpiTableRow[]>(() => {
		if (useMock) return [];
		const normalized = normalizeSupplierKpiRows(
			(supplierKPIData.results || []) as any[],
			kpiMap,
		);
		return normalized
			.filter(
				(row) =>
					STATUS_OPEN.has(Number(row.status)) &&
					Boolean(row.issue_escalated_to_buyer),
			)
			.sort(
				(a, b) =>
					new Date(b.opened_at || "").getTime() -
					new Date(a.opened_at || "").getTime(),
			);
	}, [useMock, supplierKPIData.results, kpiMap]);

	const rows = useMock ? mockRows : liveRows;

	// Distinct suppliers with at least one open escalated case — matches the KPI
	// card's "Suppliers with Escalated Cases" semantics.
	const supplierCount = useMemo(() => {
		if (useMock) return mockSupplierCount;
		const ids = new Set<string>();
		rows.forEach((row) => {
			const key =
				row.supplier != null ? String(row.supplier) : row.supplier_name;
			if (key) ids.add(key);
		});
		return ids.size;
	}, [useMock, mockSupplierCount, rows]);

	return { rows, caseCount: rows.length, supplierCount, isSupplierContext };
};

/**
 * HRDD Component 6 — "Open Cases Received for Escalation".
 *
 * Renders the SAME table as the Worker-reported Issues page's "Open
 * Worker-reported Violations" table (same `/supplierkpis` data, columns,
 * expanded detail and status legend), but filtered to OPEN cases that have been
 * escalated to the buyer (`issue_escalated_to_buyer === true`).
 */
const OpenEscalatedCasesTable = () => {
	const { t } = useTranslation();
	const { rows: openEscalatedRows, isSupplierContext } =
		useOpenEscalatedCases();

	const openKpiColumns = useMemo(() => buildOpenKpiColumns(t), [t]);

	return (
		<Box mb="8">
			<CollapsibleDataTable
				columnSearchEnabled={true}
				columns={openKpiColumns}
				dense={false}
				expandAllButton={true}
				pageSize={10}
				renderExpandedContent={(row) =>
					renderKpiExpandedContent({ row, isSupplierContext, t })
				}
				rows={openEscalatedRows}
				statusLegends={[...KPI_STATUS_LEGENDS]}
				title={t("companyDashboard.openEscalatedCases.title", {
					count: openEscalatedRows.length,
					defaultValue: "Open Cases Received for Escalation ({{count}})",
				})}
				totalCount={openEscalatedRows.length}
			/>
		</Box>
	);
};

export default OpenEscalatedCasesTable;
