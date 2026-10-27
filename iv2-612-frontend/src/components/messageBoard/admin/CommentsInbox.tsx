import { useState } from "react";
import {
	type BoardComment,
	type BoardPost,
	TYPE_LABEL,
} from "$src/assets/mock/message-board";
import type { PostStateMap } from "$src/routes/message-board";
import { readAdminUser } from "./adminUser";
import { postNeedsReply } from "./consoleHelpers";
import { I } from "./icons";

interface CommentsInboxProps {
	posts: BoardPost[];
	state: PostStateMap;
	onReply: (postId: string, text: string, parentId: number | null) => void;
	onDelete: (commentId: number) => void;
	// When set, only show top-level comments from this strategic partner (with
	// their reply threads). Null/undefined ⇒ show all partners' comments.
	partnerId?: number | null;
}

function ThreadComment({
	c,
	onDelete,
}: {
	c: BoardComment;
	onDelete: (commentId: number) => void;
}) {
	return (
		<div className="cmt">
			<div className="cav" style={{ background: c.color }}>
				{c.initials}
			</div>
			<div className="cbody">
				<div className="cmeta">
					<span className="who">{c.who}</span>
					{c.role && <span className="role">{c.role}</span>}
					<span className="when">{c.when}</span>
					{typeof c.id === "number" && (
						<button
							className="cmt-action cmt-action-danger"
							onClick={() => {
								if (window.confirm("Delete this comment?"))
									onDelete(c.id as number);
							}}
							type="button"
						>
							Delete
						</button>
					)}
				</div>
				<div className="ctext">{c.text}</div>
				{c.replies?.map((r, i) => (
					<div className="cmt-replies" key={r.id ?? `${c.who}-r-${i}`}>
						<ThreadComment c={r} onDelete={onDelete} />
					</div>
				))}
			</div>
		</div>
	);
}

function InboxRow({
	post,
	comments,
	onReply,
	onDelete,
}: {
	post: BoardPost;
	comments: BoardComment[];
	onReply: (postId: string, text: string, parentId: number | null) => void;
	onDelete: (commentId: number) => void;
}) {
	const [val, setVal] = useState("");
	const needs = postNeedsReply(comments);
	const me = readAdminUser();
	// Thread the reply under the partner's comment — the most recent top-level
	// comment that came from a partner (so it nests, not posts as a new comment).
	const parentComment =
		[...comments].reverse().find((c) => !!c.strategicPartnerId) ??
		comments[comments.length - 1];
	const submit = () => {
		if (!val.trim()) return;
		onReply(post.id, val.trim(), parentComment?.id ?? null);
		setVal("");
	};
	const lastWho = comments[comments.length - 1]?.who ?? "the partner";

	return (
		<div className={`inrow${needs ? " needs" : ""}`}>
			<div className="in-context">
				<span className={`ictag ${post.type}`}>{TYPE_LABEL[post.type]}</span>
				<span className="icon-title">{post.title}</span>
				{needs && <span className="needs-pill">Awaiting reply</span>}
			</div>
			<div className="in-reply-thread">
				{comments.map((c, i) => (
					<ThreadComment
						c={c}
						key={c.id ?? `${post.id}-c-${i}`}
						onDelete={onDelete}
					/>
				))}
			</div>
			{needs ? (
				<div className="in-replybar">
					<div className="rav">{me.initials}</div>
					<input
						onChange={(e) => setVal(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") submit();
						}}
						placeholder={`Reply to ${lastWho} as ILM Cascade Team…`}
						value={val}
					/>
					<button
						className="btn-send"
						disabled={!val.trim()}
						onClick={submit}
						type="button"
					>
						Reply
					</button>
				</div>
			) : (
				<div className="replied-note">
					<I.checkCircle /> Replied by ILM Cascade Team
				</div>
			)}
		</div>
	);
}

export function CommentsInbox({
	posts,
	state,
	onReply,
	onDelete,
	partnerId,
}: CommentsInboxProps) {
	const commentsFor = (p: BoardPost): BoardComment[] => {
		const all = state[p.id]?.comments ?? [];
		if (partnerId == null) return all;
		return all.filter((c) => c.strategicPartnerId === partnerId);
	};
	const items = posts.filter((p) => commentsFor(p).length > 0);
	if (items.length === 0) {
		return (
			<div className="inbox-empty">
				<I.comment />
				<p>No comments yet</p>
			</div>
		);
	}
	const sorted = [...items].sort(
		(a, b) =>
			(postNeedsReply(commentsFor(b)) ? 1 : 0) -
			(postNeedsReply(commentsFor(a)) ? 1 : 0),
	);
	return (
		<div className="inbox">
			{sorted.map((p) => (
				<InboxRow
					comments={commentsFor(p)}
					key={p.id}
					onDelete={onDelete}
					onReply={onReply}
					post={p}
				/>
			))}
		</div>
	);
}
