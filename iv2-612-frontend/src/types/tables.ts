// Table Component Types

export interface DataTableProps {
	data: any[];
	columns: Array<{
		key: string;
		label: string;
		sortable?: boolean;
		render?: (value: any, row: any) => React.ReactNode;
	}>;
	onRowClick?: (row: any) => void;
	loading?: boolean;
	emptyMessage?: string;
}

export interface FilterOption {
	id: string;
	label: string;
	count?: number;
	checked: boolean;
}

export interface FilterSection {
	id: string;
	title: string;
	options: FilterOption[];
	searchable?: boolean;
	collapsible?: boolean;
}

export interface FilterColumnProps {
	sections: FilterSection[];
	onFilterChange: (
		sectionId: string,
		optionId: string,
		checked: boolean,
	) => void;
	onClearAll?: () => void;
}

export interface DataTableFilterBarProps {
	filters: {
		search?: string;
		dateRange?: {
			start: string;
			end: string;
		};
		status?: string[];
		category?: string[];
	};
	onFilterChange: (filters: any) => void;
	onClearFilters: () => void;
}

export interface FilterProps {
	label: string;
	value: any;
	onChange: (value: any) => void;
	type: "search" | "date" | "select" | "multiselect";
	options?: Array<{ value: string; label: string }>;
}

export interface CollapsibleColumn {
	key: string;
	label: string;
	sortable?: boolean;
	width?: string;
	render?: (value: any, row: any) => React.ReactNode;
}

export interface CollapsibleRowData {
	id: string | number;
	[key: string]: any;
	children?: CollapsibleRowData[];
	isExpanded?: boolean;
}

export interface CollapsibleDataTableProps {
	data: CollapsibleRowData[];
	columns: CollapsibleColumn[];
	onRowClick?: (row: CollapsibleRowData) => void;
	defaultExpanded?: boolean;
	loading?: boolean;
}

export interface SupplyChainFilterColumnProps {
	filters: {
		tiers: FilterOption[];
		countries: FilterOption[];
		status: FilterOption[];
	};
	onFilterChange: (
		category: string,
		optionId: string,
		checked: boolean,
	) => void;
}
