import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { statusColorPalette } from "$src/assets/mock/common-data";

interface SupplierKPISummary {
	name: string;
	value: number;
}

interface SummaryOpenOrClosedCardProps {
	supplierKPISummary: SupplierKPISummary[];
}

const SummaryOpenOrClosedCard: React.FC<SummaryOpenOrClosedCardProps> = ({
	supplierKPISummary = [],
}) => {
	const totalIssues = useMemo(() => {
		return supplierKPISummary.reduce((sum, item) => sum + (item.value || 0), 0);
	}, [supplierKPISummary]);

	const COLORS = statusColorPalette;

	const chartOptions: ApexOptions = useMemo(
		() => ({
			chart: {
				type: "donut",
				fontFamily: "inherit",
			},
			labels: supplierKPISummary.map((item) => item.name),
			colors: COLORS,
			dataLabels: {
				enabled: true,
				formatter: (val: number) => (val >= 5 ? `${val.toFixed(0)}%` : ""),
				style: {
					fontSize: "12px",
					fontWeight: "bold",
					colors: ["#fff"],
				},
				dropShadow: {
					enabled: false,
				},
			},
			plotOptions: {
				pie: {
					donut: {
						size: "70%",
						labels: {
							show: true,
							name: {
								show: false,
							},
							value: {
								show: true,
								fontSize: "24px",
								fontWeight: "bold",
								color: "#374151",
								formatter: () => `Total: ${totalIssues}`,
								offsetY: 30,
							},
							total: {
								show: true,
								showAlways: true,
								label: "",
								fontSize: "24px",
								fontWeight: "bold",
								color: "#374151",
								formatter: () => `Total: ${totalIssues}`,
							},
						},
					},
				},
			},
			legend: {
				show: true,
				position: "right",
				horizontalAlign: "center",
				fontSize: "14px",
				fontWeight: 400,
				offsetX: -50,
				offsetY: 35,
				formatter: (seriesName: string, opts?: any) => {
					return `${seriesName} (${opts.w.globals.series[opts.seriesIndex]})`;
				},
				markers: {
					size: 6,
				},
			},
			tooltip: {
				y: {
					formatter: (val: number) => `Total: ${val}`,
				},
			},
			stroke: {
				width: 2,
				colors: ["#fff"],
			},
		}),
		[supplierKPISummary, COLORS, totalIssues],
	);

	const series = useMemo(
		() => supplierKPISummary.map((item) => item.value),
		[supplierKPISummary],
	);

	return (
		<div className="p-4 mb-4">
			<div className="text-center mb-4">
				<h1 className="text-lg font-bold mb-2">
					Summary of KPI Issues by Category
				</h1>
				{/* <p className="text-xs">
                    THE GRAPH REPRESENTS KPI ISSUES BY CATEGORY FROM THE SUPPLIER KPI SUMMARY API. TOTAL COUNTS FOR EACH LABOR CATEGORY ARE PRESENTED BELOW
                </p> */}
			</div>

			{supplierKPISummary.length > 0 ? (
				<div className="flex items-center justify-center">
					<ReactApexChart
						height={320}
						options={chartOptions}
						series={series}
						type="donut"
						width={600}
					/>
				</div>
			) : (
				<div className="text-center py-8 text-gray-500">
					No data available for chart
				</div>
			)}
		</div>
	);
};

export default SummaryOpenOrClosedCard;
