import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useFlags } from "flagsmith/react";
import type { IFlagsmithFeature } from "flagsmith/types";
import { AnimatePresence, motion } from "framer-motion";
import {
	type ReactNode,
	type SVGProps,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import {
	type BoardComment,
	type BoardDoc,
	type BoardEvent,
	type BoardPost,
	type PostType,
	TYPE_LABEL,
} from "$src/assets/mock/message-board";
import { AdminConsole } from "$src/components/messageBoard/admin/AdminConsole";
import { isCommentsEnabled } from "$src/components/messageBoard/featureFlags";
import { RichMessageBody } from "$src/components/messageBoard/RichMessageBody";
import {
	isReactionFeatureEnabled,
	MESSAGE_BOARD_REACTIONS_FLAG,
	REACTIONS,
} from "$src/components/messageBoard/reactions";
import { useStrategicPartners } from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import {
	colorFor,
	initialsOf,
	MESSAGE_BOARD_QUERY_KEY,
	STAFF_DISPLAY_NAME,
	STAFF_INITIALS,
	useMessageBoard,
} from "$src/queries/useMessageBoard";
import {
	useAcknowledgePost,
	useAddComment,
	useDeleteComment,
	useDeletePost,
	useMarkPostSeen,
	useReactToPost,
	useRsvpPost,
	useTogglePinPost,
} from "$src/queries/useMessageBoardMutations";
import { useActionStatus } from "$src/store/actionStatusStore";
import {
	type MessageBoardNotificationType,
	useNotificationStore,
} from "$src/store/notificationStore";
import { useViewModeStore } from "$src/store/viewModeStore";
import "$src/styles/message-board.css";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import {
	deleteMessageBoardPostNotifications,
	emitNotifications,
	ISSARA_STAFF_RECIPIENT,
} from "$src/utils/notificationEmit";

const ISSARA_STAFF_ROLES = new Set([
	"org-issara-staff",
	"org-issara-management",
]);

const BOARD_REFRESH_NOTIFICATION_TYPES = new Set<string>([
	"MB_POST",
	"MB_REPLY",
	"MB_COMMENT",
	"MB_RSVP",
	"MB_ACK",
	"MB_REACT",
	"MB_REMIND",
]);

const readCurrentUser = (): { id: number | null; isIssaraStaff: boolean } => {
	try {
		const raw = localStorage.getItem("auth_user");
		const u = raw ? JSON.parse(raw) : {};
		const id =
			typeof u?.id === "number"
				? u.id
				: typeof u?.user_id === "number"
					? u.user_id
					: null;
		const role: string | null =
			u?.role_slug ??
			(Array.isArray(u?.groups) && typeof u.groups[0] === "string"
				? u.groups[0]
				: null);
		return { id, isIssaraStaff: role ? ISSARA_STAFF_ROLES.has(role) : false };
	} catch {
		return { id: null, isIssaraStaff: false };
	}
};

// Find a comment by id anywhere in a post's comment tree (top-level or reply).
const findComment = (
	comments: BoardComment[],
	id: number,
): BoardComment | undefined => {
	for (const c of comments) {
		if (c.id === id) return c;
		const found = c.replies ? findComment(c.replies, id) : undefined;
		if (found) return found;
	}
	return undefined;
};

export const Route = createFileRoute("/message-board")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

/* ============================== Icons ============================== */
type IconProps = SVGProps<SVGSVGElement>;
const Icon = {
	smile: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Smile</title>
			<circle cx="12" cy="12" r="10" />
			<path d="M8 14s1.5 2 4 2 4-2 4-2" />
			<line x1="9" x2="9.01" y1="9" y2="9" />
			<line x1="15" x2="15.01" y1="9" y2="9" />
		</svg>
	),
	search: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Search</title>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" x2="16.65" y1="21" y2="16.65" />
		</svg>
	),
	pin: (p: IconProps) => (
		<svg fill="currentColor" viewBox="0 0 24 24" {...p}>
			<title>Pinned</title>
			<line
				stroke="currentColor"
				strokeWidth="2"
				x1="12"
				x2="12"
				y1="17"
				y2="22"
			/>
			<path
				d="M9 9V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5l2 3v2H7v-2z"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	),
	check: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2.4"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Check</title>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	),
	checkCircle: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Confirm</title>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	),
	verified: (p: IconProps) => (
		<svg fill="currentColor" viewBox="0 0 24 24" {...p}>
			<title>Verified</title>
			<path
				d="M12 1l2.4 1.8 3 .1 1 2.8 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16.5l.9-2.9-.9-2.9L5.6 8 6.6 5.2l3-.1L12 1z"
				opacity=".2"
			/>
			<path
				d="M9 12l2 2 4-4"
				fill="none"
				stroke="#fff"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2.2"
			/>
		</svg>
	),
	clock: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Deadline</title>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	),
	download: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Download</title>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" x2="12" y1="15" y2="3" />
		</svg>
	),
	eye: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Preview</title>
			<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	),
	doc: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Document</title>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	),
	comment: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Comments</title>
			<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
		</svg>
	),
	mapPin: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Location</title>
			<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	),
	x: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Close</title>
			<line x1="18" x2="6" y1="6" y2="18" />
			<line x1="6" x2="18" y1="6" y2="18" />
		</svg>
	),
	inbox: (p: IconProps) => (
		<svg
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
			viewBox="0 0 24 24"
			{...p}
		>
			<title>Empty</title>
			<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
			<path d="M5.5 5.5L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" />
		</svg>
	),
};

/* ============================== Data ============================== */

const CATS: Array<{ key: "all" | PostType; label: string }> = [
	{ key: "all", label: "All posts" },
	{ key: "announcement", label: "Announcements" },
	{ key: "report", label: "Documents" },
	{ key: "event", label: "Events" },
];

/* ============================== State ============================== */
export interface PostState {
	unread: boolean;
	acked: boolean;
	ackCount: number;
	going: boolean;
	comments: BoardComment[];
	userReaction: string | null;
	reactionCounts: Record<string, number>;
}
export type PostStateMap = Record<string, PostState>;

type Action =
	| { type: "ack"; id: string }
	| { type: "rsvp"; id: string }
	| { type: "react"; id: string; emoji: string }
	| { type: "restore"; id: string; postState: PostState }
	| { type: "read"; id: string }
	| { type: "markAll" }
	| { type: "reset"; posts: BoardPost[] };

