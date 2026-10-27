import { createFileRoute } from "@tanstack/react-router";
import { GuestLayout } from "$src/layouts/GuestLayout";

export const Route = createFileRoute("/employee-relations")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<div>
				<h1>Employee Relations</h1>
				<p>Learn about our workplace and worker feedback initiatives.</p>
			</div>
		</GuestLayout>
	);
}
