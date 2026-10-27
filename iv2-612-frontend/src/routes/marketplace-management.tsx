import { createFileRoute, redirect } from "@tanstack/react-router";
import MarketplaceManagementPanel from "$src/components/routes/MarketplaceManagement/MarketplaceManagementPanel";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isILMManagement } from "$src/utils/account";

export const Route = createFileRoute("/marketplace-management")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		if (!isAuthenticated) {
			throw redirect({ to: "/" });
		}

		const isIlmView = getCurrentViewMode() === "ilm-view";
		if (!isILMManagement(role) || !isIlmView) {
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
					subtitle="Review incoming user activity from marketplace solutions, such as registrations and submissions, in one place."
					title="Marketplace Management"
				/>
				<MarketplaceManagementPanel />
			</PageContainer>
		</GuestLayout>
	);
}
