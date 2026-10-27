import { createFileRoute, redirect } from "@tanstack/react-router";
import { AboutSection } from "$src/components/home/AboutSection";
import AutoSlideDrawer from "$src/components/home/AutoSlideDrawer";
import { ContactSection } from "$src/components/home/ContactSection";
import { CTASection } from "$src/components/home/CTASection";
import { FeaturesSection } from "$src/components/home/FeaturesSection";
// import { FrequentlyAskedQuestions } from "$src/components/home/FrequentlyAskedQuestions";
import { HeroCarousel } from "$src/components/home/HeroCarousel";
import IntroVideo from "$src/components/home/IntroVideo";
import { LatestUpdates } from "$src/components/home/LatestUpdates";
import { StatsSection } from "$src/components/home/StatsSection";
import { TestimonialsSection } from "$src/components/home/TestimonialsSection";
// import ThumbnailGrid from "$src/components/home/ThumbnailGrid";
import AnimatedStickyNavbar from "$src/components/navbars/AnimatedStickyNavbar";
import SocialSidebar from "$src/components/ui/SocialSidebar";
import { authStatus } from "$src/queries/auth";
// GuestLayout intentionally not used here; keep imports minimal

export const Route = createFileRoute("/")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		// Keep home public. Redirect only when auth state is complete.
		if (isAuthenticated && role) {
			throw redirect({
				to: role === "org-cso" ? "/organization-profile" : "/company-dashboard",
			});
		}
	},
	head: () => ({
		meta: [
			{ title: "CASCADE | Cascading Sustainability Data Ecosystem" },
			{
				content:
					"Leading platform for ethical recruitment, supply chain transparency, and worker empowerment. Transform your business with comprehensive labor monitoring solutions.",
				name: "description",
			},
			{
				content:
					"ethical recruitment, supply chain management, worker voice, labor monitoring, ethical business, supply chain transparency",
				name: "keywords",
			},
			{ content: "index, follow", name: "robots" },
			{ content: "en_US", property: "og:locale" },
			{ content: "website", property: "og:type" },
			{
				content: "CASCADE | Cascading Sustainability Data Ecosystem",
				property: "og:title",
			},
			{
				content:
					"Transform your business with our comprehensive ethical recruitment and supply chain management platform",
				property: "og:description",
			},
			{ href: "/", rel: "canonical" },
		],
	}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex min-h-screen w-full flex-col">
			{/* Navbar */}
			<AnimatedStickyNavbar />

			{/* <GuestLayout> */}
			<main className="w-full flex-1 overflow-y-auto snap-y snap-mandatory overflow-x-hidden scroll-smooth">
				{/* Social icons (fixed left) */}
				<SocialSidebar />
				{/* Thumbnail Grid (4 columns x 2 rows) */}
				{/* Hero Section with Carousel */}
				<section
					aria-label="Hero banner"
					className="min-h-[100svh] md:min-h-screen lg:h-screen"
				>
					<HeroCarousel />
				</section>

				<section>
					<IntroVideo />
				</section>

				<section aria-label="Auto-slide drawer">
					<AutoSlideDrawer />
				</section>
				{/* Features Section */}
				<section aria-label="Key features">
					<FeaturesSection />
				</section>

				{/* Latest Updates Section */}
				{/* <section aria-label="Latest Updates">
					<ThumbnailGrid />
				</section> */}
				<section aria-label="Latest Updates">
					<LatestUpdates />
				</section>
				{/* About Section */}
				<section aria-label="About us">
					<AboutSection />
				</section>

				{/* Statistics Section */}
				<section aria-label="Our impact">
					<StatsSection />
				</section>

				{/* Testimonials Section */}
				<section aria-label="Client testimonials">
					<TestimonialsSection />
				</section>

				{/* Contact form */}
				<section aria-label="Contact us">
					<ContactSection />
				</section>
			</main>
			{/* Footer */}
			<CTASection />
			{/* </GuestLayout> */}
		</div>
	);
}
