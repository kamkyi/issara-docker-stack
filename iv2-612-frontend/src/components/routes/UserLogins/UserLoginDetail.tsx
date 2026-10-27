import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import {
	type SessionSummary,
	type UserLoginDetail as UserLoginDetailData,
	useUserLoginDetail,
} from "$src/queries/userLogins";
import {
	authMeta,
	type DayGroup,
	dateLabel,
	exactTime,
	groupByDay,
	initials,
	parseDevice,
	relativeTime,
	statusMeta,
} from "./format";

/**
 * Per-user details page: profile header, summary stats (sign-in count, last
 * sign-in, member since) and a session timeline grouped by day, newest first.
 * Mirrors WorkOS's per-user "Sessions" tab in the ILM design system.
 */

function Chip({ meta }: { meta: { label: string; bg: string; fg: string } }) {
	return (
		<span
			className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold tracking-[0.02em]"
			style={{ backgroundColor: meta.bg, color: meta.fg }}
		>
			{meta.label}
		</span>
	);
}

function SessionRow({ session }: { session: SessionSummary }) {
	return (
		<li className="grid grid-cols-[40px_1fr] items-start gap-x-4 gap-y-1 py-4 sm:grid-cols-[40px_1fr_auto]">
			{/* Node on the timeline spine, ringed by the page bg to mask it */}
			<span
				aria-hidden="true"
				className="z-[1] grid h-10 w-10 place-items-center rounded-full"
				style={{
					backgroundColor: "#004a60",
					boxShadow: "0 0 0 4px var(--color-bg)",
				}}
			>
				<span
					className="h-2 w-2 rounded-full"
					style={{ backgroundColor: "#fbf6ec" }}
				/>
			</span>

			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<Chip meta={authMeta(session.authMethod)} />
					<Chip meta={statusMeta(session.status)} />
					{session.isImpersonated && (
						<Chip
							meta={{
								label: "Impersonated",
								bg: "#ffe1dd",
								fg: "#b23a2c",
							}}
						/>
					)}
				</div>
				<div
					className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px]"
					style={{ color: "var(--color-body)" }}
				>
					<span>{parseDevice(session.userAgent)}</span>
					{session.ipAddress && (
						<>
							<span aria-hidden="true">·</span>
							<span className="tabular-nums">{session.ipAddress}</span>
						</>
					)}
				</div>
				{session.endedAt && (
					<div
						className="mt-0.5 text-[12px] tabular-nums"
						style={{ color: "var(--color-caption)" }}
					>
						Ended {exactTime(session.endedAt)}
					</div>
				)}
			</div>

			<div className="col-start-2 flex items-baseline gap-2 sm:col-start-3 sm:flex-col sm:items-end sm:gap-0.5 sm:text-right">
				<span
					className="text-[13px] font-semibold"
					style={{ color: "var(--color-secondary)" }}
				>
					{relativeTime(session.createdAt)}
				</span>
				<span
					className="text-[12px] tabular-nums tracking-[0.02em]"
					style={{ color: "var(--color-caption)" }}
				>
					{exactTime(session.createdAt)}
				</span>
			</div>
		</li>
	);
}

function DaySection({ group }: { group: DayGroup<SessionSummary> }) {
	return (
		<section className="mb-8 last:mb-0">
			<div className="mb-1 flex items-baseline gap-2">
				<h2
					className="text-[13px] font-bold uppercase tracking-[0.08em]"
					style={{ color: "var(--color-primary)" }}
				>
					{group.label}
				</h2>
				<span className="text-[12px]" style={{ color: "var(--color-caption)" }}>
					{group.sublabel}
				</span>
				<span
					className="ml-1 rounded-full px-2 text-[11px] font-semibold tabular-nums"
					style={{
						backgroundColor: "color-mix(in srgb, #148696 12%, transparent)",
						color: "var(--color-secondary)",
					}}
				>
					{group.rows.length}
				</span>
			</div>
			<ol className="relative m-0 list-none p-0 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:-translate-x-1/2 before:bg-[color-mix(in_srgb,#148696_28%,transparent)] before:content-['']">
				{group.rows.map((session) => (
					<SessionRow key={session.id} session={session} />
				))}
			</ol>
		</section>
	);
}

