import { useTranslation } from "react-i18next";

export const NoteAndRemark = ({ noteData }) => {
	const { t } = useTranslation();

	return (
		<div className="w-full bg-white border border-gray-200 rounded-md p-6">
			{/* Header */}
			<p className="text-2xl font-bold text-gray-700 text-center mb-6 uppercase">
				{t("socialResponsibilityWorkplan.notesRemarks.title")}
			</p>
			{noteData?.map((note, index) => (
				<div className="mb-4 rounded-md" key={index}>
					{/* Table */}
					<div className="overflow-x-auto mb-2 text-sm font-bold">
						{note.area.toUpperCase()}
					</div>
					<div className="p-4 bg-gray-100">{note.txt_value}</div>
				</div>
			))}
		</div>
	);
};
