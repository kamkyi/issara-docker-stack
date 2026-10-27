import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useTranslation } from "react-i18next";
import type {
	KpiClosureMonthlyQuality,
	KpiClosureQualityKey,
	KpiClosuresByMonthQualityData,
} from "$src/queries/kpiClosuresQuality";

interface QualitySeriesItem {
	key: KpiClosureQualityKey;
	label: string;
	color: string;
}

interface KpiClosuresByMonthQualityChartProps {
	data?: KpiClosuresByMonthQualityData | null;
	isLoading?: boolean;
	isError?: boolean;
	showDescription?: boolean;
	/**
	 * Let the chart span the whole container. Only the internal dashboard does
	 * this; the SP-facing surfaces keep it at the same reading width as the rest
	 * of their content.
	 */
	fullWidth?: boolean;
}

const formatNumber = (value: number) => value.toLocaleString();

const metricFor = (
	row: KpiClosureMonthlyQuality,
	key: KpiClosureQualityKey,
	metric: "count" | "workers",
) => {
	if (metric === "count") return Number(row[key] ?? 0);
	return Number(row[`${key}Workers` as keyof KpiClosureMonthlyQuality] ?? 0);
};

const buildTooltip = (
	row: KpiClosureMonthlyQuality,
	qualitySeries: QualitySeriesItem[],
	t: (key: string, options?: Record<string, unknown>) => string,
) => {
	const totalKpis = qualitySeries.reduce(
		(sum, item) => sum + metricFor(row, item.key, "count"),
		0,
	);
	const totalWorkers = qualitySeries.reduce(
		(sum, item) => sum + metricFor(row, item.key, "workers"),
		0,
	);

	const dateLabel = t("hrddOverview.kpiClosures.tooltip.date", {
		defaultValue: t("companyDashboard.kpiClosures.tooltip.date", {
			defaultValue: "Date",
		}),
	});
	const totalCasesLabel = t("hrddOverview.kpiClosures.tooltip.totalCases", {
		defaultValue: t("companyDashboard.kpiClosures.tooltip.totalCases", {
			defaultValue: "Total Cases",
		}),
	});
	const totalAffectedWorkersLabel = t(
		"hrddOverview.kpiClosures.tooltip.totalAffectedWorkers",
		{
			defaultValue: t(
				"companyDashboard.kpiClosures.tooltip.totalAffectedWorkers",
				{
					defaultValue: "Total Affected Workers",
				},
			),
		},
	);
	const casesSuffix = t("hrddOverview.kpiClosures.cases", {
		count: 0,
		defaultValue: t("companyDashboard.kpiClosures.cases", {
			count: 0,
			defaultValue: "cases",
		}),
	});
	const affectedWorkersSuffix = t(
		"hrddOverview.kpiClosures.tooltip.affectedWorkers",
		{
			defaultValue: t("companyDashboard.kpiClosures.tooltip.affectedWorkers", {
				defaultValue: "affected workers",
			}),
		},
	);

	const rows = qualitySeries
		.map((item) => {
			const count = metricFor(row, item.key, "count");
			const workers = metricFor(row, item.key, "workers");
			return `
			<div style="display:grid;grid-template-columns:10px 76px 1fr;gap:8px;align-items:center;margin-top:5px;">
				<span style="width:9px;height:9px;border-radius:999px;background:${item.color};display:inline-block;"></span>
				<span style="font-weight:700;color:${item.color};">${item.label}</span>
				<span style="color:#333333;">${formatNumber(count)} ${casesSuffix}, ${formatNumber(workers)} ${affectedWorkersSuffix}</span>
			</div>`;
		})
		.join("");

	return `
		<div style="font-family:'DM Sans',sans-serif;padding:10px 12px;min-width:300px;">
			<div style="font-weight:700;color:#333333;margin-bottom:4px;">${dateLabel}: ${row.month}</div>
			<div style="color:#333333;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">
				${totalCasesLabel}: ${formatNumber(totalKpis)} | ${totalAffectedWorkersLabel}: ${formatNumber(totalWorkers)}
			</div>
			${rows}
		</div>`;
};

