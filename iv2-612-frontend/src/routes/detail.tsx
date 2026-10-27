import { createFileRoute, redirect } from "@tanstack/react-router";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";

export const Route = createFileRoute("/detail")({
	beforeLoad: () => {
		if (!authStatus().isAuthenticated) {
			return redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<div>
				<h1>Details</h1>
				<p>This is the detail page showing more specific information.</p>
				<p>
					Here you can find detailed content about our products or services.
				</p>
			</div>
		</GuestLayout>
	);
}
