/**
 * The "View Worker Voice" table (IV2-582): the signed-in CSO's caseload, with a
 * read-only detail view, an edit shortcut back into the five-step form, and
 * delete.
 *
 * The caseload has two halves. The calls the organization logged itself are
 * its own to edit and delete. The calls another organization referred to it on
 * step 5 are read-only: the referral hands over the reading of a call, not the
 * keeping of it, so a shared row is marked as such and carries only the view
 * action. The API enforces the same rule, so hiding the two buttons is about
 * not offering an officer something that would be refused.
 *
 * Searching, paging and the scope tabs are all server-side -- a CSO's caseload
 * grows without bound, so the client never holds more than the page it is
 * drawing, and a search covers the whole caseload rather than the rows
 * currently loaded.
 */
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	Cross2Icon,
	EyeOpenIcon,
	MagnifyingGlassIcon,
	Pencil1Icon,
	TrashIcon,
} from "@radix-ui/react-icons";
import {
	AlertDialog,
	Badge,
	Button,
	Flex,
	IconButton,
	Table as RadixTable,
	SegmentedControl,
	Text,
	Tooltip,
} from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "$src/components/toast/toastUtil";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import {
	useDeleteWorkerVoiceCase,
	useWorkerVoiceCases,
} from "$src/queries/workerVoiceCalls";
import type {
	WorkerVoiceCaseColumnFilters,
	WorkerVoiceCaseListRow,
	WorkerVoiceCaseScope,
} from "$src/services/workerVoiceCaseService";
import {
	EMPTY_VALUE,
	formatCallDate,
	KPI_RISK_COLORS,
	KPI_RISK_LABEL_KEYS,
	KPI_RISK_LEVELS,
	kpiRiskLevel,
	orEmpty,
} from "./callFormatting";
import WorkerVoiceCallDetails from "./WorkerVoiceCallDetails";
import "./issueTooltip.css";

/** Keystrokes are held for this long before a request goes out. */
const SEARCH_DEBOUNCE_MS = 300;
/** One screenful of calls; the rest are a page away. */
const PAGE_SIZE = 12;

/**
 * Fixed widths keep every column aligned down the page and stop one long
 * reason from pushing the actions off screen. `reason` is left unsized so it
 * takes whatever room is left over.
 *
 * `filter` is the control the column's search box uses: a number for the call
 * an officer already knows, a calendar for the date, the two KPI-derived
 * levels for the forced-labor risk, and free text for everything else.
 * `actions` has nothing to search.
 *
 * `kpi` is the "Issue Description" column. It draws the descriptions of the
 * KPIs picked on step 4 -- the text ILM shows under "Kpi" -- and not the
 * interaction reason it carried until round four, which is still collected on
 * step 1 and still shown in the detail panel. It is the unsized column because
 * a KPI description is a full sentence and a call can carry several.
 *
 * Its search box matches the English KPI descriptions. The column can render
 * a translation, but the CSO and Management dashboards are English-only for
 * now, so the two agree in practice; if another language is ever turned on,
 * the box and the text would part company and this needs revisiting. The
 * free-text search deliberately still leaves KPIs alone -- one column's box
 * is a narrower promise than "search everything".
 *
 * `staff` is the email of the account that entered the call, added in round
 * four. It sits last because it names the officer rather than the call. A
 * referred-in row has no email to show -- the API withholds it -- so it reads
 * "Referred" instead, which is what Ana asked for over a bare dash. That badge
 * is also the row's only referred marker; it used to be drawn beside the call
 * number as well, which stated the same fact twice.
 *
 * Channel and status were dropped in round three: a call's status is the
 * officer's own note on the conversation and is not the status of the KPI the
 * issue belongs to, so showing it beside a KPI-derived risk read as a claim
 * the two were connected. Supplier and phone number took their place.
 */
