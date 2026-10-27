import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import PageContainer from "$components/ui/PageContainer";
import { useProductRoadmap } from "$src/queries/productRoadmap";
import type {
	ProductRoadmapNote,
	ProductRoadmapRelease,
	ProductRoadmapSprintTask,
} from "$src/services/productRoadmap";

// --- Types ---
type Tab = "roadmap" | "news" | "sprint";

type FilterKind = "fProducts" | "fTypes" | "fStatuses";

// --- Imported mockup design tokens (literal match to Product Roadmap.dc.html) ---
const NAVY = "#0e4a58"; // headings / names
const TEAL = "#17788a"; // links / icons / dots
const TEAL_DK = "#146e80"; // "In progress" text / "Rolling out"
const TEAL_LABEL = "#148696"; // micro-labels, section labels, "Coming up", Target
const BODY = "#4a5a5f"; // default card body copy
const CAPTION = "#8a979c"; // muted counts ("N updates match")
const BORDER = "#e7dfca"; // warm-tan card / container / tab / table borders
const TRACK = "#d2d2d2"; // timeline track line + "date TBC" ring
const GREEN = "#2D9E5B";
const GREEN_TEXT = "#2e8b57";
const INK = "#28332f"; // feature / task names
const CORAL = "#FB8379"; // product labels, TODAY marker, "Waiting on"
const TAN = "#c3b99e";
const HEAD = "'Montserrat', sans-serif";

// --- Status / type metadata ---
const statusMeta: Record<string, { bg: string; color: string; dot: string }> = {
	Planned: { bg: "#D2D2D2", color: "#5c5c5c", dot: "#8f8f8f" },
	"In progress": { bg: "#A6DFDD", color: "#0e5b5b", dot: "#178a88" },
	Testing: { bg: "#FFEDAF", color: "#8a6d1a", dot: "#d9b13a" },
	Live: { bg: "#e2f2e8", color: GREEN_TEXT, dot: GREEN_TEXT },
};

const typeMeta: Record<string, string> = {
	Announcement: "#17788a",
	Improvement: "#f5a623",
	Fix: "#2e9e5b",
	Removal: "#8a7f61",
	Experiment: "#7b61b9",
};

const newsStatusMeta: Record<string, { bg: string; color: string }> = {
	"Coming soon": { bg: "#efece1", color: "#7a7f88" },
	"Rolling out": { bg: "#e0eef1", color: TEAL_DK },
	"Now available": { bg: "#e2f2e8", color: GREEN_TEXT },
	"Rolled back": { bg: "#f7e4e0", color: "#b5482e" },
};

const sprintStatusMeta: Record<
	string,
	{ bg: string; color: string; dot: string }
> = {
	"To do": { bg: "#D2D2D2", color: "#5c5c5c", dot: "#8f8f8f" },
	"In progress": { bg: "#A6DFDD", color: "#0e5b5b", dot: "#178a88" },
	Testing: { bg: "#FFEDAF", color: "#8a6d1a", dot: "#d9b13a" },
	Done: { bg: "#e2f2e8", color: GREEN_TEXT, dot: GREEN_TEXT },
};

// Stepper stages and the current index for each status (matches the mockup).
const stepDefs = ["Planned", "In progress", "Testing", "Live"];
const statusIdx: Record<string, number> = {
	Planned: 0,
	"In progress": 1,
	"In Progress": 1,
	"Rolling out": 1,
	Testing: 2,
	Live: 3,
	Released: 3,
};

// Progress stepper: teal dots + connecting lines, followed by the stage label.
function ProgressDots({ status }: { status: string }) {
	const cur = statusIdx[status] ?? 0;
	const metaKey = stepDefs[cur] || "Planned";
	const meta = statusMeta[metaKey] || statusMeta["Planned"];

	return (
		<span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
			<span style={{ display: "inline-flex", alignItems: "center" }}>
				{stepDefs.map((_, i) => {
					const done = i < cur;
					const current = i === cur;
					const dot: React.CSSProperties = {
						flex: "none",
						width: 12,
						height: 12,
						borderRadius: "50%",
						boxSizing: "border-box",
						...(done
							? { background: TEAL }
							: current
								? { background: meta.dot }
								: { background: "#fff", border: "2px solid #d8d2c0" }),
						...(current ? { boxShadow: `0 0 0 3px ${meta.bg}` } : {}),
					};
					return (
						<span
							key={i}
							style={{ display: "inline-flex", alignItems: "center" }}
						>
							{i > 0 && (
								<span
									style={{
										width: 16,
										height: 2,
										flex: "none",
										background: cur >= i ? TEAL : "#e6ddc9",
										display: "inline-block",
									}}
								/>
							)}
							<span style={dot} />
						</span>
					);
				})}
			</span>
			<span
				style={{
					fontFamily: HEAD,
					fontWeight: 800,
					fontSize: 12,
					letterSpacing: ".3px",
					color: meta.color,
					background: meta.bg,
					padding: "4px 10px",
					borderRadius: 999,
				}}
			>
				{stepDefs[cur]}
			</span>
		</span>
	);
}

const groupNames = ["This week", "This month", "Earlier"];

// Page skin + link hover styles (scoped to the roadmap page, mockup-literal)
const injectStyles = () => (
	<style>{`
		.roadmap-container { font-family: 'Mulish', sans-serif; color: #2c2c2c; }
		.roadmap-container a { color: ${TEAL}; text-decoration: none; font-weight: 700; }
		.roadmap-container a:hover { color: ${NAVY}; text-decoration: underline; }
	`}</style>
);

const routeApi = getRouteApi("/product-roadmap");

// --- Shared inline-style helpers (facelift tokens) ---
const sectionHeading: React.CSSProperties = {
	fontFamily: "'Fugaz One', sans-serif",
	fontWeight: 400,
	fontSize: 26,
	color: NAVY,
	textTransform: "uppercase",
	letterSpacing: "-.3px",
};

const sectionLabel = (color: string): React.CSSProperties => ({
	fontFamily: HEAD,
	fontWeight: 800,
	fontSize: 13,
	letterSpacing: 1,
	textTransform: "uppercase",
	color,
	display: "flex",
	alignItems: "center",
	gap: 9,
});

const microLabel: React.CSSProperties = {
	fontFamily: HEAD,
	fontWeight: 800,
	fontSize: 11,
	letterSpacing: ".6px",
	textTransform: "uppercase",
	color: TEAL_LABEL,
};

const chip = (m: { bg: string; color: string }): React.CSSProperties => ({
	display: "inline-flex",
	alignItems: "center",
	gap: 7,
	padding: "5px 12px",
	borderRadius: 999,
	fontSize: 12.5,
	fontWeight: 700,
	whiteSpace: "nowrap",
	background: m.bg,
	color: m.color,
});

const dotStyle = (color: string): React.CSSProperties => ({
	width: 8,
	height: 8,
	borderRadius: "50%",
	background: color,
	flex: "none",
});

function formatSprintDates(startStr?: string, endStr?: string) {
	if (!startStr || !endStr) return "";
	const s = new Date(startStr);
	const e = new Date(endStr);
	const sDay = s.getDate().toString().padStart(2, "0");
	const eDay = e.getDate().toString().padStart(2, "0");
	const sMon = s.toLocaleString("en-GB", { month: "short" });
	const eMon = e.toLocaleString("en-GB", { month: "short" });
	const sYear = s.getFullYear();
	const eYear = e.getFullYear();
	if (sYear !== eYear) {
		return `${sDay} ${sMon} ${sYear} – ${eDay} ${eMon} ${eYear}`;
	} else if (sMon !== eMon) {
		return `${sDay} ${sMon} – ${eDay} ${eMon} ${eYear}`;
	} else {
		return `${sDay} – ${eDay} ${sMon} ${eYear}`;
	}
}

