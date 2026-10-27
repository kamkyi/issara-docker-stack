import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Box, Tabs, Text } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { sunrisepalette } from "$src/assets/mock/common-data";
import supplierKpiMockData from "$src/assets/mock/supplier-kpi-stackbar-data.json";
import timelineMockData from "$src/assets/mock/timeline-data.json";
import { useKPICategories } from "$src/queries/kpis";
import { useMockData } from "$src/utils/config";
import { useSupplierKpiTimeline } from "../../queries/useSupplierKpiTimeline";
import SupplierKpisApexTimeline from "./SupplierKpisApexTimeline";
import "./SupplierKPITimelineChart.css";

const stripLaborPrefix = (s: string) => s.replace(/^Labor\s*-\s*/i, "");
const OPEN_STATUS_COLOR = "#FB8379";
const CLOSED_STATUS_COLOR = "#148696";

type StatusFilter = "ALL" | "OPEN" | "CLOSED";

interface FlatKpiRecord {
	id?: number;
	supplier_name?: string;
	category?: string;
	description?: string;
	status_name?: string;
}

interface SupplierKPITimelineChartProps {
	filters: {
		supplier?: string | string[];
		partner?: string;
		country?: string;
		industry?: string;
		startTime: string;
		endTime: string;
	};
	useMock?: boolean;
	chartVariant?: "stacked" | "time";
	statusFilterMode?: "default" | "all-only";
	compact?: boolean;
}