const COLUMNS = [
	{ key: "id", width: 80, filter: "number" },
	{ key: "date", width: 112, filter: "date" },
	{ key: "worker", width: 116, filter: "text" },
	{ key: "phone", width: 132, filter: "text" },
	{ key: "nationality", width: 108, filter: "text" },
	{ key: "supplier", width: 132, filter: "text" },
	{ key: "kpi", width: undefined, filter: "text" },
	{ key: "kpi_risk", width: 130, filter: "kpi_risk" },
	{ key: "staff", width: 144, filter: "text" },
	// Three 24px icon buttons, two 8px gaps and the cell's own 24px of
	// padding. It was 108 and the third button never had room.
	{ key: "actions", width: 112, filter: null },
] as const;

/**
 * What the sized columns add up to, and the room the unsized one needs beside
 * them. The table is `table-layout: fixed`, so these are not suggestions: if
 * the sized columns ever add up to more than the table's own width, the
 * unsized column is squeezed to nothing and the table spills out of its
 * container. That is exactly what adding the Staff column did -- the widths
 * came to 1288 against a `minWidth` of 1240 -- so the two are derived here
 * rather than left as two numbers to keep in step by hand.
 *
 * The sized columns are also kept tight enough that the whole table fits the
 * card at a 1440px viewport, where the card measures 1310. Wider and the last
 * column is scrolled out of sight, which is what an officer notices first: the
 * row actions are the rightmost thing on the row.
 */
const SIZED_COLUMNS_WIDTH = COLUMNS.reduce(
	(total, column) => total + (column.width ?? 0),
	0,
);
/** Below this the KPI descriptions stop being readable; the wrapper scrolls. */
const KPI_COLUMN_MIN_WIDTH = 220;
const TABLE_MIN_WIDTH = SIZED_COLUMNS_WIDTH + KPI_COLUMN_MIN_WIDTH;

type FilterColumn = keyof WorkerVoiceCaseColumnFilters;

/**
 * The tabs over the table. "all" is first and is the default: an officer wants
 * their caseload, and a referral another organization sent them is part of it.
 */
const SCOPES: readonly WorkerVoiceCaseScope[] = ["all", "own", "shared"];

const filterControlStyle = {
	width: "100%",
	padding: "4px 6px",
	fontSize: "0.75rem",
	color: "var(--color-ink)",
	backgroundColor: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 6,
} as const;

const headerCellStyle = {
	fontSize: "0.8125rem",
	fontWeight: 600,
	color: "var(--color-secondary)",
	borderBottom: "2px solid var(--color-border)",
	padding: "10px 12px",
	verticalAlign: "top",
	whiteSpace: "nowrap",
} as const;

const bodyCellStyle = {
	padding: "12px",
	fontSize: "0.875rem",
	verticalAlign: "middle",
} as const;

const messageCellStyle = {
	padding: "40px 12px",
	textAlign: "center",
} as const;

/** One line, ellipsised, with the full value on hover. */
const Truncated: React.FC<{ value: string }> = ({ value }) => {
	const blank = value === EMPTY_VALUE;
	return (
		<div
			className={blank ? "truncate text-caption" : "truncate"}
			title={blank ? undefined : value}
		>
			{value}
		</div>
	);
};

/**
 * The KPI descriptions of one call, drawn the way ILM draws them: joined into
 * one line that truncates, with the full list on hover. A call usually carries
 * one KPI, but the tail runs to a dozen, and the tooltip is the only place
 * they all fit -- ILM puts them in a bulleted list there, which a `title`
 * attribute renders as one per line.
 */
const kpiCellStyle = {
	// Two lines, then ellipsis. One line ellipsised a 70-character KPI after
	// about three words; two lines roughly double that in the same width,
	// which is what keeps the column narrow enough for the rest of the table
	// to fit. The whole list is on the tooltip either way.
	display: "-webkit-box",
	WebkitBoxOrient: "vertical",
	WebkitLineClamp: 2,
	overflow: "hidden",
	lineHeight: 1.35,
	// `-webkit-box` ignores `text-overflow`, so the clamp does the ellipsis;
	// this stops a single long word from widening the fixed column instead.
	overflowWrap: "anywhere",
} as const;