function buildState(posts: BoardPost[]): PostStateMap {
	const st: PostStateMap = {};
	posts.forEach((p) => {
		st[p.id] = {
			unread: p.unread,
			acked: !!p.userHasAcked,
			ackCount: p.acked || 0,
			going: p.rsvpStatus === "going",
			comments: p.comments.slice(),
			userReaction: p.userReaction ?? null,
			reactionCounts: { ...(p.reactionCounts ?? {}) },
		};
	});
	return st;
}

function reducer(state: PostStateMap, action: Action): PostStateMap {
	if (action.type === "reset") return buildState(action.posts);
	if (action.type === "restore")
		return { ...state, [action.id]: action.postState };
	if (action.type === "markAll") {
		const next: PostStateMap = {};
		Object.keys(state).forEach((k) => {
			next[k] = { ...state[k], unread: false };
		});
		return next;
	}
	const cur = { ...state[action.id] };
	switch (action.type) {
		case "ack":
			cur.acked = true;
			cur.ackCount = (cur.ackCount || 0) + 1;
			cur.unread = false;
			break;
		case "rsvp":
			cur.going = !cur.going;
			cur.unread = false;
			break;
		case "react": {
			// Facebook-style one-per-user: clicking the active emoji removes it,
			// otherwise switch to the new emoji (decrement old, increment new).
			const counts = { ...cur.reactionCounts };
			const prev = cur.userReaction;
			if (prev) counts[prev] = Math.max(0, (counts[prev] || 0) - 1);
			if (prev === action.emoji) {
				cur.userReaction = null;
			} else {
				counts[action.emoji] = (counts[action.emoji] || 0) + 1;
				cur.userReaction = action.emoji;
			}
			cur.reactionCounts = counts;
			cur.unread = false;
			break;
		}
		case "read":
			cur.unread = false;
			break;
	}
	return { ...state, [action.id]: cur };
}

/* ============================== Sub-components ============================== */
function Author({ a, time }: { a: BoardPost["author"]; time: string }) {
	return (
		<div className="author">
			<div className="av person" style={{ background: a.color }}>
				{a.initials}
			</div>
			<div>
				<div className="nm">
					{a.name} <Icon.verified className="verified" />
				</div>
				<div className="meta">
					{a.role ? `${a.role} · ` : ""}
					{a.isStaff ? time : `ILM Cascade Team · ${time}`}
				</div>
			</div>
		</div>
	);
}

function DocAttach({
	doc,
	onPreview,
}: {
	doc: BoardDoc;
	onPreview: (doc: BoardDoc, download?: boolean) => void;
}) {
	const ext = doc.kind === "pdf" ? "PDF" : "XLSX";
	return (
		<div className="doc">
			<div className={`ic ${doc.kind}`}>
				<Icon.doc />
				<span className="ext">{ext}</span>
			</div>
			<div className="dmeta">
				<div className="fn">{doc.name}</div>
				<div className="fs">{doc.size}</div>
			</div>
			<div className="dl">
				<button
					className="btn-ghost"
					onClick={() => onPreview(doc)}
					type="button"
				>
					<Icon.eye /> Preview
				</button>
				<button
					className="btn-ghost"
					onClick={() => onPreview(doc, true)}
					type="button"
				>
					<Icon.download /> Download
				</button>
			</div>
		</div>
	);
}

function EventBox({
	event,
	going,
	onRsvp,
}: {
	event: BoardEvent;
	going: boolean;
	onRsvp: () => void;
}) {
	return (
		<div className="event-box">
			<div className="cal">
				<div className="m">{event.month}</div>
				<div className="d">{event.day}</div>
			</div>
			<div className="ev-meta">
				<div className="ev-when">{event.when}</div>
				<div className="ev-where">
					<Icon.mapPin /> {event.where}
				</div>
			</div>
			<div className="rsvp">
				<button
					className={`btn-rsvp${going ? " going" : ""}`}
					onClick={onRsvp}
					type="button"
				>
					{going ? (
						<>
							<Icon.check /> You're going
						</>
					) : (
						"RSVP"
					)}
				</button>
			</div>
		</div>
	);
}

interface CommentRowProps {
	c: BoardComment;
	currentUserId: number | null;
	isIssaraStaff: boolean;
	onReply?: (commentId: number) => void;
	onDelete?: (commentId: number) => void;
	isReply?: boolean;
}

