import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import {
	Backdrop,
	Box,
	Chip,
	CircularProgress,
	Collapse,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TableSortLabel,
	TextField,
	Typography,
} from "@mui/material";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import React, { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStickyHeaderOffset, revealElement } from "$src/utils/revealElement";

export interface CollapsibleColumn {
	id: string;
	label: string;
	minWidth?: number;
	align?: "right" | "left" | "center";
	format?: (value: any, row: CollapsibleRowData) => string | React.ReactNode;
	sortable?: boolean;
	searchable?: boolean;
	searchValue?: (row: CollapsibleRowData) => unknown;
}

export interface CollapsibleRowData {
	id: string | number;
	[key: string]: any;
	expandedContent?:
		| React.ReactNode
		| ((row: CollapsibleRowData) => React.ReactNode);
	expandable?: boolean;
}

export interface StatusLegendItem {
	label: string;
	color: string;
}

interface CollapsibleDataTableProps {
	columns: CollapsibleColumn[];
	rows: CollapsibleRowData[];
	appearance?: "default" | "workerViolations";
	title?: string;
	defaultExpanded?: boolean;
	expandAllButton?: boolean;
	pageSize?: number;
	dense?: boolean;
	stickyHeader?: boolean;
	maxHeight?: number;
	onRowClick?: (row: CollapsibleRowData) => void;
	renderExpandedContent?: (row: CollapsibleRowData) => React.ReactNode;
	totalCount?: number;
	// External pagination props
	currentPage?: number;
	onPageChange?: (page: number) => void;
	isLoading?: boolean;
	errorMessage?: string | null;
	emptyMessage?: string;
	onRetry?: () => void;
	statusLegends?: StatusLegendItem[];
	columnSearchEnabled?: boolean;
	/**
	 * When true (default), only one row can be expanded at a time. Expanding a
	 * new row collapses any previously expanded row. Set to false to restore
	 * the legacy multi-expand behavior.
	 */
	singleExpand?: boolean;
}

// Pixel offset for the sticky column-search row so it stacks BELOW the main
// header row instead of overlapping it. Matches MUI medium-density header
// height (~57px including border).
const HEADER_ROW_HEIGHT = 57;

