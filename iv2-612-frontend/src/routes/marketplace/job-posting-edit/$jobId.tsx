import { ListBulletIcon } from "@radix-ui/react-icons";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import CascadeButton from "$src/components/button/button";
import { JobPostingForm } from "$src/components/marketplace/JobPostingForm";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { jobPostingService } from "$src/services/jobPostingService";

export const Route = createFileRoute("/marketplace/job-posting-edit/$jobId")({
	component: EditJobPosting,
});

function EditJobPosting() {
	const { jobId } = Route.useParams();
	const navigate = useNavigate();

	// Fetch job data for editing
	const {
		data: jobData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["jobPosting", jobId],
		queryFn: () => jobPostingService.getById(Number(jobId)),
		enabled: !!jobId,
	});

	if (isLoading) {
		return (
			<GuestLayout>
				<div className="container mx-auto px-l py-xl">
					<LoadingSpinner subtitle="Please wait" title="Loading job data..." />
				</div>
			</GuestLayout>
		);
	}

	if (error || !jobData) {
		return (
			<GuestLayout>
				<div className="container mx-auto px-l py-xl">
					<Box className="text-center">
						<Text color="red" size="4">
							Failed to load job posting. Please try again.
						</Text>
						<button
							className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
							onClick={() => navigate({ to: "/marketplace/job-posting" })}
						>
							Back to Job Posts
						</button>
					</Box>
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<div className="container mx-auto px-l py-xl">
				<Flex align={"center"} justify={"between"} mb={"6"}>
					<div>
						<h1 className="mb-xl font-black uppercase tracking-[-0.022em]">
							EDITING JOB POST
						</h1>
						<p className="text-gray-600 mt-1 text-sm">
							Fill out the form below to create a new job posting. You can save
							as draft at any time.
						</p>
					</div>
					<div>
						<CascadeButton
							buttonText="View Drafts"
							handleOnClick={() => navigate({ to: "/marketplace/job-posting" })}
							iconLeft={<ListBulletIcon />}
							size="3"
							variant="outline"
						/>
					</div>
				</Flex>
				<JobPostingForm
					initialData={jobData}
					jobId={Number(jobId)}
					mode="edit"
				/>
			</div>
		</GuestLayout>
	);
}
