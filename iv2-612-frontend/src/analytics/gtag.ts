// Google Analytics 4 (gtag.js) helper.
// Loaded at runtime only in production (see src/main.tsx).

export const GA_MEASUREMENT_ID = "G-V3H5GXCW9H";

declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

/**
 * Inject the gtag.js script and initialize GA4.
 *
 * `send_page_view: false` disables GA's automatic initial pageview so that we
 * send every pageview ourselves via `trackPageview` (including the first load),
 * avoiding double-counting in this SPA.
 */
export function initGA(environment?: string): void {
	if (typeof window === "undefined") return;

	const script = document.createElement("script");
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
	document.head.appendChild(script);

	window.dataLayer = window.dataLayer || [];
	// Canonical gtag stub: push the `arguments` object (not an array) so the
	// gtag.js library recognizes every command, including callback commands
	// like `gtag('get', ...)`.
	window.gtag = function gtag() {
		// biome-ignore lint/complexity/noArguments: gtag.js requires the arguments object
		window.dataLayer.push(arguments);
	};
	window.gtag("js", new Date());
	window.gtag("config", GA_MEASUREMENT_ID, {
		send_page_view: false,
		// Route staging hits to GA4 DebugView, and tag every event with the
		// environment so staging test traffic can be filtered/excluded in reports.
		...(environment === "staging" ? { debug_mode: true } : {}),
	});
	if (environment) {
		window.gtag("set", { environment });
	}
}

/** Send a GA4 pageview event for the given path. */
export function trackPageview(path: string): void {
	if (typeof window === "undefined" || typeof window.gtag !== "function")
		return;

	window.gtag("event", "page_view", {
		// Target our property explicitly. Without send_to the event is delivered
		// to the page's default (first-loaded) tag, which is a pre-existing
		// unrelated Google tag on this site.
		send_to: GA_MEASUREMENT_ID,
		page_path: path,
		page_location: window.location.href,
		page_title: document.title,
	});
}

/**
 * Send a custom GA4 event to measure feature usage.
 *
 * Call this at the point a feature is used, e.g.
 * `trackEvent("export_report", { format: "csv" })`. The event name and any
 * params show up in GA4 under Reports → Engagement → Events (and can be built
 * into custom "feature usage rate" explorations).
 *
 * `name` should be snake_case, <= 40 chars (GA4 constraints).
 */
export function trackEvent(
	name: string,
	params?: Record<string, unknown>,
): void {
	if (typeof window === "undefined" || typeof window.gtag !== "function")
		return;

	// Default send_to to our property so feature events don't leak into the
	// pre-existing unrelated Google tag on this site. Callers can still override.
	window.gtag("event", name, { send_to: GA_MEASUREMENT_ID, ...params });
}
