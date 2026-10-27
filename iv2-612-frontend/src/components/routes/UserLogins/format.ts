/**
 * Shared formatting helpers for the User Logins roster and details pages.
 * Kept framework-free so both components can import them.
 */

/** Humanized name from an email local-part: "aung.min" -> "Aung Min". */
export function displayName(email: string | null): string {
	if (!email) return "Unknown user";
	const local = email.split("@")[0];
	const words = local.split(/[._-]+/).filter(Boolean);
	if (words.length === 0) return email;
	return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Two-letter monogram from a name or email. */
export function initials(source: string | null): string {
	if (!source) return "?";
	const base = source.includes("@") ? source.split("@")[0] : source;
	const words = base.split(/[._\-\s]+/).filter(Boolean);
	if (words.length === 0) return base.charAt(0).toUpperCase();
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function relativeTime(iso: string | null): string {
	if (!iso) return "—";
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return "—";
	const diffSec = Math.round((Date.now() - then) / 1000);
	if (diffSec < 45) return "just now";
	if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
	if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
	const days = Math.round(diffSec / 86400);
	if (days < 30) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

export function exactTime(iso: string | null): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** "Mar 22, 2026" style date. */
export function dateLabel(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/** Best-effort browser · OS summary from a user-agent string. */
export function parseDevice(ua: string | null): string {
	if (!ua) return "Unknown device";
	const browser = /Edg\//.test(ua)
		? "Edge"
		: /OPR\//.test(ua)
			? "Opera"
			: /Chrome\//.test(ua)
				? "Chrome"
				: /Firefox\//.test(ua)
					? "Firefox"
					: /Safari\//.test(ua)
						? "Safari"
						: "Browser";
	const os = /Windows/.test(ua)
		? "Windows"
		: /Mac OS X|Macintosh/.test(ua)
			? "macOS"
			: /Android/.test(ua)
				? "Android"
				: /iPhone|iPad|iOS/.test(ua)
					? "iOS"
					: /Linux/.test(ua)
						? "Linux"
						: "";
	return os ? `${browser} on ${os}` : browser;
}

export interface AuthMeta {
	label: string;
	bg: string;
	fg: string;
}

/** Map a WorkOS auth method to a labelled, colour-coded chip. */
export function authMeta(method: string | null): AuthMeta {
	switch ((method ?? "").toLowerCase()) {
		case "sso":
			return { label: "SSO", bg: "#a6dfdd", fg: "#004a60" };
		case "password":
			return { label: "Password", bg: "#ffedaf", fg: "#6b5900" };
		case "oauth":
			return { label: "OAuth", bg: "#ece0f4", fg: "#6f2e97" };
		case "magic_auth":
			return { label: "Magic link", bg: "#e6f4f1", fg: "#148696" };
		case "passkey":
			return { label: "Passkey", bg: "#e6f4f1", fg: "#148696" };
		case "impersonation":
			return { label: "Impersonation", bg: "#ffe1dd", fg: "#b23a2c" };
		default:
			return method
				? { label: method, bg: "#eef1f0", fg: "#56666c" }
				: { label: "Session", bg: "#eef1f0", fg: "#56666c" };
	}
}

/** Map a WorkOS session status to a labelled, colour-coded chip. */
export function statusMeta(status: string | null): AuthMeta {
	switch ((status ?? "").toLowerCase()) {
		case "active":
			return { label: "Active", bg: "#d9efe9", fg: "#0f6b5f" };
		case "revoked":
			return { label: "Revoked", bg: "#ffe1dd", fg: "#b23a2c" };
		case "expired":
			return { label: "Expired", bg: "#eef1f0", fg: "#56666c" };
		default:
			return status
				? { label: status, bg: "#eef1f0", fg: "#56666c" }
				: { label: "Session", bg: "#eef1f0", fg: "#56666c" };
	}
}

// ── Day grouping ────────────────────────────────────────────────────────────

export interface DayGroup<T> {
	key: string;
	label: string;
	sublabel: string;
	rows: T[];
}

function dayLabels(iso: string): { label: string; sublabel: string } {
	const d = new Date(iso);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();

	const sublabel = d.toLocaleDateString(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	if (sameDay(d, today)) return { label: "Today", sublabel };
	if (sameDay(d, yesterday)) return { label: "Yesterday", sublabel };
	return {
		label: d.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
		sublabel: d.toLocaleDateString(undefined, { weekday: "long" }),
	};
}

/** Group time-ordered rows by calendar day, preserving input order. */
export function groupByDay<T>(
	rows: T[],
	getIso: (row: T) => string | null,
): DayGroup<T>[] {
	const groups: DayGroup<T>[] = [];
	const index = new Map<string, DayGroup<T>>();
	for (const row of rows) {
		const iso = getIso(row) ?? new Date(0).toISOString();
		const key = new Date(iso).toDateString();
		let group = index.get(key);
		if (!group) {
			const { label, sublabel } = dayLabels(iso);
			group = { key, label, sublabel, rows: [] };
			index.set(key, group);
			groups.push(group);
		}
		group.rows.push(row);
	}
	return groups;
}