/**
 * One issue per line in the tooltip, bulleted only when there is more than one
 * to tell apart -- the way ILM lists them.
 *
 * Blocks rather than a `<ul>`: Radix Themes wraps whatever it is given in a
 * `<p class="rt-TooltipText">`, and a list inside a paragraph is invalid HTML
 * that React warns about. A `<span>` is valid there and `display: block` gives
 * the same one-per-line result, with a hanging indent so a wrapped line sits
 * under its own text and not under the bullet.
 */
const kpiTooltipLineStyle = {
	display: "block",
	paddingLeft: 12,
	textIndent: -12,
	lineHeight: 1.4,
} as const;

/**
 * The clamped cell, with the whole list on hover.
 *
 * A themed tooltip rather than the browser's `title`: `title` waits about a
 * second, cannot be styled to match the table (see `issueTooltip.css`, which
 * inverts Radix's near-black panel to a light one), and flattens the line
 * breaks
 * that separate one KPI from the next in most browsers -- which on a call
 * carrying seven of them turns the one place the full text lives into a wall
 * of run-on words.
 *
 * The trigger is deliberately not focusable. The clamp is visual only, so the
 * whole joined string is in the DOM and a screen reader reads all of it
 * already; adding a tab stop per row would put a dozen of them on the page
 * between an officer and the row actions, to reveal text their reader had
 * given them anyway.
 */
const KpiDescriptions: React.FC<{ values: string[] }> = ({ values }) => {
	if (values.length === 0) {
		return <span className="text-caption">{EMPTY_VALUE}</span>;
	}
	const content =
		values.length === 1 ? (
			values[0]
		) : (
			<>
				{values.map((value) => (
					<span key={value} style={kpiTooltipLineStyle}>
						{`\u2022 ${value}`}
					</span>
				))}
			</>
		);
	return (
		<Tooltip className="wv-issue-tooltip" content={content}>
			<div style={kpiCellStyle}>{values.join(", ")}</div>
		</Tooltip>
	);
};

