import {
	ArrowDownIcon,
	ArrowUpIcon,
	EnterIcon,
	LapTimerIcon,
	MagnifyingGlassIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { type RosterUser, useUserRoster } from "$src/queries/userLogins";
import {
	dateLabel,
	exactTime,
	initials,
	relativeTime,
	statusMeta,
} from "./format";

/**
 * The roster: a searchable, sortable table of internal users — one row per
 * person, newest sign-in first by default. Each row links to that person's
 * details page. Mirrors WorkOS's own Users list in the ILM design system.
 */

type SortKey =
	| "name"
	| "sessionStatus"
	| "signInCount"
	| "lastSignInAt"
	| "createdAt";
type SortDir = "asc" | "desc";

interface Column {
	key: SortKey;
	label: string;
	align: "left" | "right";
	numeric?: boolean;
	timestamp?: boolean;
}

const COLUMNS: Column[] = [
	{ key: "name", label: "User", align: "left" },
	{ key: "sessionStatus", label: "Latest Session Status", align: "left" },
	{
		key: "signInCount",
		label: "Sign-in count  (Last 30d)",
		align: "right",
		numeric: true,
	},
	{
		key: "lastSignInAt",
		label: "Last sign-in",
		align: "right",
		timestamp: true,
	},
	{ key: "createdAt", label: "Created", align: "right", timestamp: true },
];

function Avatar({ user }: { user: RosterUser }) {
	if (user.avatarUrl) {
		return (
			<img
				alt=""
				className="h-9 w-9 shrink-0 rounded-full object-cover"
				src={user.avatarUrl}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold tracking-[0.02em]"
			style={{ backgroundColor: "#004a60", color: "#fbf6ec" }}
		>
			{initials(user.name || user.email)}
		</span>
	);
}

function StatusChip({ status }: { status: string | null }) {
	if (!status) {
		return (
			<span className="text-[13px]" style={{ color: "var(--color-caption)" }}>
				Inactive
			</span>
		);
	}
	const meta = statusMeta(status);
	return (
		<span
			className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold tracking-[0.02em]"
			style={{ backgroundColor: meta.bg, color: meta.fg }}
		>
			{meta.label}
		</span>
	);
}

/** Numeric for count, epoch for timestamps, lower-cased string otherwise. */
function sortValue(user: RosterUser, col: Column): number | string {
	const raw = user[col.key];
	if (col.numeric) return typeof raw === "number" ? raw : 0;
	if (col.timestamp) {
		const t = raw ? new Date(raw as string).getTime() : NaN;
		return Number.isNaN(t) ? -Infinity : t;
	}
	return String(raw ?? "").toLowerCase();
}

function SortHeader({
	col,
	sort,
	onSort,
}: {
	col: Column;
	sort: { key: SortKey; dir: SortDir };
	onSort: (key: SortKey) => void;
}) {
	const active = sort.key === col.key;
	return (
		<th
			className={`${col.align === "right" ? "text-right" : "text-left"} ${
				col.key === "name" ? "pl-3" : ""
			} ${col.key === "createdAt" ? "pr-3" : ""}`}
			scope="col"
		>
			<button
				className={`inline-flex items-center gap-1 py-2 text-[12px] font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
					col.align === "right" ? "flex-row-reverse" : ""
				}`}
				onClick={() => onSort(col.key)}
				style={{
					color: active ? "var(--color-primary)" : "var(--color-caption)",
				}}
				type="button"
			>
				{col.label}
				{active ? (
					sort.dir === "asc" ? (
						<ArrowUpIcon className="h-3.5 w-3.5" />
					) : (
						<ArrowDownIcon className="h-3.5 w-3.5" />
					)
				) : (
					<span className="h-3.5 w-3.5" />
				)}
			</button>
		</th>
	);
}

function RosterRow({ user }: { user: RosterUser }) {
	const signedIn = Boolean(user.lastSignInAt);
	const linkProps = {
		to: "/user-logins/$userId",
		params: { userId: user.userId },
	} as const;
	const linkClass =
		"block h-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#148696]";

	return (
		<tr
			className="group border-t transition-colors hover:bg-[color-mix(in_srgb,#148696_7%,transparent)]"
			style={{ borderColor: "var(--color-border)" }}
		>
			<td className="p-0">
				<Link
					{...linkProps}
					aria-label={`Open login details for ${user.name}`}
					className={`${linkClass} py-2 pl-3 pr-4`}
				>
					<span className="flex items-center gap-3">
						<Avatar user={user} />
						<span className="min-w-0">
							<span
								className="block truncate text-[14px] font-semibold"
								style={{ color: "var(--color-ink)" }}
							>
								{user.name}
							</span>
							<span
								className="block truncate text-[12px]"
								style={{ color: "var(--color-body)" }}
							>
								{user.email ?? user.userId}
							</span>
						</span>
					</span>
				</Link>
			</td>
			<td className="p-0">
				<Link {...linkProps} className={`${linkClass} px-2 py-2`}>
					<StatusChip status={user.sessionStatus} />
				</Link>
			</td>
			<td className="p-0">
				<Link
					{...linkProps}
					className={`${linkClass} px-2 py-2 text-right text-[14px] font-semibold tabular-nums`}
					style={{ color: "var(--color-ink)" }}
				>
					{user.signInCount}
				</Link>
			</td>
			<td className="p-0">
				<Link {...linkProps} className={`${linkClass} px-2 py-2 text-right`}>
					{signedIn ? (
						<>
							<span
								className="block text-[13px] font-semibold"
								style={{ color: "var(--color-secondary)" }}
							>
								{relativeTime(user.lastSignInAt)}
							</span>
							<span
								className="block text-[12px] tabular-nums tracking-[0.02em]"
								style={{ color: "var(--color-caption)" }}
							>
								{exactTime(user.lastSignInAt)}
							</span>
						</>
					) : (
						<span
							className="text-[13px]"
							style={{ color: "var(--color-caption)" }}
						>
							Never signed in
						</span>
					)}
				</Link>
			</td>
			<td className="p-0">
				<Link
					{...linkProps}
					className={`${linkClass} py-2 pr-3 text-right text-[13px] tabular-nums`}
					style={{ color: "var(--color-body)" }}
				>
					{dateLabel(user.createdAt)}
				</Link>
			</td>
		</tr>
	);
}

function CardShell({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="overflow-hidden rounded-2xl border"
			style={{
				borderColor: "var(--color-border)",
				backgroundColor: "color-mix(in srgb, var(--color-bg) 40%, #ffffff)",
			}}
		>
			{children}
		</div>
	);
}

function ScoreCard({
	icon: Icon,
	label,
	value,
	caption,
	tint,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	caption: string;
	tint: { bg: string; fg: string };
}) {
	return (
		<div className="flex min-h-[190px] flex-col rounded-lg border border-[#D2D2D2] bg-white px-3 py-3 shadow-sm">
			<div className="flex min-h-12 items-center gap-3">
				<span
					aria-hidden="true"
					className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
					style={{ backgroundColor: tint.bg, color: tint.fg }}
				>
					<Icon className="h-5 w-5" />
				</span>
				<div className="text-[15px] font-semibold leading-snug text-[#111827]">
					{label}
				</div>
			</div>
			<div className="my-2 h-px bg-[#D2D2D2]/45" />
			<div className="flex flex-1 flex-col items-center justify-center text-center">
				<div className="font-heading text-[46px] font-black leading-none capitalize text-[#148696]">
					{value}
				</div>
				<div className="mt-3 max-w-[190px] text-[12px] leading-snug text-[#667085]">
					{caption}
				</div>
			</div>
		</div>
	);
}

export default function UserRoster() {
	const { data, isLoading, isError, error, refetch } = useUserRoster();
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
		key: "lastSignInAt",
		dir: "desc",
	});

	const users = useMemo(() => data ?? [], [data]);

	const signedInCount = useMemo(
		() => users.filter((u) => u.lastSignInAt).length,
		[users],
	);
	const lastActivity = users.find((u) => u.lastSignInAt)?.lastSignInAt ?? null;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		return users.filter(
			(u) =>
				u.name.toLowerCase().includes(q) ||
				(u.email ?? "").toLowerCase().includes(q),
		);
	}, [users, query]);

	const sorted = useMemo(() => {
		const col = COLUMNS.find((c) => c.key === sort.key);
		if (!col) return filtered;
		const dir = sort.dir === "asc" ? 1 : -1;
		return [...filtered].sort((a, b) => {
			const av = sortValue(a, col);
			const bv = sortValue(b, col);
			if (av < bv) return -1 * dir;
			if (av > bv) return 1 * dir;
			return 0;
		});
	}, [filtered, sort]);

	const onSort = (key: SortKey) =>
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: key === "name" ? "asc" : "desc" },
		);

	return (
		<div>
			<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<ScoreCard
					caption="Total CASCADE Users"
					icon={PersonIcon}
					label="Users"
					tint={{
						bg: "color-mix(in srgb, #004a60 12%, transparent)",
						fg: "#004a60",
					}}
					value={String(users.length)}
				/>
				<ScoreCard
					caption="Counted auth events"
					icon={EnterIcon}
					label="Signed in (Last 30d)"
					tint={{
						bg: "color-mix(in srgb, #148696 14%, transparent)",
						fg: "var(--color-secondary)",
					}}
					value={String(signedInCount)}
				/>
				<ScoreCard
					caption="Most recent sign-in"
					icon={LapTimerIcon}
					label="Last activity"
					tint={{
						bg: "color-mix(in srgb, #004a60 12%, transparent)",
						fg: "#004a60",
					}}
					value={lastActivity ? relativeTime(lastActivity) : "—"}
				/>
			</div>

			<div className="mb-3">
				<div className="relative max-w-md">
					<MagnifyingGlassIcon
						className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
						style={{ color: "var(--color-caption)" }}
					/>
					<input
						aria-label="Search users by name or email"
						className="w-full rounded-full border py-2.5 pl-10 pr-4 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-1"
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search name or email"
						style={{
							borderColor: "var(--color-border)",
							backgroundColor: "var(--color-bg)",
							color: "var(--color-ink)",
						}}
						type="search"
						value={query}
					/>
				</div>
			</div>

			<CardShell>
				{isLoading ? (
					<div className="animate-pulse space-y-3 p-4">
						{[0, 1, 2, 3, 4].map((i) => (
							<div className="flex items-center gap-3" key={i}>
								<span
									className="h-9 w-9 rounded-full"
									style={{ backgroundColor: "var(--color-border)" }}
								/>
								<span
									className="h-3 flex-1 rounded"
									style={{ backgroundColor: "var(--color-border)" }}
								/>
							</div>
						))}
					</div>
				) : isError ? (
					<div className="py-10 text-center">
						<p
							className="text-[15px] font-semibold"
							style={{ color: "var(--color-ink)" }}
						>
							Couldn't load the user list
						</p>
						<p
							className="mt-1 text-[13px]"
							style={{ color: "var(--color-body)" }}
						>
							{(error as Error)?.message ??
								"Something went wrong reaching the login service."}
						</p>
						<button
							className="mt-4 rounded-full px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
							onClick={() => refetch()}
							style={{ backgroundColor: "var(--color-secondary)" }}
							type="button"
						>
							Retry
						</button>
					</div>
				) : users.length === 0 ? (
					<div className="py-12 text-center">
						<p
							className="text-[15px] font-semibold"
							style={{ color: "var(--color-ink)" }}
						>
							No users found
						</p>
						<p
							className="mx-auto mt-1 max-w-sm text-[13px]"
							style={{ color: "var(--color-body)" }}
						>
							No CASCADE users were returned by WorkOS.
						</p>
					</div>
				) : sorted.length === 0 ? (
					<div className="py-12 text-center">
						<p
							className="text-[15px] font-semibold"
							style={{ color: "var(--color-ink)" }}
						>
							No matches
						</p>
						<p
							className="mx-auto mt-1 max-w-sm text-[13px]"
							style={{ color: "var(--color-body)" }}
						>
							No users match “{query}”. Try a different name or email.
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px] border-collapse text-left">
							<thead>
								<tr
									className="border-b"
									style={{ borderColor: "var(--color-border)" }}
								>
									{COLUMNS.map((col) => (
										<SortHeader
											col={col}
											key={col.key}
											onSort={onSort}
											sort={sort}
										/>
									))}
								</tr>
							</thead>
							<tbody>
								{sorted.map((user) => (
									<RosterRow key={user.userId} user={user} />
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardShell>
		</div>
	);
}
