import Paper from "@mui/material/Paper";
import {
	DataGrid,
	type GridColDef,
	type GridPaginationModel,
	type GridValidRowModel,
} from "@mui/x-data-grid";
import { useTheme } from "next-themes";
import {
	type MouseEvent as ReactMouseEvent,
	useEffect,
	useMemo,
	useState,
} from "react";

interface ServerPaginatedDataTableProps {
	columns: GridColDef[];
	rows: unknown[];
	dense?: boolean;
	autoHeight?: boolean;
	paginationModel: GridPaginationModel;
	onPaginationModelChange: (model: GridPaginationModel) => void;
	rowCount: number;
	pageSizeOptions?: number[];
	/** Fired with the row id under the cursor, or null when the mouse leaves the table */
	onRowHover?: (id: GridValidRowModel["id"] | null) => void;
	/** Fired with the row id when the user clicks a row */
	onRowClick?: (id: GridValidRowModel["id"]) => void;
	/** Row id to visually highlight, e.g. the supplier currently hovered/clicked on the map */
	highlightedRowId?: GridValidRowModel["id"] | null;
	/**
	 * Current per-column search terms, keyed by column `field`. Supplying this
	 * (together with `onColumnSearchChange`) renders a search box under each
	 * searchable column header. Filtering is the caller's job — it is expected to
	 * be server-side, so results span the whole dataset rather than the page.
	 */
	columnSearch?: Record<string, string>;
	onColumnSearchChange?: (next: Record<string, string>) => void;
	/** Columns that get a search box; defaults to every column when omitted. */
	searchableFields?: string[];
}

/** Keystrokes are debounced by this much before a request goes out. */
const SEARCH_DEBOUNCE_MS = 300;

