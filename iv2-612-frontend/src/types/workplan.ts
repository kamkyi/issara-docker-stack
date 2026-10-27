// Workplan Component Types

export interface Activity {
	id: number;
	title: string;
	description?: string;
	status: "not-started" | "in-progress" | "completed";
	priority?: "low" | "medium" | "high";
	dueDate?: string;
}

export interface ActivitySectionProps {
	activities: Activity[];
	title: string;
	onActivityClick?: (activity: Activity) => void;
	onStatusChange?: (activityId: number, status: Activity["status"]) => void;
}

export interface ActivityItemProps {
	activity: Activity;
	onClick?: () => void;
	onStatusChange?: (status: Activity["status"]) => void;
}

export interface TrainingsListProps {
	trainings: Array<{
		id: number;
		title: string;
		date: string;
		participants?: number;
		status: string;
	}>;
	onTrainingClick?: (trainingId: number) => void;
}

export interface NoteAndRemarkProps {
	note?: string;
	remark?: string;
	onNoteChange?: (note: string) => void;
	onRemarkChange?: (remark: string) => void;
	readOnly?: boolean;
}

export interface WorkplanActivitiesProps {
	supplierId?: number;
	year?: number;
}

export interface PriorityActivityBase {
	id: number;
	title: string;
	kpiLevel?: number;
	status: string;
	dueDate?: string;
}
