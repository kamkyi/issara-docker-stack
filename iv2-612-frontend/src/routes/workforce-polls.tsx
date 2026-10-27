import { Card } from "@mui/material";
import { GridFilterAltIcon } from "@mui/x-data-grid";
import {
	CalendarIcon,
	CheckCircledIcon,
	DownloadIcon,
	EyeOpenIcon,
} from "@radix-ui/react-icons";
import { Button, Flex, RadioGroup } from "@radix-ui/themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { AxiosError } from "axios";
import moment from "moment";
import * as motion from "motion/react-client";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import pollsData from "$src/assets/mock/workforce-poll.json";
import CascadeButton from "$src/components/button/button";
import HorizontalStackedBar from "$src/components/charts/HorizontalStackedBar";
import MultipleLineChart from "$src/components/charts/LineChart";
import MiniBarChart from "$src/components/charts/MiniBarChart";
import NationalityRadialChart from "$src/components/charts/NationalityRadialChart";
import Selector from "$src/components/inputs/selector";
import AlertModal from "$src/components/modals/AlertModal";
import CreatePollStepperModal from "$src/components/modals/CreatePollStepperModal";
import PollDetailModal from "$src/components/modals/PollDetailModal";
import SearchBox from "$src/components/search/searchBox";
import DataTable from "$src/components/tables/DataTable";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import {
	deletePoll,
	fetchWorkforcePollCharts,
	fetchWorkforcePollResults,
	publishPoll,
	unpublishPoll,
} from "$src/services/pollManagementService";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import { useMockData } from "$src/utils/config";

export const Route = createFileRoute("/workforce-polls")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

const POLL_REFETCH_INTERVAL_MS = 5000;

function getHttpStatus(error: unknown): number | null {
	const status = (error as AxiosError | undefined)?.response?.status;
	return typeof status === "number" ? status : null;
}

function shouldRetryWorkforcePollQuery(failureCount: number, error: unknown) {
	const status = getHttpStatus(error);
	// Do not retry client-side failures (auth/permission/not-found/validation/etc.)
	if (typeof status === "number" && status >= 400 && status < 500) {
		return false;
	}
	return failureCount < 2;
}

function getWorkforcePollRefetchInterval(query: {
	state: { error: unknown; status?: string };
}) {
	if (query.state.error || query.state.status === "error") {
		return false;
	}
	return POLL_REFETCH_INTERVAL_MS;
}

