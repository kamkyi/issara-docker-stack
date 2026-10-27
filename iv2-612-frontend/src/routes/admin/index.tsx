import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminDashboardOverview } from "$src/components/admin/AdminDashboardOverview";
import { authStatus } from "$src/queries/auth";
import { AdminLayout } from "../../layouts/AdminLayout";

export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		if (!authStatus().isAuthenticated) {
			return redirect({ to: "/" });
		}
		// No group checks, always allow access if authenticated
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AdminLayout>
			<AdminDashboardOverview />
		</AdminLayout>
	);
}
