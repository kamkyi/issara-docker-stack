import moment from "moment";
import type React from "react";
import { useEffect, useState } from "react";
import { fetchSupplierKpiGrievance } from "$src/services/supplierKpiGrievanceService";
import { useGrievanceDraftStore } from "$src/store/grievanceDraftStore";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import GrievanceErrorBoundary from "./GrievanceErrorBoundary";
import type { GrievanceData } from "./GrievanceForm";
import SummaryComponent from "./SummaryComponent";
import SupplierKpiGrievanceForm from "./SupplierKpiGrievanceForm";

interface SupplierKpiGrievanceData {
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
	assigned_staff?: string[];
	deadline?: string | null;
}

interface SupplierKpiGrievanceComponentProps {
	data: SupplierKpiGrievanceData;
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	getDaysActive: (opened_at: string) => number;
	getStatusColor: (daysActive: number, status: string) => string;
}

const SupplierKpiGrievanceComponent: React.FC<
	SupplierKpiGrievanceComponentProps
> = ({ data, context, getDaysActive, getStatusColor }) => {
	void getDaysActive;
	void getStatusColor;
	const { isGlobalPartner, isSupplier, isTestUser } = getUserIdentifiers();
	const canEditGrievance = isSupplier || isTestUser;
	const [grievanceData, setGrievanceData] = useState<Partial<GrievanceData>>(
		{},
	);

	useEffect(() => {
		if (!data.id || (!isGlobalPartner && !canEditGrievance)) return;
		const kpiId = data.id;
		fetchSupplierKpiGrievance(kpiId)
			.then((response) => {
				const loaded = (response || {}) as Partial<GrievanceData>;
				setGrievanceData(loaded);
				// Seed the front-end draft store for read-only viewers (e.g. global
				// partners), who don't render the editable form that normally owns
				// this store. For editable users the form is the sole writer, so we
				// don't seed here and risk racing their live edits.
				if (!canEditGrievance) {
					useGrievanceDraftStore
						.getState()
						.setRemediations(
							kpiId,
							loaded.list_of_text_fields?.remediations ?? [],
						);
				}
			})
			.catch(() => {
				setGrievanceData({});
			});
	}, [canEditGrievance, data.id, isGlobalPartner]);

	const affectedWorkersLabel =
		data.affected_workers == null || data.affected_workers <= 10
			? "1-10"
			: data.affected_workers <= 50
				? "11-50"
				: data.affected_workers <= 100
					? "51-100"
					: data.affected_workers <= 500
						? "101-500"
						: data.affected_workers <= 1000
							? "501-1000"
							: "1000+";

	return (
		<div className="w-full">
			{canEditGrievance && data.id && (
				<GrievanceErrorBoundary>
					<SupplierKpiGrievanceForm
						context={context}
						disableUnmountPrompt
						onSaved={(saved) => {
							setGrievanceData(saved);
						}}
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
							closedAt: data.closed_at,
						}}
						supplierKpiId={data.id}
					/>
				</GrievanceErrorBoundary>
			)}
			{grievanceData.list_of_text_fields && isGlobalPartner && (
				<div className="mt-4 space-y-2">
					<SummaryComponent
						context={context}
						data={grievanceData.list_of_text_fields.remediations}
						header={context.t("Remediation: ")}
						title={context.t("Supplier's notes on case remediation")}
					/>
					<SummaryComponent
						context={context}
						data={grievanceData.list_of_text_fields.system_strengthenings}
						header={context.t("System Strengthenings: ")}
						title={context.t(
							"Supplier's notes on systems strengthening and continuous improvement related to this worker-reported issue:",
						)}
					/>
				</div>
			)}
		</div>
	);
};

export default SupplierKpiGrievanceComponent;
