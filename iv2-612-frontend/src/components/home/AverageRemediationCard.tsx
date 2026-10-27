import { motion } from "framer-motion";

interface ViolationData {
	rank: number;
	violation: string;
	category: string;
	remediationScore: number;
	maxScore: number;
}

interface AverageRemediationCardProps {
	violationsData: ViolationData[];
}

const GaugeChart = ({
	value,
	maxValue = 4,
}: {
	value: number;
	maxValue?: number;
}) => {
	const percentage = (value / maxValue) * 100;
	const radius = 80;
	const strokeWidth = 12;
	const normalizedRadius = radius - strokeWidth * 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const strokeDasharray = `${circumference} ${circumference}`;

	// Create 4 segments for the gauge
	const segments = [
		{ color: "#ef4444", range: [0, 25], label: "Poor" },
		{ color: "#f97316", range: [25, 50], label: "Fair" },
		{ color: "#08c8eaff", range: [50, 75], label: "Good" },
		{ color: "#22c55e", range: [75, 100], label: "Excellent" },
	];

	const getSegmentColor = (percentage: number) => {
		for (const segment of segments) {
			if (percentage >= segment.range[0] && percentage <= segment.range[1]) {
				return segment.color;
			}
		}
		return segments[segments.length - 1].color;
	};

	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	return (
		<div className="flex flex-col items-center">
			<div className="relative">
				{/* Background segments */}
				<svg
					className="transform -rotate-90"
					height={radius * 2}
					width={radius * 2}
				>
					{/* Background circle */}
					<circle
						cx={radius}
						cy={radius}
						fill="transparent"
						r={normalizedRadius}
						stroke="#e5e7eb"
						strokeWidth={strokeWidth}
					/>

					{/* Progress circle */}
					<circle
						cx={radius}
						cy={radius}
						fill="transparent"
						r={normalizedRadius}
						stroke={getSegmentColor(percentage)}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						strokeWidth={strokeWidth}
						style={{
							transition: "stroke-dashoffset 0.5s ease-in-out",
						}}
					/>
				</svg>

				{/* Center value */}
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-3xl font-bold text-gray-800">
						{value.toFixed(1)}
					</span>
					<span className="text-sm text-gray-500">/ {maxValue}</span>
				</div>
			</div>

			{/* Segment labels */}
			<div className="mt-4 flex justify-center gap-2 flex-wrap">
				{segments.map((segment, index) => (
					<div className="flex items-center gap-1 text-xs" key={index}>
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: segment.color }}
						/>
						<span className="text-gray-600">{segment.label}</span>
					</div>
				))}
			</div>
		</div>
	);
};

export const AverageRemediationCard = ({
	violationsData,
}: AverageRemediationCardProps) => {
	const averageScore =
		violationsData.reduce((sum, v) => sum + v.remediationScore, 0) /
		violationsData.length;
	const completionRate = Math.round((averageScore / 4) * 100);

	return (
		<motion.div
			className="sticky top-8"
			initial={{ opacity: 0, x: 30 }}
			transition={{ duration: 0.6, delay: 0.3 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, x: 0 }}
		>
			<div className="bg-white rounded-md p-6 shadow-lg">
				<h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
					<div className="w-3 h-3 bg-gradient-to-r from-[#148696] to-[#0d5f6d] rounded-full"></div>
					Average Remediation
				</h3>

				{/* Gauge Chart */}
				<div className="mb-6">
					<GaugeChart maxValue={4} value={averageScore} />
				</div>

				{/* Summary Stats */}
				<div className="pt-4 border-t border-gray-200">
					<div className="grid grid-cols-2 gap-4 text-center">
						<div>
							<div className="text-2xl font-bold text-[#148696]">
								{violationsData.length}
							</div>
							<div className="text-xs text-gray-600">Total Violations</div>
						</div>
						<div>
							<div className="text-2xl font-bold text-orange-500">
								{completionRate}%
							</div>
							<div className="text-xs text-gray-600">Completion Rate</div>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

export default AverageRemediationCard;
