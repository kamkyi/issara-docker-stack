import { createFileRoute } from "@tanstack/react-router";
import SupplierHrddOverview from "$src/components/dashboard/supplier/SupplierHrddOverview";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/hrdd-overview")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<SupplierHrddOverview />
		</GuestLayout>
	);
}

export default RouteComponent;
