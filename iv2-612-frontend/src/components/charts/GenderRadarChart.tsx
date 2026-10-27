import { useTheme } from "next-themes";
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
import pollsData from "$src/assets/mock/workforce-poll.json";

interface GenderRadarChartProps {
	height?: number;
	showLegend?: boolean;
	title?: string;
}

const GenderRadarChart: React.FC<GenderRadarChartProps> = ({
	height = 380,
	showLegend = true,
}) => {
	// Process poll data to aggregate by gender
	const processGenderData = () => {
		const genderStats: {
			[key: string]: { pollCount: number; totalVotes: number };
		} = {
			Male: { pollCount: 0, totalVotes: 0 },
			Female: { pollCount: 0, totalVotes: 0 },
			Anonymous: { pollCount: 0, totalVotes: 0 },
			PreferNotToSay: { pollCount: 0, totalVotes: 0 },
		};

		pollsData.forEach((poll) => {
			// Since the mock data doesn't have gender field, we'll simulate it
			// In real implementation, you would check poll.gender array

			// For demo purposes, let's distribute polls across genders based on poll ID
			const pollTotalVotes = poll.choices.reduce(
				(sum, choice) => sum + choice.votes_count,
				0,
			);

			// Simulate gender distribution based on poll ID patterns
			const genderDistribution = getGenderDistribution(poll.id);

			Object.entries(genderDistribution).forEach(([gender, percentage]) => {
				if (genderStats[gender]) {
					genderStats[gender].pollCount += 1;
					genderStats[gender].totalVotes += Math.round(
						pollTotalVotes * percentage,
					);
				}
			});
		});

		// Convert to radar chart format
		const categories = [
			"Poll Participation",
			"Response Rate",
			"Engagement Level",
			"Activity Score",
			"Feedback Quality",
		];

		return categories.map((category) => {
			const dataPoint: any = { category };

			Object.entries(genderStats).forEach(([gender, stats]) => {
				// Calculate different metrics for each category
				let value = 0;
				switch (category) {
					case "Poll Participation":
						value = Math.min(
							100,
							(stats.pollCount / pollsData.length) * 100 * 4,
						); // Scale up for visibility
						break;
					case "Response Rate":
						value = Math.min(100, (stats.totalVotes / 1000) * 100); // Normalize to 100
						break;
					case "Engagement Level":
						value = Math.min(100, stats.pollCount * 2 + stats.totalVotes / 50);
						break;
					case "Activity Score":
						value = Math.min(
							100,
							stats.pollCount * 1.5 + stats.totalVotes / 100,
						);
						break;
					case "Feedback Quality":
						value = Math.min(100, stats.pollCount * 3 + stats.totalVotes / 80);
						break;
				}
				dataPoint[gender] = Math.round(value);
			});

			return dataPoint;
		});
	};

	// Simulate gender distribution based on poll ID (for demo purposes)
	const getGenderDistribution = (pollId: number): { [key: string]: number } => {
		const patterns = [
			{ Male: 0.4, Female: 0.35, Anonymous: 0.15, PreferNotToSay: 0.1 },
			{ Male: 0.3, Female: 0.45, Anonymous: 0.2, PreferNotToSay: 0.05 },
			{ Male: 0.35, Female: 0.4, Anonymous: 0.15, PreferNotToSay: 0.1 },
			{ Male: 0.45, Female: 0.3, Anonymous: 0.15, PreferNotToSay: 0.1 },
		];
		return patterns[pollId % patterns.length];
	};

	const radarData = processGenderData();

	return (
		<div className="w-full relative">
			<div style={{ width: "100%", height: height }}>
				<ResponsiveContainer height="100%" width="100%">
					<RadarChart
						data={radarData}
						margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
					>
						<PolarGrid stroke="#e0e0e0" />
						<PolarAngleAxis
							className="text-xs"
							dataKey="category"
							tick={{ fontSize: 12, fill: "#666" }}
						/>
						<PolarRadiusAxis
							angle={90}
							domain={[0, 100]}
							tick={{ fontSize: 10, fill: "#999" }}
							tickCount={5}
						/>

						<Radar
							dataKey="Male"
							dot={{ fill: "#148696", strokeWidth: 2, r: 4 }}
							fill="#148696"
							fillOpacity={0.1}
							name="Male"
							stroke="#148696"
							strokeWidth={2}
						/>
						<Radar
							dataKey="Female"
							dot={{ fill: "#1FA3B8", strokeWidth: 2, r: 4 }}
							fill="#1FA3B8"
							fillOpacity={0.1}
							name="Female"
							stroke="#1FA3B8"
							strokeWidth={2}
						/>
						<Radar
							dataKey="Anonymous"
							dot={{ fill: "#2BB0C5", strokeWidth: 2, r: 4 }}
							fill="#2BB0C5"
							fillOpacity={0.1}
							name="Anonymous"
							stroke="#2BB0C5"
							strokeWidth={2}
						/>
						<Radar
							dataKey="PreferNotToSay"
							dot={{ fill: "#37BDD2", strokeWidth: 2, r: 4 }}
							fill="#37BDD2"
							fillOpacity={0.1}
							name="PreferNotToSay"
							stroke="#37BDD2"
							strokeWidth={2}
						/>

						<Tooltip content={<CustomTooltip />} />
						{showLegend && (
							<Legend
								align="right"
								layout="vertical"
								verticalAlign="middle"
								wrapperStyle={{
									right: 0,
									fontSize: "12px",
									color: "#666",
								}}
							/>
						)}
					</RadarChart>
				</ResponsiveContainer>
			</div>

			{/* Summary statistics */}
			<div className="gap-2 text-center absolute top-0 grid">
				{["Male", "Female", "Anonymous", "PreferNotToSay"].map(
					(gender, index) => {
						const colors = ["#148696", "#1FA3B8", "#2BB0C5", "#37BDD2"];
						const avgScore =
							radarData.reduce((sum, item) => sum + item[gender], 0) /
							radarData.length;

						return (
							<div
								className="p-2 py-3 rounded-md"
								key={gender}
								style={{ background: "rgba(0, 0, 0, 0.07)" }}
							>
								<div
									className="text-sm font-medium"
									style={{ color: colors[index] }}
								>
									{gender}
								</div>
								<div className="text-lg font-bold">{Math.round(avgScore)}%</div>
								<div className="text-xs text-gray-400">Avg Score</div>
							</div>
						);
					},
				)}
			</div>
		</div>
	);
};

export default GenderRadarChart;

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
	const { theme } = useTheme();

	if (active && payload && payload.length) {
		return (
			<div
				className="p-3 border border-gray-200 rounded-md shadow-lg"
				style={{
					background:
						theme === "dark"
							? "rgba(0, 0, 0, 0.6)"
							: "rgba(255, 255, 255, 0.8)",
				}}
			>
				<p className="font-semibold mb-2">{label}</p>
				{payload.map((entry: any, index: number) => (
					<p className="text-sm" key={index} style={{ color: entry.color }}>
						{entry.dataKey}: {entry.value}%
					</p>
				))}
			</div>
		);
	}
	return null;
};