const SupplierKPITimelineChart = ({
	filters,
	useMock,
	chartVariant = "stacked",
	statusFilterMode = "default",
	compact = false,
}: SupplierKPITimelineChartProps) => {
	const { t } = useTranslation();
	const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(
		chartVariant === "time" ? "ALL" : "CLOSED",
	);
	const [showLeftScroll, setShowLeftScroll] = useState(false);
	const [showRightScroll, setShowRightScroll] = useState(false);
	const tabsListRef = useRef<HTMLDivElement>(null);

	const envMock = useMockData();
	// Caller can override the env-var mock flag (e.g. company-dashboard passes its own useMock)
	const shouldUseMockData = useMock ?? envMock;

	// Supplier color palette — Issara sunrise palette (CASCADE UI style guide)
	const supplierPalette = sunrisepalette;

	const { data: availableKpiCategories = [] } = useKPICategories();
	const { data: apiKpiData = {} } = useSupplierKpiTimeline({
		...filters,
		category: selectedCategory,
	});
	const statusFilterOptions: StatusFilter[] =
		statusFilterMode === "all-only"
			? ["ALL"]
			: chartVariant === "time"
				? ["ALL", "OPEN", "CLOSED"]
				: ["OPEN", "CLOSED"];

	useEffect(() => {
		if (statusFilterMode === "all-only" && statusFilter !== "ALL") {
			setStatusFilter("ALL");
		}
	}, [statusFilterMode, statusFilter]);

	useEffect(() => {
		if (!selectedCategory && availableKpiCategories.length > 0) {
			const cat5 = availableKpiCategories.find((cat: any) => cat.id === 5);
			setSelectedCategory(cat5 ? 5 : availableKpiCategories[0].id);
		}
	}, [availableKpiCategories, selectedCategory]);

	const orderedCategories = useMemo(() => {
		const order = [1, 4, 5, 8, 9];
		return availableKpiCategories
			.filter((cat: any) => order.includes(cat.id))
			.sort((a: any, b: any) => order.indexOf(a.id) - order.indexOf(b.id));
	}, [availableKpiCategories]);

	const categoryNameMap = useMemo(() => {
		const map: Record<number, string> = {};
		for (const cat of orderedCategories) {
			map[cat.id] = cat.name;
		}
		return map;
	}, [orderedCategories]);

	const selectedCategoryName =
		(selectedCategory && categoryNameMap[selectedCategory]) || "";
	// The mock JSON is keyed by canonical English names, but `selectedCategoryName`
	// comes from a localized API response (e.g. Thai/Japanese). Use a stable
	// category-id → English-key map so non-English locales still find mock data.
	const MOCK_CATEGORY_KEY_BY_ID: Record<number, string> = {
		1: "Recruitment",
		4: "Wages",
		5: "Labor - Working conditions",
		8: "Labor - Employer-employee relations",
		9: "Labor - Living and eating conditions",
	};
	const mockCategoryKey = selectedCategory
		? MOCK_CATEGORY_KEY_BY_ID[selectedCategory]
		: undefined;
	const timelineMockCategoryData = mockCategoryKey
		? (timelineMockData as Record<string, { chartData?: any[][] }>)[
				mockCategoryKey
			]
		: undefined;

	const translateCategoryName = (name: string) => {
		const stripped = stripLaborPrefix(name);
		const map: Record<string, string> = {
			Labor: t("companyDashboard.issueTreemap.categoryNames.labor"),
			Wages: t("companyDashboard.issueTreemap.categoryNames.wages"),
			Recruitment: t("companyDashboard.issueTreemap.categoryNames.recruitment"),
			"Working conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborWorkingConditionsShort",
			),
			"Employer-employee relations": t(
				"companyDashboard.issueTreemap.categoryNames.laborEmployerEmployeeRelationsShort",
			),
			"Living and eating conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborLivingAndEatingConditionsShort",
			),
		};

		return map[stripped] || stripped;
	};

	const normalizedRecords = useMemo<FlatKpiRecord[]>(() => {
		if (shouldUseMockData) {
			return supplierKpiMockData as FlatKpiRecord[];
		}

		if (!Array.isArray(apiKpiData?.chartData)) {
			return [];
		}

		return apiKpiData.chartData.slice(1).map((row: any[]) => ({
			supplier_name: row[0],
			category: selectedCategoryName,
			description: row[1],
			status_name: row[4],
		}));
	}, [shouldUseMockData, apiKpiData?.chartData, selectedCategoryName]);

	const timelineRows = useMemo(() => {
		const sourceRows = shouldUseMockData
			? timelineMockCategoryData?.chartData
			: apiKpiData?.chartData;

		if (!Array.isArray(sourceRows)) {
			return [] as any[][];
		}

		return sourceRows.slice(1).filter((row: any[]) => {
			const status = String(row[4] || "").toUpperCase();
			return statusFilter === "ALL" ? true : status === statusFilter;
		});
	}, [
		shouldUseMockData,
		timelineMockCategoryData?.chartData,
		apiKpiData?.chartData,
		statusFilter,
	]);

	const timelineLegend = useMemo(() => {
		// For time-chart variant, show status-based legend (Open / Closed)
		if (chartVariant === "time") {
			const legend: Array<{ name: string; color: string }> = [];
			// Determine if there are any open/closed items in the current rows
			let hasOpen = false;
			let hasClosed = false;
			for (const row of timelineRows) {
				const status = String(row[4] || "").toUpperCase();
				if (status === "OPEN") hasOpen = true;
				if (status === "CLOSED") hasClosed = true;
				if (hasOpen && hasClosed) break;
			}
			if (hasOpen)
				legend.push({
					name: t("companyDashboard.timeline.status.open"),
					color: OPEN_STATUS_COLOR,
				});
			if (hasClosed)
				legend.push({
					name: t("companyDashboard.timeline.status.closed"),
					color: CLOSED_STATUS_COLOR,
				});
			return legend;
		}

		// Default: supplier-based legend (used by stacked chart)
		const seen = new Set<string>();
		return timelineRows.reduce<Array<{ name: string; color: string }>>(
			(acc, row: any[]) => {
				const supplierName = String(
					row[0] || t("companyDashboard.timeline.unknownSupplier"),
				);
				if (seen.has(supplierName)) {
					return acc;
				}
				seen.add(supplierName);
				acc.push({
					name: supplierName,
					color: String(row[8] || "#148696"),
				});
				return acc;
			},
			[],
		);
	}, [timelineRows, t, chartVariant]);

	const timeChartData = useMemo(() => {
		return timelineRows.map((row: any[]) => {
			const supplierName = String(
				row[0] || t("companyDashboard.timeline.unknownSupplier"),
			);
			const issueName = String(
				row[1] || t("companyDashboard.timeline.unknownIssue"),
			);
			const status = String(row[4] || "").toUpperCase();
			const openedAt = String(row[5] || filters.startTime);
			const closedAt = row[6] || filters.endTime;
			const color = status === "OPEN" ? OPEN_STATUS_COLOR : CLOSED_STATUS_COLOR;
			const tooltip = String(row[9] || issueName);

			return [
				issueName,
				status,
				color,
				openedAt,
				closedAt,
				tooltip,
				supplierName,
			];
		});
	}, [timelineRows, t, filters.startTime, filters.endTime]);

	const filteredRecords = useMemo(() => {
		// Mock records use canonical English category names, but `selectedCategoryName`
		// is localized from the API. When in mock mode, match against the English
		// key so non-English locales still find records.
		const matchLabel = (
			shouldUseMockData ? mockCategoryKey : selectedCategoryName
		)?.toLowerCase();

		return normalizedRecords.filter((record) => {
			const category = (record.category || "").toLowerCase();
			const status = (record.status_name || "").toUpperCase();

			const matchesCategory = matchLabel
				? stripLaborPrefix(category) === stripLaborPrefix(matchLabel)
				: true;

			const matchesStatus =
				statusFilter === "ALL" ? true : status === statusFilter;

			return matchesCategory && matchesStatus;
		});
	}, [
		normalizedRecords,
		selectedCategoryName,
		mockCategoryKey,
		shouldUseMockData,
		statusFilter,
	]);

	const suppliers = useMemo(() => {
		// Compute totals per supplier and only include suppliers with at least one issue
		const totals: Record<string, number> = {};
		for (const record of filteredRecords) {
			const supplier =
				record.supplier_name || t("companyDashboard.timeline.unknownSupplier");
			totals[supplier] = (totals[supplier] || 0) + 1;
		}

		return Object.keys(totals).filter((s) => totals[s] > 0);
	}, [filteredRecords]);

	const supplierColorMap = useMemo(() => {
		const map: Record<string, string> = {};
		suppliers.forEach((supplier, idx) => {
			map[supplier] = supplierPalette[idx % supplierPalette.length];
		});
		return map;
	}, [suppliers]);

	const chartRows = useMemo(() => {
		const grouped: Record<string, Record<string, number>> = {};

		for (const record of filteredRecords) {
			const description =
				record.description || t("companyDashboard.timeline.unknownIssue");
			const supplier =
				record.supplier_name || t("companyDashboard.timeline.unknownSupplier");

			if (!grouped[description]) grouped[description] = {};
			if (!grouped[description][supplier]) grouped[description][supplier] = 0;
			grouped[description][supplier] += 1;
		}

		return Object.entries(grouped)
			.map(([description, supplierCounts]) => {
				const row: Record<string, string | number> = {
					description,
				};
				for (const supplier of suppliers) {
					row[supplier] = supplierCounts[supplier] || 0;
				}
				row.total = suppliers.reduce(
					(acc, supplier) => acc + Number(row[supplier] || 0),
					0,
				);
				return row;
			})
			.sort((a, b) => Number(b.total) - Number(a.total));
	}, [filteredRecords, suppliers]);

	const selectedTabValue =
		selectedCategory?.toString() ??
		availableKpiCategories[0]?.id?.toString() ??
		"";

	const chartHeight = Math.max(
		chartRows.length * (compact ? 44 : 56) + (compact ? 56 : 80),
		Math.min(compact ? 180 : 240, chartRows.length * (compact ? 64 : 80)),
	);
	const hasChartData =
		chartVariant === "time" ? timeChartData.length > 0 : chartRows.length > 0;

	function scrollTabs(direction: "left" | "right") {
		if (!tabsListRef.current) return;
		const { scrollLeft, clientWidth } = tabsListRef.current;
		const scrollAmount = clientWidth * 0.5;
		tabsListRef.current.scrollTo({
			left:
				direction === "left"
					? scrollLeft - scrollAmount
					: scrollLeft + scrollAmount,
			behavior: "smooth",
		});
	}

	useEffect(() => {
		const checkForScrollbar = () => {
			if (tabsListRef.current) {
				const { scrollWidth, clientWidth, scrollLeft } = tabsListRef.current;
				setShowRightScroll(
					scrollWidth > clientWidth &&
						scrollWidth - clientWidth - scrollLeft > 10,
				);
				setShowLeftScroll(scrollLeft > 10);
			}
		};
		checkForScrollbar();
		window.addEventListener("resize", checkForScrollbar);
		const tabsList = tabsListRef.current;
		if (tabsList) {
			tabsList.addEventListener("scroll", checkForScrollbar);
		}
		return () => {
			window.removeEventListener("resize", checkForScrollbar);
			if (tabsList) {
				tabsList.removeEventListener("scroll", checkForScrollbar);
			}
		};
	}, [availableKpiCategories.length]);

	const renderTabs = () => {
		return orderedCategories.map((cat: any) => (
			<Tabs.Trigger
				className="cursor-pointer"
				key={cat.id}
				value={cat.id.toString()}
			>
				{translateCategoryName(cat.name)}
			</Tabs.Trigger>
		));
	};

	return (
		<Box
			className={`mb-0 supplier-kpi-stackbar-card${compact ? " supplier-kpi-stackbar-card--compact" : ""}`}
		>
			<Box p={compact ? "3" : "4"} pb={compact ? "1" : "2"}>
				<div className="stackbar-status-tabs" role="tablist">
					<div className="status-filter-group">
						{statusFilterOptions.map((option) => (
							<button
								className={`status-filter-button ${
									statusFilter === option ? "is-active" : ""
								}`}
								key={option}
								onClick={() => setStatusFilter(option)}
								type="button"
							>
								{option === "ALL"
									? t("common.all")
									: t(
											`companyDashboard.timeline.status.${option.toLowerCase()}`,
										)}
							</button>
						))}
					</div>
					<span className="status-pill">
						{t("companyDashboard.timeline.viewing")}:{" "}
						{statusFilter === "ALL"
							? t("common.all")
							: t(
									`companyDashboard.timeline.status.${statusFilter.toLowerCase()}`,
								)}
					</span>
				</div>
				<Box mt="2">
					{availableKpiCategories && availableKpiCategories.length > 0 ? (
						<Tabs.Root
							className="timeline-tabs"
							onValueChange={(value) => {
								const parsed = Number.parseInt(value, 10);
								setSelectedCategory(Number.isNaN(parsed) ? null : parsed);
							}}
							value={selectedTabValue}
						>
							<div className="tabs-container-with-indicators">
								{showLeftScroll && (
									<div
										className="scroll-indicator left"
										onClick={() => scrollTabs("left")}
									>
										{" "}
										<div className="scroll-indicator-icon">
											{" "}
											<ChevronLeftIcon height={16} width={16} />{" "}
										</div>{" "}
									</div>
								)}
								<Tabs.List
									onScroll={() => {
										if (tabsListRef.current) {
											const { scrollWidth, clientWidth, scrollLeft } =
												tabsListRef.current;
											setShowRightScroll(
												scrollWidth > clientWidth &&
													scrollWidth - clientWidth - scrollLeft > 10,
											);
											setShowLeftScroll(scrollLeft > 10);
										}
									}}
									ref={tabsListRef}
								>
									{" "}
									{renderTabs()}{" "}
								</Tabs.List>
								{showRightScroll && (
									<div
										className="scroll-indicator right"
										onClick={() => scrollTabs("right")}
									>
										{" "}
										<div className="scroll-indicator-icon">
											{" "}
											<ChevronRightIcon height={16} width={16} />{" "}
										</div>{" "}
									</div>
								)}
							</div>
						</Tabs.Root>
					) : (
						<Text color="crimson" size="2">
							{t("companyDashboard.timeline.noCategories")}
						</Text>
					)}
				</Box>
				{!hasChartData && (
					<div className="flex items-center justify-center p-6 mt-2 rounded-md bg-gray-50 border border-gray-100">
						<div className="flex flex-col items-center space-y-2 text-center">
							<svg
								className="h-10 w-10 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
								/>
							</svg>
							<p className="text-sm font-medium text-gray-500">
								{t("companyDashboard.timeline.noData")}
							</p>
						</div>
					</div>
				)}
				<Box className="mt-2 w-full" style={{ padding: 0, margin: 0 }}>
					{chartVariant === "stacked" && suppliers.length > 0 && (
						<div className="kpi-legend-row">
							{suppliers.map((supplier) => (
								<div className="kpi-legend-item" key={supplier}>
									<span
										className="kpi-legend-swatch"
										style={{ backgroundColor: supplierColorMap[supplier] }}
									/>
									<span>{supplier}</span>
								</div>
							))}
						</div>
					)}

					{chartVariant === "time" ? (
						hasChartData ? (
							<div
								className={`w-full supplier-kpi-chart-shell${compact ? " compact" : ""}`}
							>
								<SupplierKpisApexTimeline
									chartData={timeChartData}
									compact={compact}
									isMultiSupplier={timelineLegend.length > 1}
									showStatusLegend={statusFilterMode !== "all-only"}
									supplierLegend={timelineLegend}
								/>
							</div>
						) : null
					) : chartRows.length > 0 ? (
						<div
							className={`w-full supplier-kpi-chart-shell${compact ? " compact" : ""}`}
						>
							<ResponsiveContainer height={chartHeight} width="100%">
								<BarChart
									data={chartRows}
									layout="vertical"
									margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
								>
									<CartesianGrid
										horizontal
										stroke="#E5E7EB"
										strokeDasharray="0"
									/>
									<XAxis allowDecimals={false} type="number" />
									<YAxis
										dataKey="description"
										tick={{ fill: "#374151", fontSize: 12 }}
										type="category"
										width={148}
									/>
									<Tooltip
										content={({ active, payload, label }: any) => {
											if (!active || !Array.isArray(payload)) return null;

											// Only show entries with value > 0
											const nonZero = payload.filter(
												(p: any) => Number(p.value) > 0,
											);
											if (nonZero.length === 0) return null;

											return (
												<div className="recharts-tooltip-wrapper p-2 bg-white border border-gray-200 rounded shadow-sm">
													<div className="text-sm font-medium text-gray-700">
														{label}
													</div>
													<div className="mt-1">
														{nonZero.map((p: any) => (
															<div
																className="flex items-center space-x-2 text-sm text-gray-600"
																key={p.dataKey}
															>
																<span
																	style={{
																		width: 10,
																		height: 10,
																		background: p.color || p.fill,
																		display: "inline-block",
																		borderRadius: 2,
																	}}
																/>
																<span>{p.name || p.dataKey}</span>
																<span className="ml-2 font-semibold">
																	{p.value}
																</span>
															</div>
														))}
													</div>
												</div>
											);
										}}
									/>
									{suppliers.map((supplier) => (
										<Bar
											dataKey={supplier}
											fill={supplierColorMap[supplier]}
											isAnimationActive={false}
											key={supplier}
											maxBarSize={40}
											name={supplier}
											stackId="suppliers"
										/>
									))}
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : null}
				</Box>
			</Box>
		</Box>
	);
};

export default SupplierKPITimelineChart;
