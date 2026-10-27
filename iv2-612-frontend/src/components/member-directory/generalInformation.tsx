import { Card } from "@radix-ui/themes";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useCountries } from "$src/hooks/useCommonData";

const GeneralInformation = ({ company }) => {
	const { t } = useTranslation();
	const { data: countries = [] } = useCountries();

	const sendingCountries = company.sending_countries
		?.map((sc) => countries?.find((c) => c.country === sc)?.name)
		.join(", ");

	const companyCountryId = company.addresses?.[0]?.country_id;
	const isVietnam = companyCountryId === 31;
	const isOperational = company.status === "Operational";
	const licenseValidDateDisplay =
		isOperational && isVietnam
			? t("memberDirectoryDetail.generalInformation.tillTermination")
			: company.license_valid_date ||
				t("memberDirectoryDetail.common.notAvailable");

	return (
		<Card className="p-6 mb-4 backdrop-blur-md">
			<h3 className="text-lg font-bold mb-4">
				{t("memberDirectoryDetail.generalInformation.title")}
			</h3>
			<div className="space-y-2 text-sm">
				{company.type === "Recruitment Agency" && (
					<div className="flex justify-between">
						<b>
							{t("memberDirectoryDetail.generalInformation.sendingCountries")}
						</b>
						<span>
							{sendingCountries ||
								t("memberDirectoryDetail.common.notAvailable")}
						</span>
					</div>
				)}
				<div className="flex justify-between">
					<b>
						{t("memberDirectoryDetail.generalInformation.dateOfRegistration")}
					</b>
					<span>
						{company.date_of_registration ||
							t("memberDirectoryDetail.common.notAvailable")}
					</span>
				</div>
				{company.type === "Recruitment Agency" && (
					<div className="flex justify-between">
						<b>
							{t("memberDirectoryDetail.generalInformation.licenseValidDate")}
						</b>
						<span>{licenseValidDateDisplay}</span>
					</div>
				)}
				{company.type === "Recruitment Agency" && (
					<div className="flex justify-between">
						<b>{t("memberDirectoryDetail.generalInformation.licenseNumber")}</b>
						<span>
							{company.license_number ||
								t("memberDirectoryDetail.common.notAvailable")}
						</span>
					</div>
				)}
			</div>
		</Card>
	);
};

export default memo(GeneralInformation);
