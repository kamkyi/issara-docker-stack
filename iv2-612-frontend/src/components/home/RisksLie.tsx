import { Heading } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { statusColorPalette } from "$src/assets/mock/common-data";
import {
	type SocialResponsibilityFilters,
	useDetailedKpiUpdates,
} from "$src/hooks/useSocialResponsibility";

const SEVERITY_LEVELS = {
	MOST_SEVERE: 3.3,
	MEDIUM_DARK: 2.9,
	TEAL: 2.5,
	LESS_SEVERE: 2.2,
} as const;

const getSeverityColor = (severity: number): string => {
	if (severity >= SEVERITY_LEVELS.MOST_SEVERE) return "#1d3557"; // Dark blue - Most severe
	if (severity >= SEVERITY_LEVELS.MEDIUM_DARK) return "#457b9d"; // Medium-dark blue
	if (severity >= SEVERITY_LEVELS.TEAL) return "#148696"; // Teal
	if (severity >= SEVERITY_LEVELS.LESS_SEVERE) return "#a8dadc"; // Light blue
	return "#c8e4e8"; // Very light blue - Less severe
};

const getSeverityTextColor = (severity: number): string => {
	if (severity >= SEVERITY_LEVELS.TEAL) return "#fff";
	return "#000";
};

const getSeverityLevelName = (severity: number): string => {
	const level = Math.min(4, Math.max(1, Math.round(severity)));
	switch (level) {
		case 1:
			return "Level 1 (Engagement)";
		case 2:
			return "Level 2 (Early Warning)";
		case 3:
			return "Level 3 (Forced Labor Risk)";
		case 4:
			return "Level 4 (Forced Labor Risk - Urgent)";
		default:
			return `Level ${level}`;
	}
};

