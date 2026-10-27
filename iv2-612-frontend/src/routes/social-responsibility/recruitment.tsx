import { createFileRoute } from "@tanstack/react-router";
import AnimatedStickyNavbar from "$src/components/navbars/AnimatedStickyNavbar";
import { RecruitmentLandingPage } from "$src/components/recruitment/RecruitmentLandingPage";

export const Route = createFileRoute("/social-responsibility/recruitment")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<AnimatedStickyNavbar />
			<RecruitmentLandingPage />
		</>
	);
}
