import { useFlags } from "flagsmith/react";
import type { IFlagsmithFeature } from "flagsmith/types";
import { useEffect, useMemo, useState } from "react";
import {
	type BoardPost,
	type PostType,
	TYPE_LABEL,
} from "$src/assets/mock/message-board";
import { useStrategicPartners } from "$src/hooks/useStrategicPartner";
import {
	type PostFormValues,
	useCreatePost,
	useUpdatePost,
} from "$src/queries/useMessageBoardMutations";
import type { PostStateMap } from "$src/routes/message-board";
import { useActionStatus } from "$src/store/actionStatusStore";
import {
	deleteMessageBoardPostNotifications,
	emitNotifications,
} from "$src/utils/notificationEmit";
import { isCommentsEnabled } from "../featureFlags";
import {
	isReactionFeatureEnabled,
	MESSAGE_BOARD_REACTIONS_FLAG,
} from "../reactions";
import { CommentsInbox } from "./CommentsInbox";
import { ComposerModal } from "./ComposerModal";
import { boardPostToInitial, postNeedsReply } from "./consoleHelpers";
import { DashTiles } from "./DashTiles";
import { I } from "./icons";
import { ManagementRow } from "./ManagementRow";
import { RosterDrawer, type RosterMode } from "./RosterDrawer";
import { ViewPostModal } from "./ViewPostModal";

const POSTS_PAGE_SIZE = 10;

interface AdminConsoleProps {
	posts: BoardPost[];
	state: PostStateMap;
	onTogglePin: (postId: string, pinned: boolean) => void;
	onAddComment: (postId: string, text: string, parentId: number | null) => void;
	onDeletePost: (postId: string) => void;
	onDeleteComment: (commentId: number) => void;
}

