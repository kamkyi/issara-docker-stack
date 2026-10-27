import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import CsoCaseManagementPage from "$src/components/routes/CsoCaseManagement/CsoCaseManagementPage";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireCsoAuth } from "$src/utils/auth";

export const Route = createFileRoute("/worker-voice-calls_/cases")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();

	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle={t("workerVoicePage.cases.subtitle")}
					title={t("workerVoicePage.cases.title")}
				/>
				<CsoCaseManagementPage />
			</PageContainer>
		</GuestLayout>
	);
}
