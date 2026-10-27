import { ActivityItem } from "./ActivityItem";

interface Activity {
	description: string;
	status: "not-initiated" | "partial progress" | "completed";
}

interface ActivitySectionProps {
	subTitle;
	title;
	activities: Activity[];
	className?: string;
	index: number;
	sectionLength: number;
}

export const ActivitySection = ({
	subTitle,
	title,
	activities,
	index,
	sectionLength,
	className = "",
}: ActivitySectionProps) => {
	return (
		<div
			className={
				`mb-8 ${className}` + (sectionLength - index === 1 ? "" : " border-b")
			}
		>
			<h3 className=" font-bold mb-4">{title}</h3>
			<p>{subTitle}</p>
			<div className="space-y-4">
				{activities.map((activity, index) => (
					<ActivityItem
						description={activity.description}
						key={index}
						status={activity.status}
					/>
				))}
			</div>
		</div>
	);
};
