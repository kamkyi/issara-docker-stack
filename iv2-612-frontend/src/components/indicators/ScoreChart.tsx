import { Text } from "@radix-ui/themes";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

interface ScoreChartProps {
	data: Record<string, any>[];
	dataKeys: { key: string; label: string; stroke: string }[];
	title?: string;
	xAxisKey?: string; // Allow customization of the x-axis key
	yAxisLabel?: string;
}

function ScoreChart({
	data,
	dataKeys,
	title,
	xAxisKey = "date", // Default x-axis key is 'date'
}: ScoreChartProps) {
	const { theme } = useTheme();

	const series = useMemo(() => {
		return dataKeys.map((item) => ({
			name: item.label,
			data: data.map((d) => d[item.key] || 0),
			color: item.stroke,
		}));
	}, [data, dataKeys]);

	const categories = useMemo(() => {
		return data.map((d) => d[xAxisKey]);
	}, [data, xAxisKey]);

	const chartOptions: ApexOptions = useMemo(
		() => ({
			chart: {
				type: "area",
				fontFamily: "inherit",
				toolbar: {
					show: false,
				},
				animations: {
					enabled: true,
					easing: "easeinout",
					speed: 500,
				},
				background: "transparent",
			},
			dataLabels: {
				enabled: false,
			},
			stroke: {
				curve: "smooth",
				width: 2,
			},
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.4,
					opacityTo: 0.1,
					stops: [0, 100],
				},
			},
			xaxis: {
				categories: categories,
				labels: {
					style: {
						fontSize: "12px",
						colors: theme === "dark" ? "#9ca3af" : "#6b7280",
					},
				},
				axisBorder: {
					show: true,
					color: theme === "dark" ? "#374151" : "#e5e7eb",
				},
				axisTicks: {
					show: false,
				},
			},
			yaxis: {
				labels: {
					style: {
						fontSize: "12px",
						colors: theme === "dark" ? "#9ca3af" : "#6b7280",
					},
				},
			},
			grid: {
				borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
				strokeDashArray: 4,
				opacity: 0.5,
			},
			tooltip: {
				theme: theme === "dark" ? "dark" : "light",
				x: {
					show: true,
				},
				y: {
					formatter: (val: number) => val.toString(),
				},
				style: {
					fontSize: "12px",
				},
			},
			legend: {
				fontSize: "14px",
				fontWeight: 600,
				markers: {
					size: 5,
				},
				itemMargin: {
					horizontal: 10,
					vertical: 5,
				},
			},
		}),
		[categories, theme],
	);

	return (
		<div className="scoreChartCard w-full">
			{title && (
				<Text className="mb-4 block" size="3" weight="bold">
					{title}
				</Text>
			)}
			<div className="w-full" style={{ height: 300 }}>
				<ReactApexChart
					height={300}
					options={chartOptions}
					series={series}
					type="area"
					width="100%"
				/>
			</div>
		</div>
	);
}

export default ScoreChart;
