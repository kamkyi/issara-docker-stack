import { useEffect, useMemo, useState } from "react";
import type { BoardPost } from "$src/assets/mock/message-board";
import {
	useAckRoster,
	useGoingRoster,
	useReactionRoster,
	useRemindPartner,
} from "$src/queries/useMessageBoardMutations";
import { useActionStatus } from "$src/store/actionStatusStore";
import { emitNotifications } from "$src/utils/notificationEmit";
import { REACTION_EMOJI } from "../reactions";
import { I } from "./icons";

export type RosterMode = "ack" | "going" | "react";

interface RosterDrawerProps {
	post: BoardPost | null;
	open: boolean;
	onClose: () => void;
	// "ack" = acknowledgement roster (default); "going" = event RSVP roster.
	mode?: RosterMode;
}

type Filter = "all" | "done" | "pending";

// Per-mode copy so the drawer reads naturally as either roster.
const COPY: Record<
	RosterMode,
	{ kicker: string; doneVerb: string; doneLabel: string; pendingLabel: string }
> = {
	ack: {
		kicker: "Acknowledgement roster",
		doneVerb: "acknowledged",
		doneLabel: "Acknowledged",
		pendingLabel: "Pending",
	},
	going: {
		kicker: "Event RSVPs",
		doneVerb: "going",
		doneLabel: "Going",
		pendingLabel: "No response",
	},
	react: {
		kicker: "Reactions",
		doneVerb: "reacted",
		doneLabel: "Reacted",
		pendingLabel: "No reaction",
	},
};

