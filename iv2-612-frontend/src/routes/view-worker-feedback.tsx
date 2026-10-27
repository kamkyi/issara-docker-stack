import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronUpIcon,
	EyeOpenIcon,
	Pencil1Icon,
	PlusIcon,
} from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Flex,
	IconButton,
	Table as RadixTable,
	Select,
	Text,
	Tooltip,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import GrievanceComponent from "$src/components/Grievance/GrievanceComponent";
import WorkerFeedbackDetailsPanel from "$src/components/workerFeedback/WorkerFeedbackDetailsPanel";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import {
	type InteractionChannel,
	useInteractionChannels,
} from "$src/queries/interactionChannels";
import { useKPICategories, useKPIs } from "$src/queries/kpis";
import { useNationalities } from "$src/queries/nationalities";
import {
	fetchWorkerContactReasons,
	type WorkerContactReason,
} from "$src/services/workerContactReasonsService";
import {
	fetchWorkerFeedbackPage,
	isWorkerFeedbackMockEnabled,
	type WorkerFeedbackRecord,
} from "$src/services/workerFeedbackService";
import { useViewModeStore } from "$src/store/viewModeStore";
import type { AuthUser } from "$src/types/auth";
import type { KPI, KPICategory } from "$src/types/components";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import { parseStoredJson } from "$src/utils/auth-utils";

export const Route = createFileRoute("/view-worker-feedback")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

// Stable English IDs used internally for sorting/filtering by status keyword
// (e.g. "close" substring match in calculateDaysActive). Display labels go
// through t("viewWorkerFeedback.caseStatus.*") in the component.
const CASE_STATUS_LABELS = new Map<number, string>([
	[1, "open"],
	[2, "close"],
	[3, "some progress"],
]);

const CASE_STATUS_KEYS = new Map<number, "open" | "close" | "someProgress">([
	[1, "open"],
	[2, "close"],
	[3, "someProgress"],
]);

type SortColumn =
	| "id"
	| "operatorName"
	| "issueCategories"
	| "issueDescription"
	| "receivedVia"
	| "date"
	| "level"
	| "daysActive"
	| "assignedUsers"
	| "status";

type SearchFilters = {
	id: string;
	operatorName: string;
	issueCategories: string;
	issueDescription: string;
	receivedVia: string;
	date: string;
	level: string;
	daysActive: string;
	assignedUsers: string;
	status: string;
};

type PreparedRecord = {
	record: WorkerFeedbackRecord;
	categoryNames: string[];
	descriptions: string[];
	assignedUsers: string[];
	level: string;
	daysActive: number;
	operatorName: string;
	receivedVia: string;
	statusName: string;
	date: string;
};

const DEFAULT_SEARCH_FILTERS: SearchFilters = {
	id: "",
	operatorName: "",
	issueCategories: "",
	issueDescription: "",
	receivedVia: "",
	date: "",
	level: "",
	daysActive: "",
	assignedUsers: "",
	status: "",
};

const getDisplayName = (user?: {
	full_name?: string;
	first_name?: string;
	last_name?: string;
	username?: string;
	email?: string;
	id?: number;
}) => {
	const fullName = user?.full_name?.trim();
	if (fullName) {
		return fullName;
	}

	const name = [user?.first_name, user?.last_name]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (name) {
		return name;
	}

	return user?.username || user?.email || (user?.id ? `User ${user.id}` : "-");
};

const formatDate = (value?: string | null) => value || "-";

const getLookupLabel = (value: unknown): string => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : "-";
	}

	if (value && typeof value === "object") {
		const candidate = ["name", "label", "title", "value"].find((key) => {
			const entry = (value as Record<string, unknown>)[key];
			return typeof entry === "string" && entry.trim().length > 0;
		});

		if (candidate) {
			return String((value as Record<string, unknown>)[candidate]);
		}
	}

	return "-";
};