const CollapsibleDataTable: React.FC<CollapsibleDataTableProps> = ({
	columns,
	rows,
	appearance = "default",
	title,
	defaultExpanded = false,
	expandAllButton = true,
	pageSize = 10,
	dense = false,
	stickyHeader = true,
	maxHeight = 600,
	onRowClick,
	renderExpandedContent,
	totalCount,
	currentPage,
	onPageChange,
	isLoading = false,
	errorMessage = null,
	emptyMessage,
	onRetry,
	statusLegends = [],
	columnSearchEnabled = false,
	singleExpand = true,
}) => {
	const { theme } = useTheme();
	const [expandedRows, setExpandedRows] = useState<Set<string | number>>(
		defaultExpanded ? new Set(rows.map((row) => row.id)) : new Set(),
	);
	// Trigger rows, so an expanded panel can be scrolled into view from the row
	// that opened it (the row plus the top of its panel, not the panel alone).
	const rowRefs = useRef(new Map<string | number, HTMLTableRowElement>());
	const panelIdBase = useId();
	const getPanelId = (rowId: string | number) =>
		`${panelIdBase}-panel-${rowId}`;
	// A sticky header pinned inside a maxHeight-capped scroll box works well for
	// browsing plain rows, but once a row's expanded content (e.g. a grievance
	// form) is taller than that box, the header stays glued on top of it while
	// the box scrolls internally. Drop both constraints while any row is
	// expanded so the page scrolls naturally and the header doesn't overlap it.
	const hasExpandedRows = expandedRows.size > 0;
	const effectiveStickyHeader = stickyHeader && !hasExpandedRows;
	const effectiveMaxHeight = hasExpandedRows ? undefined : maxHeight;
	const [internalPage, setInternalPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(pageSize);
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const { t } = useTranslation();
	const isWorkerViolations = appearance === "workerViolations";
	const [columnSearches, setColumnSearches] = useState<Record<string, string>>(
		{},
	);

	// Use external pagination if provided, otherwise use internal
	const isExternalPagination =
		currentPage !== undefined && onPageChange !== undefined;
	const currentPageIndex = isExternalPagination
		? currentPage - 1
		: internalPage;
	const columnsById = useMemo(
		() => new Map(columns.map((column) => [column.id, column])),
		[columns],
	);

	const toSearchableText = (value: unknown): string => {
		if (value == null) return "";
		if (Array.isArray(value)) {
			return value.map((item) => toSearchableText(item)).join(" ");
		}
		if (value instanceof Date) {
			return value.toISOString();
		}
		if (typeof value === "object") {
			return Object.values(value as Record<string, unknown>)
				.map((item) => toSearchableText(item))
				.join(" ");
		}
		return String(value);
	};

	const filteredRows = useMemo(() => {
		if (!columnSearchEnabled) {
			return rows;
		}

		const activeSearches = Object.entries(columnSearches).filter(([, value]) =>
			value.trim(),
		);

		if (activeSearches.length === 0) {
			return rows;
		}

		return rows.filter((row) =>
			activeSearches.every(([columnId, searchValue]) => {
				if (columnId === "__workerViolationDetails") {
					return ["category", "description", "level"].some((detailId) =>
						toSearchableText(row[detailId])
							.toLowerCase()
							.includes(searchValue.trim().toLowerCase()),
					);
				}

				const column = columnsById.get(columnId);
				if (!column || column.searchable === false) {
					return true;
				}

				const value = column.searchValue
					? column.searchValue(row)
					: row[column.id];
				return toSearchableText(value)
					.toLowerCase()
					.includes(searchValue.trim().toLowerCase());
			}),
		);
	}, [columnSearchEnabled, columnSearches, columnsById, rows]);

	const handleSort = (columnId: string) => {
		if (sortColumn === columnId) {
			sortDirection === "asc" ? setSortDirection("desc") : setSortColumn(null);
		} else {
			setSortColumn(columnId);
			setSortDirection("asc");
		}
		// Reset to first page on sort change
		if (isExternalPagination) onPageChange?.(1);
		else setInternalPage(0);
	};

	const sortedRows = useMemo(() => {
		if (!sortColumn) return filteredRows;
		return [...filteredRows].sort((a, b) => {
			const aVal = a[sortColumn];
			const bVal = b[sortColumn];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return sortDirection === "asc" ? 1 : -1;
			if (bVal == null) return sortDirection === "asc" ? -1 : 1;
			if (typeof aVal === "number" && typeof bVal === "number") {
				return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal).toLowerCase();
			const bStr = String(bVal).toLowerCase();
			if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
			if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});
	}, [filteredRows, sortColumn, sortDirection]);

	const handleExpandRow = (rowId: string | number) => {
		if (singleExpand) {
			setExpandedRows(expandedRows.has(rowId) ? new Set() : new Set([rowId]));
			return;
		}
		const newExpandedRows = new Set(expandedRows);
		if (expandedRows.has(rowId)) {
			newExpandedRows.delete(rowId);
		} else {
			newExpandedRows.add(rowId);
		}
		setExpandedRows(newExpandedRows);
	};

	const handleExpandAll = () => {
		const visibleRowIds = new Set(filteredRows.map((row) => row.id));
		const isAllVisibleExpanded =
			filteredRows.length > 0 &&
			filteredRows.every((row) => expandedRows.has(row.id));

		if (isAllVisibleExpanded) {
			const newExpandedRows = new Set(expandedRows);
			for (const rowId of visibleRowIds) {
				newExpandedRows.delete(rowId);
			}
			setExpandedRows(newExpandedRows);
		} else {
			const newExpandedRows = new Set(expandedRows);
			for (const rowId of visibleRowIds) {
				newExpandedRows.add(rowId);
			}
			setExpandedRows(newExpandedRows);
		}
	};

	const handleColumnSearchChange = (columnId: string, value: string) => {
		setColumnSearches((previous) => ({
			...previous,
			[columnId]: value,
		}));
		if (isExternalPagination) onPageChange?.(1);
		else setInternalPage(0);
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		if (isExternalPagination) {
			// For external pagination, convert 0-based to 1-based page number
			onPageChange(newPage + 1);
		} else {
			setInternalPage(newPage);
		}
	};

	const handleChangeRowsPerPage = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		setRowsPerPage(+event.target.value);
		if (isExternalPagination) {
			onPageChange?.(1); // Reset to first page
		} else {
			setInternalPage(0);
		}
	};

	const expandedVisibleRows = filteredRows.filter((row) =>
		expandedRows.has(row.id),
	);
	const paginationCount = columnSearchEnabled
		? filteredRows.length
		: totalCount || rows.length;

	// For external pagination, show all rows (they're already paginated from API)
	// For internal pagination, slice the rows
	const paginatedRows = isExternalPagination
		? sortedRows
		: sortedRows.slice(
				currentPageIndex * rowsPerPage,
				currentPageIndex * rowsPerPage + rowsPerPage,
			);

	const effectiveRowsPerPage = isExternalPagination ? pageSize : rowsPerPage;
	const paginationRangeStart =
		paginationCount === 0 ? 0 : currentPageIndex * effectiveRowsPerPage + 1;
	const paginationRangeEnd = Math.min(
		paginationCount,
		(currentPageIndex + 1) * effectiveRowsPerPage,
	);
	const isLastPage = paginationRangeEnd >= paginationCount;

	const tableStyles = {
		backgroundColor: theme === "dark" ? "#004A60" : "#ffffff",
		color: theme === "dark" ? "#e4e4e4" : "#333333",
		borderRadius: isWorkerViolations ? 0 : "5px",
		boxShadow: "none",
	};

	const headerStyles = {
		backgroundColor: isWorkerViolations ? "#334155" : "#148696",
		color: "#ffffff",
		fontWeight: 600,
		...(isWorkerViolations && {
			borderRight: "1px solid rgba(255,255,255,0.18)",
			fontSize: 11,
			letterSpacing: "0.06em",
			lineHeight: 1.25,
			padding: "12px",
			textTransform: "uppercase",
		}),
	};

	const cellStyles = {
		color: theme === "dark" ? "#d4d4d4" : "#333333",
		borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
		...(isWorkerViolations && {
			fontSize: 14,
			height: 64,
			lineHeight: 1.4,
			padding: "12px",
			verticalAlign: "middle",
		}),
	};

	const expandedContentStyles = {
		backgroundColor:
			theme === "dark"
				? "rgba(20, 134, 150, 0.08)"
				: "rgba(20, 134, 150, 0.04)",
		borderLeft: isWorkerViolations ? 0 : `3px solid #148696`,
		borderTop: isWorkerViolations ? "2px solid var(--color-secondary)" : 0,
		borderRadius: isWorkerViolations ? 0 : "0 8px 8px 8px",
		padding: isWorkerViolations ? "0" : "20px 24px",
		// Bounding each row's own expanded content (rather than the whole
		// table) keeps the next rows reachable without scrolling through the
		// entire grievance form first, and avoids fighting the table's own
		// scroll/sticky-header handling above.
		...(isWorkerViolations && { maxHeight: 720, overflowY: "auto" as const }),
	};

	const renderSearchField = (
		columnId: string,
		label: string,
		placeholder: string,
	) => (
		<input
			aria-label={label}
			className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-[#148696]"
			onChange={(event) =>
				handleColumnSearchChange(columnId, event.target.value)
			}
			placeholder={placeholder}
			value={columnSearches[columnId] || ""}
		/>
	);

	return (
		<Paper
			sx={{
				width: "100%",
				overflow: "hidden",
				position: "relative",
				...tableStyles,
			}}
		>
			{/* Header with title, legend and expand controls */}
			{(title || expandAllButton || statusLegends.length > 0) && (
				<Box
					sx={{
						p: isWorkerViolations ? 0 : 2,
						pb: isWorkerViolations ? 2 : undefined,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						gap: 2,
					}}
				>
					<Box
						sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}
					>
						{title &&
							(isWorkerViolations ? (
								<h4 className="font-heading text-base font-semibold tracking-wide text-[var(--color-primary)] uppercase">
									{title}
								</h4>
							) : (
								<h3 className="heading-display mb-4 pb-1 uppercase">{title}</h3>
							))}
						{statusLegends.length > 0 && (
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 1,
									alignItems: "center",
								}}
							>
								{statusLegends.map((legend) => (
									<Box
										key={`${legend.label}-${legend.color}`}
										sx={{
											display: "inline-flex",
											alignItems: "center",
											gap: 0.75,
											px: isWorkerViolations ? 0 : 1,
											py: isWorkerViolations ? 0 : 0.5,
											borderRadius: isWorkerViolations ? 0 : 1,
											backgroundColor: isWorkerViolations
												? "transparent"
												: theme === "dark"
													? "rgba(255,255,255,0.08)"
													: "rgba(0,0,0,0.04)",
										}}
									>
										<Box
											sx={{
												width: 10,
												height: 10,
												borderRadius: "50%",
												backgroundColor: legend.color,
											}}
										/>
										<Typography
											component="span"
											sx={{ fontSize: 12, color: tableStyles.color }}
										>
											{t(legend.label, { defaultValue: legend.label })}
										</Typography>
									</Box>
								))}
							</Box>
						)}
					</Box>
					{expandAllButton && !singleExpand && (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Chip
								label={`${expandedVisibleRows.length} of ${filteredRows.length} expanded`}
								size="small"
								sx={{
									backgroundColor:
										theme === "dark"
											? "rgba(255,255,255,0.1)"
											: "rgba(0,0,0,0.1)",
									color: tableStyles.color,
								}}
							/>
							<IconButton
								onClick={handleExpandAll}
								size="small"
								sx={{ color: "#148696" }}
							>
								{filteredRows.length > 0 &&
								filteredRows.every((row) => expandedRows.has(row.id)) ? (
									<ExpandLess />
								) : (
									<ExpandMore />
								)}
							</IconButton>
						</Box>
					)}
				</Box>
			)}

			<TableContainer
				sx={{
					maxHeight: effectiveMaxHeight,
					overflowX: "auto",
					overscrollBehaviorX: "contain",
				}}
			>
				<Table
					size={dense || isWorkerViolations ? "small" : "medium"}
					stickyHeader={effectiveStickyHeader}
					sx={
						isWorkerViolations
							? {
									minWidth: 980,
									tableLayout: "fixed",
								}
							: undefined
					}
				>
					<TableHead>
						<TableRow>
							<TableCell sx={{ ...headerStyles, width: 50 }}>
								{/* Expand column header */}
							</TableCell>
							{columns.map((column) => (
								<TableCell
									align={column.align}
									key={column.id}
									sortDirection={
										sortColumn === column.id ? sortDirection : false
									}
									style={{ minWidth: column.minWidth }}
									sx={headerStyles}
								>
									{column.sortable ? (
										<TableSortLabel
											active={sortColumn === column.id}
											direction={
												sortColumn === column.id ? sortDirection : "asc"
											}
											onClick={() => handleSort(column.id)}
											sx={{
												color: "#ffffff !important",
												"&.Mui-active": { color: "#ffffff !important" },
												"& .MuiTableSortLabel-icon": {
													color: "#ffffff !important",
												},
											}}
										>
											{column.label}
										</TableSortLabel>
									) : (
										column.label
									)}
								</TableCell>
							))}
						</TableRow>
						{columnSearchEnabled &&
							(isWorkerViolations ? (
								<TableRow>
									<TableCell
										sx={{
											backgroundColor: "#ffffff",
											borderBottom: "1px solid var(--color-border)",
											py: 1,
											position: effectiveStickyHeader ? "sticky" : undefined,
											top: effectiveStickyHeader
												? HEADER_ROW_HEIGHT
												: undefined,
											width: 50,
											zIndex: effectiveStickyHeader ? 3 : undefined,
										}}
									/>
									<TableCell
										sx={{
											backgroundColor: "#ffffff",
											borderBottom: "1px solid var(--color-border)",
											px: 1.5,
											py: 1,
											position: effectiveStickyHeader ? "sticky" : undefined,
											top: effectiveStickyHeader
												? HEADER_ROW_HEIGHT
												: undefined,
											zIndex: effectiveStickyHeader ? 3 : undefined,
										}}
									>
										{renderSearchField("display_id", "Search ID", "Search ID")}
									</TableCell>
									<TableCell
										sx={{
											backgroundColor: "#ffffff",
											borderBottom: "1px solid var(--color-border)",
											px: 1.5,
											py: 1,
											position: effectiveStickyHeader ? "sticky" : undefined,
											top: effectiveStickyHeader
												? HEADER_ROW_HEIGHT
												: undefined,
											zIndex: effectiveStickyHeader ? 3 : undefined,
										}}
									>
										{renderSearchField(
											"supplier_name",
											"Search Supplier",
											"Search Supplier",
										)}
									</TableCell>
									<TableCell
										colSpan={Math.max(columns.length - 2, 1)}
										sx={{
											backgroundColor: "#ffffff",
											borderBottom: "1px solid var(--color-border)",
											px: 1.5,
											py: 1,
											position: effectiveStickyHeader ? "sticky" : undefined,
											top: effectiveStickyHeader
												? HEADER_ROW_HEIGHT
												: undefined,
											zIndex: effectiveStickyHeader ? 3 : undefined,
										}}
									>
										{renderSearchField(
											"__workerViolationDetails",
											"Search Category, Description, or Level",
											"Search Category / Description / Level…",
										)}
									</TableCell>
								</TableRow>
							) : (
								<TableRow>
									<TableCell
										sx={{
											...headerStyles,
											width: 50,
											position: effectiveStickyHeader ? "sticky" : undefined,
											top: effectiveStickyHeader
												? HEADER_ROW_HEIGHT
												: undefined,
											zIndex: effectiveStickyHeader ? 3 : undefined,
										}}
									/>
									{columns.map((column) => (
										<TableCell
											align={column.align}
											key={`${column.id}-search`}
											sx={{
												...headerStyles,
												py: 1,
												position: effectiveStickyHeader ? "sticky" : undefined,
												top: effectiveStickyHeader
													? HEADER_ROW_HEIGHT
													: undefined,
												zIndex: effectiveStickyHeader ? 3 : undefined,
											}}
										>
											<TextField
												fullWidth
												inputProps={{
													"aria-label": `Search ${column.label}`,
												}}
												onChange={(event) =>
													handleColumnSearchChange(
														column.id,
														event.target.value,
													)
												}
												placeholder={t("common.table.searchColumn", {
													label: column.label,
													defaultValue: `Search ${column.label}`,
												})}
												size="small"
												sx={{
													"& .MuiInput-root": {
														backgroundColor: "transparent",
														fontSize: 12,
													},
													"& .MuiInput-root:before": {
														borderBottomColor: "rgba(255,255,255,0.55)",
													},
													"& .MuiInput-root:hover:not(.Mui-disabled):before": {
														borderBottomColor: "rgba(255,255,255,0.9)",
													},
													"& .MuiInput-root:after": {
														borderBottomColor: "#ffffff",
													},
													"& .MuiInputBase-input": {
														color: "#ffffff",
														py: 0.5,
														px: 0,
													},
													"& .MuiInputBase-input::placeholder": {
														opacity: 0.8,
														color: "rgba(255,255,255,0.85)",
													},
												}}
												value={columnSearches[column.id] || ""}
												variant="standard"
											/>
										</TableCell>
									))}
								</TableRow>
							))}
					</TableHead>
					<TableBody>
						{isLoading && paginatedRows.length === 0 ? (
							<TableRow>
								<TableCell
									align="center"
									colSpan={columns.length + 1}
									sx={{ borderBottom: 0, py: 8 }}
								>
									<CircularProgress
										aria-label={t("common.loading", {
											defaultValue: "Loading",
										})}
										size={28}
										sx={{ color: "var(--color-secondary)" }}
									/>
								</TableCell>
							</TableRow>
						) : errorMessage ? (
							<TableRow>
								<TableCell
									align="center"
									colSpan={columns.length + 1}
									sx={{ borderBottom: 0, py: 8 }}
								>
									<div className="mx-auto max-w-md text-sm text-[var(--color-body)]">
										<p role="alert">{errorMessage}</p>
										{onRetry && (
											<button
												aria-label={t("common.retry", {
													defaultValue: "Try again",
												})}
												className="cascade-btn cascade-btn--alt2 mt-4"
												onClick={onRetry}
												type="button"
											>
												{t("common.retry", {
													defaultValue: "Try again",
												})}
											</button>
										)}
									</div>
								</TableCell>
							</TableRow>
						) : paginatedRows.length === 0 ? (
							<TableRow>
								<TableCell
									align="center"
									colSpan={columns.length + 1}
									sx={{ borderBottom: 0, py: 8 }}
								>
									<Typography
										sx={{
											color: "var(--color-caption)",
											fontSize: 14,
										}}
									>
										{emptyMessage ||
											t("common.table.noResults", {
												defaultValue: "No violations found",
											})}
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							paginatedRows.map((row) => {
								const isExpanded = expandedRows.has(row.id);
								const hasExpandableContent =
									row.expandable !== false &&
									(row.expandedContent || renderExpandedContent);

								return (
									<React.Fragment key={row.id}>
										{/* Main row */}
										<TableRow
											aria-controls={
												hasExpandableContent ? getPanelId(row.id) : undefined
											}
											aria-expanded={
												hasExpandableContent ? isExpanded : undefined
											}
											hover
											onClick={() => {
												if (hasExpandableContent) {
													handleExpandRow(row.id);
												}
												onRowClick?.(row);
											}}
											onKeyDown={(event) => {
												if (
													hasExpandableContent &&
													(event.key === "Enter" || event.key === " ")
												) {
													event.preventDefault();
													handleExpandRow(row.id);
												}
											}}
											ref={(node: HTMLTableRowElement | null) => {
												if (node) rowRefs.current.set(row.id, node);
												else rowRefs.current.delete(row.id);
											}}
											sx={{
												cursor:
													hasExpandableContent || onRowClick
														? "pointer"
														: "default",
												transition:
													"background-color 150ms ease, box-shadow 150ms ease",
												...(isWorkerViolations
													? {
															"&:hover": {
																backgroundColor:
																	theme === "dark"
																		? "rgba(255,255,255,0.04)"
																		: "#f8fafc",
															},
														}
													: {
															...(isExpanded && {
																backgroundColor:
																	theme === "dark"
																		? "rgba(20, 134, 150, 0.18)"
																		: "rgba(20, 134, 150, 0.08)",
																boxShadow: "inset 3px 0 0 0 #148696",
															}),
															"&:hover": {
																backgroundColor: isExpanded
																	? theme === "dark"
																		? "rgba(20, 134, 150, 0.22)"
																		: "rgba(20, 134, 150, 0.12)"
																	: theme === "dark"
																		? "rgba(26, 174, 195, 0.2)"
																		: "rgba(26, 174, 195, 0.08)",
															},
														}),
												"&:focus-visible": {
													outline: "2px solid var(--color-secondary)",
													outlineOffset: "-2px",
												},
											}}
											tabIndex={hasExpandableContent ? 0 : undefined}
										>
											{/* Expand/Collapse button */}
											<TableCell sx={cellStyles}>
												{hasExpandableContent &&
													(isWorkerViolations ? (
														<IconButton
															aria-label={
																isExpanded ? "Collapse row" : "Expand row"
															}
															onClick={(e) => {
																e.stopPropagation();
																handleExpandRow(row.id);
															}}
															size="small"
															sx={{ color: "#94a3b8" }}
														>
															{isExpanded ? (
																<ChevronDown size={14} />
															) : (
																<ChevronRight size={14} />
															)}
														</IconButton>
													) : (
														<IconButton
															aria-label={
																isExpanded ? "Collapse row" : "Expand row"
															}
															onClick={(e) => {
																e.stopPropagation();
																handleExpandRow(row.id);
															}}
															size="small"
															sx={{
																color: "#148696",
																transition: "transform 200ms ease",
																transform: isExpanded
																	? "rotate(90deg)"
																	: "rotate(0deg)",
															}}
														>
															<KeyboardArrowRight />
														</IconButton>
													))}
											</TableCell>

											{/* Data columns */}
											{columns.map((column) => {
												const value = row[column.id];
												const renderedValue = column.format
													? column.format(value, row)
													: value;
												const shouldClamp =
													isWorkerViolations &&
													typeof renderedValue !== "object";
												return (
													<TableCell
														align={column.align}
														key={column.id}
														sx={{
															...cellStyles,
															...(isWorkerViolations && {
																maxWidth:
																	column.id === "description"
																		? 280
																		: column.minWidth,
																overflow: "hidden",
															}),
														}}
													>
														{shouldClamp ? (
															<span
																className={
																	column.id === "description"
																		? "line-clamp-2"
																		: "block truncate"
																}
																title={String(renderedValue ?? "")}
															>
																{renderedValue}
															</span>
														) : (
															renderedValue
														)}
													</TableCell>
												);
											})}
										</TableRow>

										{/* Expanded content row */}
										{hasExpandableContent && (
											<TableRow>
												<TableCell
													colSpan={columns.length + 1}
													id={getPanelId(row.id)}
													style={{ paddingBottom: 0, paddingTop: 0 }}
													sx={{ border: 0 }}
												>
													<Collapse
														in={isExpanded}
														// Reveal once the panel has finished opening: its
														// height is still animating before that, so an
														// earlier measurement scrolls to the wrong place.
														// Anchoring on the trigger row keeps the row and
														// the top of its panel on screen together.
														onEntered={() => {
															revealElement(rowRefs.current.get(row.id), {
																offsetTop: getStickyHeaderOffset(),
															});
														}}
														timeout="auto"
														unmountOnExit
													>
														<Box
															sx={{ mx: 1.5, my: 1, ...expandedContentStyles }}
														>
															{typeof row.expandedContent === "function"
																? row.expandedContent(row)
																: row.expandedContent ||
																	renderExpandedContent?.(row)}
														</Box>
													</Collapse>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Pagination */}
			{!errorMessage &&
				(isWorkerViolations ? (
					<div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5 text-[11px] text-slate-500">
						<label className="flex items-center gap-1.5">
							{t("common.table.rowsPerPage", {
								defaultValue: "Rows per page:",
							})}
							<select
								className="rounded border-none bg-transparent text-[11px] focus:outline-none"
								disabled={isExternalPagination}
								onChange={(event) => {
									setRowsPerPage(+event.target.value);
									if (isExternalPagination) onPageChange?.(1);
									else setInternalPage(0);
								}}
								value={effectiveRowsPerPage}
							>
								{[5, 10, 25, 50].map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</label>
						<div className="flex items-center gap-2">
							<span>
								{paginationRangeStart}–{paginationRangeEnd} of {paginationCount}
							</span>
							<button
								aria-label="Previous page"
								className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
								disabled={currentPageIndex === 0}
								onClick={(event) =>
									handleChangePage(event, currentPageIndex - 1)
								}
								type="button"
							>
								<ChevronLeft size={14} />
							</button>
							<button
								aria-label="Next page"
								className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
								disabled={isLastPage}
								onClick={(event) =>
									handleChangePage(event, currentPageIndex + 1)
								}
								type="button"
							>
								<ChevronRight size={14} />
							</button>
						</div>
					</div>
				) : (
					<TablePagination
						component="div"
						count={paginationCount}
						labelRowsPerPage={t("common.table.rowsPerPage", {
							defaultValue: "Rows per page:",
						})}
						onPageChange={handleChangePage}
						onRowsPerPageChange={
							isExternalPagination ? undefined : handleChangeRowsPerPage
						}
						page={currentPageIndex}
						rowsPerPage={isExternalPagination ? pageSize : rowsPerPage}
						rowsPerPageOptions={isExternalPagination ? [] : [5, 10, 25, 50]}
						sx={{
							color: tableStyles.color,
							"& .MuiTablePagination-selectIcon": {
								color: tableStyles.color,
							},
							"& .MuiSvgIcon-root": {
								color: tableStyles.color,
							},
						}}
					/>
				))}

			{/* Loading overlay for external pagination */}
			{isLoading && paginatedRows.length > 0 && (
				<Backdrop
					open={isLoading}
					sx={{
						position: "absolute",
						zIndex: (theme) => theme.zIndex.drawer + 1,
						backgroundColor: "rgba(0, 0, 0, 0.3)",
						borderRadius: "10px",
					}}
				>
					<CircularProgress sx={{ color: "#148696" }} />
				</Backdrop>
			)}
		</Paper>
	);
};

export default CollapsibleDataTable;
