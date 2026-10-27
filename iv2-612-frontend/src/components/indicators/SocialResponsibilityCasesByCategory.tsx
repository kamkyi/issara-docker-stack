import { Heading, Select } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { statusColorPalette } from "$src/assets/mock/common-data";
import chartData from "$src/assets/mock/our-workplace.json";
import type { SocialResponsibilityFilters } from "$src/hooks/useSocialResponsibility";
import { useSupplierKPIs } from "$src/hooks/useSupplyChain";
import { useMockData } from "$src/utils/config";

interface CategoryData {
	category: string;
	openCases: number;
	closedCases: number;
}

const stripLaborPrefix = (s: string) => s.replace(/^Labor\s*-\s*/i, "");

const KPI_CATEGORIES = [
	{ id: 1, name: "Recruitment" },
	{ id: 4, name: "Wages" },
	{ id: 5, name: "Labor - Working conditions" },
	{ id: 8, name: "Labor - Employer-employee relations" },
	{ id: 9, name: "Labor - Living and eating conditions" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-[350px]">
				<p className="font-bold text-gray-800 mb-2 whitespace-normal break-words leading-tight">
					{label}
				</p>
				{payload.map((entry: any, index: number) => (
					<p
						className="text-sm font-medium"
						key={`item-${index}`}
						style={{ color: entry.color }}
					>
						{entry.name}: {entry.value}
					</p>
				))}
				<p className="text-sm font-semibold text-gray-700 mt-2 pt-2 border-t border-gray-100">
					Total:{" "}
					{payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
				</p>
			</div>
		);
	}
	return null;
};

