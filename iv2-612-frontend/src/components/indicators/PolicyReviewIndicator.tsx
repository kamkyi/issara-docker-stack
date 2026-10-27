import { textMapping } from "$src/utils/utils";
import { StatusBadge } from "./StatusBadge";

interface PolicyItem {
	description: string;
	status: "not-initiated" | "partial progress" | "completed";
}

interface PolicyReviewIndicatorProps {
	title: string;
	description: string;
	policyItems: PolicyItem[];
	className?: string;
}

export const PolicyReviewIndicator = ({
	title,
	description,
	policyItems,
	className = "",
}: PolicyReviewIndicatorProps) => {
	return (
		<div className={`mb-8 ${className}`}>
			{/* Title */}
			<h3 className="text-[#148696] font-bold text-lg mb-4">{title}</h3>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Side - Description */}
				<div>
					<p className="text-gray-600 text-sm mb-6">{description}</p>
				</div>

				{/* Right Side - Status Items */}
				<div>
					<div className="flex items-center gap-2 mb-4">
						<p className="text-gray-600 font-semibold text-sm">Actual status</p>
						<div className="flex items-center gap-4 ml-4">
							<StatusBadge label="Not yet initiated" status="not-initiated" />
							<StatusBadge label="Partial progress" status="partial progress" />
							<StatusBadge label="Completed/ongoing" status="completed" />
						</div>
					</div>

					<div className="space-y-3">
						{policyItems.map((item, index) => (
							<div
								className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
								key={index}
							>
								<p className="text-gray-700 text-sm flex-1">
									{item.description}
								</p>
								<StatusBadge
									label={textMapping[item.status]}
									status={item.status}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
