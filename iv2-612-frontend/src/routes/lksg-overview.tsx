import { createFileRoute } from "@tanstack/react-router";
import LksgOverviewPage from "$src/components/dashboard/partner/LksgOverviewPage";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/lksg-overview")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<LksgOverviewPage />
		</GuestLayout>
	);
}

export default RouteComponent;
