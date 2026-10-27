import type React from "react";
import type { BarChartProps } from "$src/types/charts";

const BarChart: React.FC<BarChartProps> = ({
	data,
	companyLabel = "Company",
	benchmarkLabel = "Benchmark",
	title,
}) => {
	// Find max value for scaling
	const max = Math.max(...data.flatMap((d) => [d.company, d.benchmark]), 1);

	return (
		<div className="p-4 bg-white rounded-lg shadow-sm hover:shadow-lg transition">
			{title && <div className="font-bold mb-2">{title}</div>}
			<div className="space-y-2">
				{data.map((d, i) => (
					<div key={i}>
						<div className="text-xs mb-1">{d.label}</div>
						<div className="flex items-center gap-2">
							<div className="flex-1 flex items-center gap-1">
								<div
									className="h-4 bg-[#2DCCE3] rounded"
									style={{ width: `${(d.company / max) * 70}%`, minWidth: 8 }}
									title={`${companyLabel}: ${d.company}`}
								/>
								<span className="text-xs text-[#2DCCE3]">{d.company}</span>
							</div>
							<div className="flex-1 flex items-center gap-1">
								<div
									className="h-4 bg-[#004A60] rounded"
									style={{ width: `${(d.benchmark / max) * 70}%`, minWidth: 8 }}
									title={`${benchmarkLabel}: ${d.benchmark}`}
								/>
								<span className="text-xs text-[#004A60]">{d.benchmark}</span>
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-between mt-2 text-xs text-gray-500">
				<span>{companyLabel}</span>
				<span>{benchmarkLabel}</span>
			</div>
		</div>
	);
};

export default BarChart;
