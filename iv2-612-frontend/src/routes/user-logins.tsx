import { createFileRoute, redirect } from "@tanstack/react-router";
import UserRoster from "$src/components/routes/UserLogins/UserRoster";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isIssaraManagement } from "$src/utils/account";

export const Route = createFileRoute("/user-logins")({
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

/** Small "live source" indicator for the header actions slot. */
function LiveBadge() {
	return (
		<span
			className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold"
			style={{ borderColor: "var(--color-border)", color: "var(--color-body)" }}
		>
			<span
				className="h-2 w-2 rounded-full motion-safe:animate-pulse"
				style={{ backgroundColor: "var(--color-secondary)" }}
			/>
			Live from WorkOS
		</span>
	);
}

function RouteComponent() {
	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					actions={<LiveBadge />}
					subtitle="Monitor and track CASCADE users and their most recent login activity. Select a user to view their detailed session history from the last 30 days."
					title="User Logins"
				/>
				<UserRoster />
			</PageContainer>
		</GuestLayout>
	);
}
