import { textMapping } from "$src/utils/utils";
import { StatusBadge } from "../indicators/StatusBadge";

interface ActivityItemProps {
	description: string;
	status: "not-initiated" | "partial progress" | "completed";
	className?: string;
}

export const ActivityItem = ({
	description,
	status,
	className = "",
}: ActivityItemProps) => {
	return (
		<div className={`mb-6 ${className}`}>
			<div className="flex items-start justify-between gap-4">
				<p className="text-gray-700 text-sm flex-1 leading-relaxed">
					{description}
				</p>
				<div className="flex-shrink-0">
					<StatusBadge label={textMapping[status]} status={status} />
				</div>
			</div>
		</div>
	);
};
