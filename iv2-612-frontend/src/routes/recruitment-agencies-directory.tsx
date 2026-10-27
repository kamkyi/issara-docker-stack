import { Box, Container } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import Directory from "$src/components/directory/CompanyDirectory";
import type { DirectoryProps } from "$src/components/directory/types";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireRecruiterAuth } from "$src/utils/auth";
import landingPageImage from "../assets/img/banner-image/gd-two-workers.jpg";
import agenciesData from "../assets/mock/agencies-data.json";
import styles from "./recruitment-agencies.module.css";

export const Route = createFileRoute("/recruitment-agencies-directory")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<GuestLayout>
			<div>
				<Container size="4">
					<Box className="mb-4">
						<div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
							{/* Left content - takes up 3 parts of golden ratio (approx. 61.8%) */}
							<div className="md:col-span-3 order-2 md:order-1">
								<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
									<span className="text-teal-600">
										Recruitment Agencies Directory
									</span>
								</h1>
								<div className="w-20 h-1.5 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full mb-6"></div>
								<p className="text-teal-700 leading-relaxed text-lg max-w-lg">
									Explore recruitment agencies profiles, experiences with
									sending countries, industries, scores and certifications
								</p>
							</div>

							{/* Right image - takes up 2 parts of golden ratio (approx. 38.2%) */}
							<div className="md:col-span-2 order-1 md:order-2">
								<div
									className="relative w-full overflow-hidden rounded-sm shadow-xl"
									style={{ paddingTop: "75%" }}
								>
									<div className="absolute inset-0 bg-teal-600/10 mix-blend-multiply z-10"></div>
									<img
										alt="A visual representation of Inclusive Labor Monitoring"
										className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
										src={landingPageImage}
									/>
									<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-900/70 to-transparent h-1/4"></div>
								</div>
							</div>
						</div>
					</Box>
				</Container>
			</div>

			<Container
				className={`${styles.container} ${styles.containerPadding} gap-1`}
				size="4"
			>
				<Directory
					companies={agenciesData as unknown as DirectoryProps["companies"]}
				></Directory>
			</Container>
		</GuestLayout>
	);
}
