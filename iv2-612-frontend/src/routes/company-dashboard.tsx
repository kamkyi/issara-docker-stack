import { createFileRoute } from "@tanstack/react-router";
import PartnerCompanyDashboard from "$src/components/dashboard/partner/PartnerCompanyDashboard";
import SupplierCompanyDashboard from "$src/components/dashboard/supplier/SupplierCompanyDashboard";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import { requireSupplierAuth } from "$src/utils/auth";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";

export const Route = createFileRoute("/company-dashboard")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { isSupplier, isGlobalPartner } = getUserIdentifiers();
	const viewMode = useViewModeStore((state) => state.viewMode);

	// Suppliers always see the supplier dashboard. Global partners always see
	// the partner dashboard. Tester / internal users follow the view-mode
	// toggle (defaults to supplier-view), so both views are reachable.
	const showSupplier = isGlobalPartner
		? viewMode === "supplier-view"
		: isSupplier || viewMode === "supplier-view";

	return (
		<GuestLayout>
			{showSupplier ? (
				<SupplierCompanyDashboard />
			) : (
				<PartnerCompanyDashboard />
			)}
		</GuestLayout>
	);
}

export default RouteComponent;
