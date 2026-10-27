import type { StatusBadgeProps } from "$src/types/indicators";

export const StatusBadge = ({
	status,
	label,
	className = "",
}: StatusBadgeProps) => {
	const getStatusColor = () => {
		switch (status) {
			case "not-initiated":
				return "bg-gray-400";
			case "partial progress":
				return "bg-yellow-500";
			case "completed":
				return "bg-teal-600";
			default:
				return "bg-gray-400";
		}
	};

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
			<span className="text-sm text-gray-700">{label}</span>
		</div>
	);
};
