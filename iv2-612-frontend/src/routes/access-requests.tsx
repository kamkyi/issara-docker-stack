import { createFileRoute, redirect } from "@tanstack/react-router";
import AccessRequestsPanel from "$src/components/routes/AccessRequests/AccessRequestsPanel";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isIssaraManagement } from "$src/utils/account";

export const Route = createFileRoute("/access-requests")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		if (!isAuthenticated) {
			throw redirect({ to: "/" });
		}

		const isIlmView = getCurrentViewMode() === "ilm-view";
		if (!isIssaraManagement(role) || !isIlmView) {
			throw redirect({ to: "/unauthorized" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle="Review access requests submitted by users who aren't yet linked to an organization. Issara Management can approve or reject; account setup is completed separately."
					title="CASCADE Access Requests"
				/>
				<AccessRequestsPanel />
			</PageContainer>
		</GuestLayout>
	);
}
