import { memo } from "react";
import { useTranslation } from "react-i18next";
import { getCompanyDescription } from "$src/utils/memberDirectory";

const CompanyDescription = ({ data }) => {
	const { t } = useTranslation();
	const description = getCompanyDescription(data);

	return (
		<div className="my-6">
			<p className="text-lg font-bold mb-1">
				{t("memberDirectoryDetail.description.title")}
			</p>
			<hr className="opacity-[0.1] mb-1" />
			<p className="leading-relaxed text-sm">
				{description || t("memberDirectoryDetail.description.empty")}
			</p>
		</div>
	);
};

export default memo(CompanyDescription);
