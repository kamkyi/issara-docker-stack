import { createFileRoute } from "@tanstack/react-router";
import { LaborLandingPage } from "$src/components/labor/LaborLandingPage";
import AnimatedStickyNavbar from "$src/components/navbars/AnimatedStickyNavbar";

export const Route = createFileRoute("/social-responsibility/labor")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<AnimatedStickyNavbar />
			<LaborLandingPage />
		</>
	);
}
