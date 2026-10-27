import { useTheme } from "next-themes";
import type React from "react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// Modified dummy data with poll counts by year
const dummyData = [
	{
		year: 2020,
		Myanmar: 25,
		Thailand: 50,
		Nepal: 8,
		Bangladesh: 15,
		India: 5,
		Cambodia: 4,
		Malaysia: 0,
	},
	{
		year: 2021,
		Myanmar: 35,
		Thailand: 145,
		Nepal: 12,
		Bangladesh: 18,
		India: 6,
		Cambodia: 5,
		Malaysia: 0,
	},
	{
		year: 2022,
		Myanmar: 42,
		Thailand: 120,
		Nepal: 16,
		Bangladesh: 22,
		India: 8,
		Cambodia: 7,
		Malaysia: 0,
	},
	{
		year: 2023,
		Myanmar: 18,
		Thailand: 155,
		Nepal: 14,
		Bangladesh: 19,
		India: 6,
		Cambodia: 6,
		Malaysia: 0,
	},
	{
		year: 2024,
		Myanmar: 48,
		Thailand: 165,
		Nepal: 4,
		Bangladesh: 4,
		India: 2,
		Cambodia: 3,
		Malaysia: 0,
	},
];

// Color palette for different countries
const countryColors = {
	Myanmar: "#148696", // Primary color
	Thailand: "#1FA3B8", // Lighter variation 1
	Nepal: "#2BB0C5", // Lighter variation 2
	Bangladesh: "#37BDD2", // Lighter variation 3
	India: "#43CADF", // Lighter variation 4
	Cambodia: "#4FD7EC", // Lighter variation 5
	Malaysia: "#5BE4F9", // Lightest variation
};

interface MultipleLineChartProps {
	data?: Array<Record<string, string | number>>;
	seriesKeys?: string[];
}

const palette = [
	"#148696",
	"#1FA3B8",
	"#2BB0C5",
	"#37BDD2",
	"#43CADF",
	"#4FD7EC",
	"#5BE4F9",
	"#148696",
];

const MultipleLineChart: React.FC<MultipleLineChartProps> = ({
	data,
	seriesKeys,
}) => {
	const { theme } = useTheme();
	const shouldUseMockFallback = typeof data === "undefined";
	const chartData = shouldUseMockFallback ? dummyData : data;
	const keys =
		seriesKeys && seriesKeys.length > 0
			? seriesKeys
			: Object.keys(chartData[0] || {}).filter((key) => key !== "year");

	return (
		<div className="w-full h-96">
			<ResponsiveContainer height="100%" width="100%">
				<LineChart
					data={chartData}
					margin={{
						top: 20,
						right: 30,
						left: 20,
						bottom: 20,
					}}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="year"
						domain={["dataMin", "dataMax"]}
						scale="linear"
						type="number"
					/>
					<YAxis
						label={{ value: "Poll Count", angle: -90, position: "insideLeft" }}
					/>
					<Tooltip
						contentStyle={{
							background:
								theme === "dark"
									? "rgba(0, 0, 0, 0.6)"
									: "rgba(255, 255, 255, 0.8)",
						}}
						formatter={(value, name) => [value, name]}
						labelFormatter={(label) => `Year: ${label}`}
					/>
					<Legend />

					{keys.map((key, index) => (
						<Line
							activeDot={{ r: 6 }}
							dataKey={key}
							dot={{ r: 4 }}
							key={key}
							stroke={
								(countryColors as Record<string, string>)[key] ??
								palette[index % palette.length]
							}
							strokeWidth={2}
							type="monotone"
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default MultipleLineChart;
