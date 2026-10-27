import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import mockData from "$src/assets/mock/our-workplace.json";

interface IssueTreemapChartProps {
	onSelect?: (issueName: string, caseCount: number) => void;
	kpiGroupingsByCategory?: Record<
		string,
		Array<{
			grouping: string;
			open_cases?: number;
			closed_cases?: number;
			supplier_breakdown?: SupplierBreakdownItem[];
		}>
	>;
}

type SupplierBreakdownItem = {
	supplier_id?: number;
	supplier_name: string;
	closed_cases: number;
};

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const sortSupplierBreakdown = (items: SupplierBreakdownItem[]) =>
	[...items].sort(
		(a, b) =>
			Number(b.closed_cases || 0) - Number(a.closed_cases || 0) ||
			String(a.supplier_name || "").localeCompare(
				String(b.supplier_name || ""),
			),
	);

const aggregateSupplierBreakdown = (items: SupplierBreakdownItem[]) => {
	const supplierMap = new Map<string, SupplierBreakdownItem>();

	for (const item of items) {
		const supplierName = String(item.supplier_name || "Unknown Supplier");
		const key = `${item.supplier_id ?? supplierName}:${supplierName}`;
		const existing = supplierMap.get(key);
		if (existing) {
			existing.closed_cases += Number(item.closed_cases || 0);
		} else {
			supplierMap.set(key, {
				supplier_id: item.supplier_id,
				supplier_name: supplierName,
				closed_cases: Number(item.closed_cases || 0),
			});
		}
	}

	return sortSupplierBreakdown(Array.from(supplierMap.values()));
};

