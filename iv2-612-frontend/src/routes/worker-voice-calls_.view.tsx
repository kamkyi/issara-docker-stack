import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WorkerVoiceCallsList } from "$src/components/routes/WorkerVoiceCalls";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireCsoAuth } from "$src/utils/auth";

export const Route = createFileRoute("/worker-voice-calls_/view")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

// CSO UI v1 -- the calls this organization has logged (IV2-582).
function RouteComponent() {
	const { t } = useTranslation();

	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle={t("workerVoicePage.view.subtitle")}
					title={t("workerVoicePage.view.title")}
				/>
				<WorkerVoiceCallsList />
			</PageContainer>
		</GuestLayout>
	);
}
