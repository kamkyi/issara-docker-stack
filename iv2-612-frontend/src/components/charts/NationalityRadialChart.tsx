import { Card } from "@mui/material";
import type React from "react";
import {
	Cell,
	Legend,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import pollsData from "$src/assets/mock/workforce-poll.json";

interface NationalityData {
	name: string;
	value: number;
	fill: string;
	totalVotes: number;
	pollCount: number;
}

interface NationalityDistributionItem {
	name: string;
	share_percent: number;
	total_votes: number;
	poll_count: number;
}

interface NationalityRadialChartProps {
	height?: number;
	innerRadius?: number;
	outerRadius?: number;
	showLegend?: boolean;
	title?: string;
	data?: NationalityDistributionItem[];
}

const NationalityRadialChart: React.FC<NationalityRadialChartProps> = ({
	height = 400,
	innerRadius = 60,
	outerRadius = 190,
	showLegend = true,
	data,
}) => {
	// Nationality mapping (based on your existing data structure)
	const nationalityMap: { [key: number]: string } = {
		1: "Myanmar",
		2: "Thailand",
		3: "Nepal",
		4: "Bangladesh",
		5: "India",
		6: "Cambodia",
		7: "Malaysia",
	};

	// Color mapping for each nationality - using #148696 as primary with lighter variations
	const nationalityColors: { [key: string]: string } = {
		Myanmar: "#148696", // Primary color
		Thailand: "#1FA3B8", // Lighter variation 1
		Nepal: "#2BB0C5", // Lighter variation 2
		Bangladesh: "#37BDD2", // Lighter variation 3
		India: "#43CADF", // Lighter variation 4
		Cambodia: "#4FD7EC", // Lighter variation 5
		Malaysia: "#5BE4F9", // Lightest variation
	};
	const fallbackTealPalette = [
		"#148696",
		"#1FA3B8",
		"#2BB0C5",
		"#37BDD2",
		"#43CADF",
		"#4FD7EC",
		"#5BE4F9",
	];

	// Process poll data to aggregate by nationality
	const processNationalityData = (): NationalityData[] => {
		const nationalityStats: {
			[key: string]: { totalVotes: number; pollCount: number };
		} = {};

		pollsData.forEach((poll) => {
			// Check if poll has nationality data
			if (poll.nationality && Array.isArray(poll.nationality)) {
				poll.nationality.forEach((natId) => {
					const nationalityName = nationalityMap[natId];
					if (nationalityName) {
						if (!nationalityStats[nationalityName]) {
							nationalityStats[nationalityName] = {
								totalVotes: 0,
								pollCount: 0,
							};
						}

						// Sum up all votes for this poll
						const pollTotalVotes = poll.choices.reduce(
							(sum, choice) => sum + choice.votes_count,
							0,
						);
						nationalityStats[nationalityName].totalVotes += pollTotalVotes;
						nationalityStats[nationalityName].pollCount += 1;
					}
				});
			}
		});

		// Convert to array and calculate percentages
		const totalVotes = Object.values(nationalityStats).reduce(
			(sum, stat) => sum + stat.totalVotes,
			0,
		);

		return Object.entries(nationalityStats)
			.map(([nationality, stats], index) => ({
				name: nationality,
				value: Math.round((stats.totalVotes / totalVotes) * 100),
				fill:
					nationalityColors[nationality] ||
					fallbackTealPalette[index % fallbackTealPalette.length],
				totalVotes: stats.totalVotes,
				pollCount: stats.pollCount,
			}))
			.sort((a, b) => b.totalVotes - a.totalVotes) // Sort by total votes descending
			.slice(0, 7); // Take top 7 nationalities
	};

	const shouldUseMockFallback = typeof data === "undefined";
	const chartData = shouldUseMockFallback
		? processNationalityData()
		: (data ?? []).map((item, index) => ({
				name: item.name,
				value: item.share_percent,
				fill:
					nationalityColors[item.name] ||
					fallbackTealPalette[index % fallbackTealPalette.length],
				totalVotes: item.total_votes,
				pollCount: item.poll_count,
			}));

	// Calculate total statistics
	const totalVotes = chartData.reduce((sum, item) => sum + item.totalVotes, 0);
	const totalPolls = chartData.reduce((sum, item) => sum + item.pollCount, 0);
	const hasVoteData = totalVotes > 0;
	const displayData = chartData.map((item) => ({
		...item,
		value:
			hasVoteData || totalPolls === 0
				? item.value
				: Math.round((item.pollCount / totalPolls) * 100),
	}));
	const centerValue = hasVoteData ? totalVotes : totalPolls;
	const centerLabel = hasVoteData ? "Total Votes" : "Total Polls";
	const centerSubLabel = hasVoteData ? `${totalPolls} Polls` : "Votes pending";

	return (
		<div className="w-full relative">
			<div className="relative" style={{ width: "100%", height: height }}>
				<ResponsiveContainer height="100%" width="100%">
					<RadialBarChart
						cx="50%"
						cy="50%"
						data={displayData}
						endAngle={-270}
						innerRadius={innerRadius}
						outerRadius={outerRadius}
						startAngle={90}
					>
						<RadialBar
							background={{ fill: "rgba(0, 0, 0, 0.07)" }}
							cornerRadius={10}
							dataKey="value"
						>
							{displayData.map((entry, index) => (
								<Cell fill={entry.fill} key={`cell-${index}`} />
							))}
						</RadialBar>
						<Tooltip content={<CustomTooltip />} />
						{showLegend && (
							<Legend
								align="left"
								iconSize={10}
								layout="vertical"
								verticalAlign="middle"
								wrapperStyle={{
									padding: "15px",
									fontSize: "12px",
									color: "#666",
									background: "rgba(0, 0, 0, 0.07)",
									borderRadius: 5,
								}}
							/>
						)}
					</RadialBarChart>
				</ResponsiveContainer>

				{/* Center statistics */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
					<div className="mx-auto max-w-[110px] text-center sm:max-w-[130px]">
						<div className="text-xl font-bold leading-tight text-shadow sm:text-2xl">
							{centerValue.toLocaleString()}
						</div>
						<div className="mt-1 text-xs font-bold leading-tight sm:text-sm">
							{centerLabel}
						</div>
						<div className="mt-1 text-[10px] leading-tight text-gray-600 sm:text-xs">
							{centerSubLabel}
						</div>
					</div>
				</div>
			</div>

			{/* Summary statistics */}
			<div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
				{displayData.slice(0, 4).map((item, index) => (
					<div
						className="bg-gray-50 p-3 rounded-md"
						key={index}
						style={{ background: "rgba(0, 0, 0, 0.07)" }}
					>
						<div
							className="text-sm font-medium truncate"
							style={{ color: item.fill }}
							title={item.name}
						>
							{item.name}
						</div>
						<div className="text-lg font-bold">
							{hasVoteData
								? item.totalVotes.toLocaleString()
								: item.pollCount.toLocaleString()}
						</div>
						<div className="text-xs text-gray-400">
							{item.value}% of total {hasVoteData ? "votes" : "polls"}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default NationalityRadialChart;

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		return (
			<Card
				className="p-3 border border-gray-200 rounded-md shadow-lg z-50"
				style={{
					background: "rgba(255, 255, 255, 0.8)",
				}}
			>
				<p className="font-semibold border-b">{data.name}</p>

				<p className="text-sm">Share: {data.value}%</p>
				<p className="text-sm">
					Total Votes: {data.totalVotes.toLocaleString()}
				</p>
				<p className="text-sm">Polls: {data.pollCount}</p>
			</Card>
		);
	}
	return null;
};
