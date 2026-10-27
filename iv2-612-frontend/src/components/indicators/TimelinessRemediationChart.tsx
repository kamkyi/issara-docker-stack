import { useMemo, useState } from "react";
import {
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	type TooltipProps,
	XAxis,
	YAxis,
} from "recharts";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";

// import kpiCategoriesData from "../../assets/mock/kpi-categories.json";

const stripLaborPrefix = (s: string) => s.replace(/^Labor\s*-\s*/i, "");

export type DataPoint = {
	id: string;
	issueCategory: string;
	kpiDescription: string;
	level: 2 | 3 | 4;
	receivedVia: string;
	timeToClose: number;
	quality: string; // now a string like 'poor', 'good', etc.
	date?: string;
};

// Helper to extract unique categories from data
function getUniqueCategories(data: DataPoint[]): string[] {
	return Array.from(new Set(data.map((d) => d.issueCategory)));
}

type Props = {
	data: DataPoint[];
	onCategoryChange: (value: string) => void;
	onDateRangeChange: (value: string) => void;
};

type ShapeProps = {
	cx: number;
	cy: number;
};

const COLORS: Record<string, string> = {
	"Labor - Working conditions": "#FF0000", // Red
	Recruitment: "#FF9900", // Orange
	"Labor - Employer-employee relations": "#009900", // Green
	"Labor - Living and eating conditions": "#0066FF", // Blue
	Wages: "#9900FF", // Violet
};

const CATEGORY_SHAPES: Record<
	string,
	"circle" | "triangle" | "square" | "diamond" | "star"
> = {
	"Labor - Working conditions": "circle",
	Recruitment: "triangle",
	"Labor - Employer-employee relations": "square",
	"Labor - Living and eating conditions": "diamond",
	Wages: "star",
};

const SHAPE_SIZE = 6;

function renderShape(shapeType: string, cx: number, cy: number, color: string) {
	// Guard against invalid coordinates
	if (
		typeof cx !== "number" ||
		typeof cy !== "number" ||
		!Number.isFinite(cx) ||
		!Number.isFinite(cy)
	) {
		// return an empty group so the caller always receives a valid React element
		return <g />;
	}

	switch (shapeType) {
		case "circle":
			return <circle cx={cx} cy={cy} fill={color} r={SHAPE_SIZE} />;
		case "triangle":
			return (
				<path
					d={`M ${cx} ${cy - SHAPE_SIZE} L ${cx - SHAPE_SIZE} ${cy + SHAPE_SIZE} L ${cx + SHAPE_SIZE} ${cy + SHAPE_SIZE} Z`}
					fill={color}
				/>
			);
		case "square":
			return (
				<rect
					fill={color}
					height={2 * SHAPE_SIZE}
					width={2 * SHAPE_SIZE}
					x={cx - SHAPE_SIZE}
					y={cy - SHAPE_SIZE}
				/>
			);
		case "diamond":
			return (
				<polygon
					fill={color}
					points={`${cx},${cy - SHAPE_SIZE} ${cx - SHAPE_SIZE},${cy} ${cx},${cy + SHAPE_SIZE} ${cx + SHAPE_SIZE},${cy}`}
				/>
			);
		case "star": {
			const r = SHAPE_SIZE;
			const r2 = SHAPE_SIZE * 0.4;
			const angle = Math.PI / 5;
			let points = "";
			for (let j = 0; j < 10; j++) {
				const ang = angle * j - Math.PI / 2;
				const rcur = j % 2 === 0 ? r : r2;
				const x = cx + Math.cos(ang) * rcur;
				const y = cy + Math.sin(ang) * rcur;
				points += `${x},${y} `;
			}
			return <polygon fill={color} points={points.trim()} />;
		}
		default:
			return <circle cx={cx} cy={cy} fill={color} r={SHAPE_SIZE} />;
	}
}