export default function ProductRoadmap() {
	const { data, isLoading, error } = useProductRoadmap();
	const navigate = useNavigate({ from: "/product-roadmap" });
	const { tab: urlTab } = routeApi.useSearch();
	const tab = (urlTab as Tab) || "roadmap";

	const setTab = (newTab: Tab) => {
		navigate({ search: { tab: newTab } });
	};

	const [openRelease, setOpenRelease] = useState<number | null>(null);
	const [openTask, setOpenTask] = useState<string | number | null>(null);

	const [fProducts, setFProducts] = useState<string[]>([]);
	const [fTypes, setFTypes] = useState<string[]>([]);
	const [fStatuses, setFStatuses] = useState<string[]>([]);

	// Sprint Table Search & Sort
	const [sprintTaskSearch, setSprintTaskSearch] = useState("");
	const [sprintStatusFilter, setSprintStatusFilter] = useState("");
	const [sprintFeatureFilter, setSprintFeatureFilter] = useState("");
	const [sprintAssigneeFilter, setSprintAssigneeFilter] = useState("");
	const [sprintSortCol, setSprintSortCol] = useState<
		"name" | "status" | "feature" | "assignee" | null
	>(null);
	const [sprintSortDir, setSprintSortDir] = useState<"asc" | "desc">("asc");

	// Backlog Table Search & Sort
	const [backlogTaskSearch, setBacklogTaskSearch] = useState("");
	const [backlogStatusFilter, setBacklogStatusFilter] = useState("");
	const [backlogFeatureFilter, setBacklogFeatureFilter] = useState("");
	const [backlogAssigneeFilter, setBacklogAssigneeFilter] = useState("");
	const [backlogSortCol, setBacklogSortCol] = useState<
		"name" | "status" | "feature" | "assignee" | null
	>(null);
	const [backlogSortDir, setBacklogSortDir] = useState<"asc" | "desc">("asc");

	const handleSprintSort = (
		col: "name" | "status" | "feature" | "assignee",
	) => {
		if (sprintSortCol === col) {
			if (sprintSortDir === "asc") {
				setSprintSortDir("desc");
			} else {
				setSprintSortCol(null);
				setSprintSortDir("asc");
			}
		} else {
			setSprintSortCol(col);
			setSprintSortDir("asc");
		}
	};

	const handleBacklogSort = (
		col: "name" | "status" | "feature" | "assignee",
	) => {
		if (backlogSortCol === col) {
			if (backlogSortDir === "asc") {
				setBacklogSortDir("desc");
			} else {
				setBacklogSortCol(null);
				setBacklogSortDir("asc");
			}
		} else {
			setBacklogSortCol(col);
			setBacklogSortDir("asc");
		}
	};

	// Product Filter Tabs (Cascade, ILM, Golden Dreams)
	type ProductTab = "Cascade" | "ILM" | "Golden Dreams";
	const [selectedProduct, setSelectedProduct] = useState<ProductTab>("Cascade");

	const matchesProduct = (
		t: ProductRoadmapSprintTask,
		prod: ProductTab,
	): boolean => {
		const key = String(t.jira_key || t.id || "").toUpperCase();
		const componentsList = (t.components || []).map((c) => c.toLowerCase());

		const hasCascadeComp = componentsList.some((c) => c.includes("cascade"));

		const hasILMComp =
			componentsList.some(
				(c) => c.includes("ilm") || c.includes("inclusive labour"),
			) || key.startsWith("ILM");

		const hasGDComp =
			componentsList.some(
				(c) => c.includes("golden dreams") || c.includes("gd"),
			) || key.startsWith("GD");

		if (prod === "Cascade") {
			// Must explicitly include Cascade in components or key
			return hasCascadeComp;
		}

		if (prod === "ILM") {
			// Must explicitly include ILM component/key and not be part of Cascade priority
			return hasILMComp && !hasCascadeComp;
		}

		if (prod === "Golden Dreams") {
			// Must explicitly include GD component/key and not be part of Cascade/ILM priority
			return hasGDComp && !hasCascadeComp && !hasILMComp;
		}

		return false;
	};

	const processTaskList = (
		tasks: ProductRoadmapSprintTask[],
		taskSearch: string,
		statusFilter: string,
		featureFilter: string,
		assigneeFilter: string,
		sortCol: "name" | "status" | "feature" | "assignee" | null,
		sortDir: "asc" | "desc",
	) => {
		return tasks
			.filter((t) => {
				if (!matchesProduct(t, selectedProduct)) return false;

				const matchName =
					!taskSearch ||
					t.name.toLowerCase().includes(taskSearch.toLowerCase()) ||
					(t.jira_key &&
						t.jira_key.toLowerCase().includes(taskSearch.toLowerCase())) ||
					(t.desc && t.desc.toLowerCase().includes(taskSearch.toLowerCase()));

				const matchStatus =
					!statusFilter ||
					(t.raw_status || t.status)
						.toLowerCase()
						.includes(statusFilter.toLowerCase());

				const matchFeature =
					!featureFilter ||
					(t.feature &&
						t.feature.toLowerCase().includes(featureFilter.toLowerCase()));

				const matchAssignee =
					!assigneeFilter ||
					(t.assignee &&
						t.assignee.toLowerCase().includes(assigneeFilter.toLowerCase()));

				return matchName && matchStatus && matchFeature && matchAssignee;
			})
			.sort((a, b) => {
				if (!sortCol) return 0;
				let valA = "";
				let valB = "";
				if (sortCol === "name") {
					valA = a.name;
					valB = b.name;
				} else if (sortCol === "status") {
					valA = a.raw_status || a.status;
					valB = b.raw_status || b.status;
				} else if (sortCol === "feature") {
					valA = a.feature || "";
					valB = b.feature || "";
				} else if (sortCol === "assignee") {
					valA = a.assignee || "";
					valB = b.assignee || "";
				}
				const cmp = valA.localeCompare(valB, undefined, {
					numeric: true,
					sensitivity: "base",
				});
				return sortDir === "asc" ? cmp : -cmp;
			});
	};

	const toggleRelease = (id: number) => {
		setOpenRelease((s) => (s === id ? null : id));
	};

	const toggleTask = (id: string | number) => {
		setOpenTask((s) => (s === id ? null : id));
	};

	const toggleFilter = (kind: FilterKind, val: string) => {
		if (kind === "fProducts") {
			setFProducts((cur) =>
				cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val],
			);
		} else if (kind === "fTypes") {
			setFTypes((cur) =>
				cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val],
			);
		} else if (kind === "fStatuses") {
			setFStatuses((cur) =>
				cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val],
			);
		}
	};

	const resetFilters = () => {
		setFProducts([]);
		setFTypes([]);
		setFStatuses([]);
	};

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return null;
		if (dateStr.includes("-")) {
			try {
				const d = new Date(dateStr);
				return new Intl.DateTimeFormat("en-GB", {
					day: "numeric",
					month: "short",
					year: "numeric",
				}).format(d);
			} catch {
				return dateStr;
			}
		}
		return dateStr;
	};

	const releases = data?.releases || [];

	// --- Release Timeline milestones (sorted by date, TBC last) ---
	const milestonesData = [...releases]
		.sort((a, b) => {
			const da = a.when ? new Date(a.when).getTime() : Infinity;
			const db = b.when ? new Date(b.when).getTime() : Infinity;
			return da - db;
		})
		.map((r) => ({
			name: r.name,
			when: formatDate(r.when),
			state: r.state,
			raw: r.when,
		}));

	const n = milestonesData.length;
	const milestones = milestonesData.map((m, i) => {
		const isReleased = m.state === "released";
		const isComingSoon = m.state === "upcoming";
		const bgColor = isReleased ? GREEN : "#fff";
		const borderColor = isReleased ? GREEN : isComingSoon ? TEAL : TRACK;
		// Evenly spaced across the track (matches the imported design).
		const leftPct = 5 + ((i + 0.5) / Math.max(n, 1)) * 90;
		return {
			name: m.name,
			when: m.when || "COMING SOON",
			isReleased,
			bgColor,
			borderColor,
			whenColor: isReleased ? GREEN_TEXT : isComingSoon ? TEAL_DK : TRACK,
			leftPct,
		};
	});

	// --- TODAY marker: interpolate the current date across the dated milestones ---
	const times = milestonesData.map((m) =>
		m.raw ? new Date(m.raw).getTime() : null,
	);
	const showToday = times.some((t) => t !== null);
	const nowTs = Date.now();
	let todayFrac = 0;
	for (let i = 0; i < n; i++) {
		const t = times[i];
		if (t === null) {
			// Reached the undated (TBC) tail — sit just before the first one.
			todayFrac = Math.max(i - 0.5, 0);
			break;
		}
		if (nowTs < t) {
			if (i === 0) {
				todayFrac = 0;
			} else {
				const prev = times[i - 1] as number;
				todayFrac = i - 1 + (nowTs - prev) / (t - prev);
			}
			break;
		}
		todayFrac = i;
		if (i === n - 1) break;
	}
	todayFrac = Math.min(Math.max(todayFrac, 0), Math.max(n - 1, 0));
	const todayLeft = `${5 + ((todayFrac + 0.5) / Math.max(n, 1)) * 90}%`;

	const decorateUpcomingFeature = (f: any) => {
		const m = statusMeta[f.status || "Planned"] || statusMeta["Planned"];
		const collab = (f.collaborators || []).map((c: any) => ({
			label: c.note ? `${c.team} · ${c.note}` : c.team,
		}));
		const formattedDate = formatDate(f.date);
		return {
			name: f.name,
			desc: f.desc,
			status: f.status || "Planned",
			statusStyle: m,
			expectedDate: formattedDate || "Date TBC",
			hasInfo: !!f.info_url,
			infoUrl: f.info_url || "#",
			collaborators: collab,
			hasCollab: collab.length > 0,
			independent: collab.length === 0,
		};
	};

	const mkCard = (r: ProductRoadmapRelease) => {
		const isOpen = openRelease === r.id;
		const feats = r.features || [];
		const formattedWhen = formatDate(r.when);
		const base: any = {
			id: r.id,
			name: r.name,
			summary: r.summary,
			open: isOpen,
			featLabel: feats.length + (feats.length === 1 ? " feature" : " features"),
		};
		if (r.state === "upcoming" || r.state === "tbc") {
			const expandable = !!r.when;
			base.badge = r.state === "upcoming" ? "Rolling out" : "Coming soon";
			base.dateDisplay = formattedWhen || "TBC";
			base.features = feats.map(decorateUpcomingFeature);
			base.expandable = expandable;
		} else {
			base.badge = `Released ${formattedWhen || "TBC"}`;
			base.features = feats.map((f) => ({ name: f.name, desc: f.desc }));
		}
		return base;
	};

	const upcomingReleases = releases
		.filter((r) => r.state === "upcoming" || r.state === "tbc")
		.map(mkCard);
	// Most-recently released first.
	const releasedReleases = releases
		.filter((r) => r.state === "released")
		.sort((a, b) => {
			const da = a.when ? new Date(a.when).getTime() : 0;
			const db = b.when ? new Date(b.when).getTime() : 0;
			return db - da;
		})
		.map(mkCard);

	// --- Derived Data for What's New ---
	const passes = (nt: ProductRoadmapNote) =>
		(fProducts.length === 0 ||
			(nt.products || []).some((p) => fProducts.includes(p))) &&
		(fTypes.length === 0 || (nt.type && fTypes.includes(nt.type))) &&
		(fStatuses.length === 0 || (nt.status && fStatuses.includes(nt.status)));

	const decorateNote = (nt: ProductRoadmapNote) => {
		const sm = newsStatusMeta[nt.status || ""];
		return {
			...nt,
			productsLabel: (nt.products || []).join("  ·  "),
			typeDot: typeMeta[nt.type || ""] || typeMeta["Announcement"],
			statusUpper: (nt.status || "").toUpperCase(),
			statusMeta: sm,
		};
	};

	const notes = data?.notes || [];
	const visible = notes.filter(passes);
	const highlights = visible.filter((nt) => nt.featured).map(decorateNote);
	const rest = visible.filter((nt) => !nt.featured);

	const handleNoteClick = (c: any, e: React.MouseEvent) => {
		if (c.url) return; // allow normal navigation
		if (c.products && c.products.length > 0) {
			e.preventDefault();
			const targetProductName = c.products[0];
			const matchedRelease = releases.find((r) => r.name === targetProductName);
			if (matchedRelease) {
				setTab("roadmap");
				setOpenRelease(matchedRelease.id);
				setTimeout(() => {
					const el = document.getElementById(
						`release-card-${matchedRelease.id}`,
					);
					if (el) {
						el.scrollIntoView({ behavior: "smooth", block: "start" });
					} else {
						window.scrollTo({ top: 0, behavior: "smooth" });
					}
				}, 100);
			}
		}
	};

	const feedGroups = groupNames.map((g) => {
		const cards = rest.filter((nt) => nt.group === g).map(decorateNote);
		return { title: g, cards, has: cards.length > 0 };
	});

	const dynamicProductList = Array.from(
		new Set(releases.map((r) => r.name)),
	).sort();
	const dynamicTypeList = (data?.types || []).map((t) => t.name);
	const dynamicStatusList = (data?.statuses || []).map((s) => s.name);

	const filterGroups = [
		{
			title: "User experience",
			kind: "fProducts" as const,
			items: dynamicProductList,
		},
		{
			title: "Type of update",
			kind: "fTypes" as const,
			items: dynamicTypeList,
		},
		{ title: "Status", kind: "fStatuses" as const, items: dynamicStatusList },
	];

	// --- Tab button styles ---
	const tabBase: React.CSSProperties = {
		fontFamily: "'Mulish', sans-serif",
		textAlign: "left",
		padding: "11px 26px",
		borderRadius: "11px",
		cursor: "pointer",
		border: "none",
		lineHeight: "1.1",
		color: "#5a6b70",
		background: "transparent",
	};

	const tabActive: React.CSSProperties = {
		...tabBase,
		background: "#a6dbdb",
		color: NAVY,
	};

	const roadTabStyle = tab === "roadmap" ? tabActive : tabBase;
	const newsTabStyle = tab === "news" ? tabActive : tabBase;
	const sprintTabStyle = tab === "sprint" ? tabActive : tabBase;

	const tabTitle: React.CSSProperties = {
		display: "block",
		fontFamily: HEAD,
		fontWeight: 800,
		fontSize: 16,
	};
	const tabSub: React.CSSProperties = {
		display: "block",
		fontSize: 12,
		fontWeight: 600,
		opacity: 0.8,
		marginTop: 2,
	};

	// Mockup-literal page title (Fugaz One 64px, navy, uppercase).
	const pageTitle = (
		<h1
			className="heading-display"
			style={{
				fontFamily: "'Fugaz One', sans-serif",
				fontWeight: 400,
				textTransform: "uppercase",
				fontSize: 64,
				lineHeight: 1,
				letterSpacing: "-1px",
				color: NAVY,
				margin: "26px 0 14px",
			}}
		>
			Product Roadmap
		</h1>
	);

	if (isLoading) {
		return (
			<PageContainer className="roadmap-container">
				{injectStyles()}
				{pageTitle}
				<p style={{ maxWidth: 780, fontSize: 16.5, color: "#55625f" }}>
					Loading product roadmap...
				</p>
			</PageContainer>
		);
	}

	if (error) {
		return (
			<PageContainer className="roadmap-container">
				{injectStyles()}
				{pageTitle}
				<p style={{ maxWidth: 780, fontSize: 16.5, color: "#55625f" }}>
					Failed to load product roadmap.
				</p>
			</PageContainer>
		);
	}

	return (
		<PageContainer className="roadmap-container">
			{injectStyles()}

			{pageTitle}
			<p
				style={{
					maxWidth: 780,
					fontSize: 16.5,
					lineHeight: 1.6,
					color: "#55625f",
					margin: "0 0 8px",
				}}
			>
				One shared place to see what the team has shipped, what's coming next,
				and what's just changed in CASCADE — so everyone stays in the loop, no
				matter how technical.
			</p>
			<p
				style={{
					fontSize: 13,
					color: TEAL_LABEL,
					fontWeight: 700,
					margin: "0 0 24px",
				}}
			>
				{[
					data?.meta?.last_updated
						? `Last updated ${formatDate(data.meta.last_updated)}`
						: null,
					data?.meta?.covering_since
						? `Covering ${data.meta.covering_since} onwards`
						: null,
				]
					.filter(Boolean)
					.join(" · ")}
			</p>

			<div
				style={{
					display: "inline-flex",
					gap: 8,
					background: "#fff",
					border: `1px solid ${BORDER}`,
					borderRadius: 16,
					padding: 7,
					marginBottom: 34,
				}}
			>
				<button onClick={() => setTab("roadmap")} style={roadTabStyle}>
					<span style={tabTitle}>Roadmap</span>
					<span style={tabSub}>What's coming &amp; when</span>
				</button>
				<button onClick={() => setTab("news")} style={newsTabStyle}>
					<span style={tabTitle}>What's New</span>
					<span style={tabSub}>Recent changes &amp; releases</span>
				</button>
				<button onClick={() => setTab("sprint")} style={sprintTabStyle}>
					<span style={tabTitle}>Sprint Updates</span>
					<span style={tabSub}>What the tech team is building now</span>
				</button>
			</div>

			{tab === "roadmap" && (
				<div>
					<div
						style={{
							background: "#eef6f6",
							border: "1px solid #cfe6e6",
							borderRadius: 12,
							padding: "15px 20px",
							marginBottom: 30,
							display: "flex",
							alignItems: "flex-start",
							gap: 12,
							maxWidth: 920,
						}}
					>
						<svg
							fill="none"
							height="22"
							stroke={TEAL}
							strokeWidth="2"
							style={{ flex: "none", marginTop: 1 }}
							viewBox="0 0 24 24"
							width="22"
						>
							<circle cx="12" cy="12" r="9" />
							<path d="M12 11v5" strokeLinecap="round" />
							<circle cx="12" cy="7.6" fill={TEAL} r="1" stroke="none" />
						</svg>
						<p
							style={{
								margin: 0,
								fontSize: 14.5,
								lineHeight: 1.55,
								color: "#3a5054",
							}}
						>
							Each <b>release</b> brings a new part of CASCADE to a group of
							users. Released items list what shipped; <b>upcoming</b> ones show
							target dates, the teams we're collaborating with, and links to
							more detail.
						</p>
					</div>

					<h2 className="mb-1" style={sectionHeading}>
						Release Timeline
					</h2>
					<p className="mb-4">The order our user experiences go live.</p>

					<div
						style={{
							background: "#fff",
							border: `1px solid ${BORDER}`,
							borderRadius: 16,
							padding: "34px 30px 26px",
							marginBottom: 20,
						}}
					>
						<div style={{ position: "relative", height: 176 }}>
							<div
								style={{
									position: "absolute",
									left: "5%",
									right: "5%",
									top: 98,
									height: 4,
									borderRadius: 2,
									background: TRACK,
								}}
							/>
							{showToday && (
								<>
									<div
										style={{
											position: "absolute",
											top: 26,
											bottom: 43,
											left: todayLeft,
											width: 0,
											borderLeft: `2px solid ${CORAL}`,
										}}
									/>
									<div
										style={{
											position: "absolute",
											top: 9,
											left: todayLeft,
											transform: "translateX(-50%)",
											background: "#FB837926",
											color: CORAL,
											fontSize: 11,
											fontWeight: 800,
											fontFamily: HEAD,
											padding: "2px 8px",
											borderRadius: 6,
											whiteSpace: "nowrap",
										}}
									>
										TODAY
									</div>
								</>
							)}
							{milestones.map((m, i) => (
								<div
									key={i}
									style={{
										position: "absolute",
										left: `${m.leftPct}%`,
										top: 0,
										bottom: 0,
										width: 0,
									}}
								>
									<div
										style={{
											position: "absolute",
											bottom: 96,
											left: "50%",
											transform: "translateX(-50%)",
											width: 172,
											textAlign: "center",
											fontFamily: HEAD,
											fontWeight: 800,
											fontSize: 14.5,
											color: NAVY,
											lineHeight: 1.2,
										}}
									>
										{m.name}
									</div>
									<div
										style={{
											position: "absolute",
											top: 90,
											left: "50%",
											transform: "translateX(-50%)",
											width: 20,
											height: 20,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											background: m.bgColor,
											border: `3px solid ${m.borderColor}`,
											boxShadow: m.isReleased ? "0 0 0 1px #cfe6d6" : undefined,
											zIndex: 2,
										}}
									>
										{m.isReleased && (
											<svg
												fill="none"
												height="12"
												stroke="#fff"
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="3.5"
												viewBox="0 0 24 24"
												width="12"
											>
												<path d="M20 6 9 17l-5-5" />
											</svg>
										)}
									</div>
									<div
										style={{
											position: "absolute",
											top: 126,
											left: "50%",
											transform: "translateX(-50%)",
											width: 150,
											textAlign: "center",
											fontFamily: HEAD,
											fontWeight: 700,
											fontSize: 12,
											letterSpacing: ".4px",
											color: m.whenColor,
											textTransform: "uppercase",
										}}
									>
										{m.when}
									</div>
								</div>
							))}
						</div>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 20,
							flexWrap: "wrap",
							fontSize: 12.5,
							fontWeight: 700,
							color: BODY,
							marginBottom: 44,
						}}
					>
						<span
							style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
						>
							<span
								style={{
									width: 13,
									height: 13,
									borderRadius: "50%",
									background: GREEN,
								}}
							/>{" "}
							Released
						</span>
						<span
							style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
						>
							<span
								style={{
									width: 13,
									height: 13,
									borderRadius: "50%",
									background: "#fff",
									border: `3px solid ${TEAL}`,
								}}
							/>{" "}
							Coming soon
						</span>
						<span
							style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
						>
							<span
								style={{
									width: 13,
									height: 13,
									borderRadius: "50%",
									background: "#fff",
									border: `3px solid ${TRACK}`,
								}}
							/>{" "}
							Date to be confirmed
						</span>
					</div>

					<h2 className="mb-4" style={sectionHeading}>
						Releases &amp; Features
					</h2>

					<div style={{ ...sectionLabel(TEAL_LABEL), margin: "0 0 14px" }}>
						<svg
							fill="none"
							height="16"
							stroke={TEAL_LABEL}
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2.4"
							viewBox="0 0 24 24"
							width="16"
						>
							<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4" />
						</svg>
						Coming up
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 16,
							marginBottom: 44,
						}}
					>
						{upcomingReleases.map((r) => (
							<div
								id={`release-card-${r.id}`}
								key={r.id}
								style={{
									background: "#fff",
									border: `1px solid ${BORDER}`,
									borderRadius: 16,
									overflow: "hidden",
									...(r.expandable ? {} : { opacity: 0.55 }),
								}}
							>
								<div
									onClick={r.expandable ? () => toggleRelease(r.id) : undefined}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 20,
										padding: "22px 26px",
										cursor: r.expandable ? "pointer" : "default",
									}}
								>
									<div style={{ minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 10,
												flexWrap: "wrap",
											}}
										>
											<span
												style={{
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 20,
													color: NAVY,
												}}
											>
												{r.name}
											</span>
											<span
												style={{
													display: "inline-flex",
													alignItems: "center",
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 11,
													letterSpacing: ".4px",
													background:
														r.badge === "Rolling out" ? "#e0eef1" : "#efece1",
													color:
														r.badge === "Rolling out" ? TEAL_DK : "#7a7f88",
													padding: "4px 10px",
													borderRadius: 999,
												}}
											>
												{r.badge}
											</span>
										</div>
										<p
											style={{
												margin: "8px 0 0",
												maxWidth: 760,
												fontSize: 14.5,
												lineHeight: 1.5,
												color: "#55625f",
											}}
										>
											{r.summary}
										</p>
									</div>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: 22,
											flex: "none",
										}}
									>
										<div style={{ textAlign: "right" }}>
											<div
												style={{
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 10,
													letterSpacing: ".6px",
													textTransform: "uppercase",
													color: TEAL_LABEL,
												}}
											>
												Target
											</div>
											<div
												style={{
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 16,
													color: NAVY,
													marginTop: 2,
												}}
											>
												{r.dateDisplay}
											</div>
										</div>
										{r.expandable && (
											<span
												style={{
													display: "inline-block",
													color: "#9a927c",
													fontSize: 16,
													transition: "transform .15s",
													transform: r.open ? "rotate(180deg)" : "none",
												}}
											>
												▾
											</span>
										)}
									</div>
								</div>
								{r.open && (
									<div
										style={{
											background: "#fff",
											borderTop: `1px solid ${BORDER}`,
											padding: "6px 26px 24px",
										}}
									>
										<div style={{ ...microLabel, padding: "16px 0 4px" }}>
											{r.featLabel}
										</div>
										{r.features.map((f: any, i: number) => (
											<div
												key={i}
												style={{
													border: "1px solid #C5C5C5",
													borderRadius: 12,
													padding: "20px 22px",
													marginTop: 14,
													background: "#fff",
												}}
											>
												<div
													style={{
														display: "flex",
														alignItems: "flex-start",
														justifyContent: "space-between",
														gap: 16,
														flexWrap: "wrap",
													}}
												>
													<div
														style={{
															minWidth: 0,
															display: "flex",
															alignItems: "center",
															gap: 14,
															flexWrap: "wrap",
														}}
													>
														<span
															style={{
																fontWeight: 700,
																fontSize: 16,
																color: INK,
																fontFamily: HEAD,
															}}
														>
															{f.name}
														</span>
														<ProgressDots status={f.status} />
													</div>
													{f.status === "Live" ? (
														<div
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: 6,
																fontSize: 12.5,
																fontWeight: 700,
																color: GREEN_TEXT,
																background: "#e2f2e8",
																borderRadius: 99,
																padding: "3px 10px",
																whiteSpace: "nowrap",
															}}
														>
															<span
																style={{
																	width: 7,
																	height: 7,
																	borderRadius: "50%",
																	background: GREEN_TEXT,
																	flex: "none",
																}}
															/>
															Live
														</div>
													) : (
														<div
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: 7,
																fontSize: 12.5,
																fontWeight: 700,
																color: TEAL_LABEL,
																whiteSpace: "nowrap",
															}}
														>
															<svg
																fill="none"
																height="14"
																stroke="#004A60"
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth="2"
																viewBox="0 0 24 24"
																width="14"
															>
																<rect
																	height="18"
																	rx="2"
																	width="18"
																	x="3"
																	y="4"
																/>
																<path d="M16 2v4M8 2v4M3 10h18" />
															</svg>
															Target: {f.expectedDate}
														</div>
													)}
												</div>
												<p
													style={{
														margin: "8px 0 0",
														maxWidth: 820,
														fontSize: 14,
														lineHeight: 1.6,
														color: BODY,
													}}
												>
													{f.desc}
												</p>
												<div
													style={{
														display: "flex",
														flexWrap: "wrap",
														alignItems: "center",
														gap: 18,
														marginTop: 16,
														paddingTop: 15,
														borderTop: "1px solid #f2ebda",
													}}
												>
													{f.hasCollab && (
														<div
															style={{
																display: "flex",
																alignItems: "center",
																gap: 9,
																flexWrap: "wrap",
															}}
														>
															<span
																style={{
																	...microLabel,
																	display: "flex",
																	alignItems: "center",
																	gap: 6,
																	color: "#FB8379",
																}}
															>
																<svg
																	fill="none"
																	height="14"
																	stroke="#FB8379"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth="2"
																	viewBox="0 0 24 24"
																	width="14"
																>
																	<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
																	<circle cx="9" cy="7" r="4" />
																	<path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
																</svg>
																Waiting on
															</span>
															{f.collaborators.map((c: any, j: number) => (
																<span
																	key={j}
																	style={{
																		background: "#FFEDAF99",
																		border: "1px solid #FDDA61",
																		borderLeft: "3px solid #FDDA61",
																		color: "#3a4744",
																		fontWeight: 700,
																		fontSize: 12.5,
																		padding: "5px 11px",
																		borderRadius: 7,
																	}}
																>
																	{c.label}
																</span>
															))}
														</div>
													)}
													{f.independent && (
														<span
															style={{
																fontSize: 13,
																color: "#9a927c",
																fontWeight: 700,
																fontStyle: "italic",
															}}
														>
															No collaboration blockers
														</span>
													)}
													{f.hasInfo && (
														<a
															href={f.infoUrl}
															rel="noopener noreferrer"
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: 6,
																fontSize: 13.5,
															}}
															target="_blank"
														>
															<svg
																fill="none"
																height="14"
																stroke={TEAL}
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth="2.2"
																viewBox="0 0 24 24"
																width="14"
															>
																<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
																<path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
															</svg>
															More info ↗
														</a>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>

					<div style={{ ...sectionLabel(GREEN_TEXT), margin: "0 0 14px" }}>
						<svg
							fill="none"
							height="16"
							stroke={GREEN}
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2.4"
							viewBox="0 0 24 24"
							width="16"
						>
							<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
							<path d="m9 11 3 3L22 4" />
						</svg>
						Already released
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						{releasedReleases.map((r) => (
							<div
								id={`release-card-${r.id}`}
								key={r.id}
								style={{
									background: "#fbfaf4",
									border: `1px solid ${BORDER}`,
									borderRadius: 16,
									overflow: "hidden",
								}}
							>
								<div
									onClick={() => toggleRelease(r.id)}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 20,
										padding: "20px 26px",
										cursor: "pointer",
									}}
								>
									<div style={{ minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 10,
												flexWrap: "wrap",
											}}
										>
											<span
												style={{
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 19,
													color: "#004A60",
												}}
											>
												{r.name}
											</span>
											<span
												style={{
													display: "inline-flex",
													alignItems: "center",
													gap: 6,
													background: "#2D9E5B33",
													color: GREEN,
													fontFamily: HEAD,
													fontWeight: 800,
													fontSize: 11,
													letterSpacing: ".4px",
													padding: "4px 10px",
													borderRadius: 999,
												}}
											>
												<svg
													fill="none"
													height="12"
													stroke={GREEN}
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="3"
													viewBox="0 0 24 24"
													width="12"
												>
													<path d="M20 6 9 17l-5-5" />
												</svg>
												{r.badge}
											</span>
										</div>
										<p
											style={{
												margin: "7px 0 0",
												maxWidth: 760,
												fontSize: 14,
												lineHeight: 1.5,
												color: "#6a756f",
											}}
										>
											{r.summary}
										</p>
									</div>
									<span
										style={{
											display: "inline-block",
											color: "#9a927c",
											fontSize: 16,
											transition: "transform .15s",
											transform: r.open ? "rotate(180deg)" : "none",
										}}
									>
										▾
									</span>
								</div>
								{r.open && (
									<div
										style={{
											background: "#fff",
											borderTop: `1px solid ${BORDER}`,
											padding: "6px 26px 22px",
										}}
									>
										<div style={{ ...microLabel, padding: "16px 0 4px" }}>
											{r.featLabel}
										</div>
										{r.features.map((f: any, i: number) => (
											<div
												key={i}
												style={{
													padding: "15px 0",
													borderTop: "1px solid #f0e9d6",
												}}
											>
												<div
													style={{
														fontWeight: 700,
														fontSize: 15.5,
														color: INK,
													}}
												>
													{f.name}
												</div>
												<p
													style={{
														margin: "5px 0 0",
														maxWidth: 820,
														fontSize: 14,
														lineHeight: 1.55,
														color: "#55625f",
													}}
												>
													{f.desc}
												</p>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{tab === "news" && (
				<div>
					<div
						style={{
							background: "#eef6f6",
							border: "1px solid #cfe6e6",
							borderRadius: 12,
							padding: "15px 20px",
							marginBottom: 30,
							display: "flex",
							alignItems: "flex-start",
							gap: 12,
							maxWidth: 920,
						}}
					>
						<svg
							fill="none"
							height="22"
							stroke={TEAL}
							strokeWidth="2"
							style={{ flex: "none", marginTop: 1 }}
							viewBox="0 0 24 24"
							width="22"
						>
							<path d="M11 5 6 9H2v6h4l5 4V5Z" />
							<path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
						</svg>
						<p
							style={{
								margin: 0,
								fontSize: 14.5,
								lineHeight: 1.55,
								color: "#3a5054",
							}}
						>
							A running list of changes to CASCADE — what's just gone live,
							what's <b>coming soon</b>, and anything we've <b>rolled back</b>.
							Use the filters to narrow by user experience or type of update.
						</p>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "230px 1fr",
							gap: 40,
							alignItems: "start",
						}}
					>
						<aside style={{ position: "sticky", top: 20 }}>
							<div
								style={{
									display: "flex",
									alignItems: "baseline",
									gap: 14,
									marginBottom: 4,
								}}
							>
								<span
									style={{
										fontFamily: HEAD,
										fontWeight: 800,
										fontSize: 18,
										color: NAVY,
									}}
								>
									Filters
								</span>
								<span
									onClick={resetFilters}
									style={{
										cursor: "pointer",
										fontSize: 13.5,
										color: TEAL,
										fontWeight: 700,
									}}
								>
									Reset
								</span>
							</div>
							{filterGroups.map((g, i) => (
								<div key={i} style={{ marginTop: 24 }}>
									<div
										style={{
											fontFamily: HEAD,
											fontWeight: 800,
											fontSize: 12,
											letterSpacing: ".7px",
											textTransform: "uppercase",
											color: TEAL_LABEL,
											marginBottom: 12,
										}}
									>
										{g.title}
									</div>
									{g.items.map((label, j) => {
										let checked = false;
										if (g.kind === "fProducts")
											checked = fProducts.includes(label);
										if (g.kind === "fTypes") checked = fTypes.includes(label);
										if (g.kind === "fStatuses")
											checked = fStatuses.includes(label);
										return (
											<label
												key={j}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 10,
													padding: "5px 0",
													cursor: "pointer",
													fontSize: 14.5,
													color: "#3a4744",
													fontWeight: 600,
												}}
											>
												<input
													checked={checked}
													onChange={() => toggleFilter(g.kind, label)}
													style={{ display: "none" }}
													type="checkbox"
												/>
												<span
													style={{
														width: 18,
														height: 18,
														borderRadius: 5,
														flex: "none",
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														fontSize: 12,
														color: "#fff",
														fontWeight: 900,
														border: `2px solid ${checked ? TEAL : TAN}`,
														background: checked ? TEAL : "#fff",
													}}
												>
													{checked ? "✓" : ""}
												</span>
												{label}
											</label>
										);
									})}
								</div>
							))}
						</aside>

						<div>
							{highlights.length > 0 && (
								<>
									<h2
										style={{
											...sectionHeading,
											fontSize: 22,
											letterSpacing: "-.2px",
											margin: "0 0 14px",
										}}
									>
										Highlights
									</h2>
									<div
										style={{
											background: "#eef6f6",
											border: "1px solid #cfe6e6",
											borderRadius: 16,
											padding: 14,
											marginBottom: 40,
											display: "flex",
											flexDirection: "column",
											gap: 14,
										}}
									>
										{highlights.map((c) => (
											<div
												key={c.id}
												style={{
													background: "#fff",
													border: "1px solid #e2ecec",
													borderRadius: 12,
													padding: "22px 26px",
												}}
											>
												<div
													style={{
														fontFamily: HEAD,
														fontWeight: 800,
														fontSize: 12,
														letterSpacing: ".5px",
														textTransform: "uppercase",
														color: CORAL,
														marginBottom: 8,
													}}
												>
													{c.productsLabel}
												</div>
												<a
													href={c.url || "#"}
													onClick={(e) => handleNoteClick(c, e)}
													style={{
														fontSize: 19,
														fontFamily: HEAD,
														fontWeight: 700,
														color: TEAL,
													}}
												>
													{c.title}
												</a>
												<p
													style={{
														margin: "10px 0 16px",
														maxWidth: 820,
														fontSize: 14.5,
														lineHeight: 1.6,
														color: "#4a5a5f",
													}}
												>
													{c.desc}
												</p>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: 14,
													}}
												>
													<span
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: 7,
															fontSize: 13,
															fontWeight: 700,
															color: BODY,
														}}
													>
														<span style={dotStyle(c.typeDot)} />
														{c.type}
													</span>
													{c.statusMeta && (
														<span
															style={{
																display: "inline-flex",
																alignItems: "center",
																padding: "4px 11px",
																borderRadius: 6,
																fontFamily: HEAD,
																fontSize: 11,
																fontWeight: 800,
																letterSpacing: ".5px",
																background: c.statusMeta.bg,
																color: c.statusMeta.color,
															}}
														>
															{c.statusUpper}
														</span>
													)}
												</div>
											</div>
										))}
									</div>
								</>
							)}

							<h2
								style={{
									...sectionHeading,
									fontSize: 22,
									letterSpacing: "-.2px",
									margin: "0 0 4px",
								}}
							>
								All Updates
							</h2>
							<p
								style={{
									fontWeight: 700,
									color: CAPTION,
									margin: "0 0 20px",
								}}
							>
								{visible.length} updates match your filters
							</p>

							{feedGroups.map((grp, i) =>
								grp.has ? (
									<div key={i}>
										<div
											style={{
												fontFamily: HEAD,
												fontWeight: 800,
												fontSize: 12,
												letterSpacing: 1,
												textTransform: "uppercase",
												color: TEAL_LABEL,
												margin: "26px 0 12px",
											}}
										>
											{grp.title}
										</div>
										<div
											style={{
												display: "flex",
												flexDirection: "column",
												gap: 14,
											}}
										>
											{grp.cards.map((c) => (
												<div
													key={c.id}
													style={{
														background: "#fff",
														border: `1px solid ${BORDER}`,
														borderRadius: 14,
														padding: "22px 26px",
													}}
												>
													<div
														style={{
															fontFamily: HEAD,
															fontWeight: 800,
															fontSize: 12,
															letterSpacing: ".5px",
															textTransform: "uppercase",
															color: CORAL,
															marginBottom: 8,
														}}
													>
														{c.productsLabel}
													</div>
													<a
														href={c.url || "#"}
														onClick={(e) => handleNoteClick(c, e)}
														style={{
															fontSize: 18,
															fontFamily: HEAD,
															fontWeight: 700,
															color: TEAL,
														}}
													>
														{c.title}
													</a>
													<p
														style={{
															margin: "10px 0 16px",
															maxWidth: 820,
															fontSize: 14.5,
															lineHeight: 1.6,
															color: "#4a5a5f",
														}}
													>
														{c.desc}
													</p>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 14,
														}}
													>
														<span
															style={{
																display: "inline-flex",
																alignItems: "center",
																gap: 7,
																fontSize: 13,
																fontWeight: 700,
																color: BODY,
															}}
														>
															<span style={dotStyle(c.typeDot)} />
															{c.type}
														</span>
														{c.statusMeta && (
															<span
																style={{
																	display: "inline-flex",
																	alignItems: "center",
																	padding: "4px 11px",
																	borderRadius: 6,
																	fontFamily: HEAD,
																	fontSize: 11,
																	fontWeight: 800,
																	letterSpacing: ".5px",
																	background: c.statusMeta.bg,
																	color: c.statusMeta.color,
																}}
															>
																{c.statusUpper}
															</span>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								) : null,
							)}

							{visible.length === 0 && (
								<div
									style={{
										background: "#fff",
										border: "1px dashed #d8cfb6",
										borderRadius: 14,
										padding: 44,
										textAlign: "center",
										color: CAPTION,
										fontWeight: 700,
									}}
								>
									No updates match the selected filters.{" "}
									<span
										onClick={resetFilters}
										style={{
											cursor: "pointer",
											color: TEAL,
											textDecoration: "underline",
										}}
									>
										Reset filters
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{tab === "sprint" && (
				<div>
					<div
						style={{
							background: "#eef6f6",
							border: "1px solid #cfe6e6",
							borderRadius: 12,
							padding: "15px 20px",
							marginBottom: 30,
							display: "flex",
							alignItems: "flex-start",
							gap: 12,
							maxWidth: 920,
						}}
					>
						<svg
							fill="none"
							height="22"
							stroke={TEAL}
							strokeWidth="2"
							style={{ flex: "none", marginTop: 1 }}
							viewBox="0 0 24 24"
							width="22"
						>
							<rect height="18" rx="2" width="18" x="3" y="4" />
							<path d="M16 2v4M8 2v4M3 10h18" />
						</svg>
						<p
							style={{
								margin: 0,
								fontSize: 14.5,
								lineHeight: 1.55,
								color: "#3a5054",
							}}
						>
							What the tech team is working on <b>right now</b>, and what's next
							in the queue. Maintained by the tech team so everyone can see
							status at a glance without needing access to the dev tracker.
						</p>
					</div>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: 16,
							marginBottom: 16,
						}}
					>
						<div>
							<h2
								className="mb-1"
								style={{ ...sectionHeading, color: TEAL_LABEL, margin: 0 }}
							>
								Current Sprint
							</h2>
							<p style={{ margin: "4px 0 0", fontSize: 14, color: BODY }}>
								{data?.activeSprint
									? data.activeSprint.start_date && data.activeSprint.end_date
										? `${data.activeSprint.name} · ${formatSprintDates(data.activeSprint.start_date, data.activeSprint.end_date)}`
										: data.activeSprint.name
									: "Active Sprint"}
							</p>
						</div>

						{/* Product Switch Tabs beside Current Sprint title */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								background: "#fbfaf4",
								border: `1px solid ${BORDER}`,
								borderRadius: 14,
								padding: "6px 12px",
							}}
						>
							<span
								style={{
									fontFamily: HEAD,
									fontWeight: 800,
									fontSize: 11,
									letterSpacing: ".6px",
									textTransform: "uppercase",
									color: TEAL_LABEL,
									marginRight: 4,
								}}
							>
								Product:
							</span>
							{(["Cascade", "ILM", "Golden Dreams"] as const).map((p) => {
								const active = selectedProduct === p;
								return (
									<button
										key={p}
										onClick={() => setSelectedProduct(p)}
										style={{
											padding: "5px 14px",
											borderRadius: 20,
											fontSize: 12.5,
											fontFamily: HEAD,
											fontWeight: 700,
											border: active
												? `2px solid ${TEAL}`
												: "1px solid #d2d2d2",
											background: active ? "#A6DFDD" : "#fff",
											color: active ? NAVY : "#4a5a5f",
											cursor: "pointer",
											transition: "all 0.15s ease",
											boxShadow: active ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
										}}
									>
										{p}
									</button>
								);
							})}
						</div>
					</div>

					<div
						style={{
							background: "#fff",
							border: `1px solid ${BORDER}`,
							borderRadius: 16,
							overflow: "hidden",
							marginBottom: 44,
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "2fr 1fr 1.3fr 1fr",
								gap: 14,
								padding: "14px 26px",
								background: "#FFF8DE",
								...microLabel,
								color: "#333333",
							}}
						>
							<div>
								<div
									onClick={() => handleSprintSort("name")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Task</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{sprintSortCol === "name"
											? sprintSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setSprintTaskSearch(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Search task..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={sprintTaskSearch}
								/>
							</div>

							<div>
								<div
									onClick={() => handleSprintSort("status")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Status</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{sprintSortCol === "status"
											? sprintSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setSprintStatusFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter status..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={sprintStatusFilter}
								/>
							</div>

							<div>
								<div
									onClick={() => handleSprintSort("feature")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Linked feature</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{sprintSortCol === "feature"
											? sprintSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setSprintFeatureFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter feature..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={sprintFeatureFilter}
								/>
							</div>

							<div>
								<div
									onClick={() => handleSprintSort("assignee")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Assignee</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{sprintSortCol === "assignee"
											? sprintSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setSprintAssigneeFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter assignee..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={sprintAssigneeFilter}
								/>
							</div>
						</div>
						{processTaskList(
							data?.sprintTasks || [],
							sprintTaskSearch,
							sprintStatusFilter,
							sprintFeatureFilter,
							sprintAssigneeFilter,
							sprintSortCol,
							sprintSortDir,
						).map((t) => {
							const m = sprintStatusMeta[t.status] || sprintStatusMeta["To do"];
							const isOpen = openTask === t.id;
							const deps = t.deps || [];
							const hasDeps = deps.length > 0;
							return (
								<div key={t.id} style={{ borderTop: `1px solid ${BORDER}` }}>
									<div
										onClick={() => toggleTask(t.id)}
										style={{
											display: "grid",
											gridTemplateColumns: "2fr 1fr 1.3fr 1fr auto",
											gap: 14,
											alignItems: "center",
											padding: "16px 26px",
											cursor: "pointer",
										}}
									>
										<span
											style={{
												fontWeight: 700,
												fontSize: 15,
												color: INK,
												display: "inline-flex",
												alignItems: "center",
												gap: 8,
												flexWrap: "wrap",
											}}
										>
											{t.name}
											{(t.jira_url ||
												(typeof t.id === "string" &&
													String(t.id).includes("-"))) && (
												<a
													href={
														t.jira_url ||
														`https://issaradevteam.atlassian.net/browse/${t.id}`
													}
													onClick={(e) => e.stopPropagation()}
													rel="noopener noreferrer"
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 4,
														background: "#e8f0fe",
														color: "#0052CC",
														border: "1px solid #b3d4ff",
														borderRadius: 6,
														padding: "2px 8px",
														fontSize: 12,
														fontWeight: 800,
														textDecoration: "none",
													}}
													target="_blank"
												>
													<svg
														fill="#0052CC"
														height="12"
														viewBox="0 0 24 24"
														width="12"
													>
														<path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h3.6l-7.95 7.95a4.35 4.35 0 0 0 0 6.15l.02.02c1.7 1.7 4.44 1.7 6.14 0l7.95-7.95v3.6c0 2.38 1.95 4.35 4.35 4.35V2h-18.47z" />
													</svg>
													{t.jira_key || String(t.id)} ↗
												</a>
											)}
										</span>
										<span style={chip(m)}>
											<span style={dotStyle(m.dot)} />
											{t.raw_status || t.status}
										</span>
										<span
											style={{
												fontSize: 13.5,
												fontWeight: 700,
												color: "#3a5054",
											}}
										>
											{t.feature}
										</span>
										<span
											style={{
												fontSize: 13.5,
												fontWeight: 600,
												color: "#6a726f",
											}}
										>
											{t.assignee}
										</span>
										<span
											style={{
												display: "inline-block",
												color: "#9a927c",
												fontSize: 16,
												transition: "transform .15s",
												transform: isOpen ? "rotate(180deg)" : "none",
											}}
										>
											▾
										</span>
									</div>
									{isOpen && (
										<div
											style={{
												background: "#fbfaf4",
												borderTop: `1px solid ${BORDER}`,
												padding: "6px 26px 22px",
												display: "flex",
												flexDirection: "column",
												gap: 14,
											}}
										>
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 16,
													paddingTop: 10,
												}}
											>
												{t.due_date && (
													<div>
														<div style={{ ...microLabel, margin: "0 0 4px" }}>
															Due Date
														</div>
														<span
															style={{
																fontSize: 13.5,
																fontWeight: 700,
																color: "#b5482e",
															}}
														>
															📅 {formatDate(t.due_date) || t.due_date}
														</span>
													</div>
												)}
												{t.priority && (
													<div>
														<div style={{ ...microLabel, margin: "0 0 4px" }}>
															Priority
														</div>
														<span
															style={{
																fontSize: 13.5,
																fontWeight: 700,
																color: NAVY,
															}}
														>
															⚡ {t.priority}
														</span>
													</div>
												)}
												{t.labels && t.labels.length > 0 && (
													<div>
														<div style={{ ...microLabel, margin: "0 0 4px" }}>
															Labels
														</div>
														<div
															style={{
																display: "flex",
																gap: 6,
																flexWrap: "wrap",
															}}
														>
															{t.labels.map((lbl, li) => (
																<span
																	key={li}
																	style={{
																		background: "#e0eef1",
																		color: TEAL_DK,
																		fontSize: 12,
																		fontWeight: 700,
																		padding: "2px 8px",
																		borderRadius: 6,
																	}}
																>
																	#{lbl}
																</span>
															))}
														</div>
													</div>
												)}
											</div>
											<div>
												<div style={{ ...microLabel, margin: "10px 0 6px" }}>
													Description
												</div>
												<p
													style={{
														margin: 0,
														maxWidth: 820,
														fontSize: 14,
														lineHeight: 1.6,
														color: "#4a5a5f",
														whiteSpace: "pre-wrap",
													}}
												>
													{t.desc}
												</p>
											</div>
											{hasDeps && (
												<div>
													<div style={{ ...microLabel, margin: "0 0 6px" }}>
														Dependencies
													</div>
													<div
														style={{
															display: "flex",
															flexWrap: "wrap",
															gap: 8,
														}}
													>
														{deps.map((d, i) => (
															<span
																key={i}
																style={{
																	background: "#FFEDAF99",
																	border: "1px solid #FDDA61",
																	borderLeft: "3px solid #FDDA61",
																	color: "#3a4744",
																	fontWeight: 700,
																	fontSize: 12.5,
																	padding: "5px 11px",
																	borderRadius: 7,
																}}
															>
																{d.replace(/^Unknown team - /, "")}
															</span>
														))}
													</div>
												</div>
											)}
											{t.requested_by && (
												<div>
													<div style={{ ...microLabel, margin: "0 0 6px" }}>
														Requested by
													</div>
													<span
														style={{
															fontSize: 14,
															fontWeight: 700,
															color: "#3a5054",
														}}
													>
														{t.requested_by}
													</span>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
						{processTaskList(
							data?.sprintTasks || [],
							sprintTaskSearch,
							sprintStatusFilter,
							sprintFeatureFilter,
							sprintAssigneeFilter,
							sprintSortCol,
							sprintSortDir,
						).length === 0 && (
							<div
								style={{
									padding: 24,
									textAlign: "center",
									color: CAPTION,
									fontWeight: 700,
								}}
							>
								No sprint tasks match the selected column filters.
							</div>
						)}
					</div>

					<h2 className="mb-1" style={sectionHeading}>
						Backlog / Queue
					</h2>
					<p className="mb-4">
						Planned work, not yet started, in rough priority order.
					</p>

					<div
						style={{
							background: "#fbfaf4",
							border: `1px solid ${BORDER}`,
							borderRadius: 16,
							overflow: "hidden",
							marginBottom: 44,
						}}
					>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "2fr 1fr 1.3fr 1fr",
								gap: 14,
								padding: "14px 26px",
								background: "#FFF8DE",
								...microLabel,
								color: "#333333",
							}}
						>
							<div>
								<div
									onClick={() => handleBacklogSort("name")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Task</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{backlogSortCol === "name"
											? backlogSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setBacklogTaskSearch(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Search task..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={backlogTaskSearch}
								/>
							</div>

							<div>
								<div
									onClick={() => handleBacklogSort("status")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Status</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{backlogSortCol === "status"
											? backlogSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setBacklogStatusFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter status..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={backlogStatusFilter}
								/>
							</div>

							<div>
								<div
									onClick={() => handleBacklogSort("feature")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Linked feature</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{backlogSortCol === "feature"
											? backlogSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setBacklogFeatureFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter feature..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={backlogFeatureFilter}
								/>
							</div>

							<div>
								<div
									onClick={() => handleBacklogSort("assignee")}
									style={{
										cursor: "pointer",
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										userSelect: "none",
									}}
								>
									<span>Assignee</span>
									<span style={{ fontSize: 11, color: TEAL }}>
										{backlogSortCol === "assignee"
											? backlogSortDir === "asc"
												? "▲"
												: "▼"
											: "↕"}
									</span>
								</div>
								<input
									onChange={(e) => setBacklogAssigneeFilter(e.target.value)}
									onClick={(e) => e.stopPropagation()}
									placeholder="Filter assignee..."
									style={{
										width: "100%",
										marginTop: 6,
										padding: "4px 8px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid #d2d2d2",
										fontWeight: "normal",
										background: "#fff",
									}}
									type="text"
									value={backlogAssigneeFilter}
								/>
							</div>
						</div>
						{processTaskList(
							data?.backlogTasks || [],
							backlogTaskSearch,
							backlogStatusFilter,
							backlogFeatureFilter,
							backlogAssigneeFilter,
							backlogSortCol,
							backlogSortDir,
						).map((t) => {
							const m = sprintStatusMeta[t.status] || sprintStatusMeta["To do"];
							const isOpen = openTask === t.id;
							const deps = t.deps || [];
							const hasDeps = deps.length > 0;
							return (
								<div key={t.id} style={{ borderTop: `1px solid ${BORDER}` }}>
									<div
										onClick={() => toggleTask(t.id)}
										style={{
											display: "grid",
											gridTemplateColumns: "2fr 1fr 1.3fr 1fr auto",
											gap: 14,
											alignItems: "center",
											padding: "16px 26px",
											cursor: "pointer",
										}}
									>
										<span
											style={{
												fontWeight: 700,
												fontSize: 15,
												color: INK,
												display: "inline-flex",
												alignItems: "center",
												gap: 8,
												flexWrap: "wrap",
											}}
										>
											{t.name}
											{(t.jira_url ||
												(typeof t.id === "string" &&
													String(t.id).includes("-"))) && (
												<a
													href={
														t.jira_url ||
														`https://issaradevteam.atlassian.net/browse/${t.id}`
													}
													onClick={(e) => e.stopPropagation()}
													rel="noopener noreferrer"
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: 4,
														background: "#e8f0fe",
														color: "#0052CC",
														border: "1px solid #b3d4ff",
														borderRadius: 6,
														padding: "2px 8px",
														fontSize: 12,
														fontWeight: 800,
														textDecoration: "none",
													}}
													target="_blank"
												>
													<svg
														fill="#0052CC"
														height="12"
														viewBox="0 0 24 24"
														width="12"
													>
														<path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h3.6l-7.95 7.95a4.35 4.35 0 0 0 0 6.15l.02.02c1.7 1.7 4.44 1.7 6.14 0l7.95-7.95v3.6c0 2.38 1.95 4.35 4.35 4.35V2h-18.47z" />
													</svg>
													{t.jira_key || String(t.id)} ↗
												</a>
											)}
										</span>
										<span style={chip(m)}>
											<span style={dotStyle(m.dot)} />
											{t.raw_status || t.status}
										</span>
										<span
											style={{
												fontSize: 13.5,
												fontWeight: 700,
												color: "#3a5054",
											}}
										>
											{t.feature}
										</span>
										<span
											style={{
												fontSize: 13.5,
												fontWeight: 600,
												color: "#6a726f",
											}}
										>
											{t.assignee}
										</span>
										<span
											style={{
												display: "inline-block",
												color: "#9a927c",
												fontSize: 16,
												transition: "transform .15s",
												transform: isOpen ? "rotate(180deg)" : "none",
											}}
										>
											▾
										</span>
									</div>
									{isOpen && (
										<div
											style={{
												background: "#fff",
												borderTop: `1px solid ${BORDER}`,
												padding: "6px 26px 22px",
												display: "flex",
												flexDirection: "column",
												gap: 14,
											}}
										>
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: 16,
													paddingTop: 10,
												}}
											>
												{t.due_date && (
													<div>
														<div
															style={{
																...microLabel,
																margin: "0 0 4px",
															}}
														>
															Due Date
														</div>
														<span
															style={{
																fontSize: 13.5,
																fontWeight: 700,
																color: "#b5482e",
															}}
														>
															📅 {formatDate(t.due_date) || t.due_date}
														</span>
													</div>
												)}
												{t.priority && (
													<div>
														<div
															style={{
																...microLabel,
																margin: "0 0 4px",
															}}
														>
															Priority
														</div>
														<span
															style={{
																fontSize: 13.5,
																fontWeight: 700,
																color: NAVY,
															}}
														>
															⚡ {t.priority}
														</span>
													</div>
												)}
												{t.labels && t.labels.length > 0 && (
													<div>
														<div
															style={{
																...microLabel,
																margin: "0 0 4px",
															}}
														>
															Labels
														</div>
														<div
															style={{
																display: "flex",
																gap: 6,
																flexWrap: "wrap",
															}}
														>
															{t.labels.map((lbl, li) => (
																<span
																	key={li}
																	style={{
																		background: "#e0eef1",
																		color: TEAL_DK,
																		fontSize: 12,
																		fontWeight: 700,
																		padding: "2px 8px",
																		borderRadius: 6,
																	}}
																>
																	#{lbl}
																</span>
															))}
														</div>
													</div>
												)}
											</div>
											<div>
												<div
													style={{
														...microLabel,
														margin: "10px 0 6px",
													}}
												>
													Description
												</div>
												<p
													style={{
														margin: 0,
														maxWidth: 820,
														fontSize: 14,
														lineHeight: 1.6,
														color: "#4a5a5f",
														whiteSpace: "pre-wrap",
													}}
												>
													{t.desc}
												</p>
											</div>
											{hasDeps && (
												<div>
													<div
														style={{
															...microLabel,
															margin: "0 0 6px",
														}}
													>
														Dependencies
													</div>
													<div
														style={{
															display: "flex",
															flexWrap: "wrap",
															gap: 8,
														}}
													>
														{deps.map((d, i) => (
															<span
																key={i}
																style={{
																	background: "#FFEDAF99",
																	border: "1px solid #FDDA61",
																	borderLeft: "3px solid #FDDA61",
																	color: "#3a4744",
																	fontWeight: 700,
																	fontSize: 12.5,
																	padding: "5px 11px",
																	borderRadius: 7,
																}}
															>
																{d.replace(/^Unknown team - /, "")}
															</span>
														))}
													</div>
												</div>
											)}
											{t.requested_by && (
												<div>
													<div
														style={{
															...microLabel,
															margin: "0 0 6px",
														}}
													>
														Requested by
													</div>
													<span
														style={{
															fontSize: 14,
															fontWeight: 700,
															color: "#3a5054",
														}}
													>
														{t.requested_by}
													</span>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
						{processTaskList(
							data?.backlogTasks || [],
							backlogTaskSearch,
							backlogStatusFilter,
							backlogFeatureFilter,
							backlogAssigneeFilter,
							backlogSortCol,
							backlogSortDir,
						).length === 0 && (
							<div
								style={{
									padding: 24,
									textAlign: "center",
									color: CAPTION,
									fontWeight: 700,
								}}
							>
								No backlog tasks match the selected column filters.
							</div>
						)}
					</div>
				</div>
			)}
		</PageContainer>
	);
}
