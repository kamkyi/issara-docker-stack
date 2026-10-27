import { useState } from "react";
import { SuppliersModal } from "./SuppliersModal";

interface BarSegment {
	label: string;
	percentage: number;
	color: string;
	suppliers?: {
		completed?: string[];
		not_yet_initiated?: string[];
		partial_progress?: string[];
	};
}

interface WorkerVoiceIndicatorProps {
	title: string;
	description: string;
	barSegments: BarSegment[];
	targets: Array<{
		description: string;
		value: string;
	}>;
	className?: string;
}

export const WorkerVoiceIndicator = ({
	title,
	description,
	barSegments,
	targets,
	className = "",
}: WorkerVoiceIndicatorProps) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedSegment, setSelectedSegment] = useState<BarSegment | null>(
		null,
	);

	const handleSegmentClick = (segment: BarSegment) => {
		if (segment.suppliers) {
			setSelectedSegment(segment);
			setIsModalOpen(true);
		}
	};
	return (
		<div className={`mb-8 ${className}`}>
			{/* Title */}
			<h3 className="text-[#148696] font-bold text-lg mb-4">{title}</h3>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Side - Description and Bar */}
				<div>
					<p className="text-gray-600 text-sm mb-4">{description}</p>

					{/* Actual Status Label */}
					<p className="text-gray-600 font-semibold text-sm mb-2">
						Actual status
					</p>

					{/* Bar Chart */}
					<div className="flex h-12 rounded overflow-hidden mb-3">
						{barSegments.map((segment, index) => (
							<div
								className={`flex items-center justify-center text-white font-semibold text-sm transition-opacity ${
									segment.suppliers
										? "cursor-pointer hover:opacity-80"
										: "cursor-default"
								}`}
								key={index}
								onClick={() => handleSegmentClick(segment)}
								style={{
									width: `${segment.percentage}%`,
									backgroundColor: segment.color,
								}}
								title={
									segment.suppliers
										? `Click to view ${segment.label} suppliers`
										: segment.label
								}
							>
								{segment.percentage > 10 && <span>{segment.percentage}%</span>}
							</div>
						))}
					</div>

					{/* Legend */}
					<div className="flex flex-wrap gap-4 mb-4">
						{barSegments.map((segment, index) => (
							<div className="flex items-center gap-2" key={index}>
								<div
									className="w-4 h-4 rounded"
									style={{ backgroundColor: segment.color }}
								/>
								<span className="text-xs text-gray-700">{segment.label}</span>
							</div>
						))}
					</div>

					{/* Link */}
					<div className="flex items-center gap-2 text-[#148696] cursor-pointer hover:underline">
						<div className="w-3 h-3 rounded-full bg-[#148696]" />
						<span className="text-sm font-medium">
							List of Active suppliers with/without worker voice
						</span>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<path d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</div>

				{/* Right Side - Company Targets */}
				<div>
					<h4 className="text-gray-600 font-semibold text-base mb-3">
						Company Targets / Notes
					</h4>
					<div className="space-y-3">
						{targets.map((target, index) => (
							<div className="bg-gray-100 rounded-md p-4" key={index}>
								<p className="text-gray-700 text-sm mb-2">
									{target.description}
								</p>
								<p className="text-gray-900 font-semibold text-lg">
									{target.value}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Suppliers Modal */}
			{selectedSegment && (
				<SuppliersModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					suppliers={selectedSegment.suppliers || {}}
					title={`${title} - ${selectedSegment.label}`}
				/>
			)}
		</div>
	);
};
