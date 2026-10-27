import { createFileRoute, redirect } from "@tanstack/react-router";
import UserLoginDetail from "$src/components/routes/UserLogins/UserLoginDetail";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isIssaraManagement } from "$src/utils/account";

export const Route = createFileRoute("/user-logins_/$userId")({
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
	const { userId } = Route.useParams();
	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle="Detailed session of this user history from the last 30 days."
					title="Login Details"
				/>
				<UserLoginDetail userId={userId} />
			</PageContainer>
		</GuestLayout>
	);
}
