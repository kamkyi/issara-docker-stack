import { createFileRoute } from "@tanstack/react-router";
import { GuestLayout } from "$src/layouts/GuestLayout";

export const Route = createFileRoute("/new-page")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<div>Hello "/new-page"!</div>
		</GuestLayout>
	);
}
