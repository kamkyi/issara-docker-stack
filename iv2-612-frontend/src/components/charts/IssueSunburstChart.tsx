import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import mockData from "$src/assets/mock/our-workplace.json";

interface IssueSunburstChartProps {
	category: "Labor" | "Wages" | "Recruitment";
	onSelect?: (issueName: string, caseCount: number) => void;
}

const getCategoryNames = (category: string): string[] => {
	if (category === "Labor") {
		return [
			"Labor - Working conditions",
			"Labor - Employer-employee relations",
			"Labor - Living and eating conditions",
		];
	}
	if (category === "Wages") return ["Wages"];
	if (category === "Recruitment") return ["Recruitment"];
	return [];
};

// Color palettes for the outer ring (individual issues under "Closed")
const getCategoryColors = (category: string): string[] => {
	if (category === "Labor")
		return [
			"#60A5FA",
			"#3B82F6",
			"#93C5FD",
			"#2563EB",
			"#BFDBFE",
			"#6366F1",
			"#4F46E5",
			"#818CF8",
			"#A5B4FC",
			"#C4B5FD",
			"#7C3AED",
			"#8B5CF6",
			"#6D28D9",
		];
	if (category === "Wages")
		return [
			"#10B981",
			"#34D399",
			"#6EE7B7",
			"#059669",
			"#A7F3D0",
			"#065F46",
			"#D1FAE5",
		];
	if (category === "Recruitment")
		return [
			"#F59E0B",
			"#FBBF24",
			"#FCD34D",
			"#D97706",
			"#FDE68A",
			"#B45309",
			"#92400E",
			"#78350F",
		];
	return ["#6B7280", "#9CA3AF", "#D1D5DB"];
};

export const IssueSunburstChart = ({
	category,
	onSelect,
}: IssueSunburstChartProps) => {
	const data = useMemo(() => {
		const catNames = getCategoryNames(category);
		const groupings = mockData.kpi_groupings_by_category as Record<
			string,
			any[]
		>;
		const colors = getCategoryColors(category);

		// Flatten all issues across subcategories, filtering child labor entries
		const allIssues: {
			name: string;
			closedCases: number;
			openCases: number;
			color: string;
		}[] = [];
		let colorIndex = 0;
		for (const catName of catNames) {
			const items = (groupings[catName] || []).filter(
				(it: any) => !/\bchild\b/i.test(it.grouping),
			);
			for (const item of items) {
				allIssues.push({
					name: item.grouping,
					closedCases: item.closed_cases,
					openCases: item.open_cases,
					color: colors[colorIndex % colors.length],
				});
				colorIndex++;
			}
		}

		return [
			{
				name: "Closed",
				itemStyle: { color: "#a6dfdd" },
				children: allIssues.map((issue) => ({
					name: issue.name,
					value: issue.closedCases,
					itemStyle: { color: issue.color },
				})),
			},
			{
				name: "Open",
				itemStyle: { color: "#EF4444" },
				children: allIssues.map((issue) => ({
					name: issue.name,
					value: issue.openCases,
					itemStyle: { color: "#FCA5A5" },
				})),
			},
		];
	}, [category]);

	const option = {
		tooltip: {
			trigger: "item",
			confine: true,
			backgroundColor: "rgba(255,255,255,0.95)",
			borderColor: "#e5e7eb",
			borderWidth: 1,
			textStyle: { color: "#111827", fontSize: 12 },
			extraCssText:
				"z-index: 9999; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);",
			formatter: (params: any) => {
				if (!params.value) return params.name;
				return `${params.name}: ${params.value} cases`;
			},
		},
		series: {
			type: "sunburst",
			data,
			radius: ["15%", "95%"],
			nodeClick: false,
			itemStyle: {
				borderWidth: 1,
				borderColor: "#ffffff",
			},
			levels: [
				{},
				{
					// Inner ring: Closed / Open
					r0: "15%",
					r: "38%",
					label: {
						show: true,
						fontSize: 12,
						fontWeight: "bold",
						color: "#1F2937",
						textBorderColor: "#ffffff",
						textBorderWidth: 2,
						rotate: 0,
					},
					itemStyle: { borderWidth: 2, borderColor: "#fff" },
				},
				{
					// Outer ring: individual issues
					r0: "38%",
					r: "95%",
					label: {
						show: true,
						position: "inside",
						rotate: -15,
						minAngle: 18,
						fontSize: 8,
						color: "#1F2937",
						textBorderColor: "#ffffff",
						textBorderWidth: 2,
						width: 80,
						overflow: "break",
					},
					itemStyle: { borderWidth: 1, borderColor: "#fff" },
				},
			],
		},
	};

	const onEvents = {
		click: (params: any) => {
			if (onSelect && params.name && params.value) {
				onSelect(params.name, params.value);
			}
		},
	};

	return (
		<ReactECharts
			onEvents={onEvents}
			option={option}
			style={{ height: "350px", width: "100%" }}
		/>
	);
};
