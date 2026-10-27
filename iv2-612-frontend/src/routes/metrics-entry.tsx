import { createFileRoute, redirect } from "@tanstack/react-router";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { getCurrentViewMode } from "$src/store/viewModeStore";
import { isIssaraManagement } from "$src/utils/account";

export const Route = createFileRoute("/metrics-entry")({
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
			<div className="mx-auto max-w-6xl px-6 py-6">
				<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
					Metrics Entry
				</h1>
			</div>
		</GuestLayout>
	);
}