const getCategoryColors = (category: string): string[] => {
	if (category === "Labor")
		return [
			"#a6dfdd",
			"#86d1c9",
			"#5fc0b6",
			"#34b199",
			"#1f9f8a",
			"#0e8b73",
			"#cdefe6",
			"#b8e9df",
			"#9fe1d6",
			"#79d6c7",
			"#4fc6b4",
			"#2bb9a6",
			"#179e8f",
		];
	if (category === "Wages")
		return [
			"#FDE6F3",
			"#F9B6DF",
			"#F472B6",
			"#E51B80",
			"#C0146A",
			"#991148",
			"#6D0B33",
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

// choose white or dark text depending on background color luminance
const getContrastColor = (hex: string) => {
	if (!hex) return "#000";
	const h = hex.replace("#", "");
	const r = parseInt(h.substring(0, 2), 16) / 255;
	const g = parseInt(h.substring(2, 4), 16) / 255;
	const b = parseInt(h.substring(4, 6), 16) / 255;
	const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return lum > 0.6 ? "#0f172a" : "#ffffff";
};

// return a darker shade of the provided hex color by `amount` (0..1)
const darkenHex = (hex: string, amount = 0.18) => {
	if (!hex) return hex;
	const h = hex.replace("#", "");
	if (h.length !== 6) return hex;
	const r = Math.max(
		0,
		Math.min(255, Math.floor(parseInt(h.substring(0, 2), 16) * (1 - amount))),
	);
	const g = Math.max(
		0,
		Math.min(255, Math.floor(parseInt(h.substring(2, 4), 16) * (1 - amount))),
	);
	const b = Math.max(
		0,
		Math.min(255, Math.floor(parseInt(h.substring(4, 6), 16) * (1 - amount))),
	);
	const toHex = (v: number) => v.toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const IssueTreemapChart = ({
	onSelect,
	kpiGroupingsByCategory,
}: IssueTreemapChartProps) => {
	const { t } = useTranslation();

	const translateName = (name: string) => {
		const map: Record<string, string> = {
			Labor: t("companyDashboard.issueTreemap.categoryNames.labor"),
			Wages: t("companyDashboard.issueTreemap.categoryNames.wages"),
			Recruitment: t("companyDashboard.issueTreemap.categoryNames.recruitment"),
			"Labor - Working conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborWorkingConditions",
			),
			"Labor - Employer-employee relations": t(
				"companyDashboard.issueTreemap.categoryNames.laborEmployerEmployeeRelations",
			),
			"Labor - Living and eating conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborLivingAndEatingConditions",
			),
			"Closed Issues": t("companyDashboard.issueTreemap.closedIssues"),
		};

		return map[name] || name;
	};

	const data = useMemo(() => {
		// Use provided groupings or fall back to mock data
		const groupings =
			(kpiGroupingsByCategory as any) ||
			(mockData.kpi_groupings_by_category as Record<string, any[]>);
		const categories = ["Labor", "Wages", "Recruitment"];

		return categories.map((cat) => {
			const colors = getCategoryColors(cat);
			const children: any[] = [];
			let colorIndex = 0;

			// For Labor, check "Labor" as well as sub-categories
			const names =
				cat === "Labor"
					? [
							"Labor",
							"Labor - Working conditions",
							"Labor - Employer-employee relations",
							"Labor - Living and eating conditions",
						]
					: [cat];

			for (const name of names) {
				const items = (groupings[name] || []).filter(
					(it: any) => !/\bchild\b/i.test(it.grouping),
				);
				for (const item of items) {
					const closed = Number(item.closed_cases || 0);
					const supplierBreakdown = sortSupplierBreakdown(
						(item.supplier_breakdown || []).map((supplier: any) => ({
							supplier_id: supplier.supplier_id,
							supplier_name:
								supplier.supplier_name || supplier.name || "Unknown Supplier",
							closed_cases: Number(
								supplier.closed_cases ?? supplier.value ?? supplier.count ?? 0,
							),
						})),
					);
					children.push({
						name: item.grouping,
						value: closed,
						supplierBreakdown,
						itemStyle: { color: colors[colorIndex % colors.length] },
					});
					colorIndex++;
				}
			}

			// pick the palette's central color as the main/category color
			const mainColor =
				colors && colors.length > 0
					? colors[Math.floor(colors.length / 2)]
					: colors[0];

			// Ensure the largest child tile uses the category's main color
			if (children.length > 0 && mainColor) {
				let maxIdx = 0;
				let maxVal = children[0].value || 0;
				for (let i = 1; i < children.length; i++) {
					const v = children[i].value || 0;
					if (v > maxVal) {
						maxVal = v;
						maxIdx = i;
					}
				}
				children[maxIdx].itemStyle = {
					...children[maxIdx].itemStyle,
					color: mainColor,
				};
			}

			const node: any = {
				name: cat,
				children,
				supplierBreakdown: aggregateSupplierBreakdown(
					children.flatMap((child) => child.supplierBreakdown || []),
				),
			};
			// use a slightly darker shade of the category main color for the parent tile
			const darkMain = darkenHex(mainColor, 0.18);
			node.itemStyle = { color: darkMain };
			// per-node upperLabel gives each category its own background color stripe
			node.upperLabel = {
				show: true,
				height: 22,
				color: getContrastColor(darkMain),
				backgroundColor: darkMain,
				fontWeight: "bold",
				fontSize: 13,
				align: "left",
				verticalAlign: "middle",
				padding: [0, 0, 0, 8],
			};

			return node;
		});
	}, [kpiGroupingsByCategory]);

	const option = {
		tooltip: {
			trigger: "item",
			confine: true,
			backgroundColor: "rgba(255,255,255,0.95)",
			borderColor: "#e5e7eb",
			borderWidth: 1,
			textStyle: { color: "#111827", fontSize: 12 },
			extraCssText:
				"z-index: 9999; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 360px; white-space: normal; overflow-wrap: anywhere; word-break: break-word;",
			formatter: (params: any) => {
				const supplierBreakdown = sortSupplierBreakdown(
					(params.data?.supplierBreakdown || []) as SupplierBreakdownItem[],
				);
				const caseCount =
					Number(params.value || 0) ||
					supplierBreakdown.reduce(
						(sum, supplier) => sum + Number(supplier.closed_cases || 0),
						0,
					);
				const translatedName = escapeHtml(translateName(params.name));

				if (!caseCount) return translatedName;

				const summary = `${translatedName}: ${caseCount} ${escapeHtml(
					t("companyDashboard.issueTreemap.cases"),
				)}`;

				if (supplierBreakdown.length === 0) return summary;

				const supplierRows = supplierBreakdown
					.map(
						(supplier) =>
							`<div style="line-height:1.45;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(
								supplier.supplier_name,
							)} - <span style="font-weight:600;">${Number(
								supplier.closed_cases || 0,
							)} ${escapeHtml(t("companyDashboard.issueTreemap.cases"))}</span></div>`,
					)
					.join("");

				return `<div style="width:320px;max-width:calc(100vw - 32px);white-space:normal;overflow-wrap:anywhere;word-break:break-word;"><div style="font-weight:600;margin-bottom:6px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${summary}</div><div style="border-top:1px solid #e5e7eb;padding-top:6px;max-height:220px;overflow-y:auto;white-space:normal;">${supplierRows}</div></div>`;
			},
		},
		series: [
			{
				type: "treemap",
				roam: false,
				nodeClick: false,
				breadcrumb: { show: false },
				// base upperLabel style — per-node data entries override backgroundColor/color
				upperLabel: {
					show: true,
					height: 16,
					fontWeight: "bold",
					fontSize: 13,
					align: "left",
					verticalAlign: "middle",
					padding: [0, 0, 0, 8],
					formatter: (params: any) => translateName(params.name),
				},
				label: {
					show: true,
					formatter: (params: any) => translateName(params.name),
					overflow: "break",
					color: "#111827",
					fontSize: 12,
					position: "inside",
					align: "center",
					verticalAlign: "middle",
					lineHeight: 16,
				},
				levels: [
					{
						// Level 0: category parent — backgroundColor comes from per-node upperLabel
						itemStyle: {
							borderColor: "#fff",
							borderWidth: 1,
							gapWidth: 4,
						},
						upperLabel: { show: true, height: 16 },
					},
					{
						// Level 1: leaf nodes
						itemStyle: {
							borderColor: "rgba(255,255,255,0.3)",
							borderWidth: 0.5,
							gapWidth: 1,
						},
					},
				],
				top: "2%",
				bottom: "2%",
				data,
			},
		],
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
			onChartReady={() => {}}
			onEvents={onEvents}
			option={option}
			style={{ height: "650px", width: "100%" }}
		/>
	);
};

export default IssueTreemapChart;
