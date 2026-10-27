import { useTheme } from "next-themes";
import type React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export interface StackedBarData {
	name: string;
	[key: string]: string | number;
}

interface DataKey {
	key: string;
	name: string;
	color: string;
}

interface VerticalStackedBarChartProps {
	data: StackedBarData[];
	dataKeys: DataKey[];
	xKey?: string;
	height?: number;
	showGrid?: boolean;
	showLegend?: boolean;
	showTooltip?: boolean;
	showXAxis?: boolean;
	showYAxis?: boolean;
	barRadius?: number;
	className?: string;
}

const VerticalStackedBarChart: React.FC<VerticalStackedBarChartProps> = ({
	data,
	dataKeys,
	xKey = "name",
	height = 250,
	showGrid = true,
	showLegend = true,
	showTooltip = true,
	showXAxis = true,
	showYAxis = true,
	barRadius = 10,
	className = "",
}) => {
	const { theme } = useTheme();

	const customTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			return (
				<div
					className="p-3 rounded-md shadow-lg border"
					style={{
						background:
							theme === "dark"
								? "rgba(0, 0, 0, 0.9)"
								: "rgba(255, 255, 255, 0.95)",
						borderColor: theme === "dark" ? "#148696" : "#e0e0e0",
					}}
				>
					<p className="font-semibold text-sm mb-2">{label}</p>
					{payload.map((entry: any, index: number) => (
						<div className="flex items-center gap-2 text-xs" key={index}>
							<div
								className="w-3 h-3 rounded"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="font-medium">{entry.name}:</span>
							<span className="font-bold">{entry.value}</span>
						</div>
					))}
					<div className="border-t mt-2 pt-2 text-xs font-bold">
						Total:{" "}
						{payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
					</div>
				</div>
			);
		}
		return null;
	};

	return (
		<div className={`w-full ${className}`} style={{ height }}>
			<ResponsiveContainer height="100%" width="100%">
				<BarChart
					data={data}
					margin={{
						top: 20,
						right: 30,
						left: 20,
						bottom: 5,
					}}
				>
					{showGrid && (
						<CartesianGrid
							stroke={
								theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
							}
							strokeDasharray="3 3"
						/>
					)}

					{showXAxis && (
						<XAxis
							axisLine={{
								stroke:
									theme === "dark"
										? "rgba(255,255,255,0.2)"
										: "rgba(0,0,0,0.2)",
							}}
							dataKey={xKey}
							interval={0}
							tick={(props) => {
								const { x, y, payload } = props;
								const words = payload.value.split(" ");

								return (
									<g transform={`translate(${x},${y})`}>
										{words.map((word: string, index: number) => (
											<text
												fill={theme === "dark" ? "#ffffff" : "#666666"}
												fontSize={12}
												key={index}
												textAnchor="middle"
												x={0}
												y={index * 13}
											>
												{word}
											</text>
										))}
									</g>
								);
							}}
						/>
					)}

					{showYAxis && (
						<YAxis
							allowDecimals={false}
							axisLine={{
								stroke:
									theme === "dark"
										? "rgba(255,255,255,0.2)"
										: "rgba(0,0,0,0.2)",
							}}
							label={{
								value: "Count",
								angle: -90,
								position: "insideLeft",
								offset: 10,
								fill: theme === "dark" ? "#ffffff" : "#666666",
								fontSize: 12,
							}}
							tick={{
								fontSize: 12,
								fill: theme === "dark" ? "#ffffff" : "#666666",
							}}
						/>
					)}

					{showTooltip && <Tooltip content={customTooltip} />}

					{showLegend && (
						<Legend
							wrapperStyle={{
								fontSize: "12px",
								paddingTop: 20,
							}}
						/>
					)}

					{dataKeys.map((dataKey, index) => (
						<Bar
							dataKey={dataKey.key}
							fill={dataKey.color}
							key={dataKey.key}
							name={dataKey.name}
							radius={
								index === dataKeys.length - 1
									? [barRadius, barRadius, 0, 0]
									: [0, 0, 0, 0]
							}
							stackId="stack"
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default VerticalStackedBarChart;
