import type React from "react";
import FilterColumn, { type FilterSection } from "./FilterColumn";

interface SupplyChainFilterColumnProps {
	// Business Types
	selectedBusinessTypes: (string | number)[];
	onBusinessTypesChange: (ids: (string | number)[]) => void;

	// Countries
	selectedCountries: (string | number)[];
	onCountriesChange: (ids: (string | number)[]) => void;
	countryOptions: { id: string | number; label: string }[];

	// Industries
	selectedIndustries: (string | number)[];
	onIndustriesChange: (ids: (string | number)[]) => void;
	industryOptions: { id: string | number; label: string }[];

	// Sub-Industries
	selectedSubIndustries: (string | number)[];
	onSubIndustriesChange: (ids: (string | number)[]) => void;
	subIndustryOptions: { id: string | number; label: string }[];

	// Suppliers
	selectedSuppliers?: (string | number)[];
	onSuppliersChange?: (ids: (string | number)[]) => void;
	supplierOptions?: { id: string | number; label: string }[];

	// Supply Chains
	selectedSupplyChains?: (string | number)[];
	onSupplyChainsChange?: (ids: (string | number)[]) => void;
	supplyChainOptions?: { id: string | number; label: string }[];

	// Clear all callback
	onClearAll?: () => void;

	// Customization
	title?: string;
	className?: string;
}

const SupplyChainFilterColumn: React.FC<SupplyChainFilterColumnProps> = ({
	selectedBusinessTypes,
	onBusinessTypesChange,
	selectedCountries,
	onCountriesChange,
	countryOptions,
	selectedIndustries,
	onIndustriesChange,
	industryOptions,
	selectedSubIndustries,
	onSubIndustriesChange,
	subIndustryOptions,
	selectedSuppliers = [],
	onSuppliersChange,
	supplierOptions = [],
	selectedSupplyChains = [],
	onSupplyChainsChange,
	supplyChainOptions = [],
	onClearAll,
	title = "Supply Chain Filters",
	className = "",
}) => {
	// Build filter sections dynamically
	const filterSections: FilterSection[] = [
		{
			title: "Business Type",
			options: [
				{ id: "supplier", label: "Supplier" },
				{ id: "recruitment", label: "Recruitment Agency" },
			],
			selectedIds: selectedBusinessTypes,
			onChange: onBusinessTypesChange,
			multiSelect: true,
		},
		{
			title: "Country",
			options: countryOptions,
			selectedIds: selectedCountries,
			onChange: onCountriesChange,
			multiSelect: true,
		},
		{
			title: "Industry",
			options: industryOptions,
			selectedIds: selectedIndustries,
			onChange: onIndustriesChange,
			multiSelect: true,
		},
		{
			title: "Sub-Industry",
			options: subIndustryOptions,
			selectedIds: selectedSubIndustries,
			onChange: onSubIndustriesChange,
			multiSelect: true,
		},
	];

	// Add suppliers section if provided
	if (supplierOptions.length > 0 && onSuppliersChange) {
		filterSections.push({
			title: "Suppliers",
			options: supplierOptions,
			selectedIds: selectedSuppliers,
			onChange: onSuppliersChange,
			multiSelect: true,
		});
	}

	// Add supply chains section if provided
	if (supplyChainOptions.length > 0 && onSupplyChainsChange) {
		filterSections.push({
			title: "Supply Chains",
			options: supplyChainOptions,
			selectedIds: selectedSupplyChains,
			onChange: onSupplyChainsChange,
			multiSelect: true,
		});
	}

	return (
		<FilterColumn
			className={className}
			onClearAll={onClearAll}
			sections={filterSections}
			title={title}
		/>
	);
};

export default SupplyChainFilterColumn;