function CardShell({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="rounded-2xl border p-6 sm:p-8"
			style={{
				borderColor: "var(--color-border)",
				backgroundColor: "color-mix(in srgb, var(--color-bg) 40%, #ffffff)",
			}}
		>
			{children}
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div
				className="text-[20px] font-bold tabular-nums leading-none capitalize"
				style={{ color: "var(--color-primary)" }}
			>
				{value}
			</div>
			<div
				className="mt-1 text-[12px] uppercase tracking-[0.06em]"
				style={{ color: "var(--color-caption)" }}
			>
				{label}
			</div>
		</div>
	);
}

/** Friendly labels for known WorkOS metadata keys; others are humanized. */
const METADATA_LABELS: Record<string, string> = {
	app_user_type: "GD User type",
	app_groups: "ILM User role",
	app_is_active: "Cascade Active",
	gd_is_active: "Golden Dreams access",
	ilm_is_active: "ILM Active",
	organization_id: "Organization ID",
	partner_id: "ILM Partner Name",
	supplier_id: "ILM Supplier Name",
	ilm_user_id: "ILM user ID",
	gd_user_id: "Golden Dreams user ID",
};

/** Golden Dreams user-type codes, expanded for display. */
const USER_TYPE_LABELS: Record<string, string> = {
	JS: "Job Seeker",
	EM: "Employer",
	RA: "Recruitment Agency",
	IS: "Issara Staff",
};

/** Order the fields most-useful-first; unknown keys keep their given order. */
const METADATA_ORDER = [
	"app_user_type",
	"app_groups",
	"app_is_active",
	"gd_is_active",
	"ilm_is_active",
	"organization_id",
	"partner_id",
	"supplier_id",
	"ilm_user_id",
	"gd_user_id",
];

function humanizeKey(key: string): string {
	return (
		METADATA_LABELS[key] ??
		key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
	);
}

/** Render a metadata value: booleans as chips, JSON arrays as a readable list. */
function MetadataValue({ metaKey, raw }: { metaKey: string; raw: string }) {
	if (metaKey === "app_user_type") {
		return (
			<span style={{ color: "var(--color-ink)" }}>
				{USER_TYPE_LABELS[raw.trim().toUpperCase()] ?? raw}
			</span>
		);
	}
	const lower = raw.trim().toLowerCase();
	if (lower === "true" || lower === "false") {
		const on = lower === "true";
		return (
			<span
				className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
				style={{
					backgroundColor: on
						? "color-mix(in srgb, #148696 14%, transparent)"
						: "color-mix(in srgb, var(--color-border) 45%, transparent)",
					color: on ? "var(--color-secondary)" : "var(--color-caption)",
				}}
			>
				{on ? "Yes" : "No"}
			</span>
		);
	}
	if (raw.trim().startsWith("[")) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return (
					<span style={{ color: "var(--color-ink)" }}>
						{parsed.map((v) => String(v).replace(/_/g, " ")).join(", ") || "—"}
					</span>
				);
			}
		} catch {
			// fall through to raw text
		}
	}
	return (
		<span className="tabular-nums" style={{ color: "var(--color-ink)" }}>
			{raw}
		</span>
	);
}

