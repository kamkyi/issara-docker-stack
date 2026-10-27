import { useTranslation } from "react-i18next";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import { useImprovementTracks } from "$src/queries/useImprovementTracks";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import BuyerPartnersSection from "./BuyerPartnersSection";
import DemographicsSection from "./DemographicsSection";
import EngagementSection from "./EngagementSection";
import ImprovementTracksSection from "./ImprovementTracksSection";
import styles from "./supplier-dashboard.module.css";

export default function SupplierCompanyDashboard() {
	const { t } = useTranslation();
	const ids = getUserIdentifiers();
	const { data, isLoading } = useImprovementTracks({
		supplierId: ids.supplierId || undefined,
	});

	return (
		<div className={styles.page}>
			<div className={styles.pageTitleRow}>
				<h1 className={styles.pageTitle}>{t("supplierDashboard.title")}</h1>
				<p className={styles.pageSub}>{t("supplierDashboard.subtitle")}</p>
			</div>

			<DemographicsSection />

			{isLoading && !data ? (
				<div className={styles.dashSection}>
					<LoadingSpinner />
				</div>
			) : (
				<>
					<EngagementSection rows={data?.engagement ?? []} />
					<ImprovementTracksSection tracks={data?.tracks ?? []} />
					<BuyerPartnersSection />
				</>
			)}
		</div>
	);
}