export function RosterDrawer({
	post,
	open,
	onClose,
	mode = "ack",
}: RosterDrawerProps) {
	const [filter, setFilter] = useState<Filter>("all");
	const [q, setQ] = useState("");
	const [nudged, setNudged] = useState<Record<number, boolean>>({});
	const isGoing = mode === "going";
	const isReact = mode === "react";
	const isAck = mode === "ack";
	const copy = COPY[mode];

	// Only the active mode's query is enabled (the others are passed null).
	const ackQ = useAckRoster(open && isAck ? (post?.id ?? null) : null);
	const goingQ = useGoingRoster(open && isGoing ? (post?.id ?? null) : null);
	const reactQ = useReactionRoster(open && isReact ? (post?.id ?? null) : null);
	const isLoading = isReact
		? reactQ.isLoading
		: isGoing
			? goingQ.isLoading
			: ackQ.isLoading;
	const remindMut = useRemindPartner();
	const actionStatus = useActionStatus();

	useEffect(() => {
		if (open) {
			setFilter("all");
			setQ("");
			setNudged({});
		}
	}, [open, post?.id]);

	// Normalise every roster shape into a common row: done + on(date) +
	// reminded (+ emoji, react mode only).
	const rows = useMemo(() => {
		if (isReact) {
			return (reactQ.data?.roster ?? []).map((r) => ({
				id: r.id,
				org: r.org,
				initials: r.initials,
				color: r.color,
				done: r.reacted,
				on: r.reacted_on,
				reminded: false,
				remindedOn: null as string | null,
				emoji: r.emoji,
			}));
		}
		if (isGoing) {
			return (goingQ.data?.roster ?? []).map((r) => ({
				id: r.id,
				org: r.org,
				initials: r.initials,
				color: r.color,
				done: r.going,
				on: r.responded_on,
				reminded: r.reminded,
				remindedOn: r.reminded_on,
				emoji: null as string | null,
			}));
		}
		return (ackQ.data?.roster ?? []).map((r) => ({
			id: r.id,
			org: r.org,
			initials: r.initials,
			color: r.color,
			done: r.acked,
			on: r.acked_on,
			reminded: r.reminded,
			remindedOn: r.reminded_on,
			emoji: null as string | null,
		}));
	}, [isReact, isGoing, reactQ.data, goingQ.data, ackQ.data]);

	const total = isReact
		? (reactQ.data?.react_total ?? rows.length)
		: isGoing
			? (goingQ.data?.going_total ?? rows.length)
			: (ackQ.data?.ack_total ?? rows.length);
	const doneCount = isReact
		? (reactQ.data?.react_count ?? rows.filter((r) => r.done).length)
		: isGoing
			? (goingQ.data?.going_count ?? rows.filter((r) => r.done).length)
			: (ackQ.data?.ack_count ?? rows.filter((r) => r.done).length);
	const pending = rows.filter((r) => !r.done);
	// Pending orgs not yet reminded (persisted or this session) — drives the
	// "Remind all" affordance so it disappears once everyone's been nudged.
	const remindablePending = pending.filter((r) => !r.reminded && !nudged[r.id]);
	const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
	const C = 2 * Math.PI * 28;

	const shown = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return rows.filter((r) => {
			if (filter === "done" && !r.done) return false;
			if (filter === "pending" && r.done) return false;
			if (needle && !r.org.toLowerCase().includes(needle)) return false;
			return true;
		});
	}, [rows, filter, q]);

	// Send a real reminder notification to the partner org(s) so they're nudged
	// to acknowledge / RSVP. recipient_id is the strategic-partner id (roster
	// row id); fire-and-forget, then mark the row "Reminded".
	const remindMessage = isGoing
		? `Please RSVP to "${post?.title ?? "the event"}"`
		: `Please acknowledge "${post?.title ?? "the post"}"`;
	const sendRemind = (orgIds: number[], successMsg: string) => {
		if (!post || orgIds.length === 0) return;
		actionStatus.loading("Sending reminder…");
		// Persist the reminder (survives across sessions / staff) …
		remindMut.mutate(
			{ postId: post.id, strategicPartnerIds: orgIds },
			{
				onSuccess: () => actionStatus.success(successMsg),
				onError: () =>
					actionStatus.error("Could not send reminder — please try again"),
			},
		);
		// … and notify the partner org(s).
		emitNotifications(
			orgIds.map((id) => ({
				recipient_id: String(id),
				recipient_role: "buyer" as const,
				type: "MB_REMIND" as const,
				title: "Reminder from the Cascade team",
				message: remindMessage,
				data: {
					sender_name: "ILM Cascade Team",
					post_id: post.id,
					post_title: post.title,
					post_type: post.type,
				},
			})),
		);
	};

	const nudge = (id: number, name: string) => {
		setNudged((n) => ({ ...n, [id]: true }));
		sendRemind([id], `Reminder sent to ${name}`);
	};
	const nudgeAll = () => {
		// Only remind pending orgs that haven't already been reminded.
		const ids = pending
			.filter((p) => !p.reminded && !nudged[p.id])
			.map((p) => p.id);
		if (ids.length === 0) {
			actionStatus.success("All pending partners have already been reminded");
			return;
		}
		const next: Record<number, boolean> = {};
		ids.forEach((i) => {
			next[i] = true;
		});
		setNudged((x) => ({ ...x, ...next }));
		sendRemind(ids, `Reminder sent to ${ids.length} pending partners`);
	};

	return (
		<div
			className={`drawer-back${open ? " show" : ""}`}
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div
				className={`drawer${open ? " show" : ""}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className="drawer-head">
					<div className="dh-top">
						<span className="dh-kicker">{copy.kicker}</span>
						<button className="x" onClick={onClose} type="button">
							<I.x />
						</button>
					</div>
					<h3>{post?.title ?? ""}</h3>
				</div>

				<div className="rost-sum">
					<div className="ring">
						<svg
							aria-hidden="true"
							focusable="false"
							height="64"
							viewBox="0 0 64 64"
							width="64"
						>
							<title>{`${copy.doneVerb} progress`}</title>
							<circle
								cx="32"
								cy="32"
								fill="none"
								r="28"
								stroke="#EAF0F1"
								strokeWidth="8"
							/>
							<circle
								cx="32"
								cy="32"
								fill="none"
								r="28"
								stroke={pct === 100 ? "#1B9E63" : "var(--teal-600)"}
								strokeDasharray={C}
								strokeDashoffset={C * (1 - (total ? doneCount / total : 0))}
								strokeLinecap="round"
								strokeWidth="8"
								style={{ transition: "stroke-dashoffset .5s" }}
							/>
						</svg>
						<div className="rpct">{pct}%</div>
					</div>
					<div className="rs-meta">
						<div className="rs-big">
							{doneCount} of {total} {copy.doneVerb}
						</div>
						<div className="rs-sub">
							<I.clock /> {pending.length} {copy.pendingLabel.toLowerCase()}
							{isAck && post?.ackBy ? ` · due ${post.ackBy}` : ""}
						</div>
					</div>
					{!isReact && remindablePending.length > 0 && (
						<div className="remind-all">
							<button className="btn-remind" onClick={nudgeAll} type="button">
								<I.bell /> Remind all ({remindablePending.length})
							</button>
						</div>
					)}
				</div>

				<div className="rost-search">
					<I.search />
					<input
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search partners…"
						value={q}
					/>
				</div>

				<div className="rost-filter">
					{(
						[
							["all", "All", total],
							["done", copy.doneLabel, doneCount],
							["pending", copy.pendingLabel, pending.length],
						] as Array<[Filter, string, number]>
					).map(([key, label, count]) => (
						<button
							className={`rfchip${filter === key ? " on" : ""}`}
							key={key}
							onClick={() => setFilter(key)}
							type="button"
						>
							{label} <span className="c">{count}</span>
						</button>
					))}
				</div>

				<div className="rost-list">
					{isLoading ? (
						<div className="inbox-empty" style={{ border: 0 }}>
							<I.users />
							<p>Loading roster…</p>
						</div>
					) : (
						shown.map((r) => (
							<div className="rost-row" key={r.id}>
								<div className="rav" style={{ background: r.color }}>
									{r.initials}
								</div>
								<div className="rinfo">
									<div className="rorg">{r.org}</div>
								</div>
								<div className="rstatus">
									{isReact ? (
										r.done ? (
											<div className="badge-ack">
												<span className="roster-emoji">
													{r.emoji ? (REACTION_EMOJI[r.emoji] ?? "") : ""}
												</span>
												{copy.doneLabel}
												{r.on && <span className="on-date">{r.on}</span>}
											</div>
										) : (
											<div className="badge-none">{copy.pendingLabel}</div>
										)
									) : r.done ? (
										<div className="badge-ack">
											<I.checkCircle /> {copy.doneLabel}
											{r.on && <span className="on-date">{r.on}</span>}
										</div>
									) : nudged[r.id] || r.reminded ? (
										<div className="badge-reminded">
											<I.check /> Reminded
											{r.remindedOn && (
												<span className="on-date">{r.remindedOn}</span>
											)}
										</div>
									) : (
										<button
											className="btn-nudge"
											onClick={() => nudge(r.id, r.org)}
											type="button"
										>
											<I.bell /> Remind
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
