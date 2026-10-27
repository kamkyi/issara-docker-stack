import PageHeader from "$src/components/ui/PageHeader";
import { useTranslation } from "$src/hooks/useTranslation";

interface CompanyProfilePageHeaderProps {
	companyName?: string | null;
}

export default function CompanyProfilePageHeader({
	companyName,
}: CompanyProfilePageHeaderProps) {
	const { t } = useTranslation();
	const normalizedCompanyName = companyName?.trim() ?? "";
	const title = normalizedCompanyName
		? t("companyProfilePage.titleWithCompany", {
				companyName: normalizedCompanyName,
			})
		: t("companyProfilePage.title");

	return (
		<PageHeader subtitle={t("companyProfilePage.subtitle")} title={title} />
	);
}
