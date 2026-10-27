import moment from "moment";

/**
 * Adjusts mock KPI dates and statuses to keep them fresh and visually realistic for demo.
 * - ~85% closed, ~15% open
 * - Open issues spread across 5-45 days (mix of fresh + a couple older)
 * - Closed issues opened 60-180 days ago, closed 5-50 days ago
 * - Guarantees at least one "Poor" remediation outcome among closed
 * - Curated open KPIs (STABLE_OPEN_KPIS) are always pinned open with fixed
 *   day-active offsets so their dates roll forward each calendar day but never
 *   land in the randomized closed bucket.
 *
 * Mutates a shallow copy of the input array.
 */
const REMEDIATION_QUALITIES = ["Fair", "Good", "Excellent"];

// Curated open KPIs across categories (id -> days open + progress status).
// Status 1 = "No Progress", 2 = "Some Progress". Single source of truth shared
// by every route that surfaces these IDs (worker-reported issues, category
// dashboards, etc.) so they always appear open with consistent day counts.
export const STABLE_OPEN_KPIS = new Map<
	number,
	{ offset: number; status: 1 | 2 }
>([
	[2005, { offset: 19, status: 2 }],
	[3007, { offset: 25, status: 2 }],
	[1002, { offset: 13, status: 1 }],
	[1006, { offset: 6, status: 1 }],
	// Level 2 Early Warning demo cases (full worker/Issara/supplier narratives).
	// Offsets are the "ideal # of open days" for each case.
	[1013, { offset: 15, status: 2 }],
	[1010, { offset: 20, status: 2 }],
	[1014, { offset: 10, status: 2 }],
]);

export const STABLE_POOR_CLOSED_ID = 1004;

export function pinStableOpenKpi(kpi: any, today = moment()): any | null {
	const spec = STABLE_OPEN_KPIS.get(Number(kpi.id));
	if (!spec) return null;
	return {
		...kpi,
		opened_at: today.clone().subtract(spec.offset, "days").format("YYYY-MM-DD"),
		closed_at: null,
		status: spec.status,
		status_name: spec.status === 1 ? "No Progress" : "Some Progress",
		closed_quality: null,
	};
}

const randInt = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min + 1)) + min;

export function refreshMockKPIDates(kpis: any[]): any[] {
	const today = moment();

	// Refresh if any open KPI is older than 50 days, OR if any curated
	// always-open KPI has drifted past its pinned day offset (e.g. a new day
	// has rolled over since the mock data was last touched).
	const openKPIs = kpis.filter((kpi) => kpi.status !== 3 && kpi.opened_at);
	const open50Plus = openKPIs.filter((kpi) => {
		if (!kpi.opened_at) return false;
		const daysAgo = today.diff(moment(kpi.opened_at, "YYYY-MM-DD"), "days");
		return daysAgo > 50;
	});
	const stableDrifted = kpis.some((kpi) => {
		const spec = STABLE_OPEN_KPIS.get(Number(kpi.id));
		if (!spec || !kpi.opened_at) return false;
		const daysAgo = today.diff(moment(kpi.opened_at, "YYYY-MM-DD"), "days");
		return daysAgo !== spec.offset || kpi.status === 3;
	});
	if (open50Plus.length === 0 && !stableDrifted) {
		// All open KPIs are 50 days or less old and the curated 4 still match
		// their pinned offsets; nothing to refresh.
		return kpis;
	}

	// Split off the curated always-open IDs so the randomizer never closes them.
	const stableRows: any[] = [];
	const refreshable: any[] = [];
	for (const kpi of kpis) {
		if (STABLE_OPEN_KPIS.has(Number(kpi.id))) {
			const pinned = pinStableOpenKpi(kpi, today);
			if (pinned) stableRows.push(pinned);
		} else {
			refreshable.push(kpi);
		}
	}

	const total = refreshable.length;
	const closedCount = Math.round(total * 0.85);

	const shuffled = [...refreshable].sort(() => Math.random() - 0.5);

	let poorAssigned = false;

	const randomized = shuffled.map((kpi, idx) => {
		if (idx < closedCount) {
			// Closed: opened 60-180 days ago, closed 5-50 days ago
			const closedDaysAgo = randInt(5, 50);
			const openedDaysAgo = closedDaysAgo + randInt(30, 120);
			let closed_quality: string;
			if (!poorAssigned) {
				closed_quality = "Poor";
				poorAssigned = true;
			} else {
				closed_quality =
					REMEDIATION_QUALITIES[randInt(0, REMEDIATION_QUALITIES.length - 1)];
			}
			return {
				...kpi,
				opened_at: today
					.clone()
					.subtract(openedDaysAgo, "days")
					.format("YYYY-MM-DD"),
				closed_at: today
					.clone()
					.subtract(closedDaysAgo, "days")
					.format("YYYY-MM-DD"),
				status: 3,
				status_name: "Closed",
				closed_quality,
			};
		}
		// Open: uniformly 5-45 days ago; >30d => No Progress (1), else Some Progress (2)
		const daysAgo = randInt(5, 45);
		const status = daysAgo > 30 ? 1 : 2;
		return {
			...kpi,
			opened_at: today.clone().subtract(daysAgo, "days").format("YYYY-MM-DD"),
			closed_at: null,
			status,
			status_name: status === 1 ? "No Progress" : "Some Progress",
			closed_quality: null,
		};
	});

	return [...stableRows, ...randomized];
}
