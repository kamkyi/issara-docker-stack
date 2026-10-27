import { createFileRoute } from "@tanstack/react-router";
import WorkerReportedIssues from "$components/routes/WorkerReportedIssues";
import { authStatus } from "$src/queries/auth";
import { requireGlobalPartnerAuth } from "$src/utils/auth";

export const Route = createFileRoute("/worker-reported-issues")({
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
	return <WorkerReportedIssues />;
}
