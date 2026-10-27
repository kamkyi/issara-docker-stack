import moment from "moment";
import type React from "react";
import { useEffect, useState } from "react";
import { fetchWorkerFeedbackGrievance } from "$src/services/workerFeedbackGrievanceService";
import { useViewModeStore } from "$src/store/viewModeStore";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import GrievanceForm from "./GrievanceForm";
import SummaryComponent from "./SummaryComponent";

interface GrievanceData {
	id?: number;
	description?: string | number;
	opened_at?: string;
	closed_at?: string;
	affected_workers?: number;
	level?: string | number;
	status?: string;
	remediation_notes?: string;
	remediation_action?: string;
	remediation_validation?: string;
	remediation_results?: string;
	remediation_sp_recommendation?: string;
	assigned_staff?: string[];
	deadline?: string | null;
}

interface GrievanceComponentProps {
	data: GrievanceData;
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	getDaysActive: (opened_at: string) => number;
	getStatusColor: (daysActive: number, status: string) => string;
}

const GrievanceComponent: React.FC<GrievanceComponentProps> = ({
	data,
	context,
	getDaysActive,
	getStatusColor,
}) => {
	void getDaysActive;
	void getStatusColor;
	const { isGlobalPartner, isSupplier } = getUserIdentifiers();
	const { viewMode } = useViewModeStore();
	const isSupplierContext = isSupplier || viewMode === "supplier-view";
	const [grievanceData, setGrievanceData] = useState<{
		list_of_text_fields?: {
			remediations?: unknown;
			system_strengthenings?: unknown;
		};
	}>({});

	useEffect(() => {
		if (isGlobalPartner) {
			fetchWorkerFeedbackGrievance(data.id ?? 0)
				.then((response) => {
					if (response) {
						setGrievanceData(response as any);
					}
				})
				.catch(() => {
					setGrievanceData({});
				});
		}
	}, [data.id, isGlobalPartner]);

	const affectedWorkersLabel =
		data.affected_workers == null ||
		(data.affected_workers <= 10 && data.affected_workers !== undefined)
			? "1-10"
			: data.affected_workers > 10 && data.affected_workers <= 50
				? "11-50"
				: data.affected_workers > 50 && data.affected_workers <= 100
					? "51-100"
					: data.affected_workers > 100 && data.affected_workers <= 500
						? "101-500"
						: data.affected_workers > 500 && data.affected_workers <= 1000
							? "501-1000"
							: data.affected_workers > 1000
								? "1000+"
								: "-";

	return (
		<div className="w-full">
			{isSupplierContext && data.id && (
				<GrievanceForm
					context={context}
					disableUnmountPrompt={true}
					summary={{
						caseId: data.id,
						dateReceived: data.opened_at
							? moment(data.opened_at).format("YYYY-MM-DD")
							: "-",
						issueCategories: String(data.description ?? "-"),
						affectedWorkers: affectedWorkersLabel,
						currentStatus: String(data.status ?? "-"),
						issueDescription: String(data.remediation_notes ?? "-"),
						assignedStaff: data.assigned_staff ?? [],
						deadline: data.deadline ?? undefined,
						nextSteps: data.remediation_action ?? undefined,
					}}
					workerFeedbackId={data.id}
				/>
			)}
			{grievanceData.list_of_text_fields && isGlobalPartner && (
				<div className="space-y-2 mt-4">
					<SummaryComponent
						context={context}
						data={grievanceData.list_of_text_fields.remediations}
						header={context.t(
							"workerFeedbackGrievance.monitoring.remediationHeader",
						)}
						title={context.t(
							"workerFeedbackGrievance.summary.remediationTitle",
						)}
					/>
					<SummaryComponent
						context={context}
						data={grievanceData.list_of_text_fields.system_strengthenings}
						header={context.t(
							"workerFeedbackGrievance.monitoring.systemStrengtheningHeader",
						)}
						title={context.t(
							"workerFeedbackGrievance.summary.systemStrengtheningTitle",
						)}
					/>
				</div>
			)}
		</div>
	);
};

export default GrievanceComponent;