// Custom tick component for wrapped text labels
const CustomYAxisTick = ({ x, y, payload }: any) => {
	const text = payload.value || "";
	const maxWidth = 160; // Reduced max width to reclaim left whitespace
	const lineHeight = 14; // Line height

	// Split text into words
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	// Create a temporary canvas to measure text width
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (context) {
		context.font = "11px sans-serif";

		words.forEach((word) => {
			const testLine = currentLine ? `${currentLine} ${word}` : word;
			const metrics = context.measureText(testLine);

			if (metrics.width > maxWidth && currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		});

		if (currentLine) {
			lines.push(currentLine);
		}
	}

	// Calculate vertical offset to center the text block
	const totalHeight = lines.length * lineHeight;
	const startY = y - totalHeight / 2 + lineHeight / 2;

	// Slightly reduce left offset to use less whitespace
	return (
		<g transform={`translate(${x},${startY})`}>
			{lines.map((line, index) => (
				<text
					dy={0}
					fill="#4b5563"
					fontSize={11}
					fontWeight={500}
					key={index}
					textAnchor="end"
					x={-6}
					y={index * lineHeight}
				>
					{line}
				</text>
			))}
		</g>
	);
};

interface SocialResponsibilityCasesByCategoryProps {
	filters?: SocialResponsibilityFilters;
	defaultCategoryId?: string;
	hideCategorySelector?: boolean;
	title?: string;
	allCategoriesLabel?: string;
}

export const SocialResponsibilityCasesByCategory = ({
	filters,
	defaultCategoryId = "5",
	hideCategorySelector = false,
	title = "Cases by Category",
	allCategoriesLabel = "All Categories",
}: SocialResponsibilityCasesByCategoryProps) => {
	const [selectedCategoryId, setSelectedCategoryId] =
		useState<string>(defaultCategoryId);

	// Check if we should use mock data
	const shouldUseMockData = useMockData();

	// Map category IDs to names for the legacy API filter
	const categoryIdToName = useMemo(() => {
		const map: Record<number, string> = {};
		for (const cat of KPI_CATEGORIES) {
			map[cat.id] = cat.name;
		}
		return map;
	}, []);

	const supplierKPIParamsOpen = useMemo(() => {
		const catId = Number.parseInt(selectedCategoryId, 10);
		const catName = categoryIdToName[catId];

		return {
			suppliers: filters?.supplierId as number[],
			has_cases: true,
			show_closed: false,
			kpi__kpi_category: catName,
		};
	}, [filters?.supplierId, selectedCategoryId, categoryIdToName]);

	const supplierKPIParamsClosed = useMemo(() => {
		const catId = Number.parseInt(selectedCategoryId, 10);
		const catName = categoryIdToName[catId];

		return {
			suppliers: filters?.supplierId as number[],
			has_cases: true,
			show_closed: true,
			kpi__kpi_category: catName,
		};
	}, [filters?.supplierId, selectedCategoryId, categoryIdToName]);

	const {
		data: kpiResponseOpen,
		isLoading: isLoadingOpen,
		error: errorOpen,
	} = useSupplierKPIs(supplierKPIParamsOpen);

	const {
		data: kpiResponseClosed,
		isLoading: isLoadingClosed,
		error: errorClosed,
	} = useSupplierKPIs(supplierKPIParamsClosed);

	const isLoading = !shouldUseMockData && (isLoadingOpen || isLoadingClosed);
	const error = !shouldUseMockData && (errorOpen || errorClosed);

	// Transform legacy KPI data to component format
	const categoryData = useMemo<CategoryData[]>(() => {
		// If using mock data, return it directly
		if (shouldUseMockData) {
			const catId = Number.parseInt(selectedCategoryId, 10);
			const catName = categoryIdToName[catId];

			// Get groupings for the selected category
			const groupings =
				(chartData.kpi_groupings_by_category as any)?.[catName] || [];

			return groupings.map((item: any) => ({
				category: item.grouping,
				openCases: item.open_cases,
				closedCases: item.closed_cases,
			}));
		}

		const openResults = kpiResponseOpen?.results ?? [];
		const closedResults = kpiResponseClosed?.results ?? [];
		const combined = openResults.concat(closedResults);

		if (combined.length === 0) return [];

		const seenIds = new Set<number>();
		const uniqueItems = combined.filter((item) => {
			if (!item.id || seenIds.has(item.id)) return false;
			seenIds.add(item.id);
			return true;
		});

		const groupMap = new Map<string, { open: number; closed: number }>();

		for (const item of uniqueItems) {
			const label = item.grouping_name || item.description || "No description";
			const isOpen = item.status === 1 || item.status === 2;
			const isClosed = item.status === 3;

			const counts = groupMap.get(label) || { open: 0, closed: 0 };
			if (isOpen) {
				counts.open += 1;
			} else if (isClosed) {
				counts.closed += 1;
			}
			groupMap.set(label, counts);
		}

		return Array.from(groupMap.entries())
			.map(([label, counts]) => ({
				category: label,
				openCases: counts.open,
				closedCases: counts.closed,
			}))
			.sort(
				(a, b) => b.openCases + b.closedCases - (a.openCases + a.closedCases),
			);
	}, [
		shouldUseMockData,
		selectedCategoryId,
		categoryIdToName,
		kpiResponseOpen,
		kpiResponseClosed,
	]);

	const totalCases = categoryData.reduce(
		(sum, item) => sum + item.openCases + item.closedCases,
		0,
	);

	const selectedCategory = KPI_CATEGORIES.find(
		(c) => c.id === Number(selectedCategoryId),
	);
	const selectedCategoryDisplayName = selectedCategory
		? stripLaborPrefix(selectedCategory.name)
		: allCategoriesLabel;

	if (isLoading) {
		return (
			<motion.div
				className="bg-white rounded-md p-6 md:p-8 mt-8 flex items-center justify-center"
				initial={{ opacity: 0, y: 20 }}
				style={{ minHeight: "500px" }}
				transition={{ duration: 0.6, delay: 0.3 }}
				viewport={{ once: true }}
				whileInView={{ opacity: 1, y: 0 }}
			>
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#148696]"></div>
					<p className="mt-4 text-gray-600">Loading cases data...</p>
				</div>
			</motion.div>
		);
	}

	if (error) {
		return (
			<motion.div
				className="bg-white rounded-md p-6 md:p-8 mt-8"
				initial={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.6, delay: 0.3 }}
				viewport={{ once: true }}
				whileInView={{ opacity: 1, y: 0 }}
			>
				<div className="text-center text-red-600">
					<p className="text-lg font-semibold">Failed to load data</p>
					<p className="text-sm mt-2">Please try again later</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			className="bg-white rounded-md p-6 md:p-8 mt-8"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.6, delay: 0.3 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-8 flex-wrap gap-4 border-b border-gray-100 pb-4">
				<div className="flex flex-col gap-1">
					<Heading className="text-[#148696]" size="6">
						{title}
					</Heading>
					<p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
						{selectedCategoryDisplayName}
					</p>
				</div>

				<div className="flex items-center gap-6 flex-wrap">
					{/* Category Filter */}
					{!hideCategorySelector && (
						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-gray-600">
								Category:
							</span>
							<Select.Root
								onValueChange={setSelectedCategoryId}
								value={selectedCategoryId}
							>
								<Select.Trigger className="min-w-[220px]" />
								<Select.Content>
									{KPI_CATEGORIES.map((cat) => (
										<Select.Item key={cat.id} value={cat.id.toString()}>
											{stripLaborPrefix(cat.name)}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
						</div>
					)}

					{/* Legend */}
					<div className="flex items-center gap-4 text-sm bg-gray-50 px-3 py-1.5 rounded-md">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-[#F2A65A] rounded-sm"></div>
							<span className="text-gray-600 font-medium">{"Open"}</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-sm"
								style={{ backgroundColor: statusColorPalette[0] }}
							></div>
							<span className="text-gray-600 font-medium">{"Closed"}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Bar Chart */}
			<div style={{ height: "600px", width: "100%" }}>
				<ResponsiveContainer height="100%" width="100%">
					<BarChart
						barCategoryGap={20}
						data={categoryData}
						layout="vertical"
						margin={{ top: 10, right: 30, left: 160, bottom: 20 }}
					>
						<CartesianGrid
							horizontal={true}
							strokeDasharray="3 3"
							vertical={false}
						/>
						<XAxis
							axisLine={false}
							tick={{ fontSize: 12, fill: "#6b7280" }}
							tickLine={false}
							type="number"
						/>
						<YAxis
							dataKey="category"
							tick={<CustomYAxisTick />}
							type="category"
							width={140}
						/>
						<Tooltip
							content={<CustomTooltip />}
							cursor={{ fill: "rgba(0,0,0,0.04)" }}
						/>
						<Bar
							dataKey="openCases"
							fill="#F2A65A"
							maxBarSize={48}
							name={"Open"}
							stackId="a"
						>
							{categoryData.map((_entry, index) => (
								<Cell fill="#F2A65A" key={`cell-open-${index}`} />
							))}
						</Bar>
						<Bar
							dataKey="closedCases"
							fill={statusColorPalette[0]}
							maxBarSize={48}
							name={"Closed"}
							radius={[0, 4, 4, 0]}
							stackId="a"
						>
							{categoryData.map((_entry, index) => (
								<Cell
									fill={statusColorPalette[0]}
									key={`cell-closed-${index}`}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Total Statistics */}
			<div className="border-t border-gray-100 flex items-center justify-center gap-8 py-4">
				<div className="text-center">
					<p className="text-2xl font-bold text-gray-900">
						{totalCases.toLocaleString()}
					</p>
					<p className="text-xs text-gray-500 uppercase font-semibold">
						Total Cases Detected
					</p>
				</div>
				<div className="w-px h-10 bg-gray-200"></div>
				<div className="text-center">
					<p className="text-2xl font-bold text-[#F2A65A]">
						{categoryData
							.reduce((sum, item) => sum + item.openCases, 0)
							.toLocaleString()}
					</p>
					<p className="text-xs text-gray-500 uppercase font-semibold">
						Open during selected period
					</p>
				</div>
				<div className="w-px h-10 bg-gray-200"></div>
				<div className="text-center">
					<p
						className="text-2xl font-bold"
						style={{ color: statusColorPalette[0] }}
					>
						{categoryData
							.reduce((sum, item) => sum + item.closedCases, 0)
							.toLocaleString()}
					</p>
					<p className="text-xs text-gray-500 uppercase font-semibold">
						Closed during selected period
					</p>
				</div>
			</div>
		</motion.div>
	);
};

export default SocialResponsibilityCasesByCategory;
