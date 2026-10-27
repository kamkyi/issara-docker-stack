import { createFileRoute } from "@tanstack/react-router";
import WorkerReportedIssuesSupplier from "$src/components/routes/WorkerReportedIssuesSupplier";
import { authStatus } from "$src/queries/auth";
import { requireGlobalPartnerAuth } from "$src/utils/auth";

export const Route = createFileRoute(
	"/social-responsibility/worker-reported-issues",
)({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireGlobalPartnerAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <WorkerReportedIssuesSupplier />;
}