export default function KpiClosuresByMonthQualityChart({
	data,
	isLoading = false,
	isError = false,
	showDescription = false,
	fullWidth = false,
}: KpiClosuresByMonthQualityChartProps) {
	const { t } = useTranslation();

	const qualitySeries = useMemo<QualitySeriesItem[]>(
		() => [
			{
				key: "excellent",
				label: t("hrddOverview.kpiClosures.quality.excellent", {
					defaultValue: t("companyDashboard.kpiClosures.quality.excellent", {
						defaultValue: "Excellent",
					}),
				}),
				color: "#56b4b7",
			},
			{
				key: "good",
				label: t("hrddOverview.kpiClosures.quality.good", {
					defaultValue: t("companyDashboard.kpiClosures.quality.good", {
						defaultValue: "Good",
					}),
				}),
				color: "#fdd556",
			},
			{
				key: "fair",
				label: t("hrddOverview.kpiClosures.quality.fair", {
					defaultValue: t("companyDashboard.kpiClosures.quality.fair", {
						defaultValue: "Fair",
					}),
				}),
				color: "#ffa239",
			},
			{
				key: "poor",
				label: t("hrddOverview.kpiClosures.quality.poor", {
					defaultValue: t("companyDashboard.kpiClosures.quality.poor", {
						defaultValue: "Poor",
					}),
				}),
				color: "#d34d9c",
			},
		],
		[t],
	);

	const rows = data?.monthlyQuality ?? [];
	const totals = data?.totalsByQuality;
	const grandTotal = data?.grandTotal ?? {
		kpis: 0,
		affectedWorkers: 0,
	};

	const series = useMemo(
		() =>
			qualitySeries.map((item) => ({
				name: item.label,
				data: rows.map((row) => metricFor(row, item.key, "count")),
			})),
		[qualitySeries, rows],
	);

	const options = useMemo<ApexOptions>(
		() => ({
			chart: {
				type: "bar",
				stacked: true,
				toolbar: { show: false },
				fontFamily: "DM Sans, sans-serif",
			},
			colors: qualitySeries.map((item) => item.color),
			dataLabels: { enabled: false },
			grid: {
				borderColor: "#e5e7eb",
				strokeDashArray: 0,
			},
			legend: {
				show: true,
				position: "bottom",
				horizontalAlign: "center",
				fontFamily: "DM Sans, sans-serif",
				labels: { colors: "#333333" },
				offsetY: 15,
			},
			plotOptions: {
				bar: {
					borderRadius: 4,
					columnWidth:
						rows.length < 6 ? "20px" : rows.length < 12 ? "30px" : "60%",
					horizontal: false,
				},
			},
			states: {
				hover: { filter: { type: "lighten", value: 0.04 } },
				active: { filter: { type: "none" } },
			},
			tooltip: {
				shared: true,
				intersect: false,
				custom: ({ dataPointIndex }) => {
					const row = rows[dataPointIndex];
					return row ? buildTooltip(row, qualitySeries, t) : "";
				},
			},
			xaxis: {
				categories: rows.map((row) => row.month),
				labels: {
					rotate: -75,
					trim: false,
					style: {
						colors: "#56666C",
						fontFamily: "DM Sans, sans-serif",
						fontSize: "11px",
					},
				},
				title: {
					text: t("hrddOverview.kpiClosures.xAxisTitle", {
						defaultValue: t("companyDashboard.kpiClosures.xAxisTitle", {
							defaultValue: "Date",
						}),
					}),
					offsetY: 0,
					style: {
						color: "#333333",
						fontFamily: "DM Sans, sans-serif",
						fontWeight: 700,
					},
				},
			},
			yaxis: {
				labels: {
					formatter: (value) => formatNumber(Math.round(Number(value))),
					style: {
						colors: "#56666C",
						fontFamily: "DM Sans, sans-serif",
					},
				},
				title: {
					text: t("hrddOverview.kpiClosures.yAxisTitle", {
						defaultValue: t("companyDashboard.kpiClosures.yAxisTitle", {
							defaultValue: "Cases Closed",
						}),
					}),
					style: {
						color: "#333333",
						fontFamily: "DM Sans, sans-serif",
						fontWeight: 700,
					},
				},
			},
		}),
		[qualitySeries, rows, t],
	);

	return (
		<div
			className={`mb-8 print-section-break ${fullWidth ? "" : "container mx-auto px-4"}`}
		>
			<h3
				className={`heading-display mb-3 pb-1 ${fullWidth ? "text-[32px] md:text-[32px]" : "text-[22px] md:text-[22px]"}`}
			>
				{t("hrddOverview.kpiClosures.title", {
					defaultValue: t("companyDashboard.kpiClosures.title", {
						defaultValue:
							"Labor Cases Closed, By Date & Quality of Remediation",
					}),
				})}
			</h3>
			{showDescription && (
				<div className="text-[#56666C] text-sm md:text-base leading-relaxed mb-6 space-y-2 max-w-5xl">
					<p>
						{t("hrddOverview.kpiClosures.description1", {
							defaultValue: t("companyDashboard.kpiClosures.description1", {
								defaultValue:
									"An increase in the number of cases closed does not necessarily mean that labor conditions are getting worse. It often can indicate that the supplier is open to independent worker voice channels, and that workers feel comfortable and safe providing feedback.",
							}),
						})}
					</p>
					<p>
						{t("hrddOverview.kpiClosures.description2", {
							defaultValue: t("companyDashboard.kpiClosures.description2", {
								defaultValue:
									"The quality of case closures provides a more complete picture of how effectively the suppliers are responding to worker-reported feedback. Improvement in grievance mechanisms should show an increase in good and excellent outcomes. To see longer-term trends in case responses and continuous improvement, toggle the date range filter at the top of the page.",
							}),
						})}
					</p>
				</div>
			)}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
				<div className="mb-6 flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
					{qualitySeries.map((item) => {
						const total = totals?.[item.key] ?? {
							kpis: 0,
							affectedWorkers: 0,
						};
						return (
							<div
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200/70 bg-gray-50/70 font-semibold"
								key={item.key}
							>
								<span
									className="w-2.5 h-2.5 rounded-full flex-shrink-0"
									style={{ backgroundColor: item.color }}
								/>
								<span className="font-bold" style={{ color: item.color }}>
									{item.label}:
								</span>
								<span className="text-[#333333]">
									{formatNumber(total.kpis)}{" "}
									{t("hrddOverview.kpiClosures.cases", {
										count: total.kpis,
										defaultValue: t("companyDashboard.kpiClosures.cases", {
											count: total.kpis,
											defaultValue: "cases",
										}),
									})}
								</span>
								<span className="text-gray-300">•</span>
								<span className="text-[#56666C]">
									{formatNumber(total.affectedWorkers)}{" "}
									{t("hrddOverview.kpiClosures.workers", {
										count: total.affectedWorkers,
										defaultValue: t("companyDashboard.kpiClosures.workers", {
											count: total.affectedWorkers,
											defaultValue: "workers",
										}),
									})}
								</span>
							</div>
						);
					})}
					<div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#004A60]/5 border border-[#004A60]/15 text-[#004A60] font-bold">
						<span>
							{t("hrddOverview.kpiClosures.total", {
								defaultValue: t("companyDashboard.kpiClosures.total", {
									defaultValue: "Total:",
								}),
							})}
						</span>
						<span>
							{formatNumber(grandTotal.kpis)}{" "}
							{t("hrddOverview.kpiClosures.cases", {
								count: grandTotal.kpis,
								defaultValue: t("companyDashboard.kpiClosures.cases", {
									count: grandTotal.kpis,
									defaultValue: "cases",
								}),
							})}
						</span>
						<span className="text-[#004A60]/30">•</span>
						<span>
							{formatNumber(grandTotal.affectedWorkers)}{" "}
							{t("hrddOverview.kpiClosures.workers", {
								count: grandTotal.affectedWorkers,
								defaultValue: t("companyDashboard.kpiClosures.workers", {
									count: grandTotal.affectedWorkers,
									defaultValue: "workers",
								}),
							})}
						</span>
					</div>
				</div>

				{isLoading ? (
					<div className="flex min-h-[320px] items-center justify-center text-sm text-[#56666C]">
						{t("hrddOverview.kpiClosures.loading", {
							defaultValue: t("companyDashboard.kpiClosures.loading", {
								defaultValue: "Loading KPI closures...",
							}),
						})}
					</div>
				) : isError ? (
					<div className="flex min-h-[320px] items-center justify-center text-sm text-[#FB8379]">
						{t("hrddOverview.kpiClosures.error", {
							defaultValue: t("companyDashboard.kpiClosures.error", {
								defaultValue: "Unable to load KPI closures.",
							}),
						})}
					</div>
				) : rows.length === 0 ? (
					<div className="flex min-h-[320px] items-center justify-center text-sm text-[#56666C]">
						{t("hrddOverview.kpiClosures.empty", {
							defaultValue: t("companyDashboard.kpiClosures.empty", {
								defaultValue: "No KPI closure data found.",
							}),
						})}
					</div>
				) : (
					<ReactApexChart
						height={480}
						options={options}
						series={series}
						type="bar"
					/>
				)}
			</div>
		</div>
	);
}
