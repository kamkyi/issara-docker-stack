// Company Supply Chain Component Types

export interface SupplierKPISummary {
	totalSuppliers: number;
	openCases: number;
	closedCases: number;
}

export interface SummaryOpenOrClosedCardProps {
	summary: SupplierKPISummary;
	title: string;
	type: "open" | "closed";
}

export interface CategoryKPIsBySupplierChartProps {
	supplierId?: number;
	categoryId?: number;
	data?: Array<{
		category: string;
		score: number;
		maxScore: number;
	}>;
	title?: string;
}
