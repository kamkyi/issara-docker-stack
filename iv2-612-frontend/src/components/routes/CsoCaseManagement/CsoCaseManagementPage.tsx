import { Button, Flex, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import SectionCard from "$src/components/ui/SectionCard";
import {
	useCaseManagementContext,
	useCsoKpiCycles,
	useCsoKpis,
	useCsoOrganizations,
} from "$src/queries/csoCaseManagement";
import type {
	CsoKpi,
	CsoKpiFilters,
	CsoKpiHistory,
} from "$src/services/csoCaseManagementService";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import CsoCaseManagementFilters, {
	type CaseManagementFilterState,
	EMPTY_FILTERS,
} from "./CsoCaseManagementFilters";
import CsoKpiDrawer from "./CsoKpiDrawer";
import CsoKpiQueueTable, {
	displayDate,
	type QueueColumn,
	StatusBadge,
} from "./CsoKpiQueueTable";

const PAGE_SIZE = 10;

/**
 * Legacy switches the default sort to closed date once closed rows are shown
 * (`CsoSupplierKpiFilters`), because an open-date sort buries what just closed.
 */
const defaultOrdering = (showClosed: boolean) =>
	showClosed ? "-closed_at" : "-opened_at";

/**
 * CSO Case Management, following the legacy `/admin/businesskpiupdates`
 * workflow: one sticky filter bar over two stacked queues -- current Supplier
 * KPIs and their open/reopen cycles -- with row checkboxes feeding a bulk
 * update and an eye icon opening the detail drawer.
 *
 * The queue itself is scoped by the Django adapter, which reproduces legacy's
 * combination rule: ownership through `Case.supplier_kpis`, liveness rechecked
 * against supplier + KPI definition so stale links stay hidden.
 */
export default function CsoCaseManagementPage() {
	const role = useAuthData((state) => state.role);
	const viewMode = useViewModeStore((state) => state.viewMode);
	const [selectedOrganizationId, setSelectedOrganizationId] = useState<
		number | null
	>(null);
	const [selectedKpiId, setSelectedKpiId] = useState<number | null>(null);
	const [checkedIds, setCheckedIds] = useState<number[]>([]);
	const [filters, setFilters] =
		useState<CaseManagementFilterState>(EMPTY_FILTERS);

	const [kpiPage, setKpiPage] = useState(1);
	const [cyclePage, setCyclePage] = useState(1);
	const [kpiOrdering, setKpiOrdering] = useState(defaultOrdering(false));
	const [cycleOrdering, setCycleOrdering] = useState(defaultOrdering(false));
	const [kpiColumnFilters, setKpiColumnFilters] = useState<
		Record<string, string>
	>({});
	const [cycleColumnFilters, setCycleColumnFilters] = useState<
		Record<string, string>
	>({});

	const navigate = useNavigate();
	const context = useCaseManagementContext(selectedOrganizationId);
	const organizations = useCsoOrganizations(
		Boolean(context.data?.can_select_organization),
	);

	const active = role === "org-cso" || viewMode === "cso-view";
	const enabled = active && Boolean(context.data?.effective_organization);
	const actualRole = context.data?.actual_role ?? "cso";

	// Any filter change restarts both queues at page one, so a narrowed result
	// set cannot leave the user stranded on a page that no longer exists.
	const applyFilters = (next: CaseManagementFilterState) => {
		if (next.showClosed !== filters.showClosed) {
			setKpiOrdering(defaultOrdering(next.showClosed));
			setCycleOrdering(defaultOrdering(next.showClosed));
		}
		setFilters(next);
		setKpiPage(1);
		setCyclePage(1);
	};

	const shared: CsoKpiFilters = useMemo(
		() => ({
			selectedOrganizationId,
			pageSize: PAGE_SIZE,
			search: filters.search,
			showClosed: filters.showClosed,
			suppliers: filters.supplierIds.join(",") || undefined,
			openedAfter: filters.openedAfter,
			openedBefore: filters.openedBefore,
			daysOpenMin: filters.daysOpenMin,
			daysOpenMax: filters.daysOpenMax,
			supplyChain: filters.supplyScope === "supply",
			nonSupplyChain: filters.supplyScope === "non",
		}),
		[filters, selectedOrganizationId],
	);

	const kpis = useCsoKpis(
		{
			...shared,
			page: kpiPage,
			ordering: kpiOrdering,
			columnFilters: kpiColumnFilters,
		},
		enabled,
	);
	const cycles = useCsoKpiCycles(
		{
			...shared,
			page: cyclePage,
			ordering: cycleOrdering,
			columnFilters: cycleColumnFilters,
		},
		enabled,
	);

	// Rows can leave the queue under a new filter; drop them from the selection
	// so a bulk update never carries an id the user can no longer see.
	const visibleKpiKey = (kpis.data?.results ?? [])
		.map((row) => row.id)
		.join(",");
	useEffect(() => {
		const visible = new Set(
			visibleKpiKey ? visibleKpiKey.split(",").map(Number) : [],
		);
		setCheckedIds((ids) => ids.filter((id) => visible.has(id)));
	}, [visibleKpiKey]);

	const refreshAll = () => {
		void kpis.refetch();
		void cycles.refetch();
	};

	// Legacy hands the selection to a dedicated bulk page through the URL
	// (`/admin/supplier-kpi-bulk-update?ids=`) rather than updating rows in
	// place, so the user gets a full edit form per KPI and can reload without
	// losing the queue. The organization travels along for Management viewers,
	// whose scope is not implied by their account.
	const openBulkUpdate = () =>
		void navigate({
			to: "/worker-voice-calls/cases/bulk-update",
			search: {
				ids: checkedIds.join(","),
				...(selectedOrganizationId ? { org: selectedOrganizationId } : {}),
			},
		});

	const kpiColumns: QueueColumn<CsoKpi>[] = [
		{ field: "id", header: "ID", render: (row) => `#${row.id}` },
		{
			field: "supplier__name",
			header: "Supplier",
			render: (row) => row.supplier_name,
		},
		{
			field: "kpi__kpi_category",
			header: "Category / KPI",
			render: (row) => (
				<>
					<Text weight="medium">{row.category}</Text>
					<Text className="block text-body" size="2">
						{row.description}
					</Text>
				</>
			),
		},
		{ field: "kpi__level", header: "Level", render: (row) => row.level },
		{
			field: "affected_workers",
			header: "Affected",
			render: (row) => row.affected_workers ?? "—",
		},
		{
			field: "opened_at",
			header: "Opened",
			render: (row) => displayDate(row.opened_at),
		},
		{
			field: "days_active",
			header: "Days active",
			render: (row) => row.days_open,
		},
		{
			field: "status__name",
			header: "Status",
			render: (row) => <StatusBadge name={row.status_name} />,
		},
	];

	const cycleColumns: QueueColumn<CsoKpiHistory>[] = [
		{ field: "id", header: "Update", render: (row) => `#${row.id}` },
		{
			field: "supplier_kpi",
			header: "Supplier KPI",
			render: (row) => `#${row.supplier_kpi}`,
		},
		{
			field: "supplier_kpi__supplier__name",
			header: "Supplier",
			render: (row) => row.supplier_name,
		},
		{
			field: "supplier_kpi__kpi__kpi_category",
			header: "Category / KPI",
			render: (row) => (
				<>
					<Text weight="medium">{row.category}</Text>
					<Text className="block text-body" size="2">
						{row.description}
					</Text>
				</>
			),
		},
		{
			field: "supplier_kpi__kpi__level",
			header: "Level",
			render: (row) => row.level,
		},
		{
			field: "opened_at",
			header: "Opened",
			render: (row) => displayDate(row.opened_at),
		},
		{
			field: "closed_at",
			header: "Closed",
			render: (row) => displayDate(row.closed_at),
		},
		{
			field: "status__name",
			header: "Status",
			render: (row) => <StatusBadge name={row.status_name} />,
		},
	];

	if (!active) {
		return (
			<SectionCard>
				<Text>Switch to CSO View to open Case Management.</Text>
			</SectionCard>
		);
	}

	return (
		<div className="grid gap-l">
			{context.isLoading && (
				<SectionCard>
					<Text>Loading Case Management context…</Text>
				</SectionCard>
			)}
			{context.isError && (
				<SectionCard>
					<Text>Could not resolve your Case Management organization.</Text>
				</SectionCard>
			)}
			{context.data?.can_select_organization && (
				<SectionCard title="Select a CSO organization">
					<Text className="mb-m block">
						{context.data.selection_required
							? "Select a CSO organization to inspect its cases."
							: "Inspecting the selected CSO organization."}
					</Text>
					<label className="flex max-w-md flex-col gap-xs text-sm text-body">
						<span>CSO organization</span>
						<select
							className="rounded-lg border border-[var(--color-border)] p-s text-ink"
							onChange={(event) =>
								setSelectedOrganizationId(
									event.target.value ? Number(event.target.value) : null,
								)
							}
							value={selectedOrganizationId ?? ""}
						>
							<option value="">Select an organization</option>
							{organizations.data?.map((org) => (
								<option key={org.id} value={org.id}>
									{org.name}
								</option>
							))}
						</select>
					</label>
					{organizations.isError && (
						<Text>Could not load CSO organizations.</Text>
					)}
				</SectionCard>
			)}

			{enabled && (
				<>
					<CsoCaseManagementFilters
						isRefreshing={kpis.isFetching || cycles.isFetching}
						onChange={applyFilters}
						onRefresh={refreshAll}
						value={filters}
					/>

					<SectionCard
						title={`${context.data?.effective_organization?.name} · Case Management`}
					>
						<div className="grid gap-2xl">
							<CsoKpiQueueTable
								actions={
									checkedIds.length > 0 && actualRole === "cso" ? (
										<Button
											className="cascade-btn cascade-btn--primary"
											onClick={openBulkUpdate}
										>
											Update selected ({checkedIds.length})
										</Button>
									) : undefined
								}
								columnFilters={kpiColumnFilters}
								columns={kpiColumns}
								count={kpis.data?.count ?? 0}
								description="Current Supplier KPI records. Reopened or repeated cycles are listed separately below."
								isError={kpis.isError}
								isLoading={kpis.isLoading}
								isSelectable={(row) => row.can_edit}
								onColumnFiltersChange={(next) => {
									setKpiColumnFilters(next);
									setKpiPage(1);
								}}
								onOrderingChange={(next) => {
									setKpiOrdering(next);
									setKpiPage(1);
								}}
								onPageChange={setKpiPage}
								onSelectedIdsChange={setCheckedIds}
								onView={setSelectedKpiId}
								ordering={kpiOrdering}
								page={kpiPage}
								pageSize={PAGE_SIZE}
								rowKpiId={(row) => row.id}
								rows={kpis.data?.results ?? []}
								selectable
								selectedIds={checkedIds}
								title="Current Supplier KPIs"
							/>

							<CsoKpiQueueTable
								columnFilters={cycleColumnFilters}
								columns={cycleColumns}
								count={cycles.data?.count ?? 0}
								description="Each time a KPI was opened or reopened, listed as its own cycle."
								isError={cycles.isError}
								isLoading={cycles.isLoading}
								onColumnFiltersChange={(next) => {
									setCycleColumnFilters(next);
									setCyclePage(1);
								}}
								onOrderingChange={(next) => {
									setCycleOrdering(next);
									setCyclePage(1);
								}}
								onPageChange={setCyclePage}
								onView={setSelectedKpiId}
								ordering={cycleOrdering}
								page={cyclePage}
								pageSize={PAGE_SIZE}
								rowKpiId={(row) => row.supplier_kpi}
								rows={cycles.data?.results ?? []}
								title="Supplier KPI open/reopen cycles"
							/>
						</div>
					</SectionCard>

					<CsoKpiDrawer
						id={selectedKpiId}
						onClose={() => setSelectedKpiId(null)}
						onSaved={refreshAll}
						selectedOrganizationId={selectedOrganizationId}
						statuses={context.data?.statuses ?? []}
					/>

					{checkedIds.length > 0 && (
						<Flex align="center" gap="3" justify="end">
							<Text size="2">{checkedIds.length} selected</Text>
							<Button
								className="cascade-btn cascade-btn--alt2"
								onClick={() => setCheckedIds([])}
							>
								Clear selection
							</Button>
						</Flex>
					)}
				</>
			)}
		</div>
	);
}
