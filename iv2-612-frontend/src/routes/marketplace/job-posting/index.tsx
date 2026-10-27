import type { GridColDef } from "@mui/x-data-grid";
import {
	Box,
	Button,
	Flex,
	Heading,
	Switch,
	Tabs,
	Text,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import moment from "moment";
import { useState } from "react";
import CascadeButton from "$src/components/button/button";
import DataTable from "$src/components/tables/DataTable";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { jobPostingService } from "$src/services/jobPostingService";

export const Route = createFileRoute("/marketplace/job-posting/")({
	component: RouteComponent,
});

interface JobPosting {
	id: number;
	job_title: string;
	updated_at: string;
	created_at: string;
	posted_at: string;
	expired_at: string;
	is_draft: boolean;
	is_closed: boolean;
	is_archived: boolean;
	is_online: boolean;
	view_count: number;
	applications_count?: number;
	filled_vacancies?: number;
}

type JobStatus = "draft" | "posted" | "closed" | "archived";

function RouteComponent() {
	const navigate = useNavigate();
	const urlParams = new URLSearchParams(window.location.search);
	const type = urlParams.get("type") as JobStatus;
	const [activeTab, setActiveTab] = useState<JobStatus>(type || "draft");

	// Fetch jobs by status
	const {
		data: jobsData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["jobs", activeTab],
		queryFn: () => jobPostingService.getByStatus(activeTab),
	});

	// Fetch counts for all statuses
	const { data: draftCount = 0 } = useQuery({
		queryKey: ["jobCount", "draft"],
		queryFn: async () => {
			const data = await jobPostingService.getByStatus("draft");
			return data?.length || 0;
		},
	});

	const { data: postedCount = 0 } = useQuery({
		queryKey: ["jobCount", "posted"],
		queryFn: async () => {
			const data = await jobPostingService.getByStatus("posted");
			return data?.length || 0;
		},
	});

	const { data: closedCount = 0 } = useQuery({
		queryKey: ["jobCount", "closed"],
		queryFn: async () => {
			const data = await jobPostingService.getByStatus("closed");
			return data?.length || 0;
		},
	});

	const { data: archivedCount = 0 } = useQuery({
		queryKey: ["jobCount", "archived"],
		queryFn: async () => {
			const data = await jobPostingService.getByStatus("archived");
			return data?.length || 0;
		},
	});

	const handleEdit = (id: number) => {
		navigate({ to: `/marketplace/job-posting-edit/${id}` });
	};

	const handleArchive = async (id: number) => {
		try {
			await jobPostingService.archive(id);
			refetch();
		} catch (error) {
			console.error("Failed to archive job:", error);
		}
	};

	const handleReopen = async (id: number) => {
		try {
			await jobPostingService.reopen(id);
			refetch();
		} catch (error) {
			console.error("Failed to reopen job:", error);
		}
	};

	const handleToggleOnline = async (id: number, isOnline: boolean) => {
		try {
			await jobPostingService.toggleOnline(id, isOnline);
			refetch();
		} catch (error) {
			console.error("Failed to toggle online status:", error);
		}
	};

	const handleEndRecruitment = async (id: number) => {
		try {
			await jobPostingService.endRecruitment(id);
			refetch();
		} catch (error) {
			console.error("Failed to end recruitment:", error);
		}
	};

	const handleDelete = async (id: number) => {
		if (
			confirm("Are you sure you want to permanently delete this job posting?")
		) {
			try {
				await jobPostingService.delete(id);
				refetch();
			} catch (error) {
				console.error("Failed to delete job:", error);
			}
		}
	};

	const handlePreview = (id: number) => {
		navigate({ to: `/marketplace/job-posting-preview/${id}` });
	};

	const getColumns = (): GridColDef[] => {
		const baseColumns: GridColDef[] = [
			{
				field: "job_title",
				headerName: "Title",
				flex: 1,
				minWidth: 200,
				renderCell: (params) => (
					<div>
						<Text size="2" weight="medium">
							{params.value || "Untitled Job"}
						</Text>
					</div>
				),
			},
		];

		// Status-specific columns
		switch (activeTab) {
			case "draft":
				return [
					...baseColumns,
					{
						field: "updated_at",
						headerName: "Saved",
						width: 150,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{moment(params.value).format("DD-MMM-YYYY HH:mm")}
							</Text>
						),
					},
					{
						field: "actions",
						headerName: "Action",
						width: 250,
						sortable: false,
						renderCell: (params) => (
							<Flex align="center" gap="2">
								<Button
									color="blue"
									onClick={() => handleEdit(params.row.id)}
									size="1"
									variant="soft"
								>
									Edit
								</Button>
								<Button
									color="green"
									onClick={() => handlePreview(params.row.id)}
									size="1"
									variant="soft"
								>
									Preview
								</Button>
								<Button
									color="red"
									onClick={() => handleArchive(params.row.id)}
									size="1"
									variant="soft"
								>
									Archive
								</Button>
							</Flex>
						),
					},
				];

			case "posted":
				return [
					...baseColumns,
					{
						field: "posted_at",
						headerName: "Posted",
						width: 120,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{params.value
									? moment(params.value).format("DD-MMM-YYYY HH:mm")
									: "N/A"}
							</Text>
						),
					},
					{
						field: "expired_at",
						headerName: "Expires",
						width: 120,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{params.value
									? moment(params.value).format("DD-MMM-YYYY HH:mm")
									: "N/A"}
							</Text>
						),
					},
					{
						field: "view_count",
						headerName: "Views",
						width: 80,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "applications_count",
						headerName: "Applicants",
						width: 100,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "filled_vacancies",
						headerName: "Filled Vacancies",
						width: 130,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "is_online",
						headerName: "Online",
						width: 80,
						renderCell: (params) => (
							<Switch
								checked={params.value}
								onCheckedChange={(checked) =>
									handleToggleOnline(params.row.id, checked)
								}
								size="1"
							/>
						),
					},
					{
						field: "actions",
						headerName: "Action",
						width: 250,
						sortable: false,
						renderCell: (params) => (
							<Flex align="center" gap="2">
								<Button
									color="green"
									onClick={() => handlePreview(params.row.id)}
									size="1"
									variant="soft"
								>
									Preview
								</Button>
								<Button
									color="orange"
									onClick={() => handleEndRecruitment(params.row.id)}
									size="1"
									variant="soft"
								>
									End Recruitment
								</Button>
								<Button
									color="red"
									onClick={() => handleArchive(params.row.id)}
									size="1"
									variant="soft"
								>
									Archive
								</Button>
							</Flex>
						),
					},
				];

			case "closed":
				return [
					...baseColumns,
					{
						field: "posted_at",
						headerName: "Posted",
						width: 120,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{params.value
									? moment(params.value).format("DD-MMM-YYYY HH:mm")
									: "N/A"}
							</Text>
						),
					},
					{
						field: "expired_at",
						headerName: "Expires",
						width: 120,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{params.value
									? moment(params.value).format("DD-MMM-YYYY HH:mm")
									: "N/A"}
							</Text>
						),
					},
					{
						field: "view_count",
						headerName: "Views",
						width: 80,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "applications_count",
						headerName: "Applicants",
						width: 100,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "filled_vacancies",
						headerName: "Filled Vacancies",
						width: 130,
						renderCell: (params) => <Text size="2">{params.value || 0}</Text>,
					},
					{
						field: "actions",
						headerName: "Action",
						width: 200,
						sortable: false,
						renderCell: (params) => (
							<Flex align="center" gap="2">
								<Button
									color="green"
									onClick={() => handlePreview(params.row.id)}
									size="1"
									variant="soft"
								>
									Preview
								</Button>
								<Button
									color="blue"
									onClick={() => handleReopen(params.row.id)}
									size="1"
									variant="soft"
								>
									Reopen
								</Button>
								<Button
									color="red"
									onClick={() => handleArchive(params.row.id)}
									size="1"
									variant="soft"
								>
									Archive
								</Button>
							</Flex>
						),
					},
				];

			case "archived":
				return [
					...baseColumns,
					{
						field: "updated_at",
						headerName: "Archived",
						width: 150,
						renderCell: (params) => (
							<Text color="gray" size="2">
								{moment(params.value).format("DD-MMM-YYYY HH:mm")}
							</Text>
						),
					},
					{
						field: "actions",
						headerName: "Action",
						width: 200,
						sortable: false,
						renderCell: (params) => (
							<Flex align="center" gap="2">
								<Button
									color="green"
									onClick={() => handlePreview(params.row.id)}
									size="1"
									variant="soft"
								>
									Preview
								</Button>
								<Button
									color="red"
									onClick={() => handleDelete(params.row.id)}
									size="1"
									variant="soft"
								>
									Delete
								</Button>
							</Flex>
						),
					},
				];

			default:
				return baseColumns;
		}
	};

	const rows =
		jobsData?.map((job: JobPosting) => ({
			id: job.id,
			job_title: job.job_title,
			updated_at: job.updated_at,
			posted_at: job.posted_at,
			expired_at: job.expired_at,
			view_count: job.view_count,
			applications_count: job.applications_count,
			filled_vacancies: job.filled_vacancies,
			is_online: job.is_online,
		})) || [];

	const getTabTitle = (status: JobStatus) => {
		const counts = {
			draft: draftCount,
			posted: postedCount,
			closed: closedCount,
			archived: archivedCount,
		};

		const labels = {
			draft: "Draft",
			posted: "Posted",
			closed: "Closed",
			archived: "Archived",
		};

		return `${labels[status]} (${counts[status]})`;
	};

	if (error) {
		return (
			<GuestLayout>
				<div className="container mx-auto px-l py-xl">
					<Box className="text-center">
						<Text color="red" size="4">
							Failed to load draft jobs. Please try again.
						</Text>
						<Button className="mt-4" onClick={() => refetch()}>
							Retry
						</Button>
					</Box>
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<div className="container mx-auto px-l py-xl">
				<Flex direction="column" gap="6">
					{/* Header */}
					<Flex align="center" justify="between">
						<div>
							<Heading className="mb-2" size="8">
								JOB POSTS MANAGEMENT
							</Heading>
							<Text color="gray" size="3">
								Manage all your job postings across different statuses
							</Text>
						</div>
						<CascadeButton
							buttonText="+ Create New Job Post"
							handleOnClick={() =>
								navigate({ to: "/marketplace/new-job-post" })
							}
							size="3"
						/>
					</Flex>

					{/* Tabs */}
					<Tabs.Root
						onValueChange={(value) => setActiveTab(value as JobStatus)}
						value={activeTab}
					>
						<Tabs.List className="grid w-full grid-cols-4">
							<Tabs.Trigger
								className="data-[state=active]:bg-blue-100"
								value="draft"
							>
								{getTabTitle("draft")}
							</Tabs.Trigger>
							<Tabs.Trigger
								className="data-[state=active]:bg-green-100"
								value="posted"
							>
								{getTabTitle("posted")}
							</Tabs.Trigger>
							<Tabs.Trigger
								className="data-[state=active]:bg-orange-100"
								value="closed"
							>
								{getTabTitle("closed")}
							</Tabs.Trigger>
							<Tabs.Trigger
								className="data-[state=active]:bg-gray-100"
								value="archived"
							>
								{getTabTitle("archived")}
							</Tabs.Trigger>
						</Tabs.List>

						{/* Tab Content */}
						<Tabs.Content className="mt-6" value={activeTab}>
							{/* Stats */}
							<Flex className="mb-6" gap="4" justify="between">
								<Box className="p-3 bg-gray-50 rounded-lg">
									<Text color="gray" size="2" weight="bold">
										Total{" "}
										{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}:
									</Text>
									<Text size="3" weight="bold">
										{" "}
										{rows.length}
									</Text>
								</Box>
								<Box className="p-3 bg-gray-50 rounded-lg">
									<Text color="gray" size="2" weight="bold">
										Last Updated:{" "}
									</Text>
									<Text size="2">
										{rows.length > 0
											? new Date(
													Math.max(
														...rows.map((r) =>
															new Date(r.updated_at).getTime(),
														),
													),
												).toLocaleDateString()
											: "N/A"}
									</Text>
								</Box>
							</Flex>

							{/* Data Table */}
							<Box className="rounded-lg p-1">
								{isLoading ? (
									<Box className="text-center py-8">
										<Text size="3">Loading {activeTab} jobs...</Text>
									</Box>
								) : rows.length === 0 ? (
									<Box className="text-center py-12">
										<Text className="mb-4" size="4">
											📄 No {activeTab} jobs found
										</Text>
										<Text className="mb-6" color="gray" size="3">
											{activeTab === "draft"
												? "You haven't saved any job posting drafts yet."
												: `You don't have any ${activeTab} job postings.`}
										</Text>
										{activeTab === "draft" && (
											<Button
												onClick={() =>
													navigate({ to: "/marketplace/new-job-post" })
												}
												size="3"
											>
												Create Your First Job Post
											</Button>
										)}
									</Box>
								) : (
									<DataTable
										autoHeight={true}
										columns={getColumns()}
										dense
										pageSize={10}
										rows={rows}
									/>
								)}
							</Box>
						</Tabs.Content>
					</Tabs.Root>
				</Flex>
			</div>
		</GuestLayout>
	);
}
