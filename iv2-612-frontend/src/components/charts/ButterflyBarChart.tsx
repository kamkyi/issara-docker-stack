import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import moment from "moment";
import { useTheme } from "next-themes";
import type React from "react";
import { statusColorPalette } from "$src/assets/mock/common-data";
import useCompanyDashboardStore from "$src/store/store.ourdashboard";

interface ButterflyBarChartProps {
	data: {
		category: string;
		q1: number;
		q2: number;
		id: number;
	};
	height?: number;
	showLegend?: boolean;
	showValues?: boolean;
}

const ButterflyBarChart: React.FC<ButterflyBarChartProps> = ({ data }) => {
	const maxValue = 100;
	const { q1, q2, id } = data;

	const { quarterA, quarterB } = useCompanyDashboardStore((state) => state);
	const { theme } = useTheme();

	return (
		<div className="w-full">
			{/* Legend */}
			<div className="flex justify-center gap-8 my-3 items-center">
				<div className="flex items-center gap-3">
					<div
						className="w-2 h-2 rounded shadow-sm"
						style={{
							background: statusColorPalette[id],
							opacity: 0.5,
						}}
					></div>
					<span className="text-sm font-semibold">
						{moment(quarterA).format("YYYY [Q]Q")}
					</span>
				</div>
				<span className="text-xs">VS</span>
				<div className="flex items-center gap-3">
					<div
						className="w-2 h-2 rounded shadow-sm"
						style={{ backgroundColor: statusColorPalette[id] }}
					></div>
					<span className="text-sm font-semibold">
						{moment(quarterB).format("YYYY [Q]Q")}
					</span>
				</div>
			</div>
			{/* Chart Container */}
			<div className="relative rounded-md">
				{/* Chart rows */}
				<div className="space-y-6">
					<div className="relative">
						{/* Bar row */}
						<div className="flex items-center w-full">
							{/* Left side (Q1) */}
							<div className="flex-1 flex justify-end items-center">
								<div className="relative group flex items-center w-full justify-end">
									{/* Q1 value label */}
									<span className="text-sm font-medium mr-3 min-w-[30px] text-right">
										{q1}
									</span>
									{/* Q1 bar container */}
									<div className="w-full max-w-[300px] flex justify-end">
										<div
											className="h-4 rounded-l-full shadow-sm transition-all duration-500 hover:shadow-md transform hover:scale-105"
											style={{
												width: `${(q1 / maxValue) * 100}%`,
												background: statusColorPalette[id],
												opacity: 0.5,
											}}
										/>
									</div>
								</div>
							</div>

							{/* Center divider with styling */}
							<div className="flex flex-col items-center px-2 flex-shrink-0">
								<div
									className="w-1 h-10 rounded-full shadow-sm"
									style={{
										background:
											theme === "dark"
												? "rgba(255,255,255,0.4)"
												: "rgba(0,0,0,0.2)",
									}}
								></div>
							</div>

							{/* Right side (Q2) */}
							<div className="flex-1 flex justify-start items-center ">
								<div className="relative group flex items-center w-full">
									{/* Q2 bar container */}
									<div className="w-full max-w-[300px] flex justify-start">
										<div
											className="h-4 rounded-r-full shadow-sm transition-all duration-500 hover:shadow-md transform hover:scale-105"
											style={{
												width: `${(q2 / maxValue) * 100}%`,
												background: statusColorPalette[id],
											}}
										/>
									</div>
									{/* Q2 value label */}
									<span className="text-sm font-medium ml-3 min-w-[30px] text-left">
										{q2}
									</span>
								</div>
							</div>
						</div>

						{/* Improvement indicator */}
						<div className="text-center mt-2">
							{q2 > q1 ? (
								<span className="text-xs font-medium text-green-600 p-1 px-2 rounded-full bg-green-100">
									<TrendingUpIcon /> +{q2 - q1} Improvement
								</span>
							) : q2 < q1 ? (
								<span className="text-xs font-medium  text-red-600 p-1 px-2 rounded-full bg-red-100">
									<TrendingDownIcon /> -{q1 - q2} Decline
								</span>
							) : (
								<span className="text-xs font-medium rounded text-white p-1 px-2 rounded-full bg-gray-400">
									<TrendingFlatIcon className="pb-1" /> No Change
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ButterflyBarChart;
