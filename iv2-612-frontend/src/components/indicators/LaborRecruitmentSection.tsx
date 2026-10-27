import transformProgressData from "$src/utils/transformProgressData";
import utils from "$src/utils/utils";
import { ImpactIndicator } from "./ImpactIndicator";
import { PolicyReviewIndicator } from "./PolicyReviewIndicator";

interface LaborRecruitmentSectionProps {
	workervoiceBarChartData: {
		completed_ongoing: number;
		not_yet_initiated: number;
		partial_progress: number;
		suppliers: any;
	}[];
	workplanData: any;
}

export const LaborRecruitmentSection = ({
	workervoiceBarChartData,
	workplanData,
}: LaborRecruitmentSectionProps) => {
	const ErIndicator3Data =
		workervoiceBarChartData?.[utils.business_indicator.ER_3];
	const ErIndicator4Data =
		workervoiceBarChartData?.[utils.business_indicator.ER_4];
	const ErIndicato6Data =
		workervoiceBarChartData?.[utils.business_indicator.ER_6];
	const ErIndicator7Data =
		workervoiceBarChartData?.[utils.business_indicator.ER_7];
	const findIndicatorProgressByText = (txt: string) =>
		workplanData?.progress_indicator?.find((itm) => itm.str_value === txt)
			?.progress_status;
	const findIndicatorNoteByText = (txt: string) =>
		workplanData?.progress_indicator?.find((itm) => itm.str_value === txt)
			?.notes;
	return !workervoiceBarChartData ? (
		<span>loading...</span>
	) : (
		<div className={`w-full`}>
			{/* Header */}
			<div className="text-center mb-8">
				<h2 className="text-xl text-gray-600 uppercase tracking-wide">
					INDICATORS FOR AREA 2 – LABOR RECRUITMENT
				</h2>
			</div>

			{/* ER Indicator 1 */}
			<PolicyReviewIndicator
				description="Policy & procedures review: Ethical recruitment / migrant recruitment laws and policies is in force that is:"
				policyItems={[
					{
						description: "In line with international standards and definitions",
						status: findIndicatorProgressByText(
							"international_standards_definitions",
						),
					},
					{
						description: "Clearly communicated to suppliers",
						status: findIndicatorProgressByText("communicated_to_suppliers"),
					},
					{
						description:
							"Integrated into commercial processes such as supplier scorecards and contracts",
						status: findIndicatorProgressByText(
							"integrated_commercial_processes",
						),
					},
				]}
				title="ER Indicator 1"
			/>

			{/* ER Indicator 3 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					ER Indicator 3
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-2 font-semibold">
						Policy & procedures review: Management Service Agreements:
					</p>
					<p className="text-gray-600 text-sm mb-6">
						Review of MSAs between employers/suppliers and recruitment agencies
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicator3Data)}
							subtitle=""
							target={findIndicatorNoteByText(
								"review_msas_employer_supplier_recruitment_note",
							)}
							title=""
						/>
					</div>

					{/* Right Side - Company Targets */}
					{/* <div>
						<h4 className="text-gray-600 font-semibold text-base mb-3">
							Company Targets / Notes
						</h4>
						<div className="bg-gray-100 rounded-md p-4 h-32" />
					</div> */}
				</div>
			</div>

			{/* ER Indicator 4 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					ER Indicator 4
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Communications: Disclosure of recruitment agencies used
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicator4Data)}
							subtitle=""
							target={findIndicatorNoteByText(
								"communication_disclosure_recruitment_agencies_note",
							)}
							title=""
						/>
					</div>
				</div>
			</div>

			{/* ER Indicator 6 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					ER Indicator 6
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Recruitment fees surveys
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicato6Data)}
							subtitle=""
							target={findIndicatorNoteByText("recruitment_survey_fees_note")}
							title=""
						/>
					</div>
				</div>
			</div>

			{/* ER Indicator 7 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					ER Indicator 7
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Institutional capacity building: Ethical recruitment trainings
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicator7Data)}
							subtitle=""
							target={findIndicatorNoteByText(
								"institutional_capacity_building_ethical_recruitment_trainings_note",
							)}
							title=""
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
