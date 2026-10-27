import Paper from "@mui/material/Paper";
import {
	DataGrid,
	type GridColDef,
	type GridValidRowModel,
} from "@mui/x-data-grid";
import { useTheme } from "next-themes";
import { useState } from "react";

interface DataTableProps {
	columns: GridColDef[];
	rows: unknown[];
	pageSize?: number;
	dense?: boolean;
	autoHeight?: boolean;
	columnHeaderHeight?: number;
}

const DataTable = (props: DataTableProps) => {
	const {
		columns,
		rows,
		pageSize = 20,
		dense,
		autoHeight = true,
		columnHeaderHeight,
	} = props;
	const { theme } = useTheme();
	const [paginationModel, setPaginationModel] = useState({
		page: 0,
		pageSize,
	});

	return (
		<Paper
			sx={{
				width: "100%",
				background: "none",
				boxShadow: "none",
				borderRadius: 5,
			}}
		>
			<DataGrid
				columnHeaderHeight={columnHeaderHeight}
				columns={columns}
				disableRowSelectionOnClick
				getEstimatedRowHeight={() => 52}
				getRowHeight={() => (autoHeight && !dense ? "auto" : undefined)}
				hideFooterSelectedRowCount
				onPaginationModelChange={setPaginationModel}
				pageSizeOptions={[10, 20, 30]}
				paginationModel={paginationModel}
				rowHeight={dense ? 28 : undefined}
				rows={rows as GridValidRowModel[]}
				style={{
					background: theme === "dark" ? "#004A60" : "#ffffff",
					color: theme === "dark" ? "#9d9d9d" : "#3d3d3d",
					borderRadius: 2,
				}}
				sx={{
					border: 0,
					"& .MuiDataGrid-columnHeader": {
						backgroundColor: "#148696 !important", // dark teal for dark mode, light gray for light mode
					},
					"& .MuiDataGrid-columnHeaderTitle": {
						fontWeight: "bold",
						color: "#ffffff !important",
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
						borderTop: "1px solid RGBA(26, 174, 195,0.2)",
						whiteSpace: "normal",
						wordWrap: "break-word",
						lineHeight: "1.4",
						padding: "4px",
						display: "flex",
						alignItems: "flex-start",
					},
					"& .MuiDataGrid-row:hover": {
						backgroundColor: "RGBA(26, 174, 195,0.2)",
					},
					"& .MuiDataGrid-row:active": {
						backgroundColor: "RGBA(26, 174, 195,0.2)",
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

export default DataTable;