const getCategoryColor = (catName: string): string => {
	const normalized = catName.toLowerCase();
	// Using colors from statusColorPalette for consistent branding
	if (normalized.includes("working conditions")) return statusColorPalette[11]; // Primary Teal
	if (normalized.includes("employer-employee relations"))
		return statusColorPalette[11]; // Deep Space Navy
	if (normalized.includes("living and eating conditions"))
		return statusColorPalette[11]; // Light Teal
	return statusColorPalette[11]; // Neutral Gray
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Apex color ranges helper removed; ECharts coloring handled per-node via itemStyle.color

interface RisksLieProps {
	filters?: SocialResponsibilityFilters;
	groupBy?: "category" | "description";
	categoryIds?: number[];
	rootLabel?: string;
	severityMaxLabel?: string;
	issueTitle?: string;
}

const RisksLie = ({
	filters,
	groupBy = "category",
	categoryIds,
	rootLabel = "Labor",
	severityMaxLabel = "4 (Forced Labor Risk - Urgent)",
	issueTitle,
}: RisksLieProps) => {
	const { data: detailedUpdatesResponse, isLoading } =
		useDetailedKpiUpdates(filters);

	const hierarchicalData = useMemo<any[]>(() => {
		let source = detailedUpdatesResponse?.data ?? [];
		if (source.length === 0) return [];

		// RisksLie only shows closed cases
		source = source.filter((item: any) => item.status_id === 3);
		if (source.length === 0) return [];

		// Filter by categoryIds if provided
		const filteredSource = categoryIds
			? source.filter((item: any) =>
					categoryIds.includes(Number(item.kpi_category_id)),
				)
			: source;

		// Map to store categories and their nested descriptions
		const categoryMap = new Map<
			string,
			Map<string, { count: number; totalLevel: number }>
		>();

		for (const item of filteredSource) {
			const catName = item.kpi_category_name || "Uncategorized";
			const desc = item.description || "No description";
			const level = Number.parseInt(item.level, 10) || 1;

			if (!categoryMap.has(catName)) {
				categoryMap.set(catName, new Map());
			}

			const descMap = categoryMap.get(catName);
			if (!descMap) continue;
			const entry = descMap.get(desc) || { count: 0, totalLevel: 0 };
			entry.count += 1;
			entry.totalLevel += level;
			descMap.set(desc, entry);
		}

		// Build the second level (Categories) and third level (Descriptions)
		const categories = Array.from(categoryMap.entries()).map(
			([catName, descMap]) => {
				const catColor = getCategoryColor(catName);
				const children = Array.from(descMap.entries()).map(([desc, data]) => {
					const severity = data.totalLevel / data.count;
					return {
						name: desc,
						value: data.count,
						severity,
						itemStyle: { color: getSeverityColor(severity) },
						label: { color: getSeverityTextColor(severity) },
					};
				});

				const totalCount = children.reduce(
					(sum, child) => sum + child.value,
					0,
				);
				const avgSeverity =
					children.reduce(
						(sum, child) => sum + child.severity * child.value,
						0,
					) / totalCount;

				// Remove a leading rootLabel (e.g. "Labor - ") from the displayed
				// category name so the frontend doesn't repeat it.
				let displayName = catName;
				if (rootLabel) {
					const anchored = new RegExp(
						`^\\s*${escapeRegex(rootLabel)}\\s*(?:[-:\\u2014\\u2013])?\\s*`,
						"i",
					);
					displayName = catName.replace(anchored, "").trim() || catName;
				}

				return {
					name: displayName,
					value: totalCount,
					severity: avgSeverity,
					children,
					itemStyle: { color: catColor },
					upperLabel: {
						show: true,
						backgroundColor: catColor,
					},
				};
			},
		);

		// If there's only one category (e.g. Recruitment), skip the root wrapper
		// to avoid showing the same label twice in the treemap.
		if (categories.length === 1) {
			return categories;
		}

		// Build the root level (multi-category, e.g. Labor)
		const totalRootCount = categories.reduce((sum, cat) => sum + cat.value, 0);
		const avgRootSeverity =
			categories.reduce((sum, cat) => sum + cat.severity * cat.value, 0) /
			totalRootCount;

		return [
			{
				name: rootLabel,
				value: totalRootCount,
				severity: avgRootSeverity,
				children: categories,
				itemStyle: { color: statusColorPalette[1] }, // Darker Teal for the root container
				upperLabel: {
					show: true,
					backgroundColor: statusColorPalette[1],
				},
			},
		];
	}, [detailedUpdatesResponse, categoryIds, rootLabel]);

	const [selectedIssue, setSelectedIssue] = useState<{
		name: string;
		value: number;
		severity: number;
	} | null>(null);
	const totalCases = hierarchicalData[0]?.value || 0;

	const echartsOption = {
		tooltip: {
			trigger: "item",
			confine: true,
			formatter: (params: any) => {
				const severity = params.data?.severity
					? `<div style="margin-top: 4px; font-size: 12px; color: #666;">
							<span style="font-weight: 600; color: #148696;">Severity Level:</span> ${getSeverityLevelName(params.data.severity)} (${params.data.severity.toFixed(2)})
						   </div>`
					: "";
				return `
					<div style="white-space: normal; word-wrap: break-word; max-width: 250px; font-family: inherit; line-height: 1.4;">
						<div style="font-weight: bold; color: #333; margin-bottom: 4px;">${params.name}</div>
						<div style="font-size: 12px; color: #666;">
							<span style="font-weight: 600; color: #148696;">Total Cases:</span> ${params.value.toLocaleString()}
						</div>
						${severity}
					</div>
				`;
			},
		},
		series: [
			{
				type: "treemap",
				roam: false,
				nodeClick: false,
				breadcrumb: {
					show: false,
				},
				label: {
					show: true,
					formatter: "{b}",
					fontSize: 11,
					fontWeight: 500,
					color: "#fff",
					padding: [4, 8],
				},
				upperLabel: {
					show: true,
					height: 30,
					color: "#fff",
					fontWeight: "bold",
					fontSize: 13,
					backgroundColor: "inherit",
					padding: [5, 10],
				},
				itemStyle: {
					borderColor: "#fff",
					borderWidth: 1,
					gapWidth: 1,
				},
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				levels: [
					{
						// Level 0: Root (Labor)
						itemStyle: {
							borderColor: "#fff",
							borderWidth: 1,
							gapWidth: 8, // Shows categories nested inside Labor
						},
						upperLabel: {
							show: true,
							height: 35,
							color: "#148696",
							fontWeight: "bold",
							fontSize: 15,
							padding: [8, 12],
						},
					},
					{
						// Level 1: Categories (Working conditions, etc.)
						itemStyle: {
							borderColor: "#148696",
							borderWidth: 1,
							gapWidth: 4, // Shows descriptions nested inside Categories
						},
						upperLabel: {
							show: true,
							height: 30,
							color: "#fff",
							fontWeight: "bold",
							fontSize: 13,
							backgroundColor: "inherit",
							padding: [6, 10],
						},
					},
					{
						// Level 2: KPI Descriptions
						itemStyle: {
							borderColor: "rgba(255,255,255,0.3)",
							borderWidth: 0.5,
							gapWidth: 1,
						},
						label: {
							show: true,
							padding: [4, 8],
						},
					},
				],
				data: hierarchicalData,
			},
		],
	};

	return (
		<motion.div
			className="bg-white rounded-md p-6 md:p-8"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.6, delay: 0.2 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			{/* Header */}
			<div className="mb-6">
				<Heading className="text-[#148696] mb-3" size="6">
					Where the Risks Lie
				</Heading>
				<p className="text-sm text-gray-600 leading-relaxed">
					A key measure of our system's health is our ability to detect and
					categorize risk. The view below shows the immediate scale of issues
					and helps us prioritize action.
				</p>
			</div>

			{/* TreeMap Title */}
			<h3 className="text-base font-semibold text-gray-800">
				{issueTitle ??
					(groupBy === "description"
						? `${rootLabel}-Related Issues by Category and Severity Level`
						: "Issues by Category and Severity Level")}
			</h3>

			{/* TreeMap Container */}
			<div className="overflow-hidden mb-4">
				{/* TreeMap */}
				<div className="" style={{ height: "500px", width: "100%" }}>
					{isLoading ? (
						<div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
							Loading issue categories...
						</div>
					) : hierarchicalData.length === 0 ? (
						<div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
							No issue category data available.
						</div>
					) : (
						<ReactECharts
							onEvents={{
								click: (params: any) => {
									const selected = {
										name: params?.name,
										value: params?.value ?? 0,
										severity: params?.data?.severity ?? 0,
									};
									setSelectedIssue((prev) =>
										prev?.name === selected.name ? null : selected,
									);
								},
							}}
							option={echartsOption}
							style={{ height: 500, width: "100%" }}
						/>
					)}
				</div>

				{/* Legend */}
				<div className="bg-white p-4 border-t border-gray-200">
					<div className="flex flex-col gap-4">
						{/* Severity Legend */}
						<div className="flex items-center justify-between flex-wrap gap-4">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-gray-700">
									Mean Severity Level:
								</span>
								<span className="text-sm text-gray-600">
									{severityMaxLabel}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1">
									<div
										className="w-4 h-4 rounded"
										style={{
											backgroundColor: getSeverityColor(
												SEVERITY_LEVELS.MOST_SEVERE,
											),
										}}
									></div>
									<span className="text-xs text-gray-600">4</span>
								</div>
								<div className="flex items-center gap-1">
									<div
										className="w-4 h-4 rounded"
										style={{
											backgroundColor: getSeverityColor(
												SEVERITY_LEVELS.MEDIUM_DARK,
											),
										}}
									></div>
									<span className="text-xs text-gray-600">3</span>
								</div>
								<div className="flex items-center gap-1">
									<div
										className="w-4 h-4 rounded"
										style={{
											backgroundColor: getSeverityColor(
												SEVERITY_LEVELS.LESS_SEVERE,
											),
										}}
									></div>
									<span className="text-xs text-gray-600">
										2 (Early Warning)
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Selected Issue Details */}
			{selectedIssue && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="bg-[#f0f9fa] border-l-4 border-[#148696] rounded p-4"
					initial={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.3 }}
				>
					<h4 className="font-semibold text-gray-800 mb-2">
						Selection: {selectedIssue.name}
					</h4>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-gray-600">Total Cases: </span>
							<span className="font-bold text-[#148696]">
								{selectedIssue.value.toLocaleString()}
							</span>
						</div>
						<div>
							<span className="text-gray-600">Mean Severity Level: </span>
							<span className="font-bold text-[#148696]">
								{getSeverityLevelName(selectedIssue.severity)}
							</span>
						</div>
					</div>
				</motion.div>
			)}

			{/* Total Cases */}
			<div className="mt-6 pt-4 border-t border-gray-200 text-center">
				<p className="text-lg font-semibold text-[#148696]">
					Total Closed cases: {totalCases.toLocaleString()}
				</p>
			</div>
		</motion.div>
	);
};

export default RisksLie;
