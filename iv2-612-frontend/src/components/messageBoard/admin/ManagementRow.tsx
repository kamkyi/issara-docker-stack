import * as RadixTooltip from "@radix-ui/react-tooltip";
import { type BoardPost, TYPE_LABEL } from "$src/assets/mock/message-board";
import type { PostState } from "$src/routes/message-board";
import { isCommentsEnabled } from "../featureFlags";
import { REACTIONS } from "../reactions";
import { postNeedsReply } from "./consoleHelpers";
import { I } from "./icons";

const Tooltip = ({
	content,
	children,
}: {
	content: string;
	children: React.ReactNode;
}) => (
	<RadixTooltip.Provider delayDuration={200}>
		<RadixTooltip.Root>
			<RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
			<RadixTooltip.Portal>
				<RadixTooltip.Content
					className="bg-[#004A60] text-white text-xs px-2.5 py-1.5 rounded shadow-lg border border-[#004A60] z-50 font-sans"
					sideOffset={6}
				>
					{content}
					<RadixTooltip.Arrow className="fill-[#004A60]" />
				</RadixTooltip.Content>
			</RadixTooltip.Portal>
		</RadixTooltip.Root>
	</RadixTooltip.Provider>
);

interface ManagementRowProps {
	post: BoardPost;
	st: PostState;
	onView: (post: BoardPost) => void;
	onRoster: (post: BoardPost) => void;
	onReactionRoster: (post: BoardPost) => void;
	onComments: (post: BoardPost) => void;
	onPin: (post: BoardPost) => void;
	onEdit: (post: BoardPost) => void;
	onDelete: (post: BoardPost) => void;
	reactionsEnabled: boolean;
}

export function ManagementRow({
	post,
	st,
	onView,
	onRoster,
	onReactionRoster,
	onComments,
	onPin,
	onEdit,
	onDelete,
	reactionsEnabled,
}: ManagementRowProps) {
	const status = post.status ?? "published";
	const ack = post.ackRequired;
	const total = post.ackTotal ?? 0;
	const acked = st?.ackCount ?? 0;
	const pct = ack && total > 0 ? Math.round((acked / total) * 100) : 0;
	const pending = ack ? Math.max(0, total - acked) : 0;
	const needsReply = postNeedsReply(st?.comments ?? []);

	// Reaction tally (from live reducer state, falling back to the fetched post).
	const reactionCounts = st?.reactionCounts ?? post.reactionCounts ?? {};
	const reactionTotal = Object.values(reactionCounts).reduce(
		(sum, n) => sum + (n || 0),
		0,
	);
	const showReactions = reactionsEnabled;

	return (
		<div className="mrow">
			<div className="mmain">
				<div className="mtop">
					{post.pinned && <I.pinAlt className="pin" />}
					<span className={`li-tag ${post.type}`}>{TYPE_LABEL[post.type]}</span>
					<span className={`status ${status}`}>
						{status.replace(/^./, (c) => c.toUpperCase())}
					</span>
				</div>
				<button
					className="mtitle mtitle-view"
					onClick={() => onView(post)}
					title="View as partner"
					type="button"
				>
					{post.title}
				</button>
				<div className="mmeta">
					<span>{post.author.name}</span>
					<span className="dotsep" />
					<span>{post.date || post.time}</span>
				</div>
			</div>

			<div className="ackcell">
				<div className="ack-data">
					{ack ? (
						<>
							<div className="acknum">
								{acked}
								<small>/ {total} acknowledged</small>
							</div>
							<div className="bar-wrap">
								<div
									className={`bar-fill${pct === 100 ? " full" : ""}`}
									style={{ width: `${pct}%` }}
								/>
							</div>
							{pending > 0 && post.ackBy && (
								<div className="ovr">
									<I.clock /> {pending} pending · due {post.ackBy}
								</div>
							)}
						</>
					) : post.type === "event" ? (
						<div className="goingnum">
							<I.users />
							{post.goingCount ?? 0}
							<small>going</small>
						</div>
					) : (
						<div className="acknone">No acknowledgement</div>
					)}
				</div>
				{showReactions && reactionTotal > 0 && (
					<div className="mrow-reactions reaction-summary">
						{REACTIONS.filter((r) => (reactionCounts[r.key] || 0) > 0).map(
							(r) => (
								<span className="reaction-chip" key={r.key} title={r.label}>
									<span className="reaction-emoji">{r.emoji}</span>
									{reactionCounts[r.key]}
								</span>
							),
						)}
					</div>
				)}
			</div>

			<div className="mact">
				<Tooltip content="View as partner">
					<button
						className="iconbtn"
						onClick={() => onView(post)}
						type="button"
					>
						<I.eye />
					</button>
				</Tooltip>
				{(ack || post.type === "event") && (
					<Tooltip content="Acknowledgment Roster">
						<button
							className="iconbtn"
							onClick={() => onRoster(post)}
							type="button"
						>
							<I.users />
						</button>
					</Tooltip>
				)}
				{showReactions && reactionTotal > 0 && (
					<Tooltip content="Reaction Roster">
						<button
							className="iconbtn"
							onClick={() => onReactionRoster(post)}
							type="button"
						>
							<I.smile />
						</button>
					</Tooltip>
				)}
				{isCommentsEnabled() && (
					<Tooltip content="Comments">
						<button
							className={`iconbtn${needsReply ? " has" : ""}`}
							onClick={() => onComments(post)}
							type="button"
						>
							<I.comment />
							{needsReply ? <span className="ind">!</span> : null}
						</button>
					</Tooltip>
				)}
				<Tooltip content="Edit">
					<button
						className="iconbtn"
						onClick={() => onEdit(post)}
						type="button"
					>
						<I.edit />
					</button>
				</Tooltip>
				<Tooltip content="Delete">
					<button
						className="iconbtn iconbtn-danger"
						onClick={() => {
							if (
								window.confirm(`Delete “${post.title}”? This cannot be undone.`)
							)
								onDelete(post);
						}}
						type="button"
					>
						<I.trash />
					</button>
				</Tooltip>
				<Tooltip content={post.pinned ? "Unpin" : "Pin to top"}>
					<button
						className="iconbtn"
						onClick={() => onPin(post)}
						style={
							post.pinned
								? {
										color: "var(--purple)",
										borderColor: "#E3D3EE",
										background: "#F7F1FB",
									}
								: undefined
						}
						type="button"
					>
						<I.pinAlt />
					</button>
				</Tooltip>
			</div>
		</div>
	);
}
