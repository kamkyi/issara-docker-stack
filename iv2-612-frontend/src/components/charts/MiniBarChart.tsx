import { useTheme } from "next-themes";
import type React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";

interface MiniBarChartProps {
	data?: Array<{ name: string; value: number }>;
	color?: string;
	height?: number;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
	data,
	color = "#148696",
	height = 40,
}) => {
	// Default data if none provided
	const defaultData = [
		{ name: "Jan", value: 12 },
		{ name: "Feb", value: 19 },
		{ name: "Mar", value: 15 },
		{ name: "Apr", value: 25 },
		{ name: "May", value: 22 },
		{ name: "Jun", value: 30 },
		{ name: "Jul", value: 28 },
	];

	const chartData = data || defaultData;
	const { theme } = useTheme();
	return (
		<div style={{ width: "100%", height: height }}>
			<ResponsiveContainer height="100%" width="100%">
				<BarChart
					data={chartData}
					margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
				>
					<Bar
						dataKey="value"
						fill={color}
						opacity={0.8}
						radius={[2, 2, 0, 0]}
					/>
					<Tooltip
						contentStyle={{
							background:
								theme === "dark"
									? "rgba(0, 0, 0, 0.6)"
									: "rgba(255, 255, 255, 0.8)",
							borderRadius: 5,
							padding: 3,
							fontSize: 12,
							gap: 0,
						}}
						itemStyle={{ fontWeight: "bold" }}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default MiniBarChart;
