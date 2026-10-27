import { useState } from "react";
import { SuppliersModal } from "./SuppliersModal";

interface SegmentData {
	label: string;
	value: number;
	color: string;
	suppliers?: {
		completed?: string[];
		not_yet_initiated?: string[];
		partial_progress?: string[];
	};
}

interface ImpactIndicatorProps {
	title: string;
	subtitle: string;
	segments: SegmentData[];
	target: string;
	className?: string;
}

export const ImpactIndicator = ({
	title,
	subtitle,
	segments,
	target,
	className = "",
}: ImpactIndicatorProps) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedSegment, setSelectedSegment] = useState<SegmentData | null>(
		null,
	);

	const handleSegmentClick = (segment: SegmentData) => {
		if (segment.suppliers) {
			setSelectedSegment(segment);
			setIsModalOpen(true);
		}
	};

	const total = segments.reduce((sum, seg) => sum + seg.value, 0);

	return (
		<div className={`w-full mb-8 ${className}`}>
			{/* Title Section */}
			<div className="mb-4">
				<h3 className="text-[#148696] font-bold text-lg mb-1">{title}</h3>
				<p className="text-gray-600 text-sm">{subtitle}</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Side - Bar Chart */}
				<div>
					{/* Bar Chart */}
					<div className="flex h-12 rounded overflow-hidden mb-3">
						{segments.map((segment, index) => {
							const percentage = ((segment.value / total) * 100).toFixed(2);

							return !segment.value ? null : (
								<div
									className={`flex items-center justify-center text-white font-semibold text-sm relative transition-opacity ${
										segment.suppliers
											? "cursor-pointer hover:opacity-80"
											: "cursor-default"
									}`}
									key={index}
									onClick={() => handleSegmentClick(segment)}
									style={{
										width: `${percentage}%`,
										backgroundColor: segment.color,
									}}
									title={
										segment.suppliers
											? `Click to view ${segment.label} suppliers`
											: `${segment.label}: ${percentage}%`
									}
								>
									{parseFloat(percentage) > 10 && (
										<span className="text-xs sm:text-sm">{percentage}%</span>
									)}
								</div>
							);
						})}
					</div>

					{/* Legend */}
					<div className="flex flex-wrap gap-4">
						{segments.map((segment, index) => (
							<div className="flex items-center gap-2" key={index}>
								<div
									className="w-4 h-4 rounded"
									style={{ backgroundColor: segment.color }}
								/>
								<span className="text-sm text-gray-700">{segment.label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Right Side - Company Targets/Notes */}
				<div>
					<h4 className="text-gray-600 font-semibold text-base mb-3">
						Company Targets / Notes
					</h4>
					<div className="bg-gray-100 rounded-md p-4">
						<p className="text-gray-700 text-sm leading-relaxed">{target}</p>
					</div>
				</div>
			</div>

			{/* Suppliers Modal */}
			{selectedSegment && (
				<SuppliersModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					suppliers={selectedSegment.suppliers || {}}
					title={`${title || "Indicator"} - ${selectedSegment.label}`}
				/>
			)}
		</div>
	);
};
