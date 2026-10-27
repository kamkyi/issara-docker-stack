import { ListBulletIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import CascadeButton from "$src/components/button/button";
import { JobPostingForm } from "$src/components/marketplace/JobPostingForm";
import { GuestLayout } from "$src/layouts/GuestLayout";

export const Route = createFileRoute("/marketplace/new-job-post")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	return (
		<GuestLayout>
			<div className="container mx-auto px-l py-xl">
				<Flex align={"center"} justify={"between"} mb={"6"}>
					<div>
						<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
							CREATE NEW JOB POSTING
						</h1>
						<p className="text-gray-600 mt-1 text-lg">
							Fill out the form below to create a new job posting. You can save
							as draft at any time.
						</p>
					</div>
					<div>
						<CascadeButton
							buttonText="View Drafts"
							handleOnClick={() => navigate({ to: "/marketplace/job-posting" })}
							iconLeft={<ListBulletIcon />}
							size="4"
							variant="outline"
						/>
					</div>
				</Flex>
				<JobPostingForm />
			</div>
		</GuestLayout>
	);
}
