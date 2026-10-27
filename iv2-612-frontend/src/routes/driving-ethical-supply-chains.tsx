import { createFileRoute } from "@tanstack/react-router";
import DrivingEthicalSupplyChains from "$components/routes/DrivingEthicalSupplyChains";
import { authStatus } from "$src/queries/auth";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/driving-ethical-supply-chains")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = await authStatus();
		requireRecruiterSupplierAuth({ isAuthenticated, role });
	},
	component: DrivingEthicalSupplyChains,
});
