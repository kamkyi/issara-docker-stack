import { Heading, Select } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	type SocialResponsibilityFilters,
	useDetailedKpiUpdates,
} from "$src/hooks/useSocialResponsibility";

interface CategoryData {
	category: string;
	openCases: number;
	closedCases: number;
}

const LABOR_CATEGORIES = [
	{ id: 5, name: "Working conditions" },
	{ id: 8, name: "Employer-employee relations" },
	{ id: 9, name: "Living and eating conditions" },
];

// Custom tick component for wrapped text labels — uses canvas for accurate measurement
const CustomYAxisTick = ({ x, y, payload }: any) => {
	const text = payload.value || "";
	const maxWidth = 160;
	const lineHeight = 14;

	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (context) {
		context.font = "11px sans-serif";
		words.forEach((word) => {
			const testLine = currentLine ? `${currentLine} ${word}` : word;
			if (context.measureText(testLine).width > maxWidth && currentLine) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		});
		if (currentLine) lines.push(currentLine);
	}

	const totalHeight = lines.length * lineHeight;
	const startY = y - totalHeight / 2 + lineHeight / 2;

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

interface CasesByCategoryProps {
	filters?: SocialResponsibilityFilters;
	defaultCategoryId?: string;
	hideCategorySelector?: boolean;
	title?: string;
	allCategoriesLabel?: string;
}

export const CasesByCategory = ({
	filters,
	defaultCategoryId = "5",
	hideCategorySelector = false,
	title = "Labor Issues by KPI Category",
	allCategoriesLabel = "All Labor Categories",
}: CasesByCategoryProps) => {
	const [selectedCategoryId, setSelectedCategoryId] =
		useState<string>(defaultCategoryId);
	const {
		data: detailedUpdatesResponse,
		isLoading,
		error,
	} = useDetailedKpiUpdates(filters);

	// Transform detailed KPI data to component format
	const categoryData = useMemo<CategoryData[]>(() => {
		const source = detailedUpdatesResponse?.data ?? [];
		if (source.length === 0) return [];

		const catId = Number.parseInt(selectedCategoryId, 10);
		const filteredSource = source.filter(
			(item: any) => Number(item.kpi_category_id) === catId,
		);

		// Group by description
		const descGroupMap = new Map<string, { open: number; closed: number }>();

		// Explicitly deduplicate by ID to prevent overcounting if API returns redundant updates
		const seenIds = new Set<number>();
		const uniqueItems = filteredSource.filter((item: any) => {
			if (!item.id || seenIds.has(item.id)) return false;
			seenIds.add(item.id);
			return true;
		});

		for (const item of uniqueItems) {
			const desc = item.description || "No description";
			// Open Case is status 1 and 2, Closed is strictly 3
			const isOpen = item.status_id === 1 || item.status_id === 2;
			const isClosed = item.status_id === 3;

			const counts = descGroupMap.get(desc) || { open: 0, closed: 0 };
			if (isOpen) {
				counts.open += 1;
			} else if (isClosed) {
				counts.closed += 1;
			}
			descGroupMap.set(desc, counts);
		}

		return Array.from(descGroupMap.entries())
			.map(([description, counts]) => ({
				category: description,
				openCases: counts.open,
				closedCases: counts.closed,
			}))
			.sort(
				(a, b) => b.openCases + b.closedCases - (a.openCases + a.closedCases),
			);
	}, [detailedUpdatesResponse, selectedCategoryId]);

	const totalCases = categoryData.reduce(
		(sum, item) => sum + item.openCases + item.closedCases,
		0,
	);

	const chartHeight = Math.max(500, categoryData.length * 80);

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
						{LABOR_CATEGORIES.find((c) => c.id === Number(selectedCategoryId))
							?.name || allCategoriesLabel}
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
									{LABOR_CATEGORIES.map((cat) => (
										<Select.Item key={cat.id} value={cat.id.toString()}>
											{cat.name}
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
							<div className="w-3 h-3 bg-[#3BAE8C] rounded-sm"></div>
							<span className="text-gray-600 font-medium">{"Closed"}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Bar Chart */}
			<div style={{ height: chartHeight, width: "100%" }}>
				<ResponsiveContainer height="100%" width="100%">
					<BarChart
						data={categoryData}
						layout="vertical"
						margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
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
							barSize={40}
							dataKey="openCases"
							fill="#F2A65A"
							name={"Open"}
							stackId="a"
						/>
						<Bar
							barSize={40}
							dataKey="closedCases"
							fill="#3BAE8C"
							name={"Closed"}
							radius={[0, 4, 4, 0]}
							stackId="a"
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Total Statistics */}
			<div className="border-t border-gray-100 flex items-center justify-center gap-8">
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
					<p className="text-2xl font-bold text-[#3BAE8C]">
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

export default CasesByCategory;
