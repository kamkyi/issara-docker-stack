import { getStrategicPartnerId } from "$src/utils/auth-utils";
import {
	useILMSuppliers,
	useWorkerVoiceBarChart,
	useWorkPlan,
} from "../../hooks/useProgressDashboard";
import { LaborRecruitmentSection } from "./LaborRecruitmentSection";
import { PolicyReviewIndicator } from "./PolicyReviewIndicator";
import { WorkerVoiceIndicator } from "./WorkerVoiceIndicator";
import { WorkingConditionsSection } from "./WorkingConditionsSection";

interface ProgressDashboardProps {
	className?: string;
	spId?: number;
	findIndicatorNoteByText: (txt: string) => string;
	findIndicatorProgressByText: (
		txt: string,
	) => "not-initiated" | "partial progress" | "completed";
}

export const ProgressDashboard = ({
	className = "",
	findIndicatorNoteByText,
	findIndicatorProgressByText,
}: ProgressDashboardProps) => {
	// Fetch worker voice data
	const spId = getStrategicPartnerId();
	const { data: supplierWorkervoiceData } = useILMSuppliers(spId);
	// Fetch activity progress data
	const { data: workplanData } = useWorkPlan(spId);

	const { data: workervoiceBarChartData } = useWorkerVoiceBarChart(spId);

	// Calculate bar segments from API data with suppliers
	const workerVoiceSegments = supplierWorkervoiceData
		? [
				{
					label: "No Worker Voice",
					percentage: supplierWorkervoiceData.no_wv_percentage || 0,
					color: "#e5e5e5",
					suppliers: supplierWorkervoiceData.suppliers_by_status
						? {
								not_yet_initiated:
									supplierWorkervoiceData.suppliers_by_status.no_worker_voice,
							}
						: undefined,
				},
				{
					label: "Without Supplier Engagement",
					percentage: supplierWorkervoiceData.non_wv_engagement_percentage || 0,
					color: "#ffd966",
					suppliers: supplierWorkervoiceData.suppliers_by_status
						? {
								partial_progress:
									supplierWorkervoiceData.suppliers_by_status
										.without_engagement,
							}
						: undefined,
				},
				{
					label: "With Supplier Engagement",
					percentage: supplierWorkervoiceData.wv_engagement_percentage || 0,
					color: "#0097a7",
					suppliers: supplierWorkervoiceData.suppliers_by_status
						? {
								completed:
									supplierWorkervoiceData.suppliers_by_status.with_engagement,
							}
						: undefined,
				},
			]
		: [];

	return (
		<div className={`w-full ${className}`}>
			{/* Header */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-gray-700 mb-2">
					PROGRESS DASHBOARD
				</h1>
				<h2 className="text-xl text-gray-600 uppercase tracking-wide">
					INDICATORS FOR AREA 1 – WORKER VOICE
				</h2>
			</div>

			{/* Worker Voice Indicator 1 - Using API Data */}
			<WorkerVoiceIndicator
				barSegments={workerVoiceSegments}
				description="Worker voice roll-out and ongoing engagement"
				targets={[
					{
						description:
							"Percentage of tier-1 suppliers (export level) in your supply chain with issara worker voice channels available to workers",
						value: findIndicatorNoteByText(
							"percentage_tier1_suppliers_with_issara_worker_voice_channels_note",
						),
					},
					{
						description:
							"Percentage of upstream (tier-2 and beyond) suppliers in your supply chain with issara worker voice channels available to workers, based on supply chain information provided",
						value: findIndicatorNoteByText(
							"percentage_upstream_suppliers_with_issara_worker_voice_channels_note",
						),
					},
				]}
				title="Worker Voice Indicator 1"
			/>

			{/* Worker Voice Indicator 2 */}
			<PolicyReviewIndicator
				description="Policy & procedures review: Ethical grievance mechanisms policy is in force that:"
				policyItems={[
					{
						description:
							"Covers requirements and mechanisms for managing grievances",
						status: findIndicatorProgressByText(
							"covers_requirements_mechanisms_managing_grievances",
						),
					},
					{
						description: "Includes a clear non-retaliation policy",
						status: findIndicatorProgressByText("clear_non_retaliation_policy"),
					},
					{
						description:
							"Undergoes periodic review to identify means for continuous improvement",
						status: findIndicatorProgressByText(
							"periodic_review_continuous_improvement",
						),
					},
				]}
				title="Worker Voice Indicator 2"
			/>

			{/* Divider */}
			<div className="my-12 border-t-2 border-gray-300" />

			{/* Labor Recruitment Section - Using API Data */}
			<LaborRecruitmentSection
				workervoiceBarChartData={workervoiceBarChartData}
				workplanData={workplanData}
			/>

			{/* Divider */}
			<div className="my-12 border-t-2 border-gray-300" />

			{/* Working Conditions Section - Using API Data */}
			<WorkingConditionsSection
				workervoiceBarChartData={workervoiceBarChartData}
				workplanData={workplanData}
			/>
		</div>
	);
};
