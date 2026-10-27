import { Card } from "@radix-ui/themes";
import moment from "moment";
import { memo } from "react";
import { useTranslation } from "react-i18next";

const getText = (...values: unknown[]) => {
	for (const value of values) {
		if (value === null || value === undefined) continue;
		const text = String(value).trim();
		if (text) return text;
	}
	return "";
};

const InfoRow = ({
	label,
	value,
	link,
}: {
	label: string;
	value?: string | null;
	link?: string;
}) => {
	const text = getText(value);
	if (!text) return null;

	return (
		<div className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
				{label}
			</p>
			{link ? (
				<a
					className="break-words text-sm font-medium text-[#148696] hover:underline"
					href={link}
					rel="noopener noreferrer"
					target="_blank"
				>
					{text}
				</a>
			) : (
				<p className="break-words text-sm font-medium text-gray-900">{text}</p>
			)}
		</div>
	);
};

const formatDate = (value?: string | null) => {
	if (!value) return "";
	const date = moment(value);
	return date.isValid() ? date.format("MMM D, YYYY") : value;
};

const GlobalBuyerInformation = ({ company }: { company: any }) => {
	const { t } = useTranslation();
	const website = getText(company.website);
	const address = [company.address, company.country_name || company.country]
		.filter(Boolean)
		.join(", ");
	const contactName = getText(company.focal_point_name);
	const contactRole = getText(company.focal_point_title);
	const contact = [contactName, contactRole].filter(Boolean).join(", ");

	return (
		<Card className="p-6 mb-4 backdrop-blur-md">
			<h3 className="text-lg font-bold mb-4">
				{t("memberDirectoryDetail.globalBuyer.profileTitle")}
			</h3>
			<div className="space-y-3">
				<InfoRow
					label={t("memberDirectoryDetail.globalBuyer.website")}
					link={website}
					value={website}
				/>
				<InfoRow
					label={t("memberDirectoryDetail.globalBuyer.headquarters")}
					value={address}
				/>
				<InfoRow
					label={t("memberDirectoryDetail.globalBuyer.productsSourced")}
					value={company.products_sourced}
				/>
				<InfoRow
					label={t("memberDirectoryDetail.globalBuyer.directoryMemberSince")}
					value={formatDate(company.created)}
				/>
				<InfoRow
					label={t("memberDirectoryDetail.globalBuyer.profileUpdated")}
					value={formatDate(company.last_modified)}
				/>
			</div>

			{(contact ||
				company.focal_point_email ||
				company.focal_point_phone_number) && (
				<div className="mt-5 border-t border-gray-100 pt-4">
					<p className="mb-3 text-sm font-bold">
						{t("memberDirectoryDetail.globalBuyer.businessContact")}
					</p>
					<div className="space-y-3">
						<InfoRow
							label={t("memberDirectoryDetail.globalBuyer.name")}
							value={contact}
						/>
						<InfoRow
							label={t("memberDirectoryDetail.globalBuyer.email")}
							link={
								company.focal_point_email
									? `mailto:${company.focal_point_email}`
									: undefined
							}
							value={company.focal_point_email}
						/>
						<InfoRow
							label={t("memberDirectoryDetail.globalBuyer.phone")}
							value={company.focal_point_phone_number}
						/>
					</div>
				</div>
			)}
		</Card>
	);
};

export default memo(GlobalBuyerInformation);
