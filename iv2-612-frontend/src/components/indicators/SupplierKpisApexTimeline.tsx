import { useState } from "react";
import ReactApexChart from "react-apexcharts";
import "./SupplierKpisApexTimeline.css";
import PropTypes from "prop-types";

const OPEN_COLOR = "#FB8379";
const CLOSED_COLOR = "#148696";
const OPEN_BORDER_COLOR = "#E96A5F";
const CLOSED_BORDER_COLOR = "#0F6774";

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const sanitizeTooltipHtml = (value: string) =>
	value
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
		.replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
		.replace(/\son\w+\s*=\s*'[^']*'/gi, "")
		.replace(/javascript:/gi, "");

const toTooltipHtml = (value: string) => {
	const raw = String(value || "");
	const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);

	if (looksLikeHtml) {
		return sanitizeTooltipHtml(raw);
	}

	return escapeHtml(raw).replace(/\n/g, "<br />");
};

// Helper to convert your KPI data to ApexCharts Timeline format
function toApexTimelineSeries(
	chartData: any[],
	highlightStatus: "open" | "closed" | null,
	isMultiSupplier: boolean | undefined,
	hiddenSuppliers: Set<string> = new Set(),
	hoveredSupplier: string | null = null,
	compact: boolean = false,
) {
	// chartData: array of [label, status, color, start, end, tooltip]
	// highlightStatus: 'open', 'closed', or null
	const groups: Record<string, any[]> = {};

	chartData.forEach((row) => {
		const [kpiName, , color, start, end, tooltip, supplierNameArg] = row;
		const label = kpiName == null ? "Unknown" : String(kpiName);

		// Fallback to extract supplier name from tooltip if not provided
		let supplierName = supplierNameArg;
		if (!supplierName || supplierName === "") {
			const supplierMatch = tooltip?.match(/Supplier: ([^<]+)/);
			supplierName = supplierMatch ? supplierMatch[1].trim() : "Unknown";
		}

		// Skip if supplier is hidden
		if (hiddenSuppliers.has(supplierName)) return;

		// Determine status by color (only relevant for single supplier mode)
		let status: "open" | "closed" | null = null;
		if (color === OPEN_COLOR) status = "open";
		else if (color === CLOSED_COLOR) status = "closed";

		// Highlight logic
		let displayColor = color;
		let strokeColor = "#bdbdbd"; // default subtle border
		let strokeWidth = 2; // always show a border

		if (isMultiSupplier && hoveredSupplier) {
			// Hover highlighting for multi-supplier
			if (supplierName === hoveredSupplier) {
				strokeWidth = 3;
				strokeColor = "#333";
			} else {
				// Faded color for non-hovered
				displayColor = `${color}40`; // Add transparency (40 hex = ~25% alpha)
				strokeWidth = 1;
				strokeColor = "#f0f0f0";
			}
		} else if (highlightStatus && !isMultiSupplier) {
			// Status highlighting for single supplier
			if (highlightStatus === status) {
				displayColor = status === "open" ? OPEN_COLOR : CLOSED_COLOR;
				strokeColor =
					status === "open" ? OPEN_BORDER_COLOR : CLOSED_BORDER_COLOR;
				strokeWidth = 3;
			} else {
				displayColor =
					status === "open" ? `${OPEN_COLOR}66` : `${CLOSED_COLOR}66`;
				strokeColor = "#e0e0e0";
				strokeWidth = 1;
			}
		} else {
			// Default border logic
			strokeColor =
				status === "open"
					? OPEN_BORDER_COLOR
					: status === "closed"
						? CLOSED_BORDER_COLOR
						: "#bdbdbd";
			strokeWidth = 2;
		}

		if (!groups[supplierName]) groups[supplierName] = [];
		const isDummy = color === "opacity: 0" || color === "rgba(0,0,0,0)";
		groups[supplierName].push({
			x: label,
			y: [new Date(start).getTime(), new Date(end).getTime()],
			fillColor: displayColor,
			tooltip: tooltip || label,
			strokeColor,
			strokeWidth,
			barHeight: isDummy ? 0.5 : compact ? 28 : 48,
		});
	});

	return Object.keys(groups).map((sName) => ({
		name: String(sName || "Unknown"),
		data: groups[sName],
	}));
}