function CommentRow({
	c,
	currentUserId,
	isIssaraStaff,
	onReply,
	onDelete,
	isReply,
}: CommentRowProps) {
	const parts = c.text.split(/(@[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g);
	return (
		<div className={isReply ? "cmt cmt-reply" : "cmt"}>
			<div className="cav" style={{ background: c.color }}>
				{c.initials}
			</div>
			<div className="cbody">
				<div className="cmeta">
					<span className="who">{c.who}</span>
					{c.role && <span className="role">{c.role}</span>}
					<span className="when">{c.when}</span>
				</div>
				<div className="ctext">
					{parts.map((p, i) =>
						p.startsWith("@") ? (
							<span className="mention" key={`${c.who}-mention-${i}`}>
								{p}
							</span>
						) : (
							<span key={`${c.who}-text-${i}`}>{p}</span>
						),
					)}
				</div>
				<div className="cmt-actions">
					{!isReply && onReply && typeof c.id === "number" && (
						<button
							className="cmt-action"
							onClick={() => onReply(c.id as number)}
							type="button"
						>
							Reply
						</button>
					)}
				</div>
				{c.replies && c.replies.length > 0 && (
					<div className="cmt-replies">
						{c.replies.map((r, i) => (
							<CommentRow
								c={r}
								currentUserId={currentUserId}
								isIssaraStaff={isIssaraStaff}
								isReply
								key={r.id ?? `${c.id}-reply-${i}`}
								onDelete={onDelete}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface CommentsBoxProps {
	postId: string;
	comments: BoardComment[];
	currentUserId: number | null;
	isIssaraStaff: boolean;
	onAdd: (postId: string, text: string, parentId: number | null) => void;
	onDelete: (commentId: number) => void;
	currentUserInitials: string;
	currentUserColor: string;
}

function CommentsBox({
	postId,
	comments,
	currentUserId,
	isIssaraStaff,
	onAdd,
	onDelete,
	currentUserInitials,
	currentUserColor,
}: CommentsBoxProps) {
	const [val, setVal] = useState("");
	const [replyTo, setReplyTo] = useState<number | null>(null);
	const ref = useRef<HTMLTextAreaElement>(null);
	const submit = () => {
		if (!val.trim()) return;
		onAdd(postId, val.trim(), replyTo);
		setVal("");
		setReplyTo(null);
		if (ref.current) ref.current.style.height = "44px";
	};
	const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
	};
	return (
		<div className="comments">
			{comments.map((c, i) => (
				<CommentRow
					c={c}
					currentUserId={currentUserId}
					isIssaraStaff={isIssaraStaff}
					key={c.id ?? `${postId}-c-${i}`}
					onDelete={onDelete}
					onReply={(id) => {
						setReplyTo(id);
						ref.current?.focus();
					}}
				/>
			))}
			<div className="cmt-add">
				<div className="cav" style={{ background: currentUserColor }}>
					{currentUserInitials}
				</div>
				<div style={{ flex: 1 }}>
					{replyTo !== null && (
						<div className="cmt-reply-banner">
							Replying to comment
							<button
								className="cmt-action"
								onClick={() => setReplyTo(null)}
								style={{ marginLeft: 8 }}
								type="button"
							>
								Cancel
							</button>
						</div>
					)}
					<textarea
						onChange={(e) => {
							setVal(e.target.value);
							e.target.style.height = "44px";
							e.target.style.height = `${e.target.scrollHeight}px`;
						}}
						onKeyDown={onKey}
						placeholder={
							replyTo !== null
								? "Write your reply…"
								: "Add a comment for the CASCADE team…"
						}
						ref={ref}
						value={val}
					/>
				</div>
				<button
					className="btn-send"
					disabled={!val.trim()}
					onClick={submit}
					type="button"
				>
					{replyTo !== null ? "Reply" : "Post"}
				</button>
			</div>
		</div>
	);
}

interface StaffMenuProps {
	pinned: boolean;
	onTogglePin: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

function StaffMenu({
	pinned,
	onTogglePin,
	onEdit,
	onDelete,
}: StaffMenuProps): ReactNode {
	const [open, setOpen] = useState(false);
	return (
		<div className="post-menu" style={{ position: "relative" }}>
			<button
				aria-label="Post actions"
				className="post-menu-trigger"
				onBlur={() => setTimeout(() => setOpen(false), 120)}
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				⋯
			</button>
			{open && (
				<div className="post-menu-dropdown">
					<button
						className="post-menu-item"
						onClick={() => {
							setOpen(false);
							onTogglePin();
						}}
						type="button"
					>
						{pinned ? "Unpin" : "Pin to top"}
					</button>
					<button
						className="post-menu-item"
						onClick={() => {
							setOpen(false);
							onEdit();
						}}
						type="button"
					>
						Edit
					</button>
					<button
						className="post-menu-item post-menu-item-danger"
						onClick={() => {
							setOpen(false);
							if (window.confirm("Delete this post? This cannot be undone."))
								onDelete();
						}}
						type="button"
					>
						Delete
					</button>
				</div>
			)}
		</div>
	);
}

interface PostCardProps {
	post: BoardPost;
	state: PostStateMap;
	onAck: (postId: string) => void;
	onRsvp: (postId: string) => void;
	onReact: (postId: string, emoji: string) => void;
	reactionsEnabled: boolean;
	onPreview: (doc: BoardDoc, download?: boolean) => void;
	compact?: boolean;
	currentUserId: number | null;
	isIssaraStaff: boolean;
	currentUserInitials: string;
	currentUserColor: string;
	onAddComment: (postId: string, text: string, parentId: number | null) => void;
	onDeleteComment: (commentId: number) => void;
	onTogglePin?: (postId: string, pinned: boolean) => void;
	onEdit?: (postId: string) => void;
	onDeletePost?: (postId: string) => void;
	canManagePosts: boolean;
}

function PostCard({
	post,
	state,
	onAck,
	onRsvp,
	onReact,
	reactionsEnabled,
	onPreview,
	compact,
	onTogglePin,
	onEdit,
	onDeletePost,
	canManagePosts,
	currentUserId,
	isIssaraStaff,
	currentUserInitials,
	currentUserColor,
	onAddComment,
	onDeleteComment,
}: PostCardProps) {
	const s = state[post.id];
	const [showComments, setShowComments] = useState(
		post.comments.length > 0 && !compact,
	);
	const comments = post.comments;
	const acked = s.acked;

	return (
		<article className={`post${s.unread ? " unread" : ""}`}>
			{post.pinned && (
				<div className="post-pin">
					<Icon.pin /> Pinned by CASCADE team
				</div>
			)}
			<div className="post-body">
				<div className="post-top">
					<Author a={post.author} time={post.time} />
					<div className="post-actions">
						{canManagePosts && onTogglePin && onEdit && onDeletePost && (
							<StaffMenu
								onDelete={() => onDeletePost(post.id)}
								onEdit={() => onEdit(post.id)}
								onTogglePin={() => onTogglePin(post.id, !post.pinned)}
								pinned={post.pinned}
							/>
						)}
						<span className={`tag ${post.type}`}>{TYPE_LABEL[post.type]}</span>
					</div>
				</div>
				<h3>
					{post.title}
					{s.unread && <span className="newdot" title="Unread" />}
				</h3>
				<RichMessageBody compact={compact} html={post.body} />

				{post.image &&
					(typeof post.image === "string" ? (
						<div className="imgslot imgslot-has">
							<img alt="Post banner" src={post.image} />
						</div>
					) : (
						<div className="imgslot">
							<span>image placeholder · drag in a graphic</span>
						</div>
					))}
				{post.attachments?.map((d) => (
					<DocAttach doc={d} key={d.id ?? d.name} onPreview={onPreview} />
				))}
				{post.event && (
					<EventBox
						event={post.event}
						going={s.going}
						onRsvp={() => onRsvp(post.id)}
					/>
				)}
			</div>

			{reactionsEnabled && (
				<div className="reactions">
					<Popover.Root>
						<Popover.Trigger asChild>
							<button
								aria-label="Add reaction"
								className="reaction-popover-trigger"
								type="button"
							>
								<Icon.smile style={{ width: 16, height: 16, marginRight: 6 }} />{" "}
								React
							</button>
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Content
								align="start"
								className="reaction-popover-content"
								side="top"
								sideOffset={8}
							>
								{REACTIONS.map((r) => (
									<motion.button
										aria-label={`React with ${r.label}`}
										aria-pressed={s.userReaction === r.key}
										className={`reaction-btn${s.userReaction === r.key ? " on" : ""}`}
										key={r.key}
										onClick={() => onReact(post.id, r.key)}
										title={r.label}
										type="button"
										whileHover={{ scale: 1.15 }}
										whileTap={{ scale: 0.9 }}
									>
										<span className="reaction-emoji">{r.emoji}</span>
									</motion.button>
								))}
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
					{Object.entries(s.reactionCounts).some(([, n]) => n > 0) && (
						<div className="reaction-summary">
							<AnimatePresence>
								{REACTIONS.filter(
									(r) => (s.reactionCounts[r.key] || 0) > 0,
								).map((r) => (
									<motion.span
										animate={{ opacity: 1, scale: 1 }}
										className={`reaction-chip ${s.userReaction === r.key ? "reaction-chip-self" : ""}`}
										exit={{ opacity: 0, scale: 0.8 }}
										initial={{ opacity: 0, scale: 0.8 }}
										key={r.key}
										title={
											s.userReaction === r.key
												? `You and ${(s.reactionCounts[r.key] || 0) - 1} others reacted`
												: `${s.reactionCounts[r.key]} reactions`
										}
										transition={{ duration: 0.2 }}
									>
										{r.emoji} {s.reactionCounts[r.key]}
									</motion.span>
								))}
							</AnimatePresence>
						</div>
					)}
				</div>
			)}

			<div className="post-foot">
				{post.ackRequired ? (
					<div className="ack">
						<motion.button
							className={`btn-ack${acked ? " done" : ""}`}
							layout
							onClick={() => !acked && onAck(post.id)}
							type="button"
							whileTap={!acked ? { scale: 0.95 } : {}}
						>
							<AnimatePresence initial={false} mode="popLayout">
								{acked ? (
									<motion.span
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										initial={{ opacity: 0, y: -10 }}
										key="acked"
										style={{ display: "flex", alignItems: "center", gap: 6 }}
										transition={{ duration: 0.2 }}
									>
										<Icon.check /> Acknowledged
									</motion.span>
								) : (
									<motion.span
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -10 }}
										initial={{ opacity: 0, y: 10 }}
										key="ack"
										style={{ display: "flex", alignItems: "center", gap: 6 }}
										transition={{ duration: 0.2 }}
									>
										<Icon.checkCircle /> Acknowledge receipt
									</motion.span>
								)}
							</AnimatePresence>
						</motion.button>
						{!acked ? (
							<span className="ack-req">
								<Icon.clock /> Confirm by {post.ackBy}
							</span>
						) : (
							<span className="ack-meta">You confirmed receipt</span>
						)}
						{canManagePosts && (
							<span className="ack-meta">
								<b>{s.ackCount}</b> of {post.ackTotal} partners confirmed
							</span>
						)}
					</div>
				) : (
					<span className="ack-meta">No acknowledgement required</span>
				)}

				{isCommentsEnabled() && (
					<div className="foot-actions">
						<button
							className={`foot-btn${showComments ? " on" : ""}`}
							onClick={() => setShowComments((v) => !v)}
							type="button"
						>
							<Icon.comment /> {comments.length}{" "}
							{comments.length === 1 ? "comment" : "comments"}
						</button>
					</div>
				)}
			</div>

			{isCommentsEnabled() &&
				(showComments ? (
					<CommentsBox
						comments={comments}
						currentUserColor={currentUserColor}
						currentUserId={currentUserId}
						currentUserInitials={currentUserInitials}
						isIssaraStaff={isIssaraStaff}
						onAdd={onAddComment}
						onDelete={onDeleteComment}
						postId={post.id}
					/>
				) : (
					comments.length > 0 && (
						<button
							className="cmt-collapsed"
							onClick={() => setShowComments(true)}
							type="button"
						>
							<Icon.comment /> View {comments.length}{" "}
							{comments.length === 1 ? "comment" : "comments"}
						</button>
					)
				))}
		</article>
	);
}

function ListItem({
	post,
	state,
	selected,
	onClick,
}: {
	post: BoardPost;
	state: PostStateMap;
	selected: boolean;
	onClick: () => void;
}) {
	const s = state[post.id];
	return (
		<button
			className={`li${selected ? " sel" : ""}${s.unread ? " unread" : ""}`}
			onClick={onClick}
			style={{ textAlign: "left", width: "100%" }}
			type="button"
		>
			<div className="li-top">
				{s.unread && <span className="li-dot" />}
				<span className={`li-tag ${post.type}`}>{TYPE_LABEL[post.type]}</span>
				{post.pinned && <Icon.pin className="pin" />}
			</div>
			<h4>{post.title}</h4>
			<div className="li-meta">
				<span className="mi">
					{post.author.initials} · {post.time}
				</span>
				{post.comments.length > 0 && (
					<span className="mi">
						<Icon.comment /> {post.comments.length}
					</span>
				)}
				{post.ackRequired && !s.acked && (
					<span className="mi" style={{ color: "#B26A1A" }}>
						<Icon.clock /> action
					</span>
				)}
			</div>
		</button>
	);
}

/* ============================== App ============================== */
const EMPTY_POSTS: BoardPost[] = [];
const SIDEBAR_PAGE_SIZE = 5;
const UNREAD_ONLY_STORAGE_KEY = "messageBoard.unreadOnly";

const readStoredUnreadOnly = () => {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage.getItem(UNREAD_ONLY_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
};

function RouteComponent(): ReactNode {
	const queryClient = useQueryClient();
	const {
		data: allPosts = EMPTY_POSTS,
		isLoading,
		isError,
	} = useMessageBoard();
	const unreadBoardNotificationSignal = useNotificationStore((s) =>
		s.notifications
			.filter((n) => BOARD_REFRESH_NOTIFICATION_TYPES.has(n.type))
			.map((n) => `${n.id}:${n.updatedAt}`)
			.join("|"),
	);
	const navigate = useNavigate();
	const ackMut = useAcknowledgePost();
	const rsvpMut = useRsvpPost();
	const reactMut = useReactToPost();
	const seenMut = useMarkPostSeen();

	const reactionFlags = useFlags([MESSAGE_BOARD_REACTIONS_FLAG]) as Record<
		string,
		IFlagsmithFeature | undefined
	>;
	const reactionsEnabled = isReactionFeatureEnabled(
		reactionFlags[MESSAGE_BOARD_REACTIONS_FLAG],
	);
	const addCommentMut = useAddComment();
	const deleteCommentMut = useDeleteComment();
	const togglePinMut = useTogglePinPost();
	const deletePostMut = useDeletePost();

	const currentUser = useMemo(readCurrentUser, []);
	const viewMode = useViewModeStore((s) => s.viewMode);
	const actionStatus = useActionStatus();
	const { isGlobalPartner, partnerId } = getUserIdentifiers();
	// Issara staff/management are flagged as test users, so getUserIdentifiers
	// hands them a mock partner id. Never attribute their board actions to a
	// partner org — they act as the Cascade team.
	const actingPartnerId = currentUser.isIssaraStaff ? null : partnerId;
	const isBuyerContext = isGlobalPartner || viewMode === "buyer-view";
	// Issara staff/management in their own (ilm) view get the Team Console — an
	// admin panel distinct from the read-only partner board. Staff previewing
	// the buyer/SP UI (buyer-view) still see the partner experience.
	const isTeamConsole = currentUser.isIssaraStaff && viewMode === "ilm-view";
	// Staff authoring (Unpin/Edit/Delete, New post, partner-confirmation count)
	// is hidden whenever we are showing the buyer / strategic-partner UI —
	// including when Issara staff preview it via the buyer-view toggle.
	const canManagePosts = currentUser.isIssaraStaff && !isBuyerContext;
	// Resolve the active Strategic Partner's display name so the comment composer
	// presents the partner org — matching how posted comments are attributed —
	// rather than the individual signed-in user.
	const { data: spData } = useStrategicPartners();
	const partnerName = useMemo(() => {
		if (!partnerId || !Array.isArray(spData)) return "";
		return spData.find((p) => p.id === partnerId)?.name ?? "";
	}, [spData, partnerId]);

	// Avatar shown next to the comment box. Mirror CommentRow's design: staff are
	// the Cascade team (CT), partners are their SP org (name initials + the same
	// colour palette keyed off the partner id).
	const currentUserDisplay = useMemo(() => {
		if (currentUser.isIssaraStaff) {
			return {
				name: STAFF_DISPLAY_NAME,
				initials: STAFF_INITIALS,
				color: colorFor(STAFF_DISPLAY_NAME),
			};
		}
		if (partnerName) {
			return {
				name: partnerName,
				initials: initialsOf(partnerName),
				color: colorFor(partnerId),
			};
		}
		return { name: "", initials: "ME", color: "#3f7e8c" };
	}, [currentUser.isIssaraStaff, partnerName, partnerId]);

	const [state, dispatch] = useReducer(reducer, EMPTY_POSTS, buildState);
	const [cat, setCat] = useState<"all" | PostType>("all");
	const [q, setQ] = useState("");
	const [unreadOnly, setUnreadOnly] = useState(readStoredUnreadOnly);
	const [preview, setPreview] = useState<BoardDoc | null>(null);
	const [sel, setSel] = useState<string>("");
	const [visibleCount, setVisibleCount] = useState<number>(SIDEBAR_PAGE_SIZE);
	const [unreadOnlyPostIds, setUnreadOnlyPostIds] =
		useState<Set<string> | null>(null);
	const seededFor = useRef<BoardPost[] | null>(null);
	const postParamApplied = useRef(false);
	const lastBoardNotificationSignal = useRef("");

	useEffect(() => {
		if (!unreadBoardNotificationSignal) {
			lastBoardNotificationSignal.current = "";
			return;
		}
		if (lastBoardNotificationSignal.current === unreadBoardNotificationSignal) {
			return;
		}
		lastBoardNotificationSignal.current = unreadBoardNotificationSignal;
		queryClient.invalidateQueries({
			queryKey: [MESSAGE_BOARD_QUERY_KEY],
			refetchType: "active",
		});
	}, [queryClient, unreadBoardNotificationSignal]);

	useEffect(() => {
		try {
			window.localStorage.setItem(UNREAD_ONLY_STORAGE_KEY, String(unreadOnly));
		} catch {
			// Ignore storage failures; the toggle still works for this session.
		}
	}, [unreadOnly]);

	// Honour a ?post=<id> deep-link (e.g. from a notification click) once posts
	// load, selecting that post in the reader.
	useEffect(() => {
		if (postParamApplied.current || allPosts.length === 0) return;
		const wanted = new URLSearchParams(window.location.search).get("post");
		if (wanted && allPosts.some((p) => p.id === wanted)) {
			setSel(wanted);
		}
		postParamApplied.current = true;
	}, [allPosts]);

	// Reset the sidebar paging back to the first page when the filter inputs
	// change so users don't see an empty list after narrowing the results.
	useEffect(() => {
		setVisibleCount(SIDEBAR_PAGE_SIZE);
	}, [cat, q, unreadOnly]);

	useEffect(() => {
		if (!unreadOnly) {
			setUnreadOnlyPostIds(null);
			return;
		}
		if (allPosts.length === 0 || allPosts.some((p) => !state[p.id])) return;
		setUnreadOnlyPostIds((current) => {
			if (current) return current;
			return new Set(
				allPosts.filter((p) => state[p.id]?.unread).map((p) => p.id),
			);
		});
	}, [allPosts, state, unreadOnly]);

	// Re-seed reducer state synchronously when posts arrive / change. Dispatching
	// during render makes React drop the current pass and re-render with the
	// reset state, so consumers never read state[id] before it's populated.
	if (seededFor.current !== allPosts) {
		seededFor.current = allPosts;
		dispatch({ type: "reset", posts: allPosts });
		setSel((current) => current || (unreadOnly ? "" : allPosts[0]?.id || ""));
	}

	// Partner org name from a mutation response — ack/RSVP return
	// `acting_partner_name`, a created comment returns `strategic_partner_name`.
	// Notifications name the PARTNER, not the individual user who acted.
	const partnerNameFrom = (resp: unknown): string => {
		if (resp && typeof resp === "object") {
			const r = resp as {
				acting_partner_name?: string | null;
				strategic_partner_name?: string | null;
			};
			return (
				r.acting_partner_name ||
				r.strategic_partner_name ||
				"A strategic partner"
			);
		}
		return "A strategic partner";
	};

	// Fire-and-forget cross-notification for a board action. Staff-directed
	// events (comment/rsvp/ack) go to the Issara staff sentinel; the one
	// partner-directed reader event (a staff reply) targets the post's partner
	// org. `senderName` is the PARTNER org name for partner→staff events (not the
	// individual user) and "ILM Cascade Team" for the staff reply. Never throws —
	// emitNotifications swallows all errors.
	const emitBoardNotification = (
		post: BoardPost | undefined,
		type: MessageBoardNotificationType,
		title: string,
		message: string,
		senderName: string,
		commentId?: number,
		replyPartnerId?: number | null,
	) => {
		if (!post) return;
		const data = {
			sender_name: senderName,
			sender_id: actingPartnerId ?? currentUser.id ?? undefined,
			post_id: post.id,
			post_title: post.title,
			post_type: post.type,
			...(commentId != null ? { comment_id: commentId } : {}),
		};
		if (type === "MB_REPLY") {
			// Staff reply → notify the partner being replied to (the commenter's
			// org), falling back to the post's partner. On a broadcast post with no
			// resolvable partner there's no single recipient, so skip.
			const target = replyPartnerId ?? post.strategicPartnerId;
			if (target == null) return;
			emitNotifications({
				recipient_id: String(target),
				recipient_role: "buyer",
				type,
				title,
				message,
				data,
			});
			return;
		}
		emitNotifications({
			recipient_id: ISSARA_STAFF_RECIPIENT,
			recipient_role: "staff",
			type,
			title,
			message,
			data,
		});
	};

	const handleAck = (postId: string) => {
		if (state[postId]?.acked) return;
		dispatch({ type: "ack", id: postId });
		actionStatus.loading("Recording acknowledgement…");
		ackMut.mutate(
			{ postId, strategicPartnerId: actingPartnerId },
			{
				onSuccess: (data) => {
					actionStatus.success("Receipt acknowledged");
					const post = allPosts.find((p) => p.id === postId);
					const partner = partnerNameFrom(data);
					emitBoardNotification(
						post,
						"MB_ACK",
						`${partner} acknowledged a post`,
						`${partner} acknowledged "${post?.title ?? "a post"}"`,
						partner,
					);
				},
				onError: () =>
					actionStatus.error("Could not acknowledge — please try again"),
			},
		);
	};

	const handleRsvp = (postId: string) => {
		const going = state[postId]?.going;
		const nextStatus: "going" | "not_going" = going ? "not_going" : "going";
		dispatch({ type: "rsvp", id: postId });
		actionStatus.loading("Updating RSVP…");
		rsvpMut.mutate(
			{ postId, status: nextStatus, strategicPartnerId: actingPartnerId },
			{
				onSuccess: (data) => {
					actionStatus.success(
						nextStatus === "going" ? "You're going" : "RSVP updated",
					);
					// Only the affirmative "going" is worth notifying staff about.
					if (nextStatus !== "going") return;
					const post = allPosts.find((p) => p.id === postId);
					const partner = partnerNameFrom(data);
					emitBoardNotification(
						post,
						"MB_RSVP",
						`${partner} is going to an event`,
						`${partner} is going to "${post?.title ?? "an event"}"`,
						partner,
					);
				},
				onError: () => {
					dispatch({ type: "rsvp", id: postId });
					actionStatus.error("Could not update RSVP — please try again");
				},
			},
		);
	};

	const handleReact = (postId: string, emoji: string) => {
		const prevState = state[postId];
		if (!prevState) return;
		// Toggling off the active emoji sends null; otherwise send the new emoji.
		const nextEmoji = prevState.userReaction === emoji ? null : emoji;
		dispatch({ type: "react", id: postId, emoji });
		reactMut.mutate(
			{ postId, emoji: nextEmoji, strategicPartnerId: actingPartnerId },
			{
				onSuccess: (data) => {
					// Removing a reaction (toggle-off) shouldn't notify staff.
					if (!nextEmoji) return;
					const post = allPosts.find((p) => p.id === postId);
					const partner = partnerNameFrom(data);
					const label = REACTIONS.find((r) => r.key === nextEmoji)?.emoji ?? "";
					emitBoardNotification(
						post,
						"MB_REACT",
						`${partner} reacted ${label}`.trim(),
						`${partner} reacted ${label} to "${post?.title ?? "a post"}"`,
						partner,
					);
				},
				onError: () => {
					// Restore the exact pre-click state (react isn't a pure toggle).
					dispatch({ type: "restore", id: postId, postState: prevState });
					actionStatus.error("Could not save your reaction — please try again");
				},
			},
		);
	};

	const handleMarkSeen = (postId: string) => {
		if (!state[postId]?.unread) return;
		dispatch({ type: "read", id: postId });
		seenMut.mutate({ postId, strategicPartnerId: actingPartnerId });
	};

	const handleAddComment = (
		postId: string,
		text: string,
		parentId: number | null,
	) => {
		actionStatus.loading(
			parentId !== null ? "Posting reply…" : "Posting comment…",
		);
		addCommentMut.mutate(
			{
				postId,
				body: text,
				parentCommentId: parentId,
				strategicPartnerId: actingPartnerId,
			},
			{
				onSuccess: (created) => {
					actionStatus.success(
						parentId !== null ? "Reply posted" : "Comment posted",
					);
					const post = allPosts.find((p) => p.id === postId);
					const commentId =
						created && typeof created === "object"
							? (created as { id?: number }).id
							: undefined;
					const snippet = text.length > 120 ? `${text.slice(0, 117)}…` : text;
					if (currentUser.isIssaraStaff) {
						// Staff reply → notify the partner being replied to (the
						// commenter's org), so it lands even on a broadcast post.
						const parent =
							parentId != null && post
								? findComment(post.comments, parentId)
								: undefined;
						emitBoardNotification(
							post,
							"MB_REPLY",
							"Cascade Team replied",
							snippet,
							"ILM Cascade Team",
							commentId,
							parent?.strategicPartnerId ?? null,
						);
					} else {
						// Partner comment/reply → notify Issara staff, named by the
						// PARTNER org (from the created comment), not the user.
						const partner = partnerNameFrom(created);
						emitBoardNotification(
							post,
							"MB_COMMENT",
							parentId !== null
								? `${partner} replied`
								: `New comment from ${partner}`,
							snippet,
							partner,
							commentId,
						);
					}
				},
				onError: () => actionStatus.error("Could not post — please try again"),
			},
		);
	};

	const handleDeleteComment = (commentId: number) => {
		actionStatus.loading("Deleting comment…");
		deleteCommentMut.mutate(commentId, {
			onSuccess: () => actionStatus.success("Comment deleted"),
			onError: () => actionStatus.error("Could not delete — please try again"),
		});
	};

	const handleTogglePin = (postId: string, pinned: boolean) => {
		actionStatus.loading(pinned ? "Pinning post…" : "Unpinning post…");
		togglePinMut.mutate(
			{ postId, pinned },
			{
				onSuccess: () =>
					actionStatus.success(pinned ? "Post pinned" : "Post unpinned"),
				onError: () =>
					actionStatus.error("Could not update pin — please try again"),
			},
		);
	};

	const handleEdit = (postId: string) => {
		navigate({
			to: "/message-board/$postId/edit",
			params: { postId },
		});
	};

	const handleDeletePost = (postId: string) => {
		actionStatus.loading("Deleting post…");
		deletePostMut.mutate(postId, {
			onSuccess: () => {
				void deleteMessageBoardPostNotifications(postId);
				actionStatus.success("Post deleted");
			},
			onError: () => actionStatus.error("Could not delete — please try again"),
		});
	};

	const handleMarkAllRead = () => {
		const unreadIds = Object.entries(state)
			.filter(([, s]) => s.unread)
			.map(([id]) => id);
		dispatch({ type: "markAll" });
		for (const id of unreadIds) {
			seenMut.mutate({ postId: id, strategicPartnerId: actingPartnerId });
		}
		actionStatus.success("All posts marked as read");
	};

	const handleToggleUnreadOnly = () => {
		setUnreadOnly((current) => {
			const next = !current;
			if (next) {
				setSel("");
				setUnreadOnlyPostIds(
					new Set(allPosts.filter((p) => state[p.id]?.unread).map((p) => p.id)),
				);
			} else {
				setUnreadOnlyPostIds(null);
				setSel((selected) => selected || allPosts[0]?.id || "");
			}
			return next;
		});
	};

	const onPreview = (doc: BoardDoc, download?: boolean) => {
		if (download) {
			if (doc.url) {
				const a = document.createElement("a");
				a.href = doc.url;
				a.download = doc.name || "";
				a.rel = "noopener";
				// Same-origin downloads honour `download`; cross-origin (S3) will
				// open in a new tab unless the server sends Content-Disposition.
				a.target = "_blank";
				document.body.appendChild(a);
				a.click();
				a.remove();
				actionStatus.success(`Downloading ${doc.name}…`);
			} else {
				actionStatus.error("This attachment has no file to download.");
			}
			return;
		}
		if (doc.url) {
			window.open(doc.url, "_blank", "noopener,noreferrer");
			return;
		}
		setPreview(doc);
	};

	const counts = useMemo(() => {
		const c: Record<string, number> = { all: allPosts.length };
		allPosts.forEach((p) => {
			c[p.type] = (c[p.type] || 0) + 1;
		});
		return c;
	}, [allPosts]);
	const unreadCount = Object.values(state).filter((s) => s.unread).length;

	const posts = useMemo(() => {
		let list = allPosts.filter((p) => {
			if (cat !== "all" && p.type !== cat) return false;
			if (unreadOnly) {
				const matchesUnreadFilter = unreadOnlyPostIds
					? unreadOnlyPostIds.has(p.id)
					: state[p.id]?.unread;
				if (!matchesUnreadFilter) return false;
			}
			if (q.trim()) {
				const hay = `${p.title} ${p.body} ${p.author.name}`.toLowerCase();
				if (!hay.includes(q.trim().toLowerCase())) return false;
			}
			return true;
		});
		list = [...list].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
		return list;
	}, [allPosts, cat, q, unreadOnly, unreadOnlyPostIds, state]);

	const selPost = posts.find((p) => p.id === sel);

	const handleSelectPost = (postId: string) => {
		setSel(postId);
		if (state[postId]?.unread) {
			handleMarkSeen(postId);
		}
	};

	// Issara staff Team Console (admin panel). Shows every post incl. drafts,
	// the dashboard, composer modal w/ preview, roster drawer and comments inbox.
	if (isTeamConsole) {
		return (
			<GuestLayout>
				<div className="mb-root">
					{isLoading ? (
						<main className="page">
							<div className="empty">
								<Icon.inbox />
								<p>Loading posts…</p>
							</div>
						</main>
					) : isError ? (
						<main className="page">
							<div className="empty">
								<Icon.inbox />
								<p>Could not load posts. Please try again later.</p>
							</div>
						</main>
					) : (
						<AdminConsole
							onAddComment={handleAddComment}
							onDeleteComment={handleDeleteComment}
							onDeletePost={handleDeletePost}
							onTogglePin={handleTogglePin}
							posts={allPosts}
							state={state}
						/>
					)}
				</div>
			</GuestLayout>
		);
	}

	return (
		<GuestLayout>
			<div className="mb-root">
				<main className="page">
					<div className="page-head">
						<h1 className="heading-display uppercase tracking-[-0.022em]">
							Message Board
						</h1>
						<h3 className="text-xl md:text-2xl font-bold text-[#333333] mb-6">
							Updates, reports & events from the CASCADE team
						</h3>
						<p className="mt-[18px] max-w-[760px] text-base text-gray-500">
							Everything the ILM CASCADE team shares with strategic partners, in
							one place. Review your shared items and confirm receipts on
							updates that request it.
						</p>
					</div>

					{/* Toolbar */}
					<div className="toolbar">
						<div className="search">
							<Icon.search />
							<input
								onChange={(e) => setQ(e.target.value)}
								placeholder="Search posts, reports, authors…"
								value={q}
							/>
						</div>
						<div className="chips">
							{CATS.map((c) => (
								<button
									className={`chip${cat === c.key ? " active" : ""}`}
									key={c.key}
									onClick={() => setCat(c.key)}
									type="button"
								>
									{c.label}
									<span className="cnt">{counts[c.key] || 0}</span>
								</button>
							))}
						</div>
						<div className="spacer" />
						<button
							aria-pressed={unreadOnly}
							className="unread-toggle"
							onClick={handleToggleUnreadOnly}
							style={{ background: "transparent", border: 0 }}
							type="button"
						>
							Unread only
							<span className={`switch${unreadOnly ? " on" : ""}`}>
								<i />
							</span>
						</button>
						{unreadCount > 0 && (
							<button
								className="btn-ghost"
								onClick={handleMarkAllRead}
								type="button"
							>
								<Icon.check /> Mark all read
							</button>
						)}
						{canManagePosts && (
							<Link className="btn-new-post" to="/message-board/compose">
								+ New post
							</Link>
						)}
					</div>

					{/* Content */}
					{isLoading ? (
						<div
							className="skeleton-list"
							style={{ display: "flex", flexDirection: "column", gap: 16 }}
						>
							{[1, 2, 3].map((i) => (
								<motion.div
									animate={{ opacity: 1 }}
									initial={{ opacity: 0.5 }}
									key={i}
									style={{
										background: "var(--mb-card)",
										border: "1px solid var(--mb-line)",
										borderRadius: "var(--mb-radius)",
										padding: 24,
										height: 120,
										display: "flex",
										flexDirection: "column",
										gap: 12,
									}}
									transition={{
										repeat: Infinity,
										duration: 1,
										ease: "easeInOut",
										repeatType: "reverse",
										delay: i * 0.15,
									}}
								>
									<div
										style={{
											width: "30%",
											height: 16,
											background: "var(--mb-line)",
											borderRadius: 4,
										}}
									/>
									<div
										style={{
											width: "80%",
											height: 24,
											background: "var(--mb-line-soft)",
											borderRadius: 4,
										}}
									/>
									<div
										style={{
											width: "50%",
											height: 16,
											background: "var(--mb-line-soft)",
											borderRadius: 4,
										}}
									/>
								</motion.div>
							))}
						</div>
					) : isError ? (
						<div
							className="empty"
							style={{
								background: "var(--color-bg)",
								borderRadius: "var(--mb-radius)",
								padding: "48px 24px",
							}}
						>
							<Icon.inbox
								style={{
									width: 48,
									height: 48,
									color: "var(--color-action-coral)",
								}}
							/>
							<p
								style={{
									marginTop: 16,
									color: "var(--color-ink)",
									fontWeight: 600,
								}}
							>
								Could not load posts. Please try again later.
							</p>
						</div>
					) : posts.length === 0 ? (
						<div
							className="empty"
							style={{
								background: "var(--color-bg)",
								borderRadius: "var(--mb-radius)",
								padding: "64px 24px",
								border: "1px solid var(--mb-line)",
							}}
						>
							<Icon.inbox
								style={{
									width: 64,
									height: 64,
									color: "var(--color-secondary)",
									opacity: 0.5,
								}}
							/>
							<p
								style={{
									marginTop: 24,
									fontSize: 18,
									color: "var(--color-primary)",
									fontWeight: 600,
								}}
							>
								You're all caught up!
							</p>
							<p style={{ marginTop: 8, color: "var(--color-body)" }}>
								No posts match your current filters.
							</p>
						</div>
					) : (
						<div className="split">
							<div className="split-list">
								{posts.slice(0, visibleCount).map((p) => (
									<ListItem
										key={p.id}
										onClick={() => handleSelectPost(p.id)}
										post={p}
										selected={sel === p.id}
										state={state}
									/>
								))}
								{(posts.length > visibleCount ||
									visibleCount > SIDEBAR_PAGE_SIZE) && (
									<div className="li-pager">
										{posts.length > visibleCount && (
											<button
												className="li-show-more"
												onClick={() =>
													setVisibleCount((n) => n + SIDEBAR_PAGE_SIZE)
												}
												type="button"
											>
												Show more
												<span className="li-show-more-cnt">
													({posts.length - visibleCount})
												</span>
											</button>
										)}
										{visibleCount > SIDEBAR_PAGE_SIZE && (
											<button
												className="li-show-more li-show-less"
												onClick={() => setVisibleCount(SIDEBAR_PAGE_SIZE)}
												type="button"
											>
												Show less
											</button>
										)}
									</div>
								)}
							</div>
							<div className="split-detail">
								{selPost ? (
									<PostCard
										canManagePosts={canManagePosts}
										currentUserColor={currentUserDisplay.color}
										currentUserId={currentUser.id}
										currentUserInitials={currentUserDisplay.initials}
										isIssaraStaff={currentUser.isIssaraStaff}
										key={selPost.id}
										onAck={handleAck}
										onAddComment={handleAddComment}
										onDeleteComment={handleDeleteComment}
										onDeletePost={canManagePosts ? handleDeletePost : undefined}
										onEdit={canManagePosts ? handleEdit : undefined}
										onPreview={onPreview}
										onReact={handleReact}
										onRsvp={handleRsvp}
										onTogglePin={canManagePosts ? handleTogglePin : undefined}
										post={selPost}
										reactionsEnabled={reactionsEnabled}
										state={state}
									/>
								) : (
									<div className="empty">
										<Icon.inbox />
										<p>Select a post to view its details.</p>
									</div>
								)}
							</div>
						</div>
					)}
				</main>
			</div>

			{/* Doc preview modal — outside .mb-root so it overlays everything cleanly */}
			<div
				className={`mb-modal-back${preview ? " show" : ""}`}
				onClick={() => setPreview(null)}
				onKeyDown={(e) => {
					if (e.key === "Escape") setPreview(null);
				}}
			>
				{preview && (
					<div
						className="mb-modal"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<div className="mb-modal-head">
							<div className={`doc-ic ${preview.kind}`}>
								<Icon.doc />
							</div>
							<h3>{preview.name}</h3>
							<button
								className="x"
								onClick={() => setPreview(null)}
								type="button"
							>
								<Icon.x />
							</button>
						</div>
						<div className="mb-docview">
							<div className="mb-docpage">
								<div className="bar t" />
								<div className="bar s" />
								<div className="bar s2" />
								<div className="bar s3" />
								<div className="bar s" />
								<div className="bar s2" />
								<div style={{ height: 18 }} />
								<div className="bar s2" />
								<div className="bar s" />
								<div className="bar s3" />
							</div>
							<div className="mb-docpage">
								<div className="bar s" />
								<div className="bar s2" />
								<div className="bar s3" />
								<div className="bar s" />
								<div className="bar s2" />
							</div>
							<div style={{ textAlign: "center" }}>
								<button
									className="btn-ack"
									onClick={() => {
										if (preview.url) {
											const a = document.createElement("a");
											a.href = preview.url;
											a.download = preview.name || "";
											a.rel = "noopener";
											a.target = "_blank";
											document.body.appendChild(a);
											a.click();
											a.remove();
										}
										actionStatus.success(`Downloading ${preview.name}…`);
										setPreview(null);
									}}
									type="button"
								>
									<Icon.download /> Download{" "}
									{preview.kind === "pdf" ? "PDF" : "spreadsheet"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</GuestLayout>
	);
}