const calculateDaysActive = (
	createdAt?: string | null,
	updatedAt?: string | null,
	caseStatus?: number | null,
) => {
	if (!createdAt) {
		return 0;
	}

	const startDate = new Date(createdAt);
	if (Number.isNaN(startDate.getTime())) {
		return 0;
	}

	const statusName = CASE_STATUS_LABELS.get(Number(caseStatus || 0)) || "";
	const isClosed = statusName.toLowerCase().includes("close");
	const endDate = isClosed && updatedAt ? new Date(updatedAt) : new Date();
	const diffMs = Math.abs(endDate.getTime() - startDate.getTime());

	return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const tooltipContentStyle = {
	whiteSpace: "pre-line",
	fontSize: "0.875rem",
	maxWidth: "320px",
	color: "#ffffff",
} as const;

type ColumnDef = {
	key: SortColumn | "expand" | "actions";
	labelKey: string | null;
	width: number;
	minWidth: number;
	searchKey?: keyof SearchFilters;
	sortable?: boolean;
};

const COLUMN_CONFIG: ColumnDef[] = [
	{ key: "expand", labelKey: null, width: 40, minWidth: 40 },
	{
		key: "id",
		labelKey: "viewWorkerFeedback.columns.id",
		width: 52,
		minWidth: 48,
		searchKey: "id",
		sortable: true,
	},
	{
		key: "operatorName",
		labelKey: "viewWorkerFeedback.columns.operatorName",
		width: 120,
		minWidth: 104,
		searchKey: "operatorName",
		sortable: true,
	},
	{
		key: "issueCategories",
		labelKey: "viewWorkerFeedback.columns.issueCategories",
		width: 136,
		minWidth: 112,
		searchKey: "issueCategories",
		sortable: true,
	},
	{
		key: "issueDescription",
		labelKey: "viewWorkerFeedback.columns.issueDescription",
		width: 210,
		minWidth: 152,
		searchKey: "issueDescription",
		sortable: true,
	},
	{
		key: "receivedVia",
		labelKey: "viewWorkerFeedback.columns.receivedVia",
		width: 108,
		minWidth: 88,
		searchKey: "receivedVia",
		sortable: true,
	},
	{
		key: "date",
		labelKey: "viewWorkerFeedback.columns.date",
		width: 108,
		minWidth: 92,
		searchKey: "date",
		sortable: true,
	},
	{
		key: "level",
		labelKey: "viewWorkerFeedback.columns.level",
		width: 58,
		minWidth: 52,
		searchKey: "level",
		sortable: true,
	},
	{
		key: "daysActive",
		labelKey: "viewWorkerFeedback.columns.daysActive",
		width: 74,
		minWidth: 68,
		searchKey: "daysActive",
		sortable: true,
	},
	{
		key: "assignedUsers",
		labelKey: "viewWorkerFeedback.columns.assignedUsers",
		width: 108,
		minWidth: 96,
		searchKey: "assignedUsers",
		sortable: true,
	},
	{
		key: "status",
		labelKey: "viewWorkerFeedback.columns.status",
		width: 76,
		minWidth: 72,
		searchKey: "status",
		sortable: true,
	},
	{
		key: "actions",
		labelKey: "viewWorkerFeedback.columns.actions",
		width: 84,
		minWidth: 72,
	},
];

const headerCellBaseStyle = {
	fontSize: "0.8125rem",
	fontWeight: 600,
	color: "#148696",
	borderBottom: "2px solid #e0e0e0",
	padding: "10px 8px",
	verticalAlign: "top",
} as const;

const bodyCellBaseStyle = {
	padding: "10px 8px",
	fontSize: "0.875rem",
	lineHeight: 1.35,
	verticalAlign: "top",
} as const;

const truncateLineStyle = {
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
} as const;

const clampTwoLinesStyle = {
	overflow: "hidden",
	textOverflow: "ellipsis",
	display: "-webkit-box",
	WebkitLineClamp: 2,
	WebkitBoxOrient: "vertical" as const,
	lineHeight: 1.35,
} as const;

const columnResizeHandleStyle = {
	position: "absolute",
	top: 0,
	right: -4,
	width: 8,
	height: "100%",
	cursor: "col-resize",
	zIndex: 2,
} as const;

function RouteComponent() {
	const { t } = useTranslation();
	const translateLabel = (value: string) =>
		value ? t(value, { defaultValue: value }) : value;
	const summarize = (values: string[]) => {
		if (!values.length) return "-";
		const labels = values.map(translateLabel);
		if (labels.length === 1) return labels[0];
		return t("viewWorkerFeedback.moreSuffix", {
			first: labels[0],
			count: labels.length - 1,
		});
	};
	const navigate = useNavigate();
	const authUser = parseStoredJson<AuthUser>("auth_user");
	const supplierId = authUser?.supplier ? Number(authUser.supplier) : null;
	const viewMode = useViewModeStore((state) => state.viewMode);
	const shouldUseMockData = isWorkerFeedbackMockEnabled();

	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
	const [searchFilters, setSearchFilters] = useState<SearchFilters>(
		DEFAULT_SEARCH_FILTERS,
	);
	const [sortColumn, setSortColumn] = useState<SortColumn>("id");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
		Object.fromEntries(
			COLUMN_CONFIG.map((column) => [column.key, column.minWidth]),
		),
	);
	const [selectedRow, setSelectedRow] = useState<WorkerFeedbackRecord | null>(
		null,
	);
	const resizeStateRef = useRef<{
		key: string;
		startX: number;
		startWidth: number;
	} | null>(null);

	const { data: channelData = [] } = useInteractionChannels();
	const { data: kpis = [] } = useKPIs();
	const { data: kpiCategories = [] } = useKPICategories();
	const { data: nationalitiesResponse } = useNationalities();
	const activeLanguage = useActiveLanguage();
	const { data: contactReasons = [] } = useQuery<WorkerContactReason[]>({
		queryKey: ["workerContactReasons", activeLanguage],
		queryFn: () => fetchWorkerContactReasons(activeLanguage),
	});
	const interactionChannels: InteractionChannel[] = Array.isArray(channelData)
		? channelData
		: channelData?.results || [];

	const { data, isLoading, error } = useQuery({
		queryKey: ["workerFeedbackList", supplierId, viewMode, shouldUseMockData],
		queryFn: () =>
			fetchWorkerFeedbackPage({
				limit: 10000,
				offset: 0,
				supplierId,
			}),
	});

	const channelMap = useMemo(
		() =>
			new Map<number, string>(
				interactionChannels.map((channel) => [
					channel.id,
					channel.name ||
						t("viewWorkerFeedback.fallbacks.channel", { id: channel.id }),
				]),
			),
		[interactionChannels, t],
	);

	const kpiMap = useMemo(
		() => new Map((kpis as KPI[]).map((kpi) => [kpi.id, kpi])),
		[kpis],
	);

	const kpiCategoryMap = useMemo(
		() =>
			new Map(
				(kpiCategories as KPICategory[]).map((category) => [
					category.id,
					category.name,
				]),
			),
		[kpiCategories],
	);

	const nationalityMap = useMemo(
		() =>
			new Map(
				(nationalitiesResponse?.results || []).map((nationality) => [
					nationality.id,
					nationality.name,
				]),
			),
		[nationalitiesResponse],
	);

	const contactReasonMap = useMemo(
		() =>
			new Map(
				contactReasons.map((reason) => [
					reason.id,
					getLookupLabel(reason.name),
				]),
			),
		[contactReasons],
	);

	const records = data?.results || [];

	const getKpiCategoryNames = (record: WorkerFeedbackRecord) => {
		if (record.mock_issue_category_names?.length) {
			return record.mock_issue_category_names;
		}

		const selectedKpiIds = record.selected_kpis || [];
		const uniqueNames = Array.from(
			new Set(
				selectedKpiIds
					.map((id) => kpiMap.get(id)?.kpi_category?.id)
					.filter((value): value is number => value != null)
					.map(
						(categoryId) =>
							kpiCategoryMap.get(categoryId) ||
							t("viewWorkerFeedback.fallbacks.category", { id: categoryId }),
					),
			),
		);

		return uniqueNames;
	};

	const getKpiDescriptions = (record: WorkerFeedbackRecord) => {
		if (record.mock_issue_descriptions?.length) {
			return record.mock_issue_descriptions;
		}

		return (record.selected_kpis || [])
			.map((id) => kpiMap.get(id)?.description)
			.filter((value): value is string => Boolean(value));
	};

	const getKpiLevel = (record: WorkerFeedbackRecord) => {
		if (record.mock_level) {
			return record.mock_level;
		}

		const selectedKpiIds = record.selected_kpis || [];
		const levels = selectedKpiIds
			.map((id) => kpiMap.get(id)?.level)
			.filter((value): value is number => value != null);

		if (!levels.length) {
			return "-";
		}

		return String(Math.max(...levels));
	};

	const getAssignedUsers = (record: WorkerFeedbackRecord) => {
		if (!Array.isArray(record.next_steps_for_company_staff)) {
			return record.mock_assigned_users || [];
		}

		const assignedUsers = record.next_steps_for_company_staff.map((user) =>
			getDisplayName(user),
		);

		return assignedUsers.length
			? assignedUsers
			: record.mock_assigned_users || [];
	};

	const getChannelName = (record: WorkerFeedbackRecord) => {
		const channelName =
			record.mock_channel_name ||
			channelMap.get(Number(record.worker_voice_channel || 0)) ||
			(record.worker_voice_channel ? String(record.worker_voice_channel) : "-");
		return channelName === "-" ? "-" : translateLabel(channelName);
	};

	const getCaseStatusName = (record: WorkerFeedbackRecord) => {
		const key = CASE_STATUS_KEYS.get(Number(record.case_status || 0));
		if (key) {
			return t(`viewWorkerFeedback.caseStatus.${key}`);
		}
		return record.case_status
			? t("viewWorkerFeedback.caseStatus.fallback", {
					id: record.case_status,
				})
			: "-";
	};

	const getStatusColor = (_daysActive: number, _status: string) => {
		// Kept for GrievanceComponent's getStatusColor prop signature. The color
		// no longer reflects status text (which is now localized); the row-level
		// caseStatus internal keyword would drive coloring if reintroduced.
		return "#148696";
	};

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			const resizeState = resizeStateRef.current;
			if (!resizeState) {
				return;
			}

			const column = COLUMN_CONFIG.find((item) => item.key === resizeState.key);
			const minWidth = column?.minWidth ?? 60;
			const nextWidth = Math.max(
				minWidth,
				resizeState.startWidth + event.clientX - resizeState.startX,
			);

			setColumnWidths((previous) => ({
				...previous,
				[resizeState.key]: nextWidth,
			}));
		};

		const handleMouseUp = () => {
			resizeStateRef.current = null;
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	const toggleExpanded = (rowId: number) => {
		setExpandedRows((previous) => {
			const next = new Set(previous);
			if (next.has(rowId)) {
				next.delete(rowId);
			} else {
				next.add(rowId);
			}
			return next;
		});
	};

	const handleSearchChange = (key: keyof SearchFilters, value: string) => {
		setSearchFilters((previous) => ({
			...previous,
			[key]: value,
		}));
		setPage(0);
	};

	const handleSort = (column: SortColumn) => {
		if (sortColumn === column) {
			setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
			return;
		}

		setSortColumn(column);
		setSortDirection("asc");
	};

	const getSortIndicator = (column: SortColumn) => {
		if (sortColumn !== column) {
			return "";
		}

		return sortDirection === "asc" ? " ▲" : " ▼";
	};

	const handleResizeStart = (
		key: string,
		event: React.MouseEvent<HTMLDivElement>,
	) => {
		event.preventDefault();
		event.stopPropagation();

		resizeStateRef.current = {
			key,
			startX: event.clientX,
			startWidth: columnWidths[key],
		};
	};

	const preparedRecords = useMemo<PreparedRecord[]>(() => {
		return records.map((record) => {
			const categoryNames = getKpiCategoryNames(record);
			const descriptions = getKpiDescriptions(record);
			const assignedUsers = getAssignedUsers(record);
			const level = getKpiLevel(record);
			const daysActive = calculateDaysActive(
				record.interaction_date || record.created_at,
				record.updated_at,
				record.case_status,
			);

			return {
				record,
				categoryNames,
				descriptions,
				assignedUsers,
				level,
				daysActive,
				operatorName: record.client_name || "-",
				receivedVia: getChannelName(record),
				statusName: getCaseStatusName(record),
				date: formatDate(record.interaction_date),
			};
		});
	}, [records, channelMap, kpiMap, kpiCategoryMap]);

	const filteredRecords = useMemo(() => {
		const normalize = (value: string | number) =>
			String(value).toLowerCase().trim();

		return preparedRecords.filter((item) => {
			const values: SearchFilters = {
				id: String(item.record.id),
				operatorName: `${item.operatorName} ${item.record.employee_department || ""}`,
				issueCategories: item.categoryNames.join(" "),
				issueDescription: item.descriptions.join(" "),
				receivedVia: item.receivedVia,
				date: item.date,
				level: item.level,
				daysActive: String(item.daysActive),
				assignedUsers: item.assignedUsers.join(" "),
				status: item.statusName,
			};

			return (Object.keys(searchFilters) as Array<keyof SearchFilters>).every(
				(key) => {
					const filterValue = normalize(searchFilters[key]);
					if (!filterValue) {
						return true;
					}

					return normalize(values[key]).includes(filterValue);
				},
			);
		});
	}, [preparedRecords, searchFilters]);

	const sortedRecords = useMemo(() => {
		const direction = sortDirection === "asc" ? 1 : -1;

		return [...filteredRecords].sort((left, right) => {
			const getValue = (item: PreparedRecord) => {
				switch (sortColumn) {
					case "id":
						return item.record.id;
					case "operatorName":
						return item.operatorName.toLowerCase();
					case "issueCategories":
						return item.categoryNames.join(", ").toLowerCase();
					case "issueDescription":
						return item.descriptions.join(", ").toLowerCase();
					case "receivedVia":
						return item.receivedVia.toLowerCase();
					case "date":
						return item.record.interaction_date || item.record.created_at || "";
					case "level":
						return Number(item.level) || -1;
					case "daysActive":
						return item.daysActive;
					case "assignedUsers":
						return item.assignedUsers.join(", ").toLowerCase();
					case "status":
						return item.statusName.toLowerCase();
				}
			};

			const leftValue = getValue(left);
			const rightValue = getValue(right);

			if (leftValue < rightValue) {
				return -1 * direction;
			}

			if (leftValue > rightValue) {
				return 1 * direction;
			}

			return 0;
		});
	}, [filteredRecords, sortColumn, sortDirection]);

	const totalCount = sortedRecords.length;
	const pageCount = Math.max(1, Math.ceil(totalCount / rowsPerPage));
	const currentPage = Math.min(page, pageCount - 1);
	const totalColumnWidth = Object.values(columnWidths).reduce(
		(sum, width) => sum + width,
		0,
	);
	const visibleRecords = sortedRecords.slice(
		currentPage * rowsPerPage,
		currentPage * rowsPerPage + rowsPerPage,
	);

	return (
		<GuestLayout>
			<Box px="4" py="5" style={{ width: "100%" }}>
				<Box>
					<h1 className="heading-display mb-1.5 uppercase">
						EMPLOYEE RELATIONS
					</h1>
					<h4 className="text-xl md:text-2xl font-bold mb-6">
						Worker Feedback Case Management
					</h4>

					<Box
						style={{
							overflowX: "auto",
							maxWidth: "100%",
							borderRadius: 12,
							boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
							border: "1px solid #e0e0e0",
							backgroundColor: "white",
						}}
					>
						<RadixTable.Root
							style={{
								width: `max(100%, ${totalColumnWidth}px)`,
								tableLayout: "fixed",
							}}
						>
							<colgroup>
								{COLUMN_CONFIG.map((column) => (
									<col
										key={column.key}
										style={{ width: `${columnWidths[column.key]}px` }}
									/>
								))}
							</colgroup>
							<RadixTable.Header>
								<RadixTable.Row style={{ backgroundColor: "#f7fafc" }}>
									{COLUMN_CONFIG.map((column) => (
										<RadixTable.ColumnHeaderCell
											key={column.key}
											style={{
												...headerCellBaseStyle,
												width: columnWidths[column.key],
												position: "relative",
											}}
										>
											{column.sortable ? (
												<Flex direction="column" gap="2">
													<button
														onClick={() => handleSort(column.key as SortColumn)}
														style={{
															all: "unset",
															cursor: "pointer",
															color: "#148696",
															...truncateLineStyle,
														}}
														type="button"
													>
														{column.labelKey ? t(column.labelKey) : ""}
														{getSortIndicator(column.key as SortColumn)}
													</button>
													<input
														onChange={(event) =>
															column.searchKey
																? handleSearchChange(
																		column.searchKey,
																		event.target.value,
																	)
																: undefined
														}
														placeholder={t(
															"viewWorkerFeedback.searchPlaceholder",
														)}
														style={{
															width: "100%",
															padding: "5px 6px",
															fontSize: "0.75rem",
															border: "1px solid #d7dee7",
															borderRadius: 6,
														}}
														value={
															column.searchKey
																? searchFilters[column.searchKey]
																: ""
														}
													/>
												</Flex>
											) : column.labelKey ? (
												t(column.labelKey)
											) : (
												""
											)}
											{column.key !== "expand" ? (
												<div
													onMouseDown={(event) =>
														handleResizeStart(column.key, event)
													}
													style={columnResizeHandleStyle}
												/>
											) : null}
										</RadixTable.ColumnHeaderCell>
									))}
								</RadixTable.Row>
							</RadixTable.Header>
							<RadixTable.Body>
								{isLoading ? (
									<RadixTable.Row>
										<RadixTable.Cell colSpan={12} style={{ padding: "24px" }}>
											<Text>{t("viewWorkerFeedback.loading")}</Text>
										</RadixTable.Cell>
									</RadixTable.Row>
								) : error ? (
									<RadixTable.Row>
										<RadixTable.Cell colSpan={12} style={{ padding: "24px" }}>
											<Text color="red">
												{t("viewWorkerFeedback.loadError")}
											</Text>
										</RadixTable.Cell>
									</RadixTable.Row>
								) : !visibleRecords.length ? (
									<RadixTable.Row>
										<RadixTable.Cell colSpan={12} style={{ padding: "24px" }}>
											<Text>{t("viewWorkerFeedback.empty")}</Text>
										</RadixTable.Cell>
									</RadixTable.Row>
								) : (
									visibleRecords.map((item, index) => {
										const {
											record,
											categoryNames,
											descriptions,
											assignedUsers,
											level,
											daysActive,
										} = item;

										return [
											<RadixTable.Row
												key={`row-${record.id}`}
												style={{
													backgroundColor:
														index % 2 === 0 ? "#ffffff" : "#f7fafc",
												}}
											>
												<RadixTable.Cell
													style={{ ...bodyCellBaseStyle, width: 40 }}
												>
													<IconButton
														onClick={() => toggleExpanded(record.id)}
														size="1"
														variant="ghost"
													>
														{expandedRows.has(record.id) ? (
															<ChevronUpIcon />
														) : (
															<ChevronDownIcon />
														)}
													</IconButton>
												</RadixTable.Cell>
												<RadixTable.Cell
													style={{
														...bodyCellBaseStyle,
														color: "#148696",
														fontWeight: 500,
													}}
												>
													{record.id}
												</RadixTable.Cell>
												<RadixTable.Cell
													style={{
														...bodyCellBaseStyle,
														color: "#148696",
														fontWeight: 500,
													}}
												>
													<div
														style={truncateLineStyle}
														title={record.client_name || "-"}
													>
														{record.client_name || "-"}
													</div>
													{record.employee_department ? (
														<Text
															as="div"
															color="gray"
															size="1"
															style={truncateLineStyle}
														>
															({record.employee_department})
														</Text>
													) : null}
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<Tooltip
														content={
															<Box style={tooltipContentStyle}>
																{categoryNames.map(translateLabel).join("\n") ||
																	"-"}
															</Box>
														}
													>
														<Text
															style={{ ...clampTwoLinesStyle, cursor: "help" }}
														>
															{summarize(categoryNames)}
														</Text>
													</Tooltip>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<Tooltip
														content={
															<Box style={tooltipContentStyle}>
																{descriptions.map(translateLabel).join("\n") ||
																	"-"}
															</Box>
														}
													>
														<Text
															style={{ ...clampTwoLinesStyle, cursor: "help" }}
														>
															{summarize(descriptions)}
														</Text>
													</Tooltip>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<div
														style={truncateLineStyle}
														title={getChannelName(record)}
													>
														{getChannelName(record)}
													</div>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<div style={{ whiteSpace: "nowrap" }}>
														{formatDate(record.interaction_date)}
													</div>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<Tooltip
														content={
															<Box style={tooltipContentStyle}>
																{t("viewWorkerFeedback.highestLevel", {
																	level,
																})}
															</Box>
														}
													>
														<Text style={{ cursor: "help" }}>{level}</Text>
													</Tooltip>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													{daysActive}
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													{assignedUsers.length ? (
														<div
															style={truncateLineStyle}
															title={assignedUsers
																.map(translateLabel)
																.join(", ")}
														>
															{assignedUsers.map(translateLabel).join(", ")}
														</div>
													) : (
														<Text>-</Text>
													)}
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<div style={truncateLineStyle}>
														{getCaseStatusName(record)}
													</div>
												</RadixTable.Cell>
												<RadixTable.Cell style={bodyCellBaseStyle}>
													<Flex gap="1">
														<IconButton
															onClick={() => setSelectedRow(record)}
															size="1"
															title={t(
																"viewWorkerFeedback.actions.viewDetails",
															)}
															variant="ghost"
														>
															<EyeOpenIcon />
														</IconButton>
														<IconButton
															onClick={() =>
																navigate({
																	to: "/worker-feedback",
																	search: { editId: record.id },
																})
															}
															size="1"
															title={t("viewWorkerFeedback.actions.edit")}
															variant="ghost"
														>
															<Pencil1Icon />
														</IconButton>
													</Flex>
												</RadixTable.Cell>
											</RadixTable.Row>,
											expandedRows.has(record.id) ? (
												<RadixTable.Row key={`expanded-${record.id}`}>
													<RadixTable.Cell
														colSpan={12}
														style={{ padding: "12px" }}
													>
														<Box
															style={{
																margin: 4,
																borderRadius: 12,
																border: "1px solid #e0e0e0",
																background: "#fcfcfd",
																padding: 16,
															}}
														>
															<GrievanceComponent
																context={{ t: (value) => t(value) }}
																data={{
																	id: record.id,
																	description:
																		descriptions.join(", ") ||
																		record.feedback_description,
																	opened_at:
																		record.interaction_date ||
																		record.created_at ||
																		undefined,
																	affected_workers:
																		record.workers_affected ?? undefined,
																	remediation_notes:
																		record.feedback_description,
																	remediation_action: record.next_steps,
																	remediation_results: record.final_remarks,
																	assigned_staff: getAssignedUsers(record),
																	deadline: record.deadline,
																	level,
																	status: getCaseStatusName(record),
																	closed_at: getCaseStatusName(record)
																		.toLowerCase()
																		.includes("close")
																		? record.updated_at
																		: undefined,
																}}
																getDaysActive={(openedAt) =>
																	calculateDaysActive(
																		openedAt,
																		record.updated_at,
																		record.case_status,
																	)
																}
																getStatusColor={getStatusColor}
															/>
														</Box>
													</RadixTable.Cell>
												</RadixTable.Row>
											) : null,
										];
									})
								)}
							</RadixTable.Body>
						</RadixTable.Root>

						<Flex
							align="center"
							gap="3"
							justify="between"
							px="4"
							py="3"
							wrap="wrap"
						>
							<Flex align="center" gap="2">
								<Text size="2">{t("viewWorkerFeedback.rowsPerPage")}</Text>
								<Select.Root
									onValueChange={(value) => {
										setRowsPerPage(Number(value));
										setPage(0);
									}}
									value={String(rowsPerPage)}
								>
									<Select.Trigger style={{ minWidth: 80 }} />
									<Select.Content>
										<Select.Item value="5">5</Select.Item>
										<Select.Item value="10">10</Select.Item>
										<Select.Item value="25">25</Select.Item>
									</Select.Content>
								</Select.Root>
							</Flex>

							<Flex align="center" gap="3">
								<Text color="gray" size="2">
									{t("viewWorkerFeedback.pagination", {
										current: currentPage + 1,
										total: pageCount,
										visible: visibleRecords.length,
										count: totalCount,
									})}
								</Text>
								<Flex align="center" gap="1">
									<IconButton
										disabled={page === 0}
										onClick={() =>
											setPage((current) => Math.max(0, current - 1))
										}
										size="1"
										variant="soft"
									>
										<ChevronLeftIcon />
									</IconButton>
									<IconButton
										disabled={page >= pageCount - 1}
										onClick={() =>
											setPage((current) => Math.min(pageCount - 1, current + 1))
										}
										size="1"
										variant="soft"
									>
										<ChevronRightIcon />
									</IconButton>
								</Flex>
							</Flex>
						</Flex>
					</Box>

					<Flex justify="center" mt="4">
						<Button
							onClick={() => navigate({ to: "/worker-feedback" })}
							style={{
								borderRadius: 8,
								padding: "12px 24px",
								fontSize: "0.875rem",
								fontWeight: 600,
								boxShadow: "0 2px 8px rgba(20, 134, 150, 0.3)",
								background: "linear-gradient(45deg, #148696 30%, #1a9cb5 90%)",
							}}
						>
							<PlusIcon />
							{t("viewWorkerFeedback.addNew")}
						</Button>
					</Flex>
				</Box>

				{selectedRow ? (
					<WorkerFeedbackDetailsPanel
						assignedUsers={
							getAssignedUsers(selectedRow).map(translateLabel).join(", ") ||
							"-"
						}
						caseStatusName={getCaseStatusName(selectedRow)}
						channelName={getChannelName(selectedRow)}
						contactReasonName={
							contactReasonMap.get(Number(selectedRow.contact_reason || 0)) ||
							selectedRow.mock_contact_reason_name ||
							"-"
						}
						daysActive={calculateDaysActive(
							selectedRow.interaction_date || selectedRow.created_at,
							selectedRow.updated_at,
							selectedRow.case_status,
						)}
						genderName={
							(selectedRow.gender
								? t(`viewWorkerFeedback.genders.${selectedRow.gender}`, {
										defaultValue: "",
									})
								: "") ||
							selectedRow.mock_gender_name ||
							"-"
						}
						issueCategoryNames={
							getKpiCategoryNames(selectedRow).map(translateLabel).join(", ") ||
							"-"
						}
						issueDescriptions={
							getKpiDescriptions(selectedRow).map(translateLabel).join(", ") ||
							"-"
						}
						level={getKpiLevel(selectedRow)}
						nationalityName={
							nationalityMap.get(Number(selectedRow.nationality || 0)) ||
							selectedRow.mock_nationality_name ||
							"-"
						}
						onClose={() => setSelectedRow(null)}
						record={selectedRow}
					/>
				) : null}
			</Box>
		</GuestLayout>
	);
}
