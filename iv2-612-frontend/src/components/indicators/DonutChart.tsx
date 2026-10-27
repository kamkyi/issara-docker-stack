import { useState } from "react";

interface DonutSegment {
	label: string;
	value: number;
	color: string;
	amount?: string;
}

interface DonutChartProps {
	segments: DonutSegment[];
	size?: number;
	strokeWidth?: number;
	className?: string;
}

export const DonutChart = ({
	segments,
	size = 200,
	strokeWidth = 40,
	className = "",
}: DonutChartProps) => {
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		text: string;
	} | null>(null);

	const hoverExtra = 6; // how much stroke grows on hover
	const expandedStroke = strokeWidth + hoverExtra;
	const padding = hoverExtra; // add safe padding so arcs don't clip

	const adjustedSize = size + padding * 2;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const normalizedSegments = segments.map((segment) => ({
		...segment,
		value: Number.isFinite(segment.value) ? Math.max(0, segment.value) : 0,
	}));
	const total = normalizedSegments.reduce((sum, seg) => sum + seg.value, 0);

	let currentOffset = 0;

	const handleMouseMove = (
		e: React.MouseEvent,
		segment: (typeof normalizedSegments)[number],
	) => {
		const rect = (e.target as SVGElement).getBoundingClientRect();
		const percentage = total > 0 ? (segment.value / total) * 100 : 0;
		setTooltip({
			x: e.clientX - rect.left + 10,
			y: e.clientY - rect.top + 10,
			text: `${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`,
		});
	};

	return (
		<div
			className={`relative flex flex-col items-center ${className}`}
			style={{ userSelect: "none" }}
		>
			<div className="relative">
				<svg
					height={adjustedSize}
					style={{ transform: "rotate(-90deg)" }}
					viewBox={`-${padding} -${padding} ${size + padding * 2} ${size + padding * 2}`}
					width={adjustedSize}
				>
					{/* Background circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						fill="transparent"
						r={radius}
						stroke="#e5e7eb"
						strokeWidth={expandedStroke} // keep same max thickness so nothing clips
					/>

					{/* Segments */}
					{normalizedSegments.map((segment, index) => {
						const percentage = total > 0 ? (segment.value / total) * 100 : 0;
						const segmentLength = (percentage / 100) * circumference;
						const offset = currentOffset;
						currentOffset += segmentLength;

						const isActive = hoverIndex === index;

						return (
							<circle
								cx={size / 2}
								cy={size / 2}
								fill="transparent"
								key={index}
								onMouseEnter={() => setHoverIndex(index)}
								onMouseLeave={() => {
									setHoverIndex(null);
									setTooltip(null);
								}}
								onMouseMove={(e) => handleMouseMove(e, segment)}
								r={radius}
								stroke={segment.color}
								strokeDasharray={`${segmentLength} ${circumference}`}
								strokeDashoffset={-offset}
								strokeWidth={isActive ? expandedStroke : strokeWidth}
								style={{
									transition: "stroke-width 0.2s ease",
									cursor: "pointer",
								}}
							/>
						);
					})}
				</svg>

				{/* Center content */}
				<div className="absolute top-0 left-0 flex items-center justify-center w-full h-full pointer-events-none">
					{hoverIndex !== null ? (
						<div className="text-center">
							<div className="text-sm text-gray-900 max-w-30 font-bold">
								{normalizedSegments[hoverIndex].label}
							</div>
							<div className="text-xl text-gray-500">
								{normalizedSegments[hoverIndex].value.toLocaleString()}
							</div>
						</div>
					) : (
						<div className="text-center">
							<div className="text-xl font-bold text-gray-900">
								{total.toLocaleString()}
							</div>
							<div className="text-sm text-gray-500">Total</div>
						</div>
					)}
				</div>

				{/* Tooltip */}
				{tooltip && (
					<div
						className="absolute bg-white border shadow-sm rounded px-2 py-1 text-xs"
						style={{
							left: tooltip.x,
							top: tooltip.y,
							pointerEvents: "none",
							whiteSpace: "nowrap",
						}}
					>
						{tooltip.text}
					</div>
				)}
			</div>

			{/* Legend */}
			<div className="mt-4 space-y-2 w-full">
				{normalizedSegments.map((segment, index) => {
					const percentage = (
						total > 0 ? (segment.value / total) * 100 : 0
					).toFixed(1);
					return (
						<div
							className="flex items-center gap-2 text-sm cursor-pointer"
							key={index}
							onMouseEnter={() => setHoverIndex(index)}
							onMouseLeave={() => setHoverIndex(null)}
						>
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: segment.color }}
							/>
							<span className="text-gray-700 flex-1">
								{segment.label}
								{segment.amount && (
									<span className="text-gray-500"> ({segment.amount})</span>
								)}
							</span>
							<span className="font-medium text-gray-900">{percentage}%</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
