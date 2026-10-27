import { Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useRemediationQuality } from "$src/hooks/useSocialResponsibility";

interface QualityData {
	quality: string;
	count: number;
	color: string;
}

const qualityColors = {
	poor: "#EF4444",
	fair: "#F59E0B",
	good: "#10B981",
	very_good: "#3B82F6",
	excellent: "#8B5CF6",
};

const qualityLabels = {
	poor: "Poor",
	fair: "Fair",
	good: "Good",
	very_good: "Very Good",
	excellent: "Excellent",
};

const CustomTooltip = ({ active, payload }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
				<p className="font-semibold text-gray-800 mb-1">
					{payload[0].payload.quality}
				</p>
				<p className="text-sm" style={{ color: payload[0].color }}>
					Count: {payload[0].value}
				</p>
			</div>
		);
	}
	return null;
};

export const RemediationQuality = () => {
	const { data, isLoading, error } = useRemediationQuality();

	// Transform API data to component format
	const qualityData: QualityData[] = data?.data
		? Object.entries(data.data).map(([key, value]) => ({
				quality: qualityLabels[key as keyof typeof qualityLabels],
				count: value,
				color: qualityColors[key as keyof typeof qualityColors],
			}))
		: [];

	const totalCases = qualityData.reduce((sum, item) => sum + item.count, 0);

	if (isLoading) {
		return (
			<motion.div
				className="bg-white rounded-md p-6 md:p-8 mt-8 flex items-center justify-center"
				initial={{ opacity: 0, y: 20 }}
				style={{ minHeight: "500px" }}
				transition={{ duration: 0.6, delay: 0.4 }}
				viewport={{ once: true }}
				whileInView={{ opacity: 1, y: 0 }}
			>
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#148696]"></div>
					<p className="mt-4 text-gray-600">Loading remediation data...</p>
				</div>
			</motion.div>
		);
	}

	if (error) {
		return (
			<motion.div
				className="bg-white rounded-md p-6 md:p-8 mt-8"
				initial={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.6, delay: 0.4 }}
				viewport={{ once: true }}
				whileInView={{ opacity: 1, y: 0 }}
			>
				<div className="text-center text-red-600">
					<p className="text-lg font-semibold">Failed to load data</p>
					<p className="text-sm mt-2">Please try again later</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			className="bg-white rounded-md p-6 md:p-8 mt-8"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.6, delay: 0.4 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-6 flex-wrap gap-4">
				<Heading className="text-[#148696]" size="6">
					Remediation Quality
				</Heading>
			</div>

			{/* Bar Chart */}
			<div style={{ height: "400px", width: "100%" }}>
				<ResponsiveContainer height="100%" width="100%">
					<BarChart
						data={qualityData}
						margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
					>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis dataKey="quality" tick={{ fontSize: 12, fill: "#6b7280" }} />
						<YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
						<Tooltip content={<CustomTooltip />} />
						<Bar dataKey="count" name="Cases">
							{qualityData.map((entry, index) => (
								<Cell fill={entry.color} key={`cell-${index}`} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>

			{/* Legend */}
			<div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
				{qualityData.map((item) => (
					<div className="flex items-center gap-2" key={item.quality}>
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: item.color }}
						></div>
						<span className="text-gray-600">
							{item.quality}: {item.count}
						</span>
					</div>
				))}
			</div>

			{/* Total Cases */}
			<div className="mt-6 pt-4 border-t border-gray-200 text-center">
				<p className="text-lg text-gray-800">
					<b>Total cases:</b> {totalCases.toLocaleString()}
				</p>
			</div>
		</motion.div>
	);
};

export default RemediationQuality;
