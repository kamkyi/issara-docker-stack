import { createFileRoute } from "@tanstack/react-router";
import OutreachEffectiveness from "$components/routes/OutreachEffectiveness";
import { authStatus } from "$src/queries/auth";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/outreach-effectiveness")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = await authStatus();
		requireRecruiterSupplierAuth({ isAuthenticated, role });
	},
	component: OutreachEffectiveness,
});