const ServerPaginatedDataTable = (props: ServerPaginatedDataTableProps) => {
	const {
		columns,
		rows,
		dense,
		autoHeight = true,
		paginationModel,
		onPaginationModelChange,
		rowCount,
		pageSizeOptions = [10, 20, 30],
		onRowHover,
		onRowClick,
		highlightedRowId,
		columnSearch,
		onColumnSearchChange,
		searchableFields,
	} = props;
	const { theme } = useTheme();
	const searchEnabled = Boolean(columnSearch && onColumnSearchChange);

	// Typing stays local so the inputs never lag behind the keyboard; the parent
	// (and therefore the request) is only updated once typing pauses.
	const [draftSearch, setDraftSearch] = useState<Record<string, string>>(
		columnSearch ?? {},
	);

	useEffect(() => {
		setDraftSearch(columnSearch ?? {});
	}, [columnSearch]);

	useEffect(() => {
		if (!onColumnSearchChange) return;
		const timer = setTimeout(() => {
			const current = columnSearch ?? {};
			const fields = new Set([
				...Object.keys(current),
				...Object.keys(draftSearch),
			]);
			const changed = [...fields].some(
				(field) => (current[field] ?? "") !== (draftSearch[field] ?? ""),
			);
			if (changed) onColumnSearchChange(draftSearch);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draftSearch, columnSearch, onColumnSearchChange]);

	const searchColumns = useMemo(() => {
		if (!searchEnabled) return columns;
		const allowed = searchableFields ? new Set(searchableFields) : null;
		return columns.map((column) => {
			if (allowed && !allowed.has(column.field)) return column;
			return {
				...column,
				sortable: false,
				renderHeader: () => (
					<div className="flex flex-col gap-1 w-full py-2">
						<span className="MuiDataGrid-columnHeaderTitle">
							{column.headerName ?? column.field}
						</span>
						<input
							aria-label={`Search ${column.headerName ?? column.field}`}
							className="w-full rounded border border-white/30 bg-white/15 px-2 py-1 text-[11px] font-normal normal-case tracking-normal text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/70"
							onChange={(event) =>
								setDraftSearch((prev) => ({
									...prev,
									[column.field]: event.target.value,
								}))
							}
							onClick={(event) => event.stopPropagation()}
							placeholder="Search…"
							value={draftSearch[column.field] ?? ""}
						/>
					</div>
				),
			} satisfies GridColDef;
		});
	}, [columns, searchEnabled, searchableFields, draftSearch]);
	const handlePaginationModelChange = (model: GridPaginationModel) => {
		onPaginationModelChange(model);
	};

	const handleMouseOver = (event: ReactMouseEvent<HTMLDivElement>) => {
		const rowEl = (event.target as HTMLElement).closest<HTMLElement>(
			".MuiDataGrid-row",
		);
		if (rowEl && onRowClick && !rowEl.hasAttribute("title")) {
			rowEl.setAttribute("title", "Click to view on map");
		}
		if (!onRowHover) return;
		const id = rowEl?.getAttribute("data-id");
		if (id != null) onRowHover(id);
	};

	const handleMouseLeave = () => {
		onRowHover?.(null);
	};

	const getRowClassName = (params: { id: GridValidRowModel["id"] }) =>
		highlightedRowId != null && String(params.id) === String(highlightedRowId)
			? "row-highlighted"
			: "";

	return (
		<Paper
			onMouseLeave={handleMouseLeave}
			onMouseOver={handleMouseOver}
			sx={{
				width: "100%",
				height: "100%",
				background: "none",
				boxShadow: "none",

				borderRadius: 5,
			}}
		>
			<DataGrid
				columnHeaderHeight={searchEnabled ? 92 : 56}
				columns={searchColumns}
				disableRowSelectionOnClick
				getEstimatedRowHeight={() => 52}
				getRowClassName={getRowClassName}
				getRowHeight={() => (autoHeight && !dense ? "auto" : undefined)}
				hideFooterSelectedRowCount
				onPaginationModelChange={handlePaginationModelChange}
				onRowClick={(params) => onRowClick?.(params.id)}
				pageSizeOptions={pageSizeOptions}
				paginationMode="server"
				paginationModel={paginationModel}
				rowCount={rowCount}
				rowHeight={dense ? 28 : undefined}
				rows={rows as GridValidRowModel[]}
				slotProps={{
					row: {
						title: onRowClick ? "Click to view on map" : undefined,
					} as any,
				}}
				style={{
					background: theme === "dark" ? "#003A4B" : "#ffffff",
					color: theme === "dark" ? "#e4e4e4" : "#333333",
					borderRadius: 8,
				}}
				sx={{
					border: 0,
					"& .MuiDataGrid-columnHeader": {
						backgroundColor:
							theme === "dark" ? "#003A4B !important" : "#004A60 !important",
						borderBottom: "none",
					},
					"& .MuiDataGrid-columnHeaderTitle": {
						fontWeight: "600",
						color: "#ffffff !important",
						textTransform: "uppercase",
						fontSize: "12px",
						letterSpacing: "0.5px",
					},
					"& .MuiDataGrid-menuList": {
						backgroundColor:
							theme === "dark" ? "#004A60 !important" : "#ffffff !important",
						color:
							theme === "dark" ? "#e4e4e4 !important" : "#333333 !important",
					},
					"& .MuiMenuItem-root": {
						color:
							theme === "dark" ? "#e4e4e4 !important" : "#333333 !important",
						"&:hover": {
							backgroundColor:
								theme === "dark" ? "#148696 !important" : "#f5f5f5 !important",
						},
					},
					"& .MuiDataGrid-cell": {
						color: theme === "dark" ? "#d4d4d4" : "#333333",
						borderBottom:
							theme === "dark" ? "1px solid #004A60" : "1px solid #F1F5F9",
						borderTop: "none",
						whiteSpace: "normal",
						wordWrap: "break-word",
						lineHeight: "1.5",
						// padding: "12px 16px",
						display: "flex",
						alignItems: "center",
					},
					"& .MuiDataGrid-row:hover": {
						backgroundColor:
							theme === "dark" ? "RGBA(26, 174, 195,0.15)" : "#F8FAFC",
						cursor: onRowClick ? "pointer" : "default",
					},
					"& .MuiDataGrid-row:active": {
						backgroundColor:
							theme === "dark" ? "RGBA(26, 174, 195,0.2)" : "#F1F5F9",
					},
					"& .MuiDataGrid-row.row-highlighted": {
						backgroundColor: "RGBA(20, 134, 150, 0.1) !important",
						boxShadow: "inset 4px 0 0 0 #148696",
					},
					"& .MuiDataGrid-sortButton": {
						color: "#e4e4e4",
					},
					"& .MuiDataGrid-menuIcon": {
						position: "absolute",
						right: 0,
						top: 14,
					},
					"& .MuiDataGrid-menuIconButton": {
						color: "#e4e4e4",
					},
					"& .MuiTablePagination-toolbar": {
						color: theme === "dark" ? "#e4e4e4" : "#333333",
					},
					"& .MuiTablePagination-selectIcon": {
						color: theme === "dark" ? "#e4e4e4" : "#333333",
					},
					"& .MuiSvgIcon-fontSizeMedium": {
						color: theme === "dark" ? "#e4e4e4" : "#333333",
					},
				}}
			/>
		</Paper>
	);
};

export default ServerPaginatedDataTable;