export default function SupplierKpisApexTimeline({
	chartData,
	height,
	supplierLegend,
	isMultiSupplier,
	compact = false,
	showStatusLegend = true,
}: {
	chartData: any[];
	height?: number;
	supplierLegend?: Array<{ name: string; color: string }>;
	isMultiSupplier?: boolean;
	compact?: boolean;
	showStatusLegend?: boolean;
}) {
	const [highlightStatus, setHighlightStatus] = useState<
		"open" | "closed" | null
	>(null);
	const [hiddenSuppliers, setHiddenSuppliers] = useState<Set<string>>(
		new Set(),
	);
	const [hoveredSupplier, setHoveredSupplier] = useState<string | null>(null);

	const toggleSupplier = (name: string) => {
		setHiddenSuppliers((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	const uniqueLabels = Array.from(new Set(chartData.map((row) => row[0])));

	// Match the wrap logic used by the y-axis label formatter below so that
	// row spacing scales with the tallest (most-wrapped) label and labels
	// don't overlap the next row.
	const LABEL_MAX_CHARS = 22;
	const wrappedLineCount = (val: any) => {
		const str = String(val || "");
		if (str.length <= LABEL_MAX_CHARS) return 1;
		const words = str.split(/\s+/);
		let lines = 0;
		let current = "";
		for (const w of words) {
			if ((current + " " + w).trim().length <= LABEL_MAX_CHARS) {
				current = (current + " " + w).trim();
			} else {
				if (current) lines += 1;
				current = w;
			}
		}
		if (current) lines += 1;
		return Math.max(1, lines);
	};
	const maxLines = uniqueLabels.reduce(
		(max, label) => Math.max(max, wrappedLineCount(label)),
		1,
	);
	// 18px per wrapped line + 24px padding; never shorter than the bar (48 + breathing room).
	const rowHeight = Math.max(
		compact ? 60 : 64,
		maxLines * 10 + (compact ? 10 : 24),
	);
	const dynamicHeight = uniqueLabels.length * rowHeight + (compact ? 30 : 80);
	const chartHeight = height || dynamicHeight;
	const barHeightPx = compact ? 30 : 48;

	const series = toApexTimelineSeries(
		chartData,
		highlightStatus,
		isMultiSupplier,
		hiddenSuppliers,
		hoveredSupplier,
		compact,
	);

	const isLargeScreen =
		typeof window !== "undefined" && window.innerWidth > 1440;
	const yAxisWidth = isLargeScreen ? 620 : 500;

	const options = {
		chart: {
			type: "rangeBar" as const,
			height,
			toolbar: { show: false },
			zoom: { enabled: false },
			pan: { enabled: false },
		},
		plotOptions: {
			bar: {
				horizontal: true,
				barHeight: barHeightPx,
				rangeBarGroupRows: true,
				dataLabels: {
					maxItems: 100,
					hideOverflowingLabels: false,
				},
				label: { maxWidth: 600 },
			},
		},
		yaxis: {
			labels: {
				offsetX: compact ? 8 : 12,
				style: {
					fontSize: compact ? "12px" : "13px",
				},
				maxWidth: yAxisWidth,
				formatter: (val: any) => {
					// Wrap labels at word boundaries with explicit line breaks
					const maxChars = compact ? 24 : 30;
					const str = String(val || "");
					if (str.length <= maxChars) return str;
					// Split into words and build lines without breaking words
					const words = str.split(/\s+/);
					const lines: string[] = [];
					let current = "";
					for (const w of words) {
						const next = (current + " " + w).trim();
						if (next.length <= maxChars) {
							current = next;
						} else {
							if (current) lines.push(current);
							current = w;
						}
					}
					if (current) lines.push(current);
					return lines;
				},
			},
			width: yAxisWidth,
		},
		xaxis: {
			type: "datetime" as const,
			labels: {
				formatter: (value: number) => {
					const date = new Date(value);
					return date.toLocaleString("default", {
						month: "short",
						year: "numeric",
					});
				},
				style: { fontSize: compact ? "12px" : "13px" },
			},
			tickAmount: 10,
			min:
				chartData && chartData.length > 0
					? new Date(
							Math.min(...chartData.map((row) => new Date(row[3]).getTime())),
						).getTime()
					: undefined,
			max:
				chartData && chartData.length > 0
					? new Date(
							Math.max(...chartData.map((row) => new Date(row[4]).getTime())),
						).getTime()
					: undefined,
		},
		tooltip: {
			followCursor: true,
			intersect: false,
			shared: false,
			custom: ({ seriesIndex, dataPointIndex, w }: any) => {
				const d = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
				const tooltipText = String(d.tooltip || d.x || "");
				const tooltipHtml = toTooltipHtml(tooltipText);

				return `
					<div class="timeline-apex-tooltip">
						<div class="timeline-apex-tooltip__text">${tooltipHtml}</div>
					</div>
				`;
			},
		},
		grid: {
			padding: {
				left: compact ? 20 : 36,
				right: compact ? 16 : 30,
			},
		},
		legend: { show: false },
		dataLabels: { enabled: false },
	};

	return (
		<div className="timeline-apex-wrapper relative z-50 px-2 overflow-visible">
			<ReactApexChart
				height={chartHeight}
				options={options}
				series={series}
				type="rangeBar"
			/>

			{isMultiSupplier && supplierLegend && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "center",
						gap: "16px",
						marginTop: "24px",
						marginBottom: "8px",
						fontSize: "13px",
					}}
				>
					{supplierLegend.map((s) => (
						<div
							key={s.name}
							onClick={() => toggleSupplier(s.name)}
							onMouseEnter={() => setHoveredSupplier(s.name)}
							onMouseLeave={() => setHoveredSupplier(null)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								opacity: hiddenSuppliers.has(s.name) ? 0.3 : 1,
								transform:
									hoveredSupplier === s.name ? "scale(1.05)" : "scale(1)",
								transition: "all 0.2s",
								userSelect: "none",
								fontWeight: hoveredSupplier === s.name ? "bold" : "normal",
							}}
						>
							<div
								style={{
									width: 14,
									height: 14,
									backgroundColor: hiddenSuppliers.has(s.name)
										? "#ccc"
										: s.color,
									borderRadius: 3,
									transition: "background-color 0.2s",
									boxShadow:
										hoveredSupplier === s.name
											? "0 0 4px rgba(0,0,0,0.3)"
											: "none",
								}}
							/>
							<span
								style={{
									textDecoration: hiddenSuppliers.has(s.name)
										? "line-through"
										: "none",
								}}
							>
								{s.name}
							</span>
						</div>
					))}
				</div>
			)}

			{!isMultiSupplier && showStatusLegend && (
				<div
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: "24px",
						marginTop: compact ? "8px" : "16px",
						fontSize: "15px",
						userSelect: "none",
						cursor: "pointer",
					}}
				>
					<span
						onClick={() =>
							setHighlightStatus(highlightStatus === "open" ? null : "open")
						}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontWeight: highlightStatus === "open" ? "bold" : "normal",
							opacity: highlightStatus && highlightStatus !== "open" ? 0.5 : 1,
						}}
					>
						<span
							style={{
								width: 18,
								height: 18,
								background: OPEN_COLOR,
								borderRadius: 3,
								display: "inline-block",
								border: "2px solid #ccc",
								boxShadow:
									highlightStatus === "open"
										? `0 0 0 2px ${OPEN_BORDER_COLOR}`
										: "none",
							}}
						/>
						Open
					</span>
					<span
						onClick={() =>
							setHighlightStatus(highlightStatus === "closed" ? null : "closed")
						}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "6px",
							fontWeight: highlightStatus === "closed" ? "bold" : "normal",
							opacity:
								highlightStatus && highlightStatus !== "closed" ? 0.5 : 1,
						}}
					>
						<span
							style={{
								width: 18,
								height: 18,
								background: CLOSED_COLOR,
								borderRadius: 3,
								display: "inline-block",
								border: "2px solid #ccc",
								boxShadow:
									highlightStatus === "closed"
										? `0 0 0 2px ${CLOSED_BORDER_COLOR}`
										: "none",
							}}
						/>
						Closed
					</span>
				</div>
			)}
		</div>
	);
}

SupplierKpisApexTimeline.propTypes = {
	chartData: PropTypes.array.isRequired,
	height: PropTypes.number,
	supplierLegend: PropTypes.array,
	isMultiSupplier: PropTypes.bool,
	compact: PropTypes.bool,
	showStatusLegend: PropTypes.bool,
};
