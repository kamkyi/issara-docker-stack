import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface GrievanceChartProps {
	grievanceData: Array<{
		date: string;
		systemMeanLevel2: number;
		systemMeanLevel34: number;
		companyMeanLevel2: number;
		companyMeanLevel34: number;
	}>;
}

const GrievanceChart = ({ grievanceData }: GrievanceChartProps) => {
	const option = useMemo(() => {
		const gd = grievanceData || [];

		// compute dynamic y-axis max from data (with a small headroom)
		const allValues = gd.flatMap((d) => [
			d.systemMeanLevel2,
			d.systemMeanLevel34,
			d.companyMeanLevel2,
			d.companyMeanLevel34,
		]);
		const numericValues = allValues.filter(
			(v) => typeof v === "number" && !Number.isNaN(v),
		);
		const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 80;
		const yMax = Math.max(Math.ceil(maxVal / 10) * 10 + 10, 10);
		const xLabels = gd.map((d) =>
			new Date(d.date).toLocaleDateString("en-GB", {
				month: "short",
				year: "2-digit",
			}),
		);
		return {
			tooltip: { trigger: "axis" },
			legend: {
				data: [
					"System Average (Early Warning)",
					"System Average (Forced Labor Risk)",
					"Company Average (Early Warning)",
					"Company Average (Forced Labor Risk)",
				],
				bottom: 0,
				textStyle: { fontSize: 11 },
			},
			grid: { left: 60, right: 20, top: 20, bottom: 60 },
			xAxis: { type: "category", data: xLabels, axisLabel: { fontSize: 11 } },
			yAxis: {
				type: "value",
				min: 0,
				max: yMax,
				name: "Avg Days",
				nameTextStyle: { fontSize: 10 },
				axisLabel: { fontSize: 10 },
			},
			series: [
				{
					name: "System Average (Early Warning)",
					type: "line",
					data: gd.map((d) => d.systemMeanLevel2),
					lineStyle: { type: "dashed", color: "#1E88E5" },
					itemStyle: { color: "#1E88E5" },
					symbol: "circle",
					symbolSize: 5,
				},
				{
					name: "System Average (Forced Labor Risk)",
					type: "line",
					data: gd.map((d) => d.systemMeanLevel34),
					lineStyle: { type: "dashed", color: "#FCD34D" },
					itemStyle: { color: "#FCD34D" },
					symbol: "triangle",
					symbolSize: 5,
				},
				{
					name: "Company Average (Early Warning)",
					type: "line",
					data: gd.map((d) => d.companyMeanLevel2),
					lineStyle: { type: "solid", color: "#10B981" },
					itemStyle: { color: "#10B981" },
					symbol: "diamond",
					symbolSize: 5,
				},
				{
					name: "Company Average (Forced Labor Risk)",
					type: "line",
					data: gd.map((d) => d.companyMeanLevel34),
					lineStyle: { type: "solid", color: "#D97706" },
					itemStyle: { color: "#D97706" },
					symbol: "rect",
					symbolSize: 5,
				},
			],
		};
	}, [grievanceData]);

	if (!grievanceData || grievanceData.length === 0) {
		return (
			<div className="h-[400px] flex items-center justify-center text-gray-400 text-sm">
				No data available for the selected date range.
			</div>
		);
	}

	return (
		<ReactECharts
			notMerge
			option={option}
			style={{ height: "400px", width: "100%" }}
		/>
	);
};

export default GrievanceChart;
