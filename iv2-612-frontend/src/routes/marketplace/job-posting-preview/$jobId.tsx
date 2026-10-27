import { Box, Button, Heading, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGDSubIndustries } from "$src/hooks/useIndustries";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { jobPostingService } from "$src/services/jobPostingService";

export const Route = createFileRoute("/marketplace/job-posting-preview/$jobId")(
	{
		component: PreviewJobPosting,
	},
);

function PreviewJobPosting() {
	const { jobId } = Route.useParams();
	const navigate = useNavigate();

	// Fetch job data for preview
	const {
		data: jobData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["jobPosting", jobId],
		queryFn: () => jobPostingService.getById(Number(jobId)),
		enabled: !!jobId,
	});
	const { data: employerSubIndustry } = useGDSubIndustries();
	if (isLoading) {
		return (
			<GuestLayout>
				<div className="container mx-auto px-l py-xl">
					<Box className="text-center">
						<Text size="4">Loading job posting preview...</Text>
					</Box>
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
						<Button
							className="mt-4"
							onClick={() => navigate({ to: "/marketplace/job-posting" })}
						>
							Back to Job Posts
						</Button>
					</Box>
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<div className="container mx-auto px-l py-xl">
				<div className="max-w-4xl mx-auto">
					{/* Header */}
					<div className="mb-6">
						<Button
							className="mb-4"
							onClick={() => navigate({ to: "/marketplace/job-posting" })}
							variant="soft"
						>
							← Back to Job Posts
						</Button>
						<Heading className="mb-2" size="6">
							Job Posting Preview
						</Heading>
						<Text color="gray" size="3">
							Preview how your job posting will appear to candidates
						</Text>
					</div>

					{/* Job Preview Card */}
					<div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
						<div className="mb-6">
							<Heading className="mb-2" size="5">
								{jobData.job_title || "Untitled Job"}
							</Heading>
							<Text color="gray" size="3">
								{
									employerSubIndustry?.find(
										(ei) => ei.id === jobData.employer_industry,
									)?.name
								}{" "}
								• {jobData.job_type}
							</Text>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
							<div>
								<Text className="block mb-1" size="2" weight="bold">
									Location
								</Text>
								<Text color="gray" size="2">
									{jobData.city && jobData.state
										? `${jobData.city}, ${jobData.state}`
										: "Location not specified"}
								</Text>
							</div>
							<div>
								<Text className="block mb-1" size="2" weight="bold">
									Salary
								</Text>
								<Text color="gray" size="2">
									{jobData.monthlySalary > 0
										? `${jobData.currencyCode} ${jobData.monthlySalary.toLocaleString()}/month`
										: "Salary not specified"}
								</Text>
							</div>
							<div>
								<Text className="block mb-1" size="2" weight="bold">
									Contract Duration
								</Text>
								<Text color="gray" size="2">
									{jobData.contractDuration} months
								</Text>
							</div>
							<div>
								<Text className="block mb-1" size="2" weight="bold">
									Headcount Needed
								</Text>
								<Text color="gray" size="2">
									{jobData.headcountNeeded} position(s)
								</Text>
							</div>
						</div>

						{/* Benefits */}
						{jobData.selectedBenefits &&
							jobData.selectedBenefits.length > 0 && (
								<div className="mb-6">
									<Text className="block mb-2" size="2" weight="bold">
										Benefits
									</Text>
									<Text color="gray" size="2">
										{jobData.selectedBenefits.length} benefits included
									</Text>
								</div>
							)}

						{/* Contact Information */}
						<div className="border-t border-gray-200 pt-4">
							<Text className="block mb-1" size="2" weight="bold">
								Contact for Applications
							</Text>
							<Text color="gray" size="2">
								{jobData.notificationEmail || "Contact email not specified"}
							</Text>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3 mt-6">
						<Button
							onClick={() =>
								navigate({
									to: "/marketplace/job-posting-edit/$jobId",
									params: { jobId: jobId },
								})
							}
							variant="soft"
						>
							Edit Job Posting
						</Button>
						<Button
							onClick={() => navigate({ to: "/marketplace/job-posting" })}
						>
							Back to Job Posts
						</Button>
					</div>
				</div>
			</div>
		</GuestLayout>
	);
}
