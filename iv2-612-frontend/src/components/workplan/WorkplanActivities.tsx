import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStrategicPartnerId } from "$src/utils/auth-utils";
import {
	usePriorityActivityBases,
	useTrainings,
	useWorkPlan,
} from "../../hooks/useProgressDashboard";
import { StatusBadge } from "../indicators/StatusBadge";
import { ActivitySection } from "./ActivitySection";
import { NoteAndRemark } from "./NoteAndRemark";
import { TrainingsList } from "./TrainingsList";

interface WorkplanActivitiesProps {
	className?: string;
}

interface PriorityActivityBase {
	id: number;
	category: string;
	description: string;
	priority_status: string;
	group_description: string;
	group_id: number;
	group_name: string;
}

type TabType =
	| "worker_voice"
	| "labour_recruitment"
	| "working_conditions"
	| "trainings"
	| "notes_&_remarks";

export const WorkplanActivities = ({
	className = "",
}: WorkplanActivitiesProps) => {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<TabType>("worker_voice");
	const spId = getStrategicPartnerId();

	// Fetch priority activity bases, workplan data, and trainings from API
	const { data: priorityBases, isLoading: isLoadingBases } =
		usePriorityActivityBases();
	const { data: workplanData, isLoading: isLoadingWorkplan } =
		useWorkPlan(spId);
	const { data: trainingsData, isLoading: isLoadingTrainings } =
		useTrainings(spId);

	const isLoading = isLoadingBases || isLoadingWorkplan;

	// Merge priority bases with workplan data to get actual status
	const mergedActivities = useMemo(() => {
		const safePriorityBases = Array.isArray(priorityBases) ? priorityBases : [];
		const safePriorityActivities = Array.isArray(
			workplanData?.priority_activity,
		)
			? workplanData.priority_activity
			: [];

		if (safePriorityBases.length === 0) return [];

		// Create a map of priority activities by their priority_activity.id
		const paMap: Record<number, any> = {};
		safePriorityActivities.forEach((pa: any) => {
			if (pa?.priority_activity?.id != null) {
				paMap[pa.priority_activity.id] = pa;
			}
		});

		// Merge the data
		return safePriorityBases.map((base: PriorityActivityBase) => {
			const pa = paMap[base.id];
			return {
				...base,
				...(pa
					? {
							priority_status: pa.priority_status || "not yet",
							value: pa.value,
							progress: pa.progress,
							notes: pa.notes,
							priority_activity_id: pa.id,
						}
					: {
							priority_status: "not yet",
						}),
			};
		});
	}, [priorityBases, workplanData]);

	const safeTrainingsData = Array.isArray(trainingsData) ? trainingsData : [];
	const safeNotesRemarkData = Array.isArray(workplanData?.notes_remark)
		? workplanData.notes_remark
		: [];

	// Group activities by category
	const groupedActivities =
		mergedActivities?.reduce(
			(
				acc: Record<string, PriorityActivityBase[]>,
				activity: PriorityActivityBase,
			) => {
				const category = activity.category;
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push(activity);
				return acc;
			},
			{},
		) || {};

	// Sort activities by group name within each category
	Object.keys(groupedActivities).forEach((category) => {
		groupedActivities[category].sort((a, b) => {
			const aGroup = a.group_name;
			const bGroup = b.group_name;
			return aGroup.localeCompare(bGroup);
		});
	});

	const workerVoiceActivities = groupedActivities.worker_voice || [];
	const labourRecruitmentActivities =
		groupedActivities.labour_recruitment || [];
	const workingConditionsActivities =
		groupedActivities.working_conditions || [];

	// Group activities by their group id and name
	const groupBySection = (activities: PriorityActivityBase[]) => {
		const grouped: Record<string, PriorityActivityBase[]> = {};
		activities.forEach((activity) => {
			// Use group.id and group.name as the key for grouping
			const groupKey = `${activity.group_id}-${activity.group_name}`;
			if (!grouped[groupKey]) {
				grouped[groupKey] = [];
			}
			grouped[groupKey].push(activity);
		});
		return grouped;
	};

	// Map status from API to component format
	const mapStatus = (
		status: string,
	): "completed" | "not-initiated" | "partial progress" => {
		const statusMap: Record<
			string,
			"completed" | "not-initiated" | "partial progress"
		> = {
			completed: "completed",
			"completed/ongoing": "completed",
			"not started": "not-initiated",
			"not yet initiated": "not-initiated",
			"not yet": "not-initiated",
			not_started: "not-initiated",
			partial: "partial progress",
			"partial progress": "partial progress",
		};
		return statusMap[status?.toLowerCase()] || "not-initiated";
	};

	const renderActivitiesForCategory = (
		activities: PriorityActivityBase[],
		categoryTitle: string,
	) => {
		const sections = groupBySection(activities);

		return (
			<div className="bg-white border border-gray-200 rounded-md p-6 mb-6">
				<div className="text-center mb-6">
					<h2 className="text-xl text-gray-700 uppercase font-semibold">
						{categoryTitle}
					</h2>
					<div className="flex items-center justify-center gap-6 mt-4">
						<StatusBadge
							label={t("socialResponsibilityWorkplan.status.notYetInitiated")}
							status="not-initiated"
						/>
						<StatusBadge
							label={t("socialResponsibilityWorkplan.status.partialProgress")}
							status="partial progress"
						/>
						<StatusBadge
							label={t("socialResponsibilityWorkplan.status.completedOngoing")}
							status="completed"
						/>
					</div>
				</div>

				{Object.entries(sections).map(
					([groupKey, sectionActivities], index) => {
						// Get the group description from the first activity in the section
						const sectionTitle =
							sectionActivities[0]?.group_description || groupKey;

						// Sort activities by description alphabetically
						const sortedActivities = [...sectionActivities].sort((a, b) =>
							a.description.localeCompare(b.description),
						);

						return (
							<ActivitySection
								activities={sortedActivities.map((activity) => ({
									title: sectionTitle,
									description: activity.description,
									status: mapStatus(activity.priority_status),
								}))}
								index={index}
								key={groupKey}
								sectionLength={Object.keys(sections).length}
								subTitle=""
								title={sectionTitle}
							/>
						);
					},
				)}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#148696] mx-auto mb-4"></div>
					<p className="text-gray-600">
						{t("socialResponsibilityWorkplan.loading.activities")}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`w-full ${className}`}>
			{/* Main Header */}
			<div className="text-center mb-8">
				<h1 className="text-2xl font-bold text-gray-700 mb-6 uppercase">
					{t("socialResponsibilityWorkplan.header.title")}
				</h1>
			</div>

			{/* Tabs */}
			<div className="mb-6">
				<div className="border-b border-gray-200">
					<nav aria-label="Tabs" className="-mb-px flex space-x-8">
						<button
							className={`${
								activeTab === "worker_voice"
									? "border-[#148696] text-[#148696]"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
							onClick={() => setActiveTab("worker_voice")}
						>
							{t("socialResponsibilityWorkplan.tabs.workerVoice")}
							{workerVoiceActivities.length > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
									{workerVoiceActivities.length}
								</span>
							)}
						</button>
						<button
							className={`${
								activeTab === "labour_recruitment"
									? "border-[#148696] text-[#148696]"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
							onClick={() => setActiveTab("labour_recruitment")}
						>
							{t("socialResponsibilityWorkplan.tabs.laborRecruitment")}
							{labourRecruitmentActivities.length > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
									{labourRecruitmentActivities.length}
								</span>
							)}
						</button>
						<button
							className={`${
								activeTab === "working_conditions"
									? "border-[#148696] text-[#148696]"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
							onClick={() => setActiveTab("working_conditions")}
						>
							{t("socialResponsibilityWorkplan.tabs.workingConditions")}
							{workingConditionsActivities.length > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
									{workingConditionsActivities.length}
								</span>
							)}
						</button>
						<button
							className={`${
								activeTab === "trainings"
									? "border-[#148696] text-[#148696]"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
							onClick={() => setActiveTab("trainings")}
						>
							{t("socialResponsibilityWorkplan.tabs.trainings")}
							{safeTrainingsData.length > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
									{safeTrainingsData.length}
								</span>
							)}
						</button>
						<button
							className={`${
								activeTab === "notes_&_remarks"
									? "border-[#148696] text-[#148696]"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
							onClick={() => setActiveTab("notes_&_remarks")}
						>
							{t("socialResponsibilityWorkplan.tabs.notesRemarks")}
							{safeNotesRemarkData.length > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
									{safeNotesRemarkData.length}
								</span>
							)}
						</button>
					</nav>
				</div>
			</div>

			{/* Tab Content */}
			<div className="mt-6">
				{activeTab === "worker_voice" &&
					renderActivitiesForCategory(
						workerVoiceActivities,
						t("socialResponsibilityWorkplan.sections.workerVoice"),
					)}

				{activeTab === "labour_recruitment" &&
					renderActivitiesForCategory(
						labourRecruitmentActivities,
						t("socialResponsibilityWorkplan.sections.laborRecruitment"),
					)}

				{activeTab === "working_conditions" &&
					renderActivitiesForCategory(
						workingConditionsActivities,
						t("socialResponsibilityWorkplan.sections.workingConditions"),
					)}

				{activeTab === "trainings" &&
					(isLoadingTrainings ? (
						<div className="flex items-center justify-center p-8">
							<div className="text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#148696] mx-auto mb-4"></div>
								<p className="text-gray-600">
									{t("socialResponsibilityWorkplan.loading.trainings")}
								</p>
							</div>
						</div>
					) : (
						<TrainingsList trainings={safeTrainingsData} />
					))}
				{activeTab === "notes_&_remarks" && workplanData && (
					<NoteAndRemark noteData={safeNotesRemarkData} />
				)}
			</div>
		</div>
	);
};
