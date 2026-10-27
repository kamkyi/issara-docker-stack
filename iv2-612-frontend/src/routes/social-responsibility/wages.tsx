import { createFileRoute } from "@tanstack/react-router";
import AnimatedStickyNavbar from "$src/components/navbars/AnimatedStickyNavbar";
import { WagesLandingPage } from "$src/components/wages/WagesLandingPage";

export const Route = createFileRoute("/social-responsibility/wages")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<AnimatedStickyNavbar />
			<WagesLandingPage />
		</>
	);
}
