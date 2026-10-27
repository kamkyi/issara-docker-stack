import { createFileRoute } from "@tanstack/react-router";
import { GrievanceSelfDiagnostic } from "$src/components/routes/GrievanceSelfDiagnostic";
import { authStatus } from "$src/queries/auth";
import { requireSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute(
	"/cascade-marketplace_/grievance-self-diagnostic",
)({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: GrievanceSelfDiagnostic,
});
