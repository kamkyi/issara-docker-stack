import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkerVoiceCallsList from "$src/components/routes/WorkerVoiceCalls/WorkerVoiceCallsList";
import type {
	WorkerVoiceCaseListParams,
	WorkerVoiceCaseListRow,
} from "$src/services/workerVoiceCaseService";

// What the table asks the server for is the behaviour under test -- searching
// and paging are server-side, so the query hook is the seam.
const listParams: WorkerVoiceCaseListParams[] = [];
const listResult = {
	data: undefined as
		| { count: number; results: WorkerVoiceCaseListRow[] }
		| undefined,
	isLoading: false,
	isError: false,
	isFetching: false,
};
const deleteMutate = vi.fn().mockResolvedValue(undefined);

vi.mock("$src/queries/workerVoiceCalls", () => ({
	useWorkerVoiceCases: (params: WorkerVoiceCaseListParams) => {
		listParams.push(params);
		return listResult;
	},
	useDeleteWorkerVoiceCase: () => ({
		mutateAsync: deleteMutate,
		isPending: false,
	}),
	useWorkerVoiceCase: () => ({
		data: undefined,
		isLoading: false,
		isError: false,
	}),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("$src/components/toast/toastUtil", () => ({
	showToast: {
		success: (message: string) => toastSuccess(message),
		error: (message: string) => toastError(message),
	},
}));

const row = (
	overrides: Partial<WorkerVoiceCaseListRow> = {},
): WorkerVoiceCaseListRow => ({
	id: 1,
	created: "2026-08-20",
	interacted: "2026-08-28",
	client_nickname: "Aung",
	client_nationality_name: "Burmese",
	interaction_reason_name: "Reporting an issue",
	kpi_descriptions: ["Excessive overtime"],
	interaction_channel_name: "Reported In-person",
	client_type_name: "Current worker",
	case_status_name: "Open",
	supplier_name: "Bangkok Seafood Co.",
	client_phonenumber: "+66 81 234 5678",
	worker_identification_risk_level: "HIGH",
	kpi_levels: [2],
	interaction_summary: "Unpaid overtime.",
	issue_description: "Six weeks unpaid.",
	attachment_count: 0,
	owner_organization_name: "Partner CSO",
	shared_with_my_organization: false,
	staff_email: "officer@cso.org",
	...overrides,
});

const renderList = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
		<QueryClientProvider client={queryClient}>
			<Theme>{children}</Theme>
		</QueryClientProvider>
	);
	return render(<WorkerVoiceCallsList />, { wrapper: Wrapper });
};

/** The parameters behind the most recent render's request. */
const lastParams = () => listParams[listParams.length - 1];

/**
 * The table body. The header's filter boxes carry the same option wording as
 * the badges below them, so a risk assertion has to say which it means.
 */
const inBody = () => within(screen.getAllByRole("rowgroup")[1]);

describe("WorkerVoiceCallsList", () => {
	beforeEach(() => {
		listParams.length = 0;
		listResult.data = { count: 1, results: [row()] };
		listResult.isLoading = false;
		listResult.isError = false;
		listResult.isFetching = false;
		vi.clearAllMocks();
	});

	it("shows a logged call with its resolved labels", () => {
		renderList();

		expect(screen.getByText("Aung")).toBeInTheDocument();
		expect(screen.getByText("Burmese")).toBeInTheDocument();
		expect(screen.getByText("Excessive overtime")).toBeInTheDocument();
		expect(screen.getByText("Bangkok Seafood Co.")).toBeInTheDocument();
		expect(screen.getByText("+66 81 234 5678")).toBeInTheDocument();
		expect(screen.getByText("Aug 28, 2026")).toBeInTheDocument();
	});

	it("drops the channel and status columns", () => {
		// A call's status is the officer's note on the conversation, not the
		// status of the KPI the issue belongs to, so it is not shown beside a
		// KPI-derived risk where it would read as the same answer.
		renderList();

		expect(screen.queryByText("Channel")).toBeNull();
		expect(screen.queryByText("Status")).toBeNull();
		expect(screen.queryByText("Open")).toBeNull();
		expect(screen.queryByText("Reported In-person")).toBeNull();
	});

	it("draws the KPI descriptions under Issue Description, not the reason", () => {
		// Round four: Ana asked for the text ILM shows under "Kpi". The reason
		// is still collected on step 1 and still on the payload -- it is just
		// no longer what this column draws.
		renderList();

		expect(inBody().getByText("Excessive overtime")).toBeInTheDocument();
		expect(inBody().queryByText("Reporting an issue")).toBeNull();
	});

	it("keeps the table within a width the sized columns leave room for", () => {
		// `table-layout: fixed`: if the sized columns ever add up to more than
		// the table's own width, the unsized Issue Description column is
		// squeezed to nothing and the table spills out of its container. That
		// is what adding the Staff column did before its width was derived.
		renderList();

		// Radix puts the style prop on its own wrapper, not on <table>, so the
		// element carrying the constraint is found by the constraint itself.
		const constrained = document.querySelector<HTMLElement>(
			'[style*="min-width"]',
		);
		const minWidth = Number.parseInt(constrained?.style.minWidth ?? "", 10);
		const sized = Array.from(document.querySelectorAll("col")).reduce(
			(total, col) =>
				total + (Number.parseInt((col as HTMLElement).style.width, 10) || 0),
			0,
		);

		expect(sized).toBeGreaterThan(0);
		// Room left over for the one unsized column, not a deficit.
		expect(minWidth - sized).toBeGreaterThanOrEqual(200);
		// And the whole table has to fit the card it sits in. Measured in a
		// real browser at a 1440px viewport, that card is 1310px wide; at 1374
		// the Actions column was scrolled out of sight, which is the first
		// thing an officer notices because the row actions are the rightmost
		// thing on the row.
		expect(minWidth).toBeLessThanOrEqual(1310);
	});

	it("lists every issue separately in a tooltip on hover", async () => {
		// The cell joins them to fit one clamped line or two; the tooltip is
		// where the full list lives, one issue per line, as ILM lists them.
		const user = userEvent.setup();
		listResult.data = {
			count: 1,
			results: [
				row({
					kpi_descriptions: ["Excessive overtime", "Passport retention"],
				}),
			],
		};
		renderList();

		const cell = inBody().getByText("Excessive overtime, Passport retention");
		// A themed tooltip, not the browser's `title`, which flattens the line
		// breaks between one issue and the next.
		expect(cell).not.toHaveAttribute("title");

		await user.hover(cell);

		const tooltip = await screen.findByRole("tooltip");
		// One issue per line, and no list inside Radix's <p> wrapper, which
		// would be invalid HTML.
		expect(tooltip.querySelector("ul")).toBeNull();
		expect(tooltip).toHaveTextContent("Excessive overtime");
		expect(tooltip).toHaveTextContent("Passport retention");
		// Themed to the app's brand navy, not Radix's near-black default.
		expect(document.querySelector(".wv-issue-tooltip")).toBeInTheDocument();
	});

	it("keeps the whole text readable to a screen reader without hovering", () => {
		// The clamp is visual only, so the full joined string stays in the DOM
		// and assistive tech reads all of it. That is why the cell is not a tab
		// stop: it would add one per row to reveal text a reader already has.
		listResult.data = {
			count: 1,
			results: [
				row({
					kpi_descriptions: ["Excessive overtime", "Passport retention"],
				}),
			],
		};
		renderList();

		const cell = inBody().getByText("Excessive overtime, Passport retention");
		expect(cell).not.toHaveAttribute("tabindex");
		expect(cell.textContent).toBe("Excessive overtime, Passport retention");
	});

	it("leaves Issue Description blank on a call with no KPI", () => {
		listResult.data = { count: 1, results: [row({ kpi_descriptions: [] })] };
		renderList();

		expect(inBody().queryByText("Excessive overtime")).toBeNull();
	});

	it("asks the server for the KPI descriptions in the reader's language", () => {
		renderList();

		expect(lastParams()).toMatchObject({ lang: "en" });
	});

	it("names the staff member who entered the call", () => {
		renderList();

		expect(inBody().getByText("officer@cso.org")).toBeInTheDocument();
	});

	it("says a referred-in call was referred rather than naming nobody", () => {
		// The API withholds the other organization's officer, so the cell says
		// where the call came from instead of leaving a dash to interpret.
		listResult.data = {
			count: 1,
			results: [row({ shared_with_my_organization: true, staff_email: null })],
		};
		renderList();

		expect(inBody().queryByText("officer@cso.org")).toBeNull();
		// Once, and only once: the same fact was previously stated again by a
		// badge beside the call number.
		expect(inBody().getAllByText("Referred")).toHaveLength(1);
	});

	it("never labels an own row as referred, even with no email on it", () => {
		// Belt and braces: the label follows the referral flag, not the empty
		// email, so a creatorless own row still reads as blank.
		listResult.data = {
			count: 1,
			results: [row({ shared_with_my_organization: false, staff_email: null })],
		};
		renderList();

		expect(inBody().queryByText("Referred")).toBeNull();
	});

	it("reads the forced labor risk level off the KPIs, not the personal risk", () => {
		// The row carries HIGH as the worker's personal risk and a single Level
		// 2 KPI. The column is about the issue, so it says early warning.
		renderList();

		expect(inBody().getByText("Early warning")).toBeInTheDocument();
		expect(inBody().queryByText("High risk")).toBeNull();
	});

	it("takes the most severe KPI when a call is tagged with several", () => {
		listResult.data = { count: 1, results: [row({ kpi_levels: [2, 4] })] };
		renderList();

		expect(inBody().getByText("Forced labor risk")).toBeInTheDocument();
	});

	it("leaves the risk blank on a call with no KPI rather than guessing", () => {
		listResult.data = { count: 1, results: [row({ kpi_levels: [] })] };
		renderList();

		expect(inBody().queryByText("Early warning")).toBeNull();
		expect(inBody().queryByText("Forced labor risk")).toBeNull();
	});

	it("asks for the first page and no filter to begin with", () => {
		renderList();

		expect(lastParams()).toMatchObject({ limit: 12, offset: 0, search: "" });
	});

	it("sends what the officer typed to the server, once typing pauses", async () => {
		const user = userEvent.setup();
		renderList();

		await user.type(screen.getByLabelText("Search logged calls"), "passport");

		await waitFor(() =>
			expect(lastParams()).toMatchObject({ search: "passport" }),
		);
	});

	it("goes back to the first page when the search changes", async () => {
		const user = userEvent.setup();
		listResult.data = { count: 200, results: [row()] };
		renderList();

		await user.click(screen.getByLabelText("Next page"));
		expect(lastParams()).toMatchObject({ offset: 12 });

		await user.type(screen.getByLabelText("Search logged calls"), "a");

		await waitFor(() => expect(lastParams()).toMatchObject({ offset: 0 }));
	});

	it("pages by asking for the next offset rather than slicing locally", async () => {
		const user = userEvent.setup();
		listResult.data = { count: 36, results: [row()] };
		renderList();

		await user.click(screen.getByLabelText("Next page"));

		expect(lastParams()).toMatchObject({ limit: 12, offset: 12 });
	});

	it("cannot page past the last page of results", () => {
		listResult.data = { count: 3, results: [row()] };
		renderList();

		expect(screen.getByLabelText("Next page")).toBeDisabled();
		expect(screen.getByLabelText("Previous page")).toBeDisabled();
	});

	it("steps back when the page the officer is on no longer exists", async () => {
		// Deleting the last row of the last page leaves the offset past the end
		// of the result set, which the server answers with nothing.
		const user = userEvent.setup();
		listResult.data = { count: 24, results: [row()] };
		renderList();

		await user.click(screen.getByLabelText("Next page"));
		expect(lastParams()).toMatchObject({ offset: 12 });

		listResult.data = { count: 12, results: [row()] };
		await user.click(screen.getByLabelText("Previous page"));
		await user.click(screen.getByLabelText("Next page"));

		await waitFor(() => expect(lastParams()).toMatchObject({ offset: 0 }));
	});

	it("searches the Issue Description column by KPI text", async () => {
		// English text, matched server-side. The dashboards are English-only
		// for now, so what is typed and what is drawn are the same words.
		const user = userEvent.setup();
		renderList();

		await user.type(
			screen.getByLabelText("Filter by Issue Description"),
			"overtime",
		);

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ kpi: "overtime" }),
		);
	});

	it("searches the staff column by email, under its own column name", async () => {
		const user = userEvent.setup();
		renderList();

		await user.type(screen.getByLabelText("Filter by Staff"), "mya@");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ staff: "mya@" }),
		);
	});

	it("sends a column box under its own column name", async () => {
		const user = userEvent.setup();
		renderList();

		await user.type(screen.getByLabelText("Filter by Worker"), "Aung");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ worker: "Aung" }),
		);
	});

	it("sends the call number from the id box, which takes only digits", async () => {
		const user = userEvent.setup();
		renderList();

		const idBox = screen.getByLabelText("Filter by Call");
		expect(idBox).toHaveAttribute("type", "number");

		await user.type(idBox, "9900014");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ id: "9900014" }),
		);
	});

	it("picks the date from a calendar rather than free text", async () => {
		const user = userEvent.setup();
		renderList();

		const dateBox = screen.getByLabelText("Filter by Date");
		expect(dateBox).toHaveAttribute("type", "date");

		await user.type(dateBox, "2026-08-28");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ date: "2026-08-28" }),
		);
	});

	it("filters the forced labor risk column server-side, on the two KPI bands", async () => {
		const user = userEvent.setup();
		renderList();

		const box = screen.getByLabelText("Filter by Forced labor risk level");
		expect(
			Array.from(box.querySelectorAll("option")).map((o) => o.textContent),
		).toEqual(["Any", "Forced labor risk", "Early warning"]);

		await user.selectOptions(box, "FORCED_LABOR");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({ kpi_risk: "FORCED_LABOR" }),
		);
	});

	it("filters on supplier and phone number", async () => {
		const user = userEvent.setup();
		renderList();

		await user.type(screen.getByLabelText("Filter by Supplier"), "Bangkok");
		await user.type(screen.getByLabelText("Filter by Phone Number"), "5678");

		await waitFor(() =>
			expect(lastParams().filters).toMatchObject({
				supplier: "Bangkok",
				phone: "5678",
			}),
		);
	});

	it("goes back to the first page when a column box changes", async () => {
		const user = userEvent.setup();
		listResult.data = { count: 200, results: [row()] };
		renderList();

		await user.click(screen.getByLabelText("Next page"));
		expect(lastParams()).toMatchObject({ offset: 12 });

		await user.type(screen.getByLabelText("Filter by Worker"), "A");

		await waitFor(() => expect(lastParams()).toMatchObject({ offset: 0 }));
	});

	it("names what was filtered on when a column box matches nothing", async () => {
		const user = userEvent.setup();
		renderList();

		await user.type(screen.getByLabelText("Filter by Worker"), "Bopha");
		listResult.data = { count: 0, results: [] };
		await user.type(screen.getByLabelText("Filter by Worker"), "!");

		await waitFor(() =>
			expect(
				screen.getByText("No logged call matches \u201cBopha!\u201d."),
			).toBeInTheDocument(),
		);
	});

	it("has no search box on the actions column", () => {
		renderList();

		expect(screen.queryByLabelText("Filter by Actions")).toBeNull();
	});

	it("says the caseload is empty when nothing has been logged", () => {
		listResult.data = { count: 0, results: [] };
		renderList();

		expect(
			screen.getByText(
				"Your organization has not logged any worker voice calls yet.",
			),
		).toBeInTheDocument();
	});

	it("distinguishes an empty search result from an empty caseload", async () => {
		const user = userEvent.setup();
		listResult.data = { count: 0, results: [] };
		renderList();

		await user.type(screen.getByLabelText("Search logged calls"), "zzz");

		await waitFor(() =>
			expect(
				screen.getByText("No logged call matches “zzz”."),
			).toBeInTheDocument(),
		);
	});

	it("opens the edit form for the call the officer picked", async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(screen.getByLabelText("Edit Aung (call #1)"));

		expect(navigate).toHaveBeenCalledWith({
			to: "/worker-voice-calls",
			search: { editId: 1 },
		});
	});

	it("confirms before deleting, and only then calls the server", async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(screen.getByLabelText("Delete Aung (call #1)"));

		const dialog = await screen.findByRole("alertdialog");
		expect(deleteMutate).not.toHaveBeenCalled();

		await user.click(
			within(dialog).getByRole("button", { name: "Delete call" }),
		);

		await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith(1));
		expect(toastSuccess).toHaveBeenCalled();
	});

	it("leaves the call alone when the officer cancels", async () => {
		const user = userEvent.setup();
		renderList();

		await user.click(screen.getByLabelText("Delete Aung (call #1)"));
		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		expect(deleteMutate).not.toHaveBeenCalled();
	});

	it("reports a failed delete instead of pretending it worked", async () => {
		const user = userEvent.setup();
		deleteMutate.mockRejectedValueOnce(new Error("boom"));
		renderList();

		await user.click(screen.getByLabelText("Delete Aung (call #1)"));
		const dialog = await screen.findByRole("alertdialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Delete call" }),
		);

		await waitFor(() => expect(toastError).toHaveBeenCalled());
		expect(toastSuccess).not.toHaveBeenCalled();
	});

	describe("calls referred here by another organization", () => {
		const shared = () =>
			row({
				id: 42,
				shared_with_my_organization: true,
				owner_organization_name: "Mekong Migrant Network",
			});

		it("marks a referred row so it is not mistaken for the organization's own", () => {
			listResult.data = { count: 1, results: [shared()] };
			renderList();

			// One marker, in the Staff column: it answers who entered the call
			// and doubles as the reason the row has no edit or delete. Hovering
			// names the organization that sent it.
			expect(screen.getByText("Referred")).toBeInTheDocument();
			expect(
				screen.getByTitle(
					"Referred to your organization by Mekong Migrant Network",
				),
			).toHaveTextContent("Referred");
		});

		it("offers no edit or delete on a referred row", () => {
			// A referral hands over the reading of a call, not the keeping of
			// it, and the API refuses both writes -- so neither is offered.
			// Editing was opened here in round four and reverted: a save runs
			// legacy signals that reach `SupplierKpi` rows belonging to the
			// logging organization's supplier relationship.
			listResult.data = { count: 1, results: [shared()] };
			renderList();

			expect(
				screen.getByLabelText("View details of Aung (call #42)"),
			).toBeInTheDocument();
			expect(screen.queryByLabelText("Edit Aung (call #42)")).toBeNull();
			expect(screen.queryByLabelText("Delete Aung (call #42)")).toBeNull();
		});

		it("keeps edit and delete on the organization's own rows", () => {
			renderList();

			expect(screen.getByLabelText("Edit Aung (call #1)")).toBeInTheDocument();
			expect(
				screen.getByLabelText("Delete Aung (call #1)"),
			).toBeInTheDocument();
		});

		it("asks for the whole caseload to begin with", () => {
			renderList();

			expect(lastParams()).toMatchObject({ scope: "all" });
		});

		it("narrows to one half of the caseload server-side", async () => {
			const user = userEvent.setup();
			renderList();

			await user.click(screen.getByRole("radio", { name: "Referred to us" }));
			await waitFor(() =>
				expect(lastParams()).toMatchObject({ scope: "shared" }),
			);

			await user.click(screen.getByRole("radio", { name: "Logged by us" }));
			await waitFor(() => expect(lastParams()).toMatchObject({ scope: "own" }));
		});

		it("goes back to the first page when the tab changes", async () => {
			const user = userEvent.setup();
			listResult.data = { count: 200, results: [row()] };
			renderList();

			await user.click(screen.getByLabelText("Next page"));
			expect(lastParams()).toMatchObject({ offset: 12 });

			await user.click(screen.getByRole("radio", { name: "Referred to us" }));

			await waitFor(() => expect(lastParams()).toMatchObject({ offset: 0 }));
		});

		it("says why the shared tab is empty rather than why the page is", async () => {
			const user = userEvent.setup();
			renderList();

			await user.click(screen.getByRole("radio", { name: "Referred to us" }));
			listResult.data = { count: 0, results: [] };
			await user.click(screen.getByRole("radio", { name: "All calls" }));
			await user.click(screen.getByRole("radio", { name: "Referred to us" }));

			await waitFor(() =>
				expect(
					screen.getByText(
						"No partner organization has referred a worker voice call to you yet.",
					),
				).toBeInTheDocument(),
			);
		});
	});
});
