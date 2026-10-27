import { Card, Text } from "@radix-ui/themes";
import type React from "react";
import {
	Legend,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

type RadarDataPoint = {
	[key: string]: string | number;
};

type RadarChartProps = {
	data: RadarDataPoint[];
	dataKeys: { key: string; label: string; stroke?: string }[];
	title: string;
	domain?: [number, number];
	colorMap?: Record<string, string>; // This prop is not used, so we can remove it
	angle: number;
	axisKey: string;
};

const RadarChartComponent: React.FC<RadarChartProps> = ({
	data,
	dataKeys,
	title,
	domain = [0, 150],
	angle = 360 / (data.length * 2),
	axisKey,
}) => {
	if (!data || data.length === 0) return <div>No data available</div>;
	const totalSides = data.length;
	const defaultColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00c49f"];

	const sortedDataKeys = [...dataKeys].sort((a, b) => {
		const maxA = Math.max(...data.map((item) => Number(item[a.key]) || 0));
		const maxB = Math.max(...data.map((item) => Number(item[b.key]) || 0));
		return maxA - maxB;
	});

	return (
		<Card className="scoreChartCard shadow-md">
			{title && (
				<Text className="mb-2" size="3" weight="bold">
					{title}
				</Text>
			)}
			<ResponsiveContainer height={400} width="100%">
				<RadarChart cx="50%" cy="50%" data={data} outerRadius="80%">
					<PolarGrid />
					<PolarAngleAxis
						dataKey={axisKey}
						tick={({ payload, x, y, index }) => {
							const angleDegrees = index * (360 / totalSides);
							const normalizedAngle = angleDegrees % 360;
							let flipRotation = 0;

							if (normalizedAngle >= 90 && normalizedAngle < 270) {
								flipRotation = 180;
							}

							return (
								<text
									dominantBaseline="central"
									fill="#666"
									textAnchor="middle"
									transform={`rotate(${normalizedAngle + flipRotation}, ${x}, ${y})`}
									x={x}
									y={y}
								>
									{payload.value}
								</text>
							);
						}}
					/>
					<PolarRadiusAxis angle={angle} domain={domain} />
					{sortedDataKeys.map((item, index) => (
						<Radar
							dataKey={item.key}
							fillOpacity={0}
							key={item.key}
							name={item.label}
							stroke={
								item.stroke || defaultColors[index % defaultColors.length]
							}
							strokeWidth={2}
						/>
					))}
					<Tooltip />
					<Legend />
				</RadarChart>
			</ResponsiveContainer>
		</Card>
	);
};

export default RadarChartComponent;