function RouteComponent() {
	const shouldUseMockDataForRole = useMockData();
	const { role } = useAuthData();
	const { viewMode } = useViewModeStore();
	const isSupplierContext =
		role === "org-supplier" || viewMode === "supplier-view";
	const isTesterContext = viewMode === "tester-view";
	const shouldUseMockData =
		!isSupplierContext && (shouldUseMockDataForRole || isTesterContext);
	const shouldUseBackendData = !shouldUseMockData;
	const [openCreatePollModal, setOpenCreatePollModal] = useState(false);
	const [selectedGender, setSelectedGender] = useState("");
	const [selectedNationality, setSelectedNationality] = useState("");
	const [pollType, setPollType] = useState("1");
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [pollToPublish, setPollToPublish] = useState<any>(null);
	const [isUnpublishModalOpen, setIsUnpublishModalOpen] = useState(false);
	const [pollToUnpublish, setPollToUnpublish] = useState<any>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [pollToDelete, setPollToDelete] = useState<any>(null);
	const [editingPoll, setEditingPoll] = useState<{
		id: number | string;
		initialData: Record<string, any>;
	} | null>(null);
	const [isPollDetailModalOpen, setIsPollDetailModalOpen] = useState(false);
	const [selectedPoll, setSelectedPoll] = useState(null);
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [stopBackendPolling, setStopBackendPolling] = useState(false);

	const queryClient = useQueryClient();
	const hasSelectedDateRange = Boolean(startDate && endDate);
	const hasAuthToken = Boolean(localStorage.getItem("auth_token"));
	const formattedStartDate = hasSelectedDateRange
		? moment(startDate).format("YYYY-MM-DD")
		: undefined;
	const formattedEndDate = hasSelectedDateRange
		? moment(endDate).format("YYYY-MM-DD")
		: undefined;

	const onChange = (dates) => {
		const [start, end] = dates;
		setStartDate(start);
		setEndDate(end);
	};

	const handleOpenCreatePollModal = () => {
		setOpenCreatePollModal(true);
	};

	const {
		data: pollResultsApiData = [],
		error: pollResultsError,
		isError: pollResultsApiError,
	} = useQuery({
		queryKey: [
			"workforce-poll-results",
			formattedStartDate ?? "all",
			formattedEndDate ?? "all",
			selectedGender,
			selectedNationality,
			searchQuery,
		],
		queryFn: () =>
			fetchWorkforcePollResults({
				start_date: formattedStartDate,
				end_date: formattedEndDate,
				gender: selectedGender || undefined,
				nationality_id: selectedNationality || undefined,
				search: searchQuery || undefined,
			}),
		enabled: shouldUseBackendData && hasAuthToken && !stopBackendPolling,
		staleTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry: shouldRetryWorkforcePollQuery,
		refetchInterval: getWorkforcePollRefetchInterval,
		refetchIntervalInBackground: true,
		placeholderData: (previousData) => previousData,
	});

	const { data: chartApiData, error: chartApiError } = useQuery({
		queryKey: [
			"workforce-poll-chart-data",
			formattedStartDate ?? "all",
			formattedEndDate ?? "all",
			selectedGender,
			selectedNationality,
			searchQuery,
		],
		queryFn: () =>
			fetchWorkforcePollCharts({
				start_date: formattedStartDate,
				end_date: formattedEndDate,
				gender: selectedGender || undefined,
				nationality_id: selectedNationality || undefined,
				search: searchQuery || undefined,
			}),
		enabled: shouldUseBackendData && hasAuthToken && !stopBackendPolling,
		staleTime: 0,
		refetchOnMount: "always",
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		retry: shouldRetryWorkforcePollQuery,
		refetchInterval: getWorkforcePollRefetchInterval,
		refetchIntervalInBackground: true,
		placeholderData: (previousData) => previousData,
	});

	useEffect(() => {
		const pollStatus = getHttpStatus(pollResultsError);
		const chartStatus = getHttpStatus(chartApiError);
		if (
			(typeof pollStatus === "number" && pollStatus >= 400) ||
			(typeof chartStatus === "number" && chartStatus >= 400)
		) {
			setStopBackendPolling(true);
		}
	}, [pollResultsError, chartApiError]);

	const pollSourceData = useMemo(() => {
		if (shouldUseMockData) {
			return pollsData;
		}
		if (pollResultsApiError || !Array.isArray(pollResultsApiData)) {
			return [];
		}
		return pollResultsApiData;
	}, [shouldUseMockData, pollResultsApiError, pollResultsApiData]);

	const filteredPollRows = useMemo(() => {
		const normalize = (value: string) =>
			value.toLowerCase().replace(/[^a-z0-9]/g, "");

		return pollSourceData.filter((poll: any) => {
			const byGender =
				!selectedGender ||
				(Array.isArray(poll.gender) &&
					poll.gender.some(
						(gender: string) =>
							normalize(String(gender)) === normalize(selectedGender),
					));
			const byNationality =
				!selectedNationality ||
				(Array.isArray(poll.nationality) &&
					poll.nationality.some(
						(id: number | string) => String(id) === selectedNationality,
					));
			const bySearch =
				!searchQuery ||
				String(poll.description || "")
					.toLowerCase()
					.includes(searchQuery.toLowerCase());
			return byGender && byNationality && bySearch;
		});
	}, [pollSourceData, selectedGender, selectedNationality, searchQuery]);

	const buildMiniBarDataFromSeries = (
		lineSeries: Array<Record<string, string | number>>,
	) => {
		return lineSeries.map((row) => {
			const year = String(row.year ?? "");
			const value = Object.entries(row).reduce((sum, [key, item]) => {
				if (key === "year") return sum;
				return sum + Number(item || 0);
			}, 0);
			return { name: year, value };
		});
	};

	const yearlyVoteData = useMemo(() => {
		const yearlyTotals = new Map<number, number>();
		for (const poll of pollSourceData) {
			const year = Number(moment(poll.created_at).format("YYYY"));
			const votes = Array.isArray(poll.choices)
				? poll.choices.reduce(
						(total: number, choice: any) => total + (choice.votes_count || 0),
						0,
					)
				: 0;
			yearlyTotals.set(year, (yearlyTotals.get(year) || 0) + votes);
		}
		return Array.from(yearlyTotals.entries())
			.sort(([a], [b]) => a - b)
			.map(([year, value]) => ({ name: String(year), value }));
	}, [pollSourceData]);

	const summaryCards = useMemo(() => {
		if (shouldUseMockData) {
			return cardData;
		}

		const nationalitySeries = Array.isArray(
			chartApiData?.nationality_line_series,
		)
			? chartApiData?.nationality_line_series
			: [];
		const nationalityBarData = buildMiniBarDataFromSeries(nationalitySeries);
		const summary = chartApiData?.summary;

		return [
			{
				id: 1,
				title: "Average Polls by year",
				value: summary?.average_polls_by_year || 0,
				chartData: nationalityBarData,
			},
			{
				id: 2,
				title: "Total Polls",
				value: summary?.total_polls || 0,
				chartData: nationalityBarData,
			},
			{
				id: 3,
				title: "Total Polls Response",
				value: summary?.total_polls_response || 0,
				chartData: yearlyVoteData,
			},
		];
	}, [shouldUseMockData, chartApiData, yearlyVoteData]);
	const handleRadioChange = () => {
		setPollType(pollType === "1" ? "2" : "1");
	};

	const handleOnClickPublish = (poll: any) => {
		setPollToPublish(poll);
		setIsPublishModalOpen(true);
	};

	const handleConfirmPublish = async () => {
		if (!pollToPublish) return;
		try {
			if (shouldUseMockData) return;
			await publishPoll(pollToPublish.id);
			queryClient.invalidateQueries({ queryKey: ["workforce-poll-results"] });
			queryClient.invalidateQueries({
				queryKey: ["workforce-poll-chart-data"],
			});
		} finally {
			setIsPublishModalOpen(false);
			setPollToPublish(null);
		}
	};

	const handleOnClickUnpublish = (poll: any) => {
		setPollToUnpublish(poll);
		setIsUnpublishModalOpen(true);
	};

	const handleConfirmUnpublish = async () => {
		if (!pollToUnpublish) return;
		try {
			if (shouldUseMockData) return;
			await unpublishPoll(pollToUnpublish.id);
			queryClient.invalidateQueries({ queryKey: ["workforce-poll-results"] });
			queryClient.invalidateQueries({
				queryKey: ["workforce-poll-chart-data"],
			});
		} finally {
			setIsUnpublishModalOpen(false);
			setPollToUnpublish(null);
		}
	};

	const handleOnClickDelete = (poll: any) => {
		setPollToDelete(poll);
		setIsDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!pollToDelete) return;
		try {
			if (shouldUseMockData) return;
			await deletePoll(pollToDelete.id);
			queryClient.invalidateQueries({ queryKey: ["workforce-poll-results"] });
			queryClient.invalidateQueries({
				queryKey: ["workforce-poll-chart-data"],
			});
		} finally {
			setIsDeleteModalOpen(false);
			setPollToDelete(null);
		}
	};

	const handleOnClickEdit = (poll: any) => {
		if (shouldUseMockData) return;
		setEditingPoll({
			id: poll.id,
			initialData: {
				title: poll.title || "",
				description: poll.poll_description || "",
				question: poll.question_text || poll.description || "",
				selectedGenders: poll.gender || [],
				selectedNationalities: (poll.nationality || []).map(String),
				ageRange: [poll.age_min ?? 18, poll.age_max ?? 65],
				inputType: poll.input_type || "single",
				answerOptions: (poll.choices || []).map((c: any) => ({
					id: String(c.id),
					text: c.description || "",
				})),
				isScheduled: !!(poll.start_date || poll.end_date),
				startDate: poll.start_date || "",
				endDate: poll.end_date || "",
			},
		});
		setOpenCreatePollModal(true);
	};

	const handleCloseCreatePollModal = () => {
		setOpenCreatePollModal(false);
		setEditingPoll(null);
		if (shouldUseMockData) return;
		queryClient.invalidateQueries({ queryKey: ["workforce-poll-results"] });
		queryClient.invalidateQueries({ queryKey: ["workforce-poll-chart-data"] });
	};

	const handleViewDetail = (poll: any) => {
		setSelectedPoll(poll);
		setIsPollDetailModalOpen(true);
	};

	// CSV Export functionality
	const downloadCSV = () => {
		// Prepare data for CSV export
		const csvData = filteredPollRows.map((poll: any) => ({
			id: poll.id,
			question: poll.description,
			language: poll.language,
			created_at: moment(poll.created_at).format("MMM DD, YYYY"),
			total_votes: poll.choices.reduce(
				(total, choice) => total + choice.votes_count,
				0,
			),
			choices: poll.choices
				.filter((choice) => choice.description !== null)
				.map((choice) => `${choice.description} (${choice.votes_count} votes)`)
				.join("; "),
			country: poll.country ? poll.country.join(", ") : "",
			nationality: poll.nationality ? poll.nationality.join(", ") : "",
		}));

		// Convert to CSV format
		const headers = [
			"ID",
			"Question",
			"Language",
			"Created At",
			"Total Votes",
			"Choices",
			"Country",
			"Nationality",
		];
		const csvContent = [
			headers.join(","),
			...csvData.map((row) =>
				[
					row.id,
					`"${row.question.replace(/"/g, '""')}"`, // Escape quotes in question
					row.language,
					row.created_at,
					row.total_votes,
					`"${row.choices.replace(/"/g, '""')}"`, // Escape quotes in choices
					row.country,
					row.nationality,
				].join(","),
			),
		].join("\n");

		// Create and download file
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`workforce-polls-${moment().format("YYYY-MM-DD")}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const { theme } = useTheme();
	const tableRows = filteredPollRows.map((comp: any) => ({
		...comp,
		statusLabel: comp.status === "published" ? "Published" : "Unpublished",
		created_at: moment(comp.created_at).format("MMM DD, YYYY"),
		choices: comp.choices.filter((choice) => choice.description !== null),
		totalVotes: comp.choices.reduce(
			(total, choice) => total + choice.votes_count,
			0,
		),
	}));

	const actionButtonClass =
		"inline-flex cursor-pointer items-center whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] sm:px-3 sm:text-xs";
	const viewDetailButtonClass = `${actionButtonClass} bg-[rgba(20,134,150,0.12)] border border-[#148696]/35 text-[#004A60] hover:bg-[rgba(20,134,150,0.18)]`;
	const publishButtonClass = `${actionButtonClass} bg-[#148696] text-white hover:bg-[#004A60]`;
	const unpublishButtonClass = `${actionButtonClass} cascade-btn cascade-btn--alt2 text-[#004A60] hover:bg-gray-200`;
	const editButtonClass = `${actionButtonClass} bg-[rgba(20,134,150,0.08)] border border-[#148696]/20 text-[#148696] hover:bg-[rgba(20,134,150,0.15)]`;
	const deleteButtonClass = `${actionButtonClass} cascade-btn cascade-btn--alt2 text-[#56666C] hover:bg-gray-200`;
	const formatGenderLabels = (value: string[]) => {
		const codeToLabel: Record<string, string> = {
			M: "Male",
			F: "Female",
			N: "Prefer not to say",
			X: "Non-Binary",
		};
		if (!Array.isArray(value)) return value ?? "";
		return value.map((c) => codeToLabel[c] ?? c).join(", ");
	};
	const workforcePollsColumns = [
		{
			field: "id",
			headerName: "Poll ID",
			width: 100,
		},
		{ field: "description", headerName: "Question", flex: 1, minWidth: 280 },
		{
			field: "choices",
			headerName: "Poll Results",
			width: 220,
			renderCell: (params: any) =>
				params.row.totalVotes === 0 ? (
					<div className="w-full flex items-center">
						<span className="inline-flex items-center rounded-full border border-[#148696]/30 bg-[rgba(20,134,150,0.1)] px-3 py-1 text-xs font-medium text-[#004A60]">
							N/A
						</span>
					</div>
				) : (
					<HorizontalStackedBar data={params.row.choices} />
				),
		},
		{
			field: "language",
			headerName: "Language",
		},
		{
			field: "totalVotes",
			headerName: "Total Votes",
		},
		{
			field: "gender",
			headerName: "Gender",
			flex: 1,
			minWidth: 220,
			valueFormatter: (value: string[]) => formatGenderLabels(value),
			renderCell: (params: any) => {
				const label = formatGenderLabels(params.value);
				return (
					<span
						className="block w-full overflow-hidden text-ellipsis whitespace-nowrap"
						title={label}
					>
						{label}
					</span>
				);
			},
		},
		{
			field: "created_at",
			headerName: "Created At",
			minWidth: 130,
		},

		{
			field: "statusLabel",
			headerName: "Action",
			minWidth: 420,
			filterable: true,
			renderCell: (params: any) => (
				<Flex
					align="center"
					className="w-full flex-nowrap"
					gap={"2"}
					wrap="nowrap"
				>
					{shouldUseMockData ? null : params.row.status === "published" ? (
						<>
							<span className="inline-flex items-center gap-1 rounded-md bg-[rgba(20,134,150,0.12)] px-2 py-1 text-xs font-semibold text-[#148696]">
								<CheckCircledIcon className="h-3.5 w-3.5 text-[#148696]" />
								Published
							</span>
							<button
								className={unpublishButtonClass}
								onClick={() => handleOnClickUnpublish(params.row)}
								type="button"
							>
								Unpublish
							</button>
						</>
					) : (
						<>
							<button
								className={publishButtonClass}
								onClick={() => handleOnClickPublish(params.row)}
								type="button"
							>
								Publish
							</button>
							<button
								className={editButtonClass}
								onClick={() => handleOnClickEdit(params.row)}
								type="button"
							>
								Edit
							</button>
							<button
								className={deleteButtonClass}
								onClick={() => handleOnClickDelete(params.row)}
								type="button"
							>
								Delete
							</button>
						</>
					)}
					<button
						className={viewDetailButtonClass}
						onClick={() => handleViewDetail(params.row)}
						type="button"
					>
						<EyeOpenIcon className="mr-1" />
						View Detail
					</button>
				</Flex>
			),
		},
	];

	return (
		<GuestLayout>
			<div className="mb-3 flex flex-col gap-3 sm:mb-1 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="heading-display mb-xl font-black uppercase tracking-[-0.022em]">
					Workforce Polls
				</h1>
				<Button
					className="w-full rounded-md sm:w-auto"
					onClick={handleOpenCreatePollModal}
					size={"3"}
					style={{
						background: "#148696",
						cursor: "pointer",
					}}
				>
					Create Poll
				</Button>
			</div>
			<h5 className="text-sm mb-1">
				<b>Company: </b>Issara Institute
			</h5>

			{/* Filter Bar */}
			<motion.div
				animate={{ y: 0, opacity: 1 }}
				className="mb-m"
				initial={{ y: -50, opacity: 0 }}
				transition={{ duration: 0.6 }}
			>
				<div className="rounded-md">
					<div className="grid grid-cols-1 gap-3 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-4">
						<div className="flex items-center gap-2 sm:border-r sm:pe-2">
							<GridFilterAltIcon className="w-5 h-5 text-[#148696]" />
							<span className="font-semibold">Filters</span>
						</div>

						<div className="w-full sm:w-auto">
							<Selector
								allLabel="All Genders"
								fullWidth
								id={"gender-selector"}
								onChange={(value) => setSelectedGender(String(value))}
								options={genderOptions}
								value={selectedGender}
							/>
						</div>

						<div className="w-full sm:w-auto">
							<Selector
								allLabel="All Nationalities"
								fullWidth
								id={"nationality-selector"}
								onChange={(value) => setSelectedNationality(String(value))}
								options={nationalityOptions}
								value={selectedNationality}
							/>
						</div>
						<div className="w-full sm:w-auto">
							<CascadeButton
								buttonText={"Clear Filters"}
								className="w-full sm:w-auto"
								handleOnClick={() => {
									setSelectedGender("");
									setSelectedNationality("");
								}}
								size={"2"}
							/>
						</div>
					</div>
				</div>
			</motion.div>
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-m">
				{/* Left Column - Map */}
				<motion.div
					animate={{ x: 0, opacity: 1 }}
					className="rounded-md"
					initial={{ x: -100, opacity: 0 }}
					transition={{ duration: 0.8 }}
				>
					<Card className="card-radius h-auto min-h-[420px] rounded-md p-m xl:h-[576px]">
						<h5 className="font-bold leading-tight text-xl mb-4">
							Polls by Nationality
						</h5>
						<div className="h-[320px] overflow-hidden rounded-md pb-2 sm:h-[380px] xl:h-[500px]">
							<NationalityRadialChart
								data={
									shouldUseMockData
										? undefined
										: chartApiData?.nationality_distribution || []
								}
							/>
						</div>
					</Card>
				</motion.div>

				{/* Right Column - Stats and Line Chart */}
				<div className="rounded-md gap-m flex flex-col">
					{/* Stats Cards */}
					<motion.div
						animate={{ x: 0, opacity: 1 }}
						className="grid grid-cols-1 md:grid-cols-3 gap-m"
						initial={{ x: 100, opacity: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						{summaryCards.map((data, index) => (
							<Card
								className="card-radius min-h-[100px] rounded-md p-m"
								key={index}
							>
								<div className="font-bold text-sm mb-2">{data.title}</div>
								<div className="grid grid-cols-2 items-end">
									<div className="mb-2 col-1">
										<MiniBarChart
											color={theme === "dark" ? "#2DCCE3" : "#148696"}
											data={data.chartData}
											height={40}
										/>
									</div>
									<div className="text-right text-3xl font-light col-2 pb-1">
										{data.value.toLocaleString()}
									</div>
								</div>
							</Card>
						))}
					</motion.div>

					{/* Line Chart */}
					<motion.div
						animate={{ x: 0, opacity: 1 }}
						initial={{ x: 100, opacity: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
					>
						<Card className="card-radius rounded-md p-m">
							<div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
								<h5 className="font-bold leading-tight text-xl">Polls</h5>
								<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
									<RadioGroup.Root
										className="w-fit rounded-md p-2"
										defaultValue="1"
										name="pollType"
										onValueChange={handleRadioChange}
										style={{ background: "rgba(0, 0, 0, 0.07)" }}
									>
										<Flex align="center" gap="2">
											<RadioGroup.Item value="1">Nationality</RadioGroup.Item>
											<RadioGroup.Item value="2">Gender</RadioGroup.Item>
										</Flex>
									</RadioGroup.Root>
									<div className="flex w-full items-center gap-2 sm:w-auto">
										<b>Record :</b>
										<div className="w-full sm:w-auto">
											<Selector
												allLabel="Yearly"
												fullWidth
												id={"time-selector"}
												onChange={() => undefined}
												options={[
													{
														value: "2",
														label: "Monthly",
													},
												]}
											/>
										</div>
									</div>
								</div>
							</div>
							{pollType === "1" ? (
								<MultipleLineChart
									data={
										shouldUseMockData
											? undefined
											: chartApiData?.nationality_line_series || []
									}
									seriesKeys={
										shouldUseMockData
											? undefined
											: chartApiData?.meta?.nationality_keys || []
									}
								/>
							) : (
								<MultipleLineChart
									data={
										shouldUseMockData
											? undefined
											: chartApiData?.gender_line_series || []
									}
									seriesKeys={
										shouldUseMockData
											? undefined
											: chartApiData?.meta?.gender_keys || []
									}
								/>
							)}
						</Card>
					</motion.div>
				</div>

				<Card className={"card-radius overflow-hidden p-m lg:col-span-2"}>
					<Flex
						align="center"
						direction={{ initial: "column", lg: "row" }}
						gap="2"
						justify={"between"}
						mb={"4"}
						wrap={"wrap"}
					>
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
							<h5 className="text-xl font-bold leading-tight sm:text-2xl">
								Poll Results
							</h5>
							{/* <label className='font-bold text-sm' htmlFor='end-date'>
                Date Range:
              </label> */}
							<div>
								<DatePicker
									className={
										"w-full cursor-pointer rounded-md text-sm font-bold text-[#37BDD2] transition focus:border-none focus:outline-none sm:min-w-[230px]"
									}
									dateFormat="yyyy MMM dd"
									endDate={endDate}
									icon={<CalendarIcon cursor={"pointer"} />}
									id={"end-date"}
									onChange={onChange}
									onKeyDown={(e) => e.preventDefault()}
									placeholderText="Select date"
									selectsRange
									showIcon
									startDate={startDate}
									toggleCalendarOnIconClick
								/>
							</div>
						</div>
						<div className="w-full lg:min-w-[280px] lg:flex-1 lg:max-w-md">
							<SearchBox
								debounceMs={400}
								onSearch={(query) => setSearchQuery(query)}
								placeholder="Search by question..."
								value={searchQuery}
							/>
						</div>
						<Button
							className="w-full rounded-xl sm:w-auto"
							onClick={downloadCSV}
							// size={"2"}
							style={{
								background: "#148696",
								cursor: "pointer",
								height: "40px",
							}}
						>
							<DownloadIcon />
							Download CSV
						</Button>
					</Flex>
					{tableRows.length === 0 ? (
						<div className="rounded-2xl border border-[#D2D2D2] bg-gray-50 px-6 py-12 text-center">
							<h6 className="font-heading text-xl text-[#004A60]">
								No Poll Results Found
							</h6>
							<p className="mt-3 text-sm text-[#56666C]">
								There are no polls matching the selected filters and date range.
								Try adjusting filters or create a new poll to get started.
							</p>
						</div>
					) : (
						<div className="w-full overflow-x-auto">
							<div className="min-w-[760px] md:min-w-[860px] xl:min-w-0">
								<DataTable
									columns={workforcePollsColumns}
									pageSize={10}
									rows={tableRows}
								/>
							</div>
						</div>
					)}
				</Card>
			</div>

			<AlertModal
				message="Do you want to proceed with publishing this poll?"
				onClose={() => {
					setIsPublishModalOpen(false);
					setPollToPublish(null);
				}}
				onConfirm={handleConfirmPublish}
				open={isPublishModalOpen}
				title="This poll will be published to your company group."
			/>

			<AlertModal
				message="Workers will no longer see this poll. You can republish it later."
				onClose={() => {
					setIsUnpublishModalOpen(false);
					setPollToUnpublish(null);
				}}
				onConfirm={handleConfirmUnpublish}
				open={isUnpublishModalOpen}
				title="Unpublish this poll?"
			/>

			<AlertModal
				message="This action cannot be undone. The poll and all its data will be permanently removed."
				onClose={() => {
					setIsDeleteModalOpen(false);
					setPollToDelete(null);
				}}
				onConfirm={handleConfirmDelete}
				open={isDeleteModalOpen}
				title="Delete this poll? Are you sure?"
			/>

			<CreatePollStepperModal
				initialData={editingPoll?.initialData}
				onClose={handleCloseCreatePollModal}
				open={openCreatePollModal}
				pollId={editingPoll?.id}
				useMockMode={shouldUseMockData}
			/>

			<PollDetailModal
				onClose={() => setIsPollDetailModalOpen(false)}
				open={isPollDetailModalOpen}
				poll={selectedPoll}
			/>
		</GuestLayout>
	);
}

const cardData = [
	{
		id: 1,
		title: "Average Polls by year",
		value: 197,
		chartData: [
			{ name: "2020", value: 145 },
			{ name: "2021", value: 178 },
			{ name: "2022", value: 203 },
			{ name: "2023", value: 189 },
			{ name: "2024", value: 197 },
		],
	},
	{
		id: 2,
		title: "Total Polls",
		value: 987,
		chartData: [
			{ name: "Q1", value: 220 },
			{ name: "Q2", value: 245 },
			{ name: "Q3", value: 267 },
			{ name: "Q4", value: 255 },
		],
	},
	{
		id: 3,
		title: "Total Polls Response",
		value: 4582,
		chartData: [
			{ name: "Jan", value: 380 },
			{ name: "Feb", value: 420 },
			{ name: "Mar", value: 390 },
			{ name: "Apr", value: 450 },
			{ name: "May", value: 480 },
			{ name: "Jun", value: 520 },
		],
	},
];

const genderOptions = [
	{ value: "M", label: "Male" },
	{ value: "F", label: "Female" },
	{ value: "N", label: "Prefer not to say" },
	{ value: "X", label: "Non-Binary" },
];

export const nationalityOptions = [
	{ value: "1", label: "Myanmar" },
	{ value: "2", label: "Thailand" },
	{ value: "3", label: "Nepal" },
	{ value: "4", label: "Bangladesh" },
	{ value: "5", label: "India" },
	{ value: "6", label: "Cambodia" },
	{ value: "7", label: "Malaysia" },
	{ value: "8", label: "Philippines" },
	{ value: "9", label: "Vietnam" },
	{ value: "10", label: "Laos" },
];
