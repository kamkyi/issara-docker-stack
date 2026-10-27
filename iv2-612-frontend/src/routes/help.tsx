import { createFileRoute, redirect } from "@tanstack/react-router";
import { authStatus } from "$src/queries/auth";

export const Route = createFileRoute("/help")({
	beforeLoad: () => {
		if (!authStatus().isAuthenticated) {
			return redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/help"!</div>;
}
