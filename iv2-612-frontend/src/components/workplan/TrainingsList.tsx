import { useTranslation } from "react-i18next";
import type { Training } from "$src/services/progressDashboardService";

interface TrainingsListProps {
	trainings: Training[];
	className?: string;
}

export const TrainingsList = ({
	trainings,
	className = "",
}: TrainingsListProps) => {
	const { t } = useTranslation();

	return (
		<div
			className={`w-full bg-white border border-gray-200 rounded-md p-6 ${className}`}
		>
			{/* Header */}
			<h2 className="text-2xl font-bold text-gray-700 text-center mb-6 uppercase">
				{t("socialResponsibilityWorkplan.trainings.title")}
			</h2>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b-2 border-gray-300">
							<th className="text-left py-3 px-4 font-semibold text-gray-700">
								{t("socialResponsibilityWorkplan.trainings.columns.training")}
							</th>
							<th className=" py-3 px-4 font-semibold text-gray-700">
								{t("socialResponsibilityWorkplan.trainings.columns.date")}
							</th>
						</tr>
					</thead>
					<tbody>
						{trainings.map((training, index) => (
							<tr
								className="border-b border-gray-200 hover:bg-gray-50"
								key={index}
							>
								<td className="py-4 px-4 text-gray-700">
									<span className="font-semibold">{index + 1}.</span>{" "}
									{training.name + " - " + (training.training_name || "")}
								</td>
								<td className="py-4 px-4 text-gray-700 ">
									{training.fieldwork_date}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
