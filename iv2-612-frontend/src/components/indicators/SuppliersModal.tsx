import type { GridColDef } from "@mui/x-data-grid";
import { Card } from "@radix-ui/themes";
import { useEffect, useMemo } from "react";
import DataTable from "../tables/DataTable";

interface SuppliersModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	suppliers: {
		completed?: string[];
		not_yet_initiated?: string[];
		partial_progress?: string[];
	};
}

export const SuppliersModal = ({
	isOpen,
	onClose,
	title,
	suppliers,
}: SuppliersModalProps) => {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "Completed":
				return "bg-[#148696] text-white";
			case "Partial Progress":
				return "bg-[#ffe599] text-gray-800";
			case "Not Yet Initiated":
				return "bg-[#b7b7b7] text-white";
			default:
				return "bg-gray-200 text-gray-800";
		}
	};

	// Prepare table data with unique IDs
	const tableData = useMemo(() => {
		const data: Array<{ id: number; supplier: string; status: string }> = [];
		let idCounter = 0;

		if (suppliers.completed) {
			suppliers.completed.forEach((supplier) => {
				data.push({ id: idCounter++, supplier, status: "Completed" });
			});
		}

		if (suppliers.partial_progress) {
			suppliers.partial_progress.forEach((supplier) => {
				data.push({ id: idCounter++, supplier, status: "Partial Progress" });
			});
		}

		if (suppliers.not_yet_initiated) {
			suppliers.not_yet_initiated.forEach((supplier) => {
				data.push({ id: idCounter++, supplier, status: "Not Yet Initiated" });
			});
		}

		return data;
	}, [suppliers]);

	// Define columns for DataTable
	const columns: GridColDef[] = useMemo(
		() => [
			{
				field: "supplier",
				headerName: "Supplier Name",
				flex: 1,
				minWidth: 200,
			},
			{
				field: "status",
				headerName: "Status",
				width: 200,
				renderCell: (params) => (
					<span
						className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(params.value as string)}`}
					>
						{params.value}
					</span>
				),
			},
		],
		[],
	);

	// Close modal on ESC key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
			onClick={onClose}
		>
			<Card
				className=" rounded-md shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col bg-gray-100"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 ">
					<p className="text-xl font-bold text-gray-800">{title}</p>
					<button
						className="text-gray-500 hover:text-gray-700 transition-colors"
						onClick={onClose}
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-6">
					{tableData.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No suppliers data available
						</div>
					) : (
						<DataTable columns={columns} pageSize={10} rows={tableData} />
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end p-6">
					<button
						className="px-6 py-2 bg-[#148696] text-white rounded hover:bg-[#0d6b78] transition-colors"
						onClick={onClose}
					>
						CLOSE
					</button>
				</div>
			</Card>
		</div>
	);
};
