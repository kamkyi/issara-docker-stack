import { Slider } from "@mui/material";
import { Text } from "@radix-ui/themes";
import type { FC } from "react";
import MuiMultiSelectDropdown from "$src/components/business/MuiMultiSelectDropdown";

// import styles from "./InteractiveMap.module.css";

interface MobileFilterModalProps {
	isOpen: boolean;
	onClose: () => void;
	supplierSearchText: string;
	onSupplierSearchChange: (value: string) => void;
	selectedIndustryNames: string[];
	onIndustryChange: (ids: number[]) => void;
	industryList: { id: number; name: string }[];
	allIndustries: string[];
	workerRange: [number, number];
	onWorkerRangeChange: (range: [number, number]) => void;
	// moreFilters: boolean;
	// onMoreFiltersToggle: () => void;
	// onFindClick: () => void;
}

export const MobileFilterModal: FC<MobileFilterModalProps> = ({
	isOpen,
	onClose,
	supplierSearchText,
	onSupplierSearchChange,
	selectedIndustryNames,
	onIndustryChange,
	industryList,
	allIndustries,
	workerRange,
	onWorkerRangeChange,
	// moreFilters,
	// onMoreFiltersToggle,
	// onFindClick,
}) => {
	if (!isOpen) return null;

	return (
		<>
			{/* Modal Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 z-[999] md:hidden"
				onClick={onClose}
				style={{ transition: "opacity 0.3s ease" }}
			/>

			{/* Modal Content - Slides from top */}
			<div
				aria-modal="true"
				className="fixed left-0 right-0 md:hidden z-[1000]"
				role="dialog"
				style={{
					top: 0,
					background: "white",
					borderBottomLeftRadius: "12px",
					borderBottomRightRadius: "12px",
					boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
					animation: "slideDown 0.3s ease",
					maxHeight: "90vh",
					overflowY: "auto",
				}}
			>
				<style>{`
					@keyframes slideDown {
						from {
							transform: translateY(-100%);
							opacity: 0;
						}
						to {
							transform: translateY(0);
							opacity: 1;
						}
					}
				`}</style>

				{/* Close Button */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "1rem",
						borderBottom: "1px solid #e5e7eb",
						position: "sticky",
						top: 0,
						background: "white",
						zIndex: 1001,
					}}
				>
					<Text size="4" weight="bold">
						Filters
					</Text>
					<button
						onClick={onClose}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = "#f3f4f6";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "none";
						}}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "0.5rem",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "4px",
							transition: "background 0.2s",
							fontSize: "24px",
							lineHeight: 1,
						}}
						type="button"
					>
						×
					</button>
				</div>

				{/* Filter Content */}
				<div style={{ padding: "1rem" }}>
					{/* Search Box */}
					<div style={{ marginBottom: "1.5rem" }}>
						<Text as="label" className="block mb-2" size="2" weight="medium">
							Search Suppliers
						</Text>
						<input
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#32b2c3] focus:border-transparent"
							onChange={(e) => onSupplierSearchChange(e.target.value)}
							placeholder="Search by supplier name..."
							type="text"
							value={supplierSearchText}
						/>
					</div>

					{/* Industries Filter */}
					<div style={{ marginBottom: "1.5rem" }}>
						<MuiMultiSelectDropdown
							items={industryList}
							label="Industry"
							onChange={(ids) => {
								onIndustryChange(ids as number[]);
							}}
							placeholder="Select industries..."
							selectedIds={selectedIndustryNames.map((name) =>
								allIndustries.indexOf(name),
							)}
						/>
					</div>

					{/* Workers Range Filter */}
					<div style={{ marginBottom: "1.5rem" }}>
						<Text as="label" className="block mb-2" size="2" weight="medium">
							Number of Workers
						</Text>
						<div style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem" }}>
							<Slider
								marks={[
									{ value: 0, label: "0" },
									{ value: 5000, label: "5K" },
									{ value: 10000, label: "10K" },
									{ value: 15000, label: "15K" },
									{ value: 20000, label: "20K" },
								]}
								max={20000}
								min={0}
								onChange={(_, value) => {
									if (Array.isArray(value)) {
										onWorkerRangeChange([value[0], value[1]]);
									}
								}}
								size="small"
								step={50}
								value={workerRange}
							/>
						</div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								marginTop: "0.75rem",
								fontSize: "12px",
								color: "#666",
							}}
						>
							<span>Min: {workerRange[0].toLocaleString()}</span>
							<span>Max: {workerRange[1].toLocaleString()}</span>
						</div>
					</div>

					{/* Urgent privacy request: hide Find Suppliers control.
					<button
						className="btn btn-primary w-full"
						onClick={() => {
							onFindClick();
							onClose();
						}}
						style={{ marginBottom: "0.5rem" }}
						type="button"
					>
						Find Suppliers
					</button>
					*/}

					{/* Urgent privacy request: hide More Filters toggle.
					<button
						className={styles.moreFiltersToggle}
						onClick={onMoreFiltersToggle}
						style={{ marginBottom: "1rem" }}
						type="button"
					>
						{moreFilters ? "Hide filters" : "More filters"}
					</button>
					*/}

					{/* Urgent privacy request: hide More Filters content.
					{moreFilters && (
						<div className="mt-3" style={{ marginBottom: "1rem" }}>
							<div className={styles.filterLabel}>Extra filters</div>
							<div className="text-sm text-slate-600">
								(placeholder for range, status, etc.)
							</div>
						</div>
					)}
					*/}

					{/* Close Button at Bottom */}
					<button
						onClick={onClose}
						style={{
							width: "100%",
							padding: "0.75rem",
							background: "#f3f4f6",
							color: "#374151",
							border: "none",
							borderRadius: "6px",
							cursor: "pointer",
							fontWeight: 600,
							transition: "all 0.2s ease",
						}}
						type="button"
					>
						Close Filters
					</button>
				</div>
			</div>
		</>
	);
};
