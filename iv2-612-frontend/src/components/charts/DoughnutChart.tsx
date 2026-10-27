import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import ReactApexChart from "react-apexcharts";
import { statusColorPalette } from "$src/assets/mock/common-data";
import type { DoughnutChartProps } from "$src/types/charts";

const DoughnutChart: React.FC<DoughnutChartProps> = ({
	data,
	title = "",
	subtitle = "Total recruited",
}) => {
	const { theme } = useTheme();
	const chartData = data;

	// Color palette that matches your theme
	const colorPalette = statusColorPalette;

	// Assign colors if not provided
	const dataWithColors = chartData?.map((item, index) => ({
		...item,
		color: item.color || colorPalette[index],
	}));

	// ApexCharts configuration
	const chartOptions: ApexOptions = {
		chart: {
			type: "donut",
			background: "transparent",
			toolbar: {
				show: false,
			},
		},
		colors: dataWithColors?.map((item) => item.color),
		labels: dataWithColors?.map((item) => item.name),
		legend: {
			show: true,
			position: "bottom",
			horizontalAlign: "center",
			fontSize: "12px",
			labels: {
				colors: theme === "dark" ? "#e4e4e4" : "#004A60",
			},
		},
		plotOptions: {
			pie: {
				donut: {
					size: "65%",
					labels: {
						show: true,
						name: {
							show: true,
							fontSize: "14px",
							color: theme === "dark" ? "#e4e4e4" : "#004A60",
						},
						value: {
							show: true,
							fontSize: "28px",
							fontWeight: "bold",
							color: theme === "dark" ? "#e4e4e4" : "#004A60",
							formatter: (val) => val.toString(),
						},
						total: {
							show: true,
							showAlways: true,
							label: subtitle,
							fontSize: "14px",
							fontWeight: "normal",
							color:
								theme === "dark"
									? "rgba(228, 228, 228, 0.7)"
									: "rgba(5, 81, 106, 0.7)",
							formatter: () => {
								return title;
							},
						},
					},
				},
			},
		},
		dataLabels: {
			enabled: false,
		},
		tooltip: {
			enabled: true,
			theme: theme === "dark" ? "dark" : "light",
			y: {
				formatter: (val) => val.toLocaleString(),
			},
		},
		stroke: {
			show: false,
		},
	};

	const series = dataWithColors?.map((item) => item.value);

	return (
		<div style={{ width: "100%", minHeight: "350px" }}>
			<ReactApexChart
				height={380}
				options={chartOptions}
				series={series}
				type="donut"
			/>
		</div>
	);
};

export default DoughnutChart;
