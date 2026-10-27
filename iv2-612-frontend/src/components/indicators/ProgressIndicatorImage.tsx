import { memo } from "react";
import { getStrategicPartnerId } from "$src/utils/auth-utils";
import {
	useIssues,
	useWorkerReimbursement,
	useWorkPlan,
} from "../../hooks/useProgressDashboard";
import LoadingSpinner from "../ui/LoadingSpinner";
import { ImpactIndicator } from "./ImpactIndicator";
import { ImpactIndicator5 } from "./ImpactIndicator5";
import { ProgressDashboard } from "./ProgressDashboard";

interface ProgressIndicatorDashboardProps {
	className?: string;
	spId?: number;
}

const ProgressIndicatorDashboard = ({
	className = "",
}: ProgressIndicatorDashboardProps) => {
	// Fetch data from APIs
	const spId = getStrategicPartnerId();
	const { data: reimbursementData, isLoading: reimbursementLoading } =
		useWorkerReimbursement(spId);
	const { data: issuesData, isLoading: issuesLoading } = useIssues(spId);
	const { data: workplanData, isLoading: workplanLoading } = useWorkPlan(spId);

	const findIndicatorNoteByText = (txt: string): string =>
		workplanData?.progress_indicator?.find((itm) => itm.str_value === txt)
			?.notes;

	const findIndicatorProgressByText = (
		txt: string,
	): "not-initiated" | "partial progress" | "completed" =>
		workplanData?.progress_indicator?.find((itm) => itm.str_value === txt)
			?.progress_status;
	// Show loading state
	if (reimbursementLoading || issuesLoading || workplanLoading) {
		return (
			<LoadingSpinner
				subtitle="Please wait a moment"
				title="Fetching data..."
			/>
		);
	}

	// Calculate values from API data
	const issueDuration = issuesData?.issue_duration;
	const issuesResolutionData = {
		over60Days: issueDuration?.percentage_over_60 || 0,
		under60Days: issueDuration?.percentage_under_60 || 0,
	};

	const remediationQuality = issuesData?.issue_quality || {};

	const impact4Data = reimbursementData?.impact_indicator_4;

	const workerReimbursementNumbers = {
		notReimbursed: impact4Data?.total_remaining_reimbursement || 0,
		reimbursed: impact4Data?.total_reimbursement || 0,
	};

	return (
		<div className={`w-full max-w-full ${className}`}>
			{/* Impact Indicator 2 - Using API Data */}
			<ImpactIndicator
				segments={[
					{
						label: "Over 60 days",
						value: issuesResolutionData.over60Days,
						color: "#ef9a9a",
					},
					{
						label: "Under 60 days",
						value: issuesResolutionData.under60Days,
						color: "#81c784",
					},
				]}
				subtitle="% of worker-reported issues in the supply chain resolved in under 60 days"
				target={findIndicatorNoteByText(
					"impact_indicator_2_issue_resolution_60days_percent_note",
				)}
				title="IMPACT INDICATOR 2:"
			/>

			{/* Impact Indicator 3 - Using API Data */}
			<ImpactIndicator
				segments={[
					{ label: "Poor", value: remediationQuality.Poor, color: "#ab47bc" },
					{ label: "Fair", value: remediationQuality.Fair, color: "#ffb74d" },
					{ label: "Good", value: remediationQuality.Good, color: "#4dd0e1" },
					{
						label: "Excellent",
						value: remediationQuality.Excellent,
						color: "#0097a7",
					},
				]}
				subtitle="% of remediation efforts of specific issues resolved at a level of poor, fair, good, excellent"
				target={findIndicatorNoteByText(
					"impact_indicator_3_remediation_efforts_resolution_percent_note",
				)}
				title="IMPACT INDICATOR 3:"
			/>

			{/* Impact Indicator 4 - Using API Data */}
			<ImpactIndicator
				segments={[
					{
						label: "Eligible Workers Not Reimbursed",
						value: workerReimbursementNumbers.notReimbursed,
						color: "#ef9a9a",
					},
					{
						label: "Eligible Workers Reimbursed",
						value: workerReimbursementNumbers.reimbursed,
						color: "#81c784",
					},
				]}
				subtitle="Number of eligible workers reimbursed for recruitment fees they have paid"
				target={findIndicatorNoteByText(
					"impact_indicator_4_eligible_workers_reimbursement_percent_note",
				)}
				title="IMPACT INDICATOR 4:"
			/>
			{/* Impact Indicator 5 - Using API Data */}
			<ImpactIndicator5
				findIndicatorNoteByText={findIndicatorNoteByText}
				reimbursementData={reimbursementData}
			/>
			{/* Progress Dashboard - Using API Data */}
			<ProgressDashboard
				className="mb-12"
				findIndicatorNoteByText={findIndicatorNoteByText}
				findIndicatorProgressByText={findIndicatorProgressByText}
				spId={spId}
			/>
		</div>
	);
};

export default memo(ProgressIndicatorDashboard);