function MetadataSection({ metadata }: { metadata?: Record<string, string> }) {
	if (!metadata) return null;
	const keys = Object.keys(metadata);
	if (keys.length === 0) return null;

	const ordered = [
		...METADATA_ORDER.filter((k) => k in metadata),
		...keys.filter((k) => !METADATA_ORDER.includes(k)),
	];

	return (
		<section className="mb-6">
			<h2
				className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em]"
				style={{ color: "var(--color-primary)" }}
			>
				Profile & access
			</h2>
			<dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
				{ordered.map((key) => (
					<div
						className="flex items-baseline justify-between gap-4 border-b pb-2"
						key={key}
						style={{ borderColor: "var(--color-border)" }}
					>
						<dt
							className="text-[12px] uppercase tracking-[0.04em]"
							style={{ color: "var(--color-caption)" }}
						>
							{humanizeKey(key)}
						</dt>
						<dd className="m-0 text-right text-[13px] font-semibold">
							<MetadataValue metaKey={key} raw={metadata[key]} />
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

function BackLink() {
	return (
		<Link
			className="inline-flex items-center gap-1.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
			style={{ color: "var(--color-secondary)" }}
			to="/user-logins"
		>
			<ArrowLeftIcon className="h-4 w-4" />
			All users
		</Link>
	);
}

function Header({ user }: { user: UserLoginDetailData["user"] }) {
	return (
		<div className="mb-4 flex items-center gap-4">
			{user.avatarUrl ? (
				<img
					alt=""
					className="h-14 w-14 rounded-full object-cover"
					src={user.avatarUrl}
				/>
			) : (
				<span
					aria-hidden="true"
					className="grid h-14 w-14 place-items-center rounded-full text-[18px] font-bold"
					style={{ backgroundColor: "#004a60", color: "#fbf6ec" }}
				>
					{initials(user.name || user.email)}
				</span>
			)}
			<div className="min-w-0">
				<div
					className="truncate text-[20px] font-bold leading-tight"
					style={{ color: "var(--color-ink)" }}
				>
					{user.name}
				</div>
				<div
					className="truncate text-[13px]"
					style={{ color: "var(--color-body)" }}
				>
					{user.email ?? "No email on file"}
				</div>
				<code
					className="mt-1 inline-block rounded px-1.5 py-0.5 text-[11px]"
					style={{
						backgroundColor:
							"color-mix(in srgb, var(--color-border) 40%, transparent)",
						color: "var(--color-caption)",
					}}
				>
					{user.userId}
				</code>
			</div>
		</div>
	);
}

export default function UserLoginDetail({ userId }: { userId: string }) {
	const { data, isLoading, isError, error, refetch } =
		useUserLoginDetail(userId);

	if (isLoading) {
		return (
			<CardShell>
				<div className="animate-pulse space-y-4">
					<div className="flex items-center gap-4">
						<span
							className="h-14 w-14 rounded-full"
							style={{ backgroundColor: "var(--color-border)" }}
						/>
						<div className="space-y-2">
							<span
								className="block h-4 w-40 rounded"
								style={{ backgroundColor: "var(--color-border)" }}
							/>
							<span
								className="block h-3 w-56 rounded"
								style={{ backgroundColor: "var(--color-border)" }}
							/>
						</div>
					</div>
				</div>
			</CardShell>
		);
	}

	if (isError || !data) {
		return (
			<CardShell>
				<div className="py-10 text-center">
					<p
						className="text-[15px] font-semibold"
						style={{ color: "var(--color-ink)" }}
					>
						Couldn't load this user
					</p>
					<p
						className="mt-1 text-[13px]"
						style={{ color: "var(--color-body)" }}
					>
						{(error as Error)?.message ??
							"The user may not exist or the login service is unavailable."}
					</p>
					<div className="mt-4 flex items-center justify-center gap-3">
						<button
							className="rounded-full px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
							onClick={() => refetch()}
							style={{ backgroundColor: "var(--color-secondary)" }}
							type="button"
						>
							Retry
						</button>
						<BackLink />
					</div>
				</div>
			</CardShell>
		);
	}

	const { user, signInCount, sessions, metadata } = data;
	const groups = groupByDay(sessions, (s) => s.createdAt);

	return (
		<div>
			<div className="mb-4">
				<BackLink />
			</div>

			<CardShell>
				<Header user={user} />

				<div
					className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-b pb-4 text-[13px]"
					style={{ borderColor: "var(--color-border)" }}
				>
					<Stat label="Sign-ins (30d)" value={String(signInCount)} />
					<Stat
						label="Last sign-in"
						value={user.lastSignInAt ? relativeTime(user.lastSignInAt) : "—"}
					/>
					<Stat label="Member since" value={dateLabel(user.createdAt)} />
				</div>

				<p
					className="mb-6 text-[12px]"
					style={{ color: "var(--color-caption)" }}
				>
					Sign-in count and session history reflect roughly the last 30 days —
					the window WorkOS retains activity for.
				</p>

				<MetadataSection metadata={metadata} />

				{sessions.length === 0 ? (
					<div className="py-10 text-center">
						<p
							className="text-[15px] font-semibold"
							style={{ color: "var(--color-ink)" }}
						>
							No recent sessions
						</p>
						<p
							className="mx-auto mt-1 max-w-sm text-[13px]"
							style={{ color: "var(--color-body)" }}
						>
							WorkOS keeps roughly the last 30 days of activity. This user has
							no sessions in that window.
						</p>
					</div>
				) : (
					groups.map((group) => <DaySection group={group} key={group.key} />)
				)}
			</CardShell>
		</div>
	);
}
