import { EyeOpenIcon } from "@radix-ui/react-icons";
import { Badge, Button, Flex, IconButton, Table, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";

export interface QueueColumn<Row> {
	/** Backend filter/ordering name, e.g. `supplier__name`. */
	field: string;
	header: string;
	render: (row: Row) => React.ReactNode;
	/** Off for computed columns the API cannot filter or sort on. */
	filterable?: boolean;
	sortable?: boolean;
}

const formatDate = (value: string | null | undefined) =>
	value ? value.slice(0, 10) : "—";

export const displayDate = formatDate;

/**
 * Legacy debounces its column boxes by 500ms before refetching; keeping the
 * same delay means typing a supplier name costs one request, not one per key.
 */
const COLUMN_FILTER_DEBOUNCE_MS = 500;

/**
 * One queue table, drawn twice on the page: once for current Supplier KPIs and
 * once for open/reopen cycles, matching the two stacked legacy tables.
 *
 * Column boxes and sorting are server-side, as in legacy -- filtering a column
 * searches the whole queue rather than the ten rows currently on screen.
 */
export default function CsoKpiQueueTable<Row extends { id: number }>({
	title,
	description,
	columns,
	rows,
	count,
	page,
	pageSize,
	onPageChange,
	ordering,
	onOrderingChange,
	columnFilters,
	onColumnFiltersChange,
	isLoading,
	isError,
	onView,
	rowKpiId,
	selectable,
	isSelectable,
	selectedIds,
	onSelectedIdsChange,
	actions,
}: {
	title: string;
	description: string;
	columns: QueueColumn<Row>[];
	rows: Row[];
	count: number;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	ordering: string;
	onOrderingChange: (ordering: string) => void;
	columnFilters: Record<string, string>;
	onColumnFiltersChange: (next: Record<string, string>) => void;
	isLoading: boolean;
	isError: boolean;
	onView: (kpiId: number) => void;
	rowKpiId: (row: Row) => number;
	selectable?: boolean;
	isSelectable?: (row: Row) => boolean;
	selectedIds?: number[];
	onSelectedIdsChange?: (ids: number[]) => void;
	actions?: React.ReactNode;
}) {
	// Boxes echo keystrokes immediately; the request waits for the pause.
	const [draft, setDraft] = useState(columnFilters);
	const committed = useRef(columnFilters);
	useEffect(() => {
		if (committed.current !== columnFilters) {
			committed.current = columnFilters;
			setDraft(columnFilters);
		}
	}, [columnFilters]);
	useEffect(() => {
		const timer = setTimeout(() => {
			if (JSON.stringify(draft) !== JSON.stringify(committed.current)) {
				committed.current = draft;
				onColumnFiltersChange(draft);
			}
		}, COLUMN_FILTER_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draft, onColumnFiltersChange]);

	const maxPage = Math.max(1, Math.ceil(count / pageSize));
	const selected = selectedIds ?? [];

	const toggleSort = (field: string) =>
		onOrderingChange(ordering === field ? `-${field}` : field);

	const sortMark = (field: string) =>
		ordering === field ? " ▲" : ordering === `-${field}` ? " ▼" : "";

	return (
		<div className="grid gap-m">
			<Flex align="center" gap="3" justify="between" wrap="wrap">
				<div>
					<Text as="div" size="4" weight="bold">
						{title}
					</Text>
					<Text as="div" className="text-body" size="2">
						{description}
					</Text>
				</div>
				<Flex align="center" gap="3">
					<Text size="2">Found — {count}</Text>
					{actions}
				</Flex>
			</Flex>

			{isLoading && <Text>Loading KPI records…</Text>}
			{isError && <Text>Could not load these records.</Text>}
			{!isLoading && !isError && rows.length === 0 && (
				<Text>No KPIs match these filters.</Text>
			)}

			{rows.length > 0 && (
				<div className="overflow-x-auto">
					<Table.Root variant="surface">
						<Table.Header>
							<Table.Row>
								{selectable && (
									<Table.ColumnHeaderCell>Select</Table.ColumnHeaderCell>
								)}
								{columns.map((column) => (
									<Table.ColumnHeaderCell key={column.field}>
										{column.sortable === false ? (
											column.header
										) : (
											<button
												className="cursor-pointer bg-transparent p-0 text-left font-inherit"
												onClick={() => toggleSort(column.field)}
												type="button"
											>
												{column.header}
												{sortMark(column.field)}
											</button>
										)}
									</Table.ColumnHeaderCell>
								))}
								<Table.ColumnHeaderCell>View</Table.ColumnHeaderCell>
							</Table.Row>
							<Table.Row>
								{selectable && <Table.Cell />}
								{columns.map((column) => (
									<Table.Cell key={column.field}>
										{column.filterable === false ? null : (
											<input
												aria-label={`Filter by ${column.header}`}
												className="w-full rounded border border-[var(--color-border)] p-xs text-sm text-ink"
												onChange={(event) =>
													setDraft({
														...draft,
														[column.field]: event.target.value,
													})
												}
												value={draft[column.field] ?? ""}
											/>
										)}
									</Table.Cell>
								))}
								<Table.Cell />
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{rows.map((row) => {
								const selectableRow =
									selectable && (isSelectable?.(row) ?? true);
								return (
									<Table.Row key={row.id}>
										{selectable && (
											<Table.Cell>
												{selectableRow && (
													<input
														aria-label={`Select KPI ${row.id}`}
														checked={selected.includes(row.id)}
														onChange={(event) =>
															onSelectedIdsChange?.(
																event.target.checked
																	? [...selected, row.id]
																	: selected.filter((id) => id !== row.id),
															)
														}
														type="checkbox"
													/>
												)}
											</Table.Cell>
										)}
										{columns.map((column) => (
											<Table.Cell key={column.field}>
												{column.render(row)}
											</Table.Cell>
										))}
										<Table.Cell>
											<IconButton
												aria-label={`View KPI ${rowKpiId(row)}`}
												onClick={() => onView(rowKpiId(row))}
												variant="ghost"
											>
												<EyeOpenIcon />
											</IconButton>
										</Table.Cell>
									</Table.Row>
								);
							})}
						</Table.Body>
					</Table.Root>
				</div>
			)}

			<Flex align="center" gap="3" justify="end">
				<Text size="2">
					Page {page} of {maxPage} · {count} records
				</Text>
				<Button
					className="cascade-btn cascade-btn--alt2"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					Previous
				</Button>
				<Button
					className="cascade-btn cascade-btn--alt2"
					disabled={page >= maxPage}
					onClick={() => onPageChange(page + 1)}
				>
					Next
				</Button>
			</Flex>
		</div>
	);
}

export function StatusBadge({ name }: { name: string }) {
	return <Badge>{name}</Badge>;
}