const WorkerVoiceCallsList: React.FC = () => {
	const { t, i18n } = useTranslation();
	const lang = useActiveLanguage();
	const navigate = useNavigate();
	const searchId = useId();

	// The input stays local so typing never waits on a request; `search` is
	// what the query key -- and therefore the request -- actually follows.
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	// Column boxes are debounced the same way, and against the same clock, so
	// typing in two of them costs one request rather than two.
	const [filterInput, setFilterInput] = useState<WorkerVoiceCaseColumnFilters>(
		{},
	);
	const [filters, setFilters] = useState<WorkerVoiceCaseColumnFilters>({});
	// Which half of the caseload the table is drawing. Answered server-side, so
	// it is a request rather than a filter over the loaded page.
	const [scope, setScope] = useState<WorkerVoiceCaseScope>("all");
	const [page, setPage] = useState(0);
	const [detailId, setDetailId] = useState<number | null>(null);
	const [pendingDelete, setPendingDelete] =
		useState<WorkerVoiceCaseListRow | null>(null);

	const { data, isLoading, isError, isFetching } = useWorkerVoiceCases({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		search,
		filters,
		scope,
		// The KPI descriptions come back translated, so the request has to say
		// which language to read them in.
		lang,
	});
	const deleteCall = useDeleteWorkerVoiceCase();

	useEffect(() => {
		const timer = setTimeout(() => {
			setSearch(searchInput);
			setFilters(filterInput);
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [searchInput, filterInput]);

	// A new search, or a new tab, is a different result set, so the page the
	// officer was on probably does not exist in it.
	useEffect(() => {
		setPage(0);
	}, [search, filters, scope]);

	// What the officer narrowed by, for the "nothing matched" line: the free
	// text if there is any, otherwise whatever the column boxes hold.
	const narrowing =
		search.trim() ||
		Object.values(filters)
			.map((value) => (value ?? "").trim())
			.filter(Boolean)
			.join(", ");

	const rows = data?.results ?? [];
	const totalCount = data?.count ?? 0;
	const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

	// Deleting the last row of the last page would otherwise leave the officer
	// on an offset past the end of the result set, which comes back empty.
	useEffect(() => {
		if (data && page > 0 && page > pageCount - 1) {
			setPage(pageCount - 1);
		}
	}, [data, page, pageCount]);

	const handleDelete = async () => {
		if (!pendingDelete) {
			return;
		}
		try {
			await deleteCall.mutateAsync(pendingDelete.id);
			showToast.success(t("workerVoicePage.view.delete.success"));
			setPendingDelete(null);
		} catch (error) {
			console.error("Failed to delete worker voice call", error);
			showToast.error(t("workerVoicePage.view.delete.error"));
		}
	};

	/**
	 * What the row actions and the confirm dialog call a given call. The number
	 * is always part of it: one worker can call more than once, and "Delete
	 * Aung" would then name two different rows.
	 */
	const describe = (row: WorkerVoiceCaseListRow) => {
		const number = t("workerVoicePage.view.callNumber", { id: row.id });
		const nickname = row.client_nickname?.trim();
		return nickname ? `${nickname} (${number})` : number;
	};

	const setColumnFilter = (column: FilterColumn, value: string) => {
		setFilterInput((current) => ({ ...current, [column]: value }));
	};

	/** The search box a column's header carries, if it has one. */
	const filterControl = (column: (typeof COLUMNS)[number]) => {
		if (!column.filter) {
			return null;
		}

		const key = column.key as FilterColumn;
		const value = filterInput[key] ?? "";
		const label = t("workerVoicePage.view.columnFilter.label", {
			column: t(`workerVoicePage.view.columns.${column.key}`),
		});

		if (column.filter === "kpi_risk") {
			return (
				<select
					aria-label={label}
					onChange={(event) => setColumnFilter(key, event.target.value)}
					style={filterControlStyle}
					value={value}
				>
					<option value="">{t("workerVoicePage.view.columnFilter.any")}</option>
					{KPI_RISK_LEVELS.map((level) => (
						<option key={level} value={level}>
							{t(KPI_RISK_LABEL_KEYS[level])}
						</option>
					))}
				</select>
			);
		}

		return (
			<input
				aria-label={label}
				onChange={(event) => setColumnFilter(key, event.target.value)}
				// A date box carries its own calendar, and a number box its own
				// spinner, so neither wants a placeholder over the top of it.
				placeholder={
					column.filter === "text"
						? t("workerVoicePage.view.columnFilter.placeholder")
						: undefined
				}
				style={filterControlStyle}
				type={column.filter}
				value={value}
			/>
		);
	};

	const messageRow = (content: React.ReactNode) => (
		<RadixTable.Row>
			<RadixTable.Cell colSpan={COLUMNS.length} style={messageCellStyle}>
				{content}
			</RadixTable.Cell>
		</RadixTable.Row>
	);

	return (
		<div className="flex flex-col gap-m">
			<Flex align="center" gap="3" justify="between" wrap="wrap">
				<SegmentedControl.Root
					aria-label={t("workerVoicePage.view.scope.label")}
					onValueChange={(value) => setScope(value as WorkerVoiceCaseScope)}
					size="1"
					value={scope}
				>
					{SCOPES.map((option) => (
						<SegmentedControl.Item key={option} value={option}>
							{t(`workerVoicePage.view.scope.${option}`)}
						</SegmentedControl.Item>
					))}
				</SegmentedControl.Root>
			</Flex>

			<Flex align="center" gap="3" justify="between" wrap="wrap">
				<label className="relative flex items-center" htmlFor={searchId}>
					<MagnifyingGlassIcon className="pointer-events-none absolute left-3 text-caption" />
					<input
						aria-label={t("workerVoicePage.view.search.label")}
						className="w-[min(420px,80vw)] rounded-md border border-border bg-[var(--color-surface)] py-2 pr-9 pl-9 text-ink text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/40"
						id={searchId}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder={t("workerVoicePage.view.search.placeholder")}
						type="search"
						value={searchInput}
					/>
					{searchInput !== "" && (
						<IconButton
							aria-label={t("workerVoicePage.view.search.clear")}
							className="absolute right-1"
							onClick={() => setSearchInput("")}
							size="1"
							type="button"
							variant="ghost"
						>
							<Cross2Icon />
						</IconButton>
					)}
				</label>

				<Text className="text-body" size="2">
					{isFetching
						? t("workerVoicePage.view.updating")
						: t("workerVoicePage.view.totalCount", { count: totalCount })}
				</Text>
			</Flex>

			<div
				className="overflow-x-auto rounded-xl border border-border"
				style={{ backgroundColor: "var(--color-surface)" }}
			>
				<RadixTable.Root
					size="2"
					style={{
						tableLayout: "fixed",
						width: "100%",
						minWidth: TABLE_MIN_WIDTH,
					}}
				>
					<colgroup>
						{COLUMNS.map((column) => (
							<col
								key={column.key}
								style={column.width ? { width: column.width } : undefined}
							/>
						))}
					</colgroup>

					<RadixTable.Header>
						<RadixTable.Row style={{ backgroundColor: "var(--color-bg)" }}>
							{COLUMNS.map((column) => (
								<RadixTable.ColumnHeaderCell
									key={column.key}
									style={headerCellStyle}
								>
									<Flex direction="column" gap="2">
										<span>
											{t(`workerVoicePage.view.columns.${column.key}`)}
										</span>
										{filterControl(column)}
									</Flex>
								</RadixTable.ColumnHeaderCell>
							))}
						</RadixTable.Row>
					</RadixTable.Header>

					<RadixTable.Body>
						{isLoading &&
							messageRow(
								<Text className="text-body" size="2">
									{t("workerVoicePage.view.loading")}
								</Text>,
							)}

						{isError &&
							!isLoading &&
							messageRow(
								<Text className="text-red-600" role="alert" size="2">
									{t("workerVoicePage.view.error")}
								</Text>,
							)}

						{!isLoading &&
							!isError &&
							rows.length === 0 &&
							messageRow(
								<Text className="text-body" size="2">
									{t(
										narrowing
											? "workerVoicePage.view.noMatches"
											: `workerVoicePage.view.emptyScope.${scope}`,
										{ search: narrowing },
									)}
								</Text>,
							)}

						{rows.map((row) => (
							<RadixTable.Row
								className="transition-colors hover:bg-bg"
								key={row.id}
							>
								<RadixTable.Cell style={bodyCellStyle}>
									<span className="font-semibold text-primary">{row.id}</span>
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<div className="whitespace-nowrap">
										{formatCallDate(
											row.interacted ?? row.created,
											i18n.language,
										)}
									</div>
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<Truncated value={orEmpty(row.client_nickname)} />
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<Truncated value={orEmpty(row.client_phonenumber)} />
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<Truncated value={orEmpty(row.client_nationality_name)} />
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<Truncated value={orEmpty(row.supplier_name)} />
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<KpiDescriptions values={row.kpi_descriptions} />
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									{(() => {
										// Read off the KPIs the call is tagged with, not off the
										// worker's personal risk level: the two answer different
										// questions and only this one is about the issue.
										const level = kpiRiskLevel(row.kpi_levels);
										return level ? (
											<Badge color={KPI_RISK_COLORS[level]} variant="soft">
												{t(KPI_RISK_LABEL_KEYS[level])}
											</Badge>
										) : (
											<span className="text-caption">{EMPTY_VALUE}</span>
										);
									})()}
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									{/* A referred-in row carries no email -- the API withholds
									    the other organization's officer -- so the cell answers
									    the column's question with where the call came from
									    instead. This is the only place the row is marked as
									    referred: the badge used to sit beside the call number
									    too, which said the same thing twice. Sitting next to
									    the actions is if anything the better place for it, as
									    it is also why the row has no edit or delete. Hovering
									    names the organization that sent it. */}
									{row.shared_with_my_organization ? (
										<Badge
											color="purple"
											title={t("workerVoicePage.view.sharedBy", {
												organization: orEmpty(row.owner_organization_name),
											})}
											variant="soft"
										>
											{t("workerVoicePage.view.sharedBadge")}
										</Badge>
									) : (
										<Truncated value={orEmpty(row.staff_email)} />
									)}
								</RadixTable.Cell>
								<RadixTable.Cell style={bodyCellStyle}>
									<Flex gap="2">
										<IconButton
											aria-label={t("workerVoicePage.view.actions.view", {
												call: describe(row),
											})}
											onClick={() => setDetailId(row.id)}
											size="1"
											title={t("workerVoicePage.view.actions.viewShort")}
											variant="ghost"
										>
											<EyeOpenIcon />
										</IconButton>
										{/* A referral hands over the reading of a call, not
										    the keeping of it. Editing was opened to the
										    receiving organization in round four and reverted:
										    a save runs legacy signals that create, reopen and
										    delete `SupplierKpi` rows when the supplier or KPI
										    set changes, and those belong to the logging
										    organization's supplier relationship. The API
										    refuses both writes on a shared row, so neither
										    button is offered. */}
										{!row.shared_with_my_organization && (
											<>
												<IconButton
													aria-label={t("workerVoicePage.view.actions.edit", {
														call: describe(row),
													})}
													onClick={() =>
														navigate({
															to: "/worker-voice-calls",
															search: { editId: row.id },
														})
													}
													size="1"
													title={t("workerVoicePage.view.actions.editShort")}
													variant="ghost"
												>
													<Pencil1Icon />
												</IconButton>
												<IconButton
													aria-label={t("workerVoicePage.view.actions.delete", {
														call: describe(row),
													})}
													color="red"
													onClick={() => setPendingDelete(row)}
													size="1"
													title={t("workerVoicePage.view.actions.deleteShort")}
													variant="ghost"
												>
													<TrashIcon />
												</IconButton>
											</>
										)}
									</Flex>
								</RadixTable.Cell>
							</RadixTable.Row>
						))}
					</RadixTable.Body>
				</RadixTable.Root>

				<Flex
					align="center"
					gap="3"
					justify="end"
					px="4"
					py="3"
					style={{ borderTop: "1px solid var(--color-border)" }}
					wrap="wrap"
				>
					<Text className="text-body" size="2">
						{t("workerVoicePage.view.pagination", {
							current: page + 1,
							total: pageCount,
						})}
					</Text>
					<Flex align="center" gap="1">
						<IconButton
							aria-label={t("workerVoicePage.view.previousPage")}
							disabled={page === 0}
							onClick={() => setPage((current) => Math.max(0, current - 1))}
							size="1"
							variant="soft"
						>
							<ChevronLeftIcon />
						</IconButton>
						<IconButton
							aria-label={t("workerVoicePage.view.nextPage")}
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
			</div>

			<WorkerVoiceCallDetails
				callId={detailId}
				onClose={() => setDetailId(null)}
			/>

			<AlertDialog.Root
				onOpenChange={(open) => !open && setPendingDelete(null)}
				open={pendingDelete !== null}
			>
				<AlertDialog.Content maxWidth="480px">
					<AlertDialog.Title>
						{t("workerVoicePage.view.delete.title")}
					</AlertDialog.Title>
					<AlertDialog.Description size="2">
						{t("workerVoicePage.view.delete.message", {
							call: pendingDelete ? describe(pendingDelete) : "",
						})}
					</AlertDialog.Description>
					<Flex gap="3" justify="end" mt="4">
						<AlertDialog.Cancel>
							<Button color="gray" variant="soft">
								{t("workerVoicePage.view.delete.cancel")}
							</Button>
						</AlertDialog.Cancel>
						{/* Not `AlertDialog.Action`: that closes the dialog on click, which
						    would dismiss it before the request has answered. */}
						<Button
							color="red"
							disabled={deleteCall.isPending}
							onClick={handleDelete}
							variant="solid"
						>
							{t(
								deleteCall.isPending
									? "workerVoicePage.view.delete.deleting"
									: "workerVoicePage.view.delete.confirm",
							)}
						</Button>
					</Flex>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</div>
	);
};

export default WorkerVoiceCallsList;
