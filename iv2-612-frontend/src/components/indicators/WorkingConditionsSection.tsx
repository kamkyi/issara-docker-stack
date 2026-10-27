import transformProgressData from "$src/utils/transformProgressData";
import utils from "$src/utils/utils";
import { ImpactIndicator } from "./ImpactIndicator";

interface WorkingConditionsSectionProps {
	workervoiceBarChartData: {
		completed_ongoing: number;
		not_yet_initiated: number;
		partial_progress: number;
		suppliers: any;
	}[];
	workplanData: any;
}

export const WorkingConditionsSection = ({
	workervoiceBarChartData,
	workplanData,
}: WorkingConditionsSectionProps) => {
	const ErIndicator1Data =
		workervoiceBarChartData?.[utils.business_indicator.WV_1];
	const ErIndicator2Data =
		workervoiceBarChartData?.[utils.business_indicator.WV_2];

	const ErIndicator3Data =
		workervoiceBarChartData?.[utils.business_indicator.WV_3];
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
					INDICATORS FOR AREA 3 – WORKING CONDITIONS
				</h2>
			</div>

			{/* WORK Indicator 1 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					WORK Indicator 1
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Worker satisfaction surveys
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicator2Data)}
							subtitle=""
							target={findIndicatorNoteByText(
								"worker_satisfaction_surveys_note",
							)}
							title=""
						/>
					</div>
				</div>
			</div>

			{/* WORK Indicator 2 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					WORK Indicator 2
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Institutional capacity building: Training of working level /
						technical staff
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6">
					{/* Left Side - Bar Chart */}
					<div>
						<p className="text-gray-600 font-semibold text-sm mb-2">
							Actual status
						</p>

						<ImpactIndicator
							segments={transformProgressData(ErIndicator1Data)}
							subtitle=""
							target={findIndicatorNoteByText(
								"institutional_capacity_building_training_working_technical_staff_note",
							)}
							title=""
						/>
					</div>
				</div>
			</div>

			{/* WORK Indicator 3 */}
			<div className="mb-8">
				<h3 className="text-[#148696] font-bold text-lg mb-4">
					WORK Indicator 3
				</h3>

				<div className="mb-6">
					<p className="text-gray-600 text-sm mb-6 font-semibold">
						Institutional capacity building: Training of management / leadership
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
								"institutional_capacity_building_training_management_leadership_note",
							)}
							title=""
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