export function AdminConsole({
	posts,
	state,
	onTogglePin,
	onAddComment,
	onDeletePost,
	onDeleteComment,
}: AdminConsoleProps) {
	const actionStatus = useActionStatus();
	const [tab, setTab] = useState<"posts" | "comments">("posts");
	const [composerOpen, setComposerOpen] = useState(false);
	const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
	const [rosterPost, setRosterPost] = useState<BoardPost | null>(null);
	const [rosterOpen, setRosterOpen] = useState(false);
	const [rosterMode, setRosterMode] = useState<RosterMode>("ack");
	const [viewPost, setViewPost] = useState<BoardPost | null>(null);
	const [viewOpen, setViewOpen] = useState(false);

	// Posts-tab filters
	const [q, setQ] = useState("");
	const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "published" | "draft"
	>("all");
	const [visibleCount, setVisibleCount] = useState(POSTS_PAGE_SIZE);
	// Comments-tab filters
	const [commentQ, setCommentQ] = useState("");
	const [commentFilter, setCommentFilter] = useState<
		"all" | "awaiting" | "replied"
	>("all");
	const [commentPartner, setCommentPartner] = useState<number | "all">("all");

	const createMut = useCreatePost();
	const updateMut = useUpdatePost();
	const submitting = createMut.isPending || updateMut.isPending;

	// Gate the reaction summary + roster on the same flag the reader uses.
	const reactionFlags = useFlags([MESSAGE_BOARD_REACTIONS_FLAG]) as Record<
		string,
		IFlagsmithFeature | undefined
	>;
	const reactionsEnabled = isReactionFeatureEnabled(
		reactionFlags[MESSAGE_BOARD_REACTIONS_FLAG],
	);

	// Partner roster — used to fan a broadcast (audience_all) post out to every
	// strategic partner when emitting the "new post" cross-notification, and to
	// populate the comments per-partner filter.
	const { data: spData } = useStrategicPartners();
	const partners = useMemo(
		() => (Array.isArray(spData) ? spData : []),
		[spData],
	);
	const allPartnerIds = useMemo(() => partners.map((p) => p.id), [partners]);

	const getPostNotificationTargets = (values: PostFormValues) => {
		const targets = values.strategic_partner_all
			? allPartnerIds
			: values.audience_grouping != null
				? values.audience_partner_ids != null
					? values.audience_partner_ids
					: partners
							.filter(
								(p) =>
									p.strategic_partner_grouping === values.audience_grouping,
							)
							.map((p) => p.id)
				: values.strategic_partner != null
					? [values.strategic_partner]
					: [];
		return Array.from(new Set(targets.map((id) => Number(id)))).filter((id) =>
			Number.isFinite(id),
		);
	};

	const emitPostAudienceNotification = (
		values: PostFormValues,
		created: unknown,
		kind: "published" | "updated",
	) => {
		const targets = getPostNotificationTargets(values);
		if (targets.length === 0) return;

		const postId =
			created && typeof created === "object"
				? ((created as { id?: number | string }).id ?? editingPost?.id)
				: (editingPost?.id ?? undefined);
		const label = TYPE_LABEL[values.post_type] ?? "post";
		// Posts are always attributed to the team, never the individual staff
		// member — partners must never see a staff person's name.
		const data = {
			sender_name: "ILM Cascade Team",
			post_id: postId,
			post_title: values.title,
			post_type: values.post_type,
		};
		emitNotifications(
			targets.map((id) => ({
				recipient_id: String(id),
				recipient_role: "buyer" as const,
				type: "MB_POST" as const,
				title:
					kind === "updated"
						? `${label} updated by Cascade Team`
						: `New ${label.toLowerCase()} from Cascade Team`,
				message: kind === "updated" ? `Updated: ${values.title}` : values.title,
				data,
			})),
		);
	};

	const syncPostAudienceNotifications = (
		values: PostFormValues,
		created: unknown,
	) => {
		const wasPublished = editingPost
			? (editingPost.status ?? "published") === "published"
			: false;
		const isPublished = values.status === "published";
		const postId =
			created && typeof created === "object"
				? ((created as { id?: number | string }).id ?? editingPost?.id)
				: (editingPost?.id ?? undefined);

		if (!isPublished) {
			if (wasPublished && postId != null) {
				void deleteMessageBoardPostNotifications(postId);
			}
			return;
		}

		if (wasPublished && postId != null) {
			void deleteMessageBoardPostNotifications(postId).finally(() => {
				emitPostAudienceNotification(values, created, "updated");
			});
			return;
		}

		emitPostAudienceNotification(values, created, "published");
	};

	const awaitingReply = posts.filter((p) =>
		postNeedsReply(state[p.id]?.comments ?? []),
	).length;

	const statusOf = (p: BoardPost) => p.status ?? "published";

	// ---- Posts tab: type/status counts + filtered list ----
	const typeCounts = useMemo(() => {
		const c: Record<string, number> = { all: posts.length };
		for (const p of posts) c[p.type] = (c[p.type] || 0) + 1;
		return c;
	}, [posts]);
	const statusCounts = useMemo(() => {
		const c = { all: posts.length, published: 0, draft: 0 };
		for (const p of posts) c[statusOf(p)] += 1;
		return c;
	}, [posts]);
	const filteredPosts = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return posts.filter((p) => {
			if (typeFilter !== "all" && p.type !== typeFilter) return false;
			if (statusFilter !== "all" && statusOf(p) !== statusFilter) return false;
			if (needle) {
				const hay = `${p.title} ${p.author.name}`.toLowerCase();
				if (!hay.includes(needle)) return false;
			}
			return true;
		});
	}, [posts, typeFilter, statusFilter, q]);
	const visiblePosts = filteredPosts.slice(0, visibleCount);

	// Reset paging to the first page whenever the filters change so the list
	// never appears empty after narrowing the results.
	useEffect(() => {
		setVisibleCount(POSTS_PAGE_SIZE);
	}, [typeFilter, statusFilter, q]);

	// ---- Comments tab: awaiting/replied counts + filtered list ----
	const commentPosts = useMemo(
		() => posts.filter((p) => (state[p.id]?.comments ?? []).length > 0),
		[posts, state],
	);
	const repliedCount = commentPosts.length - awaitingReply;
	const filteredCommentPosts = useMemo(() => {
		const needle = commentQ.trim().toLowerCase();
		return commentPosts.filter((p) => {
			const needs = postNeedsReply(state[p.id]?.comments ?? []);
			if (commentFilter === "awaiting" && !needs) return false;
			if (commentFilter === "replied" && needs) return false;
			if (needle) {
				const text = (state[p.id]?.comments ?? [])
					.map((c) => `${c.who} ${c.text}`)
					.join(" ")
					.toLowerCase();
				if (!`${p.title} ${text}`.toLowerCase().includes(needle)) return false;
			}
			return true;
		});
	}, [commentPosts, state, commentFilter, commentQ]);

	const initial = useMemo(
		() => (editingPost ? boardPostToInitial(editingPost) : undefined),
		[editingPost],
	);

	const openNew = () => {
		setEditingPost(null);
		setComposerOpen(true);
	};
	const openEdit = (post: BoardPost) => {
		setEditingPost(post);
		setComposerOpen(true);
	};
	const openRoster = (post: BoardPost) => {
		setRosterPost(post);
		setRosterMode(post.type === "event" ? "going" : "ack");
		setRosterOpen(true);
	};
	const openReactionRoster = (post: BoardPost) => {
		setRosterPost(post);
		setRosterMode("react");
		setRosterOpen(true);
	};
	const openView = (post: BoardPost) => {
		setViewPost(post);
		setViewOpen(true);
	};

	const submit = (values: PostFormValues) => {
		const draft = values.status === "draft";
		const onSuccess = (created: unknown) => {
			actionStatus.success(
				draft ? "Draft saved" : editingPost ? "Post updated" : "Post published",
			);
			setComposerOpen(false);
			setEditingPost(null);
			window.setTimeout(
				() => syncPostAudienceNotifications(values, created),
				0,
			);
		};
		const onError = () =>
			actionStatus.error("Could not save post — try again.");
		if (editingPost) {
			updateMut.mutate(
				{ postId: editingPost.id, values },
				{ onSuccess, onError },
			);
		} else {
			createMut.mutate(values, { onSuccess, onError });
		}
	};

	return (
		<main className="page">
			<div className="console-head">
				<div className="ttl">
					<h1>
						Message Board <span className="console-pill">Team Console</span>
					</h1>
					<div className="sub">
						Post updates, track receipts & reply to partners
					</div>
				</div>
				<button className="btn-primary" onClick={openNew} type="button">
					<I.plus /> New post
				</button>
			</div>

			<div className="atabs">
				<button
					className={`atab${tab === "posts" ? " on" : ""}`}
					onClick={() => setTab("posts")}
					type="button"
				>
					<I.board /> Posts <span className="tcount">{posts.length}</span>
				</button>
				{isCommentsEnabled() && (
					<button
						className={`atab${tab === "comments" ? " on" : ""}`}
						onClick={() => setTab("comments")}
						type="button"
					>
						<I.comment /> Comments{" "}
						{awaitingReply > 0 && (
							<span className="tcount-new">
								<i className="dot" />
								{awaitingReply} new
							</span>
						)}
					</button>
				)}
			</div>

			{tab === "posts" || !isCommentsEnabled() ? (
				<>
					<DashTiles onJump={setTab} posts={posts} state={state} />

					<div className="toolbar">
						<div className="search">
							<I.search />
							<input
								onChange={(e) => setQ(e.target.value)}
								placeholder="Search posts, authors…"
								value={q}
							/>
						</div>
						<div className="chips">
							{(
								[
									["all", "All posts"],
									["announcement", "Announcements"],
									["report", "Documents"],
									["event", "Events"],
								] as Array<["all" | PostType, string]>
							).map(([key, label]) => (
								<button
									className={`chip${typeFilter === key ? " active" : ""}`}
									key={key}
									onClick={() => setTypeFilter(key)}
									type="button"
								>
									{label}
									<span className="cnt">{typeCounts[key] || 0}</span>
								</button>
							))}
						</div>
						<div className="spacer" />
						<div className="chips">
							{(
								[
									["all", "All"],
									["published", "Published"],
									["draft", "Drafts"],
								] as Array<["all" | "published" | "draft", string]>
							).map(([key, label]) => (
								<button
									className={`chip${statusFilter === key ? " active" : ""}`}
									key={key}
									onClick={() => setStatusFilter(key)}
									type="button"
								>
									{label}
									<span className="cnt">{statusCounts[key] || 0}</span>
								</button>
							))}
						</div>
					</div>

					<div className="mlist">
						<div className="mlist-head">
							<h3>
								{filteredPosts.length === posts.length
									? "All posts"
									: `${filteredPosts.length} of ${posts.length} posts`}
							</h3>
						</div>
						{filteredPosts.length === 0 ? (
							<div className="inbox-empty">
								<I.board />
								<p>No posts match your filters</p>
							</div>
						) : (
							visiblePosts.map((p) => (
								<ManagementRow
									key={p.id}
									onComments={() => setTab("comments")}
									onDelete={(post) => onDeletePost(post.id)}
									onEdit={openEdit}
									onPin={(post) => onTogglePin(post.id, !post.pinned)}
									onReactionRoster={openReactionRoster}
									onRoster={openRoster}
									onView={openView}
									post={p}
									reactionsEnabled={reactionsEnabled}
									st={state[p.id]}
								/>
							))
						)}
						{(filteredPosts.length > visibleCount ||
							visibleCount > POSTS_PAGE_SIZE) && (
							<div className="li-pager">
								{filteredPosts.length > visibleCount && (
									<button
										className="li-show-more"
										onClick={() => setVisibleCount((n) => n + POSTS_PAGE_SIZE)}
										type="button"
									>
										Show more
										<span className="li-show-more-cnt">
											({filteredPosts.length - visibleCount})
										</span>
									</button>
								)}
								{visibleCount > POSTS_PAGE_SIZE && (
									<button
										className="li-show-more li-show-less"
										onClick={() => setVisibleCount(POSTS_PAGE_SIZE)}
										type="button"
									>
										Show less
									</button>
								)}
							</div>
						)}
					</div>
				</>
			) : (
				<>
					<div className="toolbar">
						<div className="search">
							<I.search />
							<input
								onChange={(e) => setCommentQ(e.target.value)}
								placeholder="Search comments, partners…"
								value={commentQ}
							/>
						</div>
						<div className="chips">
							{(
								[
									["all", "All", commentPosts.length],
									["awaiting", "Awaiting reply", awaitingReply],
									["replied", "Replied", repliedCount],
								] as Array<["all" | "awaiting" | "replied", string, number]>
							).map(([key, label, count]) => (
								<button
									className={`chip${commentFilter === key ? " active" : ""}`}
									key={key}
									onClick={() => setCommentFilter(key)}
									type="button"
								>
									{label}
									<span className="cnt">{count}</span>
								</button>
							))}
						</div>
						{partners.length > 0 && (
							<select
								className="partner-filter"
								onChange={(e) =>
									setCommentPartner(
										e.target.value === "all" ? "all" : Number(e.target.value),
									)
								}
								value={commentPartner}
							>
								<option value="all">All partners</option>
								{partners.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
						)}
					</div>
					<CommentsInbox
						onDelete={onDeleteComment}
						onReply={(postId, text, parentId) =>
							onAddComment(postId, text, parentId)
						}
						partnerId={commentPartner === "all" ? null : commentPartner}
						posts={filteredCommentPosts}
						state={state}
					/>
				</>
			)}

			<ComposerModal
				initial={initial}
				mode={editingPost ? "edit" : "create"}
				onClose={() => {
					setComposerOpen(false);
					setEditingPost(null);
				}}
				onPublish={submit}
				onSaveDraft={submit}
				open={composerOpen}
				submitting={submitting}
			/>

			<RosterDrawer
				mode={rosterMode}
				onClose={() => setRosterOpen(false)}
				open={rosterOpen}
				post={rosterPost}
			/>

			<ViewPostModal
				onClose={() => setViewOpen(false)}
				open={viewOpen}
				post={viewPost}
			/>
		</main>
	);
}