export default function TimelinessRemediationChart({
	data,
	onCategoryChange,
	onDateRangeChange,
}: Props) {
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedDateRange, setSelectedDateRange] = useState("");

	// --- MAPPING LOGIC: transform API data to DataPoint[] or pass through mock data ---
	// Wrap in useMemo to prevent expensive re-calculations on every render
	const mappedData = useMemo(() => {
		const allowedQualities = ["poor", "fair", "good", "very_good", "excellent"];

		const normalizeQuality = (raw: any): string | null => {
			if (raw == null) return null;
			const asNumber = Number(raw);
			if (!Number.isNaN(asNumber)) {
				const map: Record<number, string> = {
					1: "poor",
					2: "fair",
					3: "good",
					4: "very_good",
					5: "excellent",
				};
				return map[asNumber] || null;
			}
			return String(raw).toLowerCase().trim().replace(/\s+/g, "_");
		};

		return data
			.map((item: any) => {
				// Check if this is already in DataPoint format (mock data)
				if (
					item.timeToClose !== undefined &&
					item.quality &&
					item.issueCategory &&
					item.kpiDescription
				) {
					const normalized = normalizeQuality(item.quality);
					if (!normalized || !allowedQualities.includes(normalized))
						return null;
					return {
						id: String(item.id || Math.random().toString()),
						issueCategory: item.issueCategory,
						kpiDescription: item.kpiDescription,
						level: (item.level as 2 | 3 | 4) || 2,
						receivedVia: item.receivedVia || "",
						timeToClose: item.timeToClose,
						quality: normalized,
						date: item.date || undefined,
					} as DataPoint;
				}

				// Otherwise, transform from API format
				const openedRaw = item.opened_at || item.openedAt;
				const closedRaw = item.closed_at || item.closedAt;
				const opened = openedRaw ? new Date(openedRaw) : null;
				const closed = closedRaw ? new Date(closedRaw) : null;
				if (!openedRaw || !closedRaw) {
					return null;
				}
				if (
					!opened ||
					!closed ||
					Number.isNaN(opened.getTime()) ||
					Number.isNaN(closed.getTime())
				) {
					return null;
				}
				// Try top-level close quality fields
				let qualityRaw =
					item.close_quality ||
					item.closeQuality ||
					item.closure_quality ||
					item.closureQuality;
				if (!qualityRaw && typeof item.close_quality === "string")
					qualityRaw = item.close_quality;
				if (!qualityRaw && typeof item.closeQuality === "string")
					qualityRaw = item.closeQuality;

				// Inspect nested supplier-level records for close quality if top-level missing
				if (!qualityRaw && Array.isArray(item.supplierKpis)) {
					for (const sk of item.supplierKpis) {
						if (sk == null) continue;
						qualityRaw =
							qualityRaw ||
							sk.close_quality ||
							sk.closeQuality ||
							sk.closure_quality ||
							sk.closureQuality ||
							sk.quality;
						if (qualityRaw) break;
					}
				}

				// If still missing, fall back to default 'good' so points display (prefer showing data over hiding)
				if (!qualityRaw) {
					qualityRaw = "good";
				}

				let quality = normalizeQuality(qualityRaw);
				if (!quality || !allowedQualities.includes(quality)) {
					// If normalization produced unexpected value, fallback to 'good'
					// eslint-disable-next-line no-console
					console.warn(
						"TimelinessRemediationChart: normalized quality not allowed",
						qualityRaw,
						quality,
					);
					quality = "good";
				}
				let receivedVia = "";
				if (Array.isArray(item.cases) && item.cases.length > 0) {
					receivedVia =
						item.cases[0].received_via || item.cases[0].receivedVia || "";
				}
				let issueCategory = "Unknown";
				if (item.kpi_category?.name) issueCategory = item.kpi_category.name;
				else if (item.category?.name) issueCategory = item.category.name;
				else if (item.category_name) issueCategory = item.category_name;
				else if (item.issue_category) issueCategory = item.issue_category;
				else if (item.issueCategory) issueCategory = item.issueCategory;
				return {
					id: String(item.id || item._id || Math.random().toString()),
					issueCategory,
					kpiDescription:
						item.description ||
						item.kpi_description ||
						item.kpiDescription ||
						"",
					level: (item.level as 2 | 3 | 4) || 2,
					receivedVia,
					timeToClose: Math.round(
						(closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24),
					),
					quality,
					date: closedRaw || undefined,
				} as DataPoint;
			})
			.filter((d): d is DataPoint => Boolean(d));
	}, [data]);

	// Debug: when input exists but mapping yields none, log to console in dev
	if (import.meta.env.MODE !== "production") {
		if (Array.isArray(data) && data.length > 0) {
			// eslint-disable-next-line no-console
			console.debug(
				"TimelinessRemediationChart: incoming data count",
				data.length,
			);
			// eslint-disable-next-line no-console
			console.debug(
				"TimelinessRemediationChart: mappedData count",
				mappedData.length,
			);
			if (mappedData.length === 0) {
				// eslint-disable-next-line no-console
				console.warn(
					"TimelinessRemediationChart: No valid points after mapping. First item:",
					data[0],
				);
			}
		}
	}

	const filteredData = useMemo(() => {
		// Filtering logic
		const getFilteredDataByDate = (data: DataPoint[], range: string) => {
			const now = new Date();
			const startDate = new Date();
			switch (range) {
				case "last30":
					startDate.setDate(now.getDate() - 30);
					break;
				case "last90":
					startDate.setDate(now.getDate() - 90);
					break;
				case "last180":
					startDate.setDate(now.getDate() - 180);
					break;
				default:
					return data;
			}

			return data.filter((item) => {
				if (!item.date) return true;
				const itemDate = new Date(item.date);
				return itemDate >= startDate && itemDate <= now;
			});
		};

		const filteredByCategory = selectedCategory
			? mappedData.filter((d) => d.issueCategory === selectedCategory)
			: mappedData;

		const baseFilteredData = selectedDateRange
			? getFilteredDataByDate(filteredByCategory, selectedDateRange)
			: filteredByCategory;

		// Slice data to show maximum 150 at X-axis value
		return baseFilteredData.filter((d) => d.timeToClose <= 150);
	}, [mappedData, selectedCategory, selectedDateRange]);

	const uniqueCategories = useMemo(
		() => getUniqueCategories(filteredData),
		[filteredData],
	);

	// For the dropdown, use unique categories from all mappedData
	const allCategories = getUniqueCategories(mappedData);

	// Quality order for axis and legend
	const qualityOrder = ["poor", "fair", "good", "very_good", "excellent"];
	const qualityLabels: Record<string, string> = {
		poor: "Poor",
		fair: "Fair",
		good: "Good",
		very_good: "Very Good",
		excellent: "Excellent",
	};

	return (
		<div className="w-full">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
				<div className="relative">
					<select
						className="w-full appearance-none border border-gray-300 rounded-xs px-3 py-2 pl-3 pr-10 text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
						onChange={(e) => {
							setSelectedCategory(e.target.value);
							onCategoryChange(e.target.value);
						}}
						value={selectedCategory}
					>
						<option value="">All issue categories</option>
						{allCategories.map((cat) => (
							<option key={cat} value={cat}>
								{stripLaborPrefix(cat)}
							</option>
						))}
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
						<svg
							className="fill-current h-4 w-4"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
						</svg>
					</div>
				</div>
				<div className="relative">
					<select
						className="w-full appearance-none border border-gray-300 rounded-xs px-3 py-2 pl-3 pr-10 text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
						onChange={(e) => {
							setSelectedDateRange(e.target.value);
							onDateRangeChange(e.target.value);
						}}
						value={selectedDateRange}
					>
						<option value="">All time periods</option>
						<option value="last30">Last 30 days</option>
						<option value="last90">Last 90 days</option>
						<option value="last180">Last 6 months</option>
						<option value="last365">Last year</option>
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
						<svg
							className="fill-current h-4 w-4"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
						</svg>
					</div>
				</div>
			</div>
			<ResponsiveContainer height={450} width="100%">
				<ScatterChart
					margin={{ top: 20, right: 40, bottom: 80, left: 20 }}
					style={{ fontFamily: "DM Sans" }}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="timeToClose"
						domain={[0, 150]}
						label={{
							value: "Time to case closure (days)",
							position: "insideBottom",
							offset: -5,
							style: {
								textAnchor: "middle",
								fill: "#4a5568",
								fontSize: 13,
								fontWeight: 500,
								fontFamily: "DM Sans",
							},
						}}
						name="Time to case closure (days)"
						tick={{ fill: "#718096", fontFamily: "DM Sans" }}
						type="number"
					/>
					<YAxis
						dataKey="quality"
						domain={qualityOrder}
						label={{
							value: "Quality of remediation",
							angle: -90,
							position: "insideLeft",
							style: {
								textAnchor: "middle",
								fill: "#4a5568",
								fontSize: 13,
								fontWeight: 500,
								fontFamily: "DM Sans",
							},
							dy: 60,
						}}
						name="Quality of remediation"
						tick={{ fill: "#718096", fontFamily: "DM Sans" }}
						tickFormatter={(val) => qualityLabels[val] || val}
						type="category"
						width={100}
					/>
					<Tooltip
						content={({
							active,
							payload,
						}: TooltipProps<ValueType, NameType>) => {
							if (active && payload && payload.length) {
								const {
									issueCategory,
									kpiDescription,
									level,
									receivedVia,
									timeToClose,
									quality,
								} = payload[0].payload as DataPoint;
								return (
									<div
										className="bg-white border border-gray-200 p-3 rounded-md shadow-md"
										style={{ fontFamily: "DM Sans" }}
									>
										<p className="font-medium text-teal-700 border-b pb-1 mb-2">
											{stripLaborPrefix(issueCategory)}
										</p>
										<p className="text-sm mb-1">
											<span className="font-semibold text-gray-700">KPI:</span>{" "}
											{kpiDescription}
										</p>
										<p className="text-sm mb-1">
											<span className="font-semibold text-gray-700">
												Level:
											</span>{" "}
											{level}
										</p>
										<p className="text-sm mb-1">
											<span className="font-semibold text-gray-700">
												Received Via:
											</span>{" "}
											{receivedVia}
										</p>
										<div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t">
											<p className="text-sm">
												<span className="font-semibold text-gray-700">
													Time:
												</span>{" "}
												{timeToClose} days
											</p>
											<p className="text-sm">
												<span className="font-semibold text-gray-700">
													Quality:
												</span>{" "}
												{qualityLabels[quality] || quality}
											</p>
										</div>
									</div>
								);
							}
							return null;
						}}
					/>
					<Legend
						align="center"
						layout="horizontal"
						verticalAlign="bottom"
						wrapperStyle={{
							paddingTop: 20,
							paddingBottom: 10,
							fontFamily: "DM Sans",
						}}
					/>
					{uniqueCategories.map((cat) => (
						<Scatter
							data={filteredData.filter((d) => d.issueCategory === cat)}
							fill={COLORS[cat] || "#148696"}
							key={cat}
							name={stripLaborPrefix(cat)}
							shape={(props) => {
								const { cx, cy } = props as ShapeProps;
								return renderShape(
									CATEGORY_SHAPES[cat] || "circle",
									cx,
									cy,
									COLORS[cat] || "#148696",
								);
							}}
						/>
					))}
				</ScatterChart>
			</ResponsiveContainer>
		</div>
	);
}
