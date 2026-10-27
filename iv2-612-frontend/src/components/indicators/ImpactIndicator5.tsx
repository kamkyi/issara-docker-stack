import { DonutChart } from "./DonutChart";

interface ImpactIndicator5Props {
	className?: string;
	reimbursementData?: any;
	findIndicatorNoteByText: (txt: string) => string;
}

export const ImpactIndicator5 = ({
	className = "",
	reimbursementData,
	findIndicatorNoteByText,
}: ImpactIndicator5Props) => {
	// Use API data if available, otherwise use defaults
	const impact5Data = reimbursementData?.impact_indicator_5;
	const reimbursed = impact5Data?.reimbursed || 0;
	const inProcess = impact5Data?.total_agree_in_process || 0;
	const notAgreed = impact5Data?.total_not_agree || 0;
	return (
		<div className={`w-full mb-8 ${className}`}>
			{/* Title Section */}
			<div className="mb-6">
				<h3 className="text-[#148696] font-bold text-lg mb-1">
					IMPACT INDICATOR 5:
				</h3>
				<p className="text-gray-600 text-sm">
					Amount of money owed versus amount of money reimbursed to workers for
					recruitment fees that they have paid
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
				{/* Left Side - Donut Chart */}
				<div className="flex justify-center lg:justify-start">
					<DonutChart
						segments={[
							{
								label: "Reimbursed ($)",
								value: reimbursed,
								color: "#0097a7",
								amount: `$${reimbursed.toLocaleString()}`,
							},
							{
								label: "Agreed and in process for reimbursement ($)",
								value: inProcess,
								color: "#4dd0e1",
								amount: `$${inProcess.toLocaleString()}`,
							},
							{
								label: "Not agreed for reimbursement ($)",
								value: notAgreed,
								color: "#ab47bc",
								amount: `$${notAgreed.toLocaleString()}`,
							},
						]}
						size={280}
						strokeWidth={50}
					/>
				</div>

				{/* Right Side - Company Targets/Notes */}
				<div>
					<h4 className="text-gray-600 font-semibold text-base mb-3">
						Company Targets / Notes
					</h4>
					<div className="bg-gray-100 rounded-md p-4">
						<p className="text-gray-700 text-sm leading-relaxed">
							{findIndicatorNoteByText(
								"impact_indicator_5_reimbursement_percent_note",
							)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};
