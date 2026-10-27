import { useTheme } from "next-themes";
import type React from "react";
import { useState } from "react";
import { statusColorPalette as colorPalette } from "$src/assets/mock/common-data";

interface StackedBarData {
	name: string;
	value: number;
	color: string;
	percentage?: number;
}

interface HorizontalStackedBarProps {
	data?: any[];
	height?: number;
	showTooltip?: boolean;
	showLabels?: boolean;
	barHeight?: number;
}

const HorizontalStackedBar: React.FC<HorizontalStackedBarProps> = ({
	data,
	showTooltip = true,
	showLabels = false,
	barHeight = 20,
}) => {
	const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const { theme } = useTheme();
	const modifiedData = data?.map((v, i) => ({
		name: v.description,
		value: v.votes_count,
		color: colorPalette[i],
	}));
	// Default data if none provided
	const defaultData: StackedBarData[] = [
		{ name: "Satisfied", value: 45, color: "#148696" },
		{ name: "Neutral", value: 30, color: "#1FA3B8" },
		{ name: "Unsatisfied", value: 15, color: "#2BB0C5" },
		{ name: "No Response", value: 10, color: "#E5E7EB" },
	];

	const chartData = modifiedData || defaultData;

	// Calculate percentages and total
	const total = chartData.reduce((sum, item) => sum + item.value, 0);
	let totalPercentage = 0;

	const dataWithPercentages = chartData.map((item, idx) => {
		let percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
		if (idx === chartData.length - 1) {
			// Adjust last item so total = 100
			percentage = total > 0 ? 100 - totalPercentage : 0;
		} else {
			totalPercentage += percentage;
		}
		return { ...item, percentage };
	});

	// Calculate cumulative widths for positioning
	let cumulativeWidth = 0;
	const segmentsWithPosition = dataWithPercentages.map((item) => {
		const startWidth = cumulativeWidth;
		cumulativeWidth += item.percentage;
		return {
			...item,
			startWidth,
			width: item.percentage,
		};
	});

	const handleMouseEnter = (segmentName: string, event: React.MouseEvent) => {
		setHoveredSegment(segmentName);
		setMousePosition({ x: event.clientX, y: event.clientY });
	};

	const handleMouseMove = (event: React.MouseEvent) => {
		setMousePosition({ x: event.clientX, y: event.clientY });
	};

	const handleMouseLeave = () => {
		setHoveredSegment(null);
	};

	return (
		<div className="w-full relative flex items-center">
			<div
				className="w-full relative overflow-hidden rounded-xs"
				style={{ height: barHeight }}
			>
				{segmentsWithPosition.map((segment) => (
					<div
						className="pt-[2px] text-center text-xs text-white absolute top-0 h-full cursor-pointer transition-all duration-200 hover:brightness-110"
						key={segment.name}
						onMouseEnter={(e) =>
							showTooltip && handleMouseEnter(segment.name, e)
						}
						onMouseLeave={handleMouseLeave}
						onMouseMove={handleMouseMove}
						style={{
							left: `${segment.startWidth}%`,
							width: `${segment.width}%`,
							backgroundColor: segment.color,
							// borderRadius: index === 0 ? '2px 0 0 2px' :
							//     index === segmentsWithPosition.length - 1 ? '0 2px 2px 0' : '0'
						}}
					>
						{segment.percentage}%
					</div>
				))}
			</div>

			{/* Tooltip */}
			{showTooltip && hoveredSegment && (
				<div
					className="fixed z-50 bg-white p-2 border border-gray-200 rounded-md shadow-lg pointer-events-none"
					style={{
						left: mousePosition.x + 5,
						transform: "translateY(20%)",
						background:
							theme === "dark"
								? "rgba(0, 0, 0, 0.6)"
								: "rgba(255, 255, 255, 0.8)",
					}}
				>
					{(() => {
						const segment = dataWithPercentages.find(
							(s) => s.name === hoveredSegment,
						);
						return segment ? (
							<>
								<p className="font-semibold" style={{ color: segment.color }}>
									{segment.name}
								</p>
								<p className="text-sm">Count: {segment.value}</p>
								{/* <p className="text-sm text-gray-600">
                                    Percentage: {segment.percentage}%
                                </p> */}
							</>
						) : null;
					})()}
				</div>
			)}

			{/* Labels below the bar */}
			{showLabels && (
				<div className="flex flex-wrap gap-2 mt-3 text-xs">
					{dataWithPercentages.map((item, index) => (
						<div className="flex items-center" key={index}>
							<div
								className="w-3 h-3 rounded-xs mr-1"
								style={{ backgroundColor: item.color }}
							/>
							<span className="text-gray-600">
								{item.name}: {item.percentage}%
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default HorizontalStackedBar;
