import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import type { BoardPost } from "$src/assets/mock/message-board";
import {
	MESSAGE_BOARD_QUERY_KEY,
	mapToBoardPost,
	type PartnerNewsUpdate,
} from "$src/queries/useMessageBoard";
import { getApiUrl } from "$src/utils/config";
import { normalizeMessageBoardPostType } from "$src/utils/messageBoardPostType";

const postsUrl = () => `${getApiUrl()}/partnernewsupdates`;
const commentsUrl = () => `${getApiUrl()}/partnermessageboardcomments`;
const MESSAGE_BOARD_MUTATION_META = { skipGlobalInvalidation: true };

const invalidateBoard = (qc: ReturnType<typeof useQueryClient>) => {
	void qc.invalidateQueries({
		queryKey: [MESSAGE_BOARD_QUERY_KEY],
		refetchType: "active",
	});
};

const isObject = (value: unknown): value is Record<string, unknown> =>
	value != null && typeof value === "object";

const toNumberOrNull = (value: unknown): number | null => {
	if (value == null || value === "") return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

const buildPostFromMutationResponse = (
	data: unknown,
	values?: Partial<PostFormValues>,
	fallbackPostId?: string | number,
): BoardPost | null => {
	if (!isObject(data) && fallbackPostId == null) return null;
	const row = isObject(data) ? data : {};
	const id = toNumberOrNull(row.id ?? fallbackPostId);
	if (id == null) return null;

	return mapToBoardPost({
		id,
		name:
			typeof row.name === "string"
				? row.name
				: (values?.name ?? values?.title ?? null),
		title: typeof row.title === "string" ? row.title : (values?.title ?? null),
		description:
			typeof row.description === "string"
				? row.description
				: (values?.description ?? null),
		created:
			typeof row.created === "string" ? row.created : new Date().toISOString(),
		sort_number: toNumberOrNull(row.sort_number ?? values?.sort_number),
		strategic_partner: toNumberOrNull(
			row.strategic_partner ?? values?.strategic_partner,
		),
		status:
			row.status === "draft" || row.status === "published"
				? row.status
				: (values?.status ?? "published"),
		post_type:
			typeof row.post_type === "string"
				? row.post_type
				: (values?.post_type ?? null),
		pinned: typeof row.pinned === "boolean" ? row.pinned : !!values?.pinned,
		ack_required:
			typeof row.ack_required === "boolean"
				? row.ack_required
				: !!values?.ack_required,
		ack_by:
			typeof row.ack_by === "string" ? row.ack_by : (values?.ack_by ?? null),
		image: typeof row.image === "string" ? row.image : null,
		event_starts_at:
			typeof row.event_starts_at === "string"
				? row.event_starts_at
				: (values?.event_starts_at ?? null),
		event_ends_at:
			typeof row.event_ends_at === "string"
				? row.event_ends_at
				: (values?.event_ends_at ?? null),
		event_location:
			typeof row.event_location === "string"
				? row.event_location
				: (values?.event_location ?? null),
		author: isObject(row.author)
			? (row.author as unknown as PartnerNewsUpdate["author"])
			: {
					id: null,
					name: "ILM Cascade Team",
					role: "",
					initials: "CT",
					is_staff: true,
				},
		attachments: Array.isArray(row.attachments)
			? (row.attachments as PartnerNewsUpdate["attachments"])
			: [],
		comments: Array.isArray(row.comments)
			? (row.comments as PartnerNewsUpdate["comments"])
			: [],
		ack_count: toNumberOrNull(row.ack_count) ?? 0,
		ack_total: toNumberOrNull(row.ack_total) ?? 0,
		user_has_acked: row.user_has_acked === true,
		going_count: toNumberOrNull(row.going_count) ?? 0,
		user_rsvp_status:
			row.user_rsvp_status === "going" || row.user_rsvp_status === "not_going"
				? row.user_rsvp_status
				: null,
		has_seen: row.has_seen === true,
	});
};

const sortCachedPosts = (posts: BoardPost[]) =>
	[...posts].sort((a, b) => {
		const sa = a.sortNumber ?? Number.POSITIVE_INFINITY;
		const sb = b.sortNumber ?? Number.POSITIVE_INFINITY;
		if (sa !== sb) return sa - sb;
		return Number(b.id) - Number(a.id);
	});

const shouldPostAppearInCache = (
	cacheScope: unknown,
	post: BoardPost,
): boolean => {
	if (cacheScope === "mock") return false;
	if (cacheScope === "issara-staff") return true;
	const partnerId = Number(cacheScope);
	if (!Number.isInteger(partnerId) || partnerId <= 0) return false;
	if ((post.status ?? "published") !== "published") return false;
	return (
		post.strategicPartnerId == null || post.strategicPartnerId === partnerId
	);
};

const updateBoardListCaches = (
	qc: ReturnType<typeof useQueryClient>,
	updater: (current: BoardPost[], cacheScope: unknown) => BoardPost[],
) => {
	const queries = qc.getQueryCache().findAll({
		queryKey: [MESSAGE_BOARD_QUERY_KEY],
	});
	for (const query of queries) {
		const [, cacheScope, extra] = query.queryKey;
		if (extra !== undefined) continue;
		qc.setQueryData(query.queryKey, (current: unknown) => {
			if (!Array.isArray(current)) return current;
			return updater(current as BoardPost[], cacheScope);
		});
	}
};

const upsertPostInBoardCaches = (
	qc: ReturnType<typeof useQueryClient>,
	post: BoardPost,
) => {
	updateBoardListCaches(qc, (current, cacheScope) => {
		const withoutPost = current.filter((p) => p.id !== post.id);
		if (!shouldPostAppearInCache(cacheScope, post)) return withoutPost;
		return sortCachedPosts([post, ...withoutPost]);
	});
};

const removePostFromBoardCaches = (
	qc: ReturnType<typeof useQueryClient>,
	postId: string | number,
) => {
	const id = String(postId);
	updateBoardListCaches(qc, (current) => current.filter((p) => p.id !== id));
};

const patchPostInBoardCaches = (
	qc: ReturnType<typeof useQueryClient>,
	postId: string | number,
	patch: Partial<BoardPost>,
) => {
	const id = String(postId);
	updateBoardListCaches(qc, (current) =>
		current.map((post) => (post.id === id ? { ...post, ...patch } : post)),
	);
};

// Mock fixtures use ids like "p1"–"p5"; real backend rows are numeric. Skip
// network calls for anything non-numeric so internal users browsing the mock
// board don't hit the live API with synthetic ids.
const isRealPostId = (id: string | number): boolean => {
	const n = typeof id === "number" ? id : Number(id);
	return Number.isInteger(n) && n > 0;
};

// ---- Acknowledgement roster (Issara staff Team Console only) ----------------

export interface AckRosterRow {
	id: number;
	org: string;
	contact: string;
	initials: string;
	color: string;
	acked: boolean;
	acked_on: string | null;
	reminded: boolean;
	reminded_on: string | null;
}

export interface AckRosterResponse {
	post: number;
	ack_total: number;
	ack_count: number;
	roster: AckRosterRow[];
}

// Per-strategic-partner acknowledgement roster for a post. Only enabled for
// real (numeric) post ids so the mock board doesn't hit the live API.
export const useAckRoster = (postId: string | number | null) => {
	const enabled = postId != null && isRealPostId(postId);
	return useQuery<AckRosterResponse>({
		queryKey: [MESSAGE_BOARD_QUERY_KEY, "roster", String(postId)],
		queryFn: async () => {
			const res = await api.get<AckRosterResponse>(
				`${postsUrl()}/${postId}/roster/`,
			);
			return res.data;
		},
		enabled,
		staleTime: 60 * 1000,
	});
};

// Per-strategic-partner RSVP "going" roster for an event. Mirrors useAckRoster.
export interface GoingRosterRow {
	id: number;
	org: string;
	contact: string;
	initials: string;
	color: string;
	going: boolean;
	responded_on: string | null;
	reminded: boolean;
	reminded_on: string | null;
}

export interface GoingRosterResponse {
	post: number;
	going_total: number;
	going_count: number;
	roster: GoingRosterRow[];
}

export const useGoingRoster = (postId: string | number | null) => {
	const enabled = postId != null && isRealPostId(postId);
	return useQuery<GoingRosterResponse>({
		queryKey: [MESSAGE_BOARD_QUERY_KEY, "rsvp-roster", String(postId)],
		queryFn: async () => {
			const res = await api.get<GoingRosterResponse>(
				`${postsUrl()}/${postId}/rsvp-roster/`,
			);
			return res.data;
		},
		enabled,
		staleTime: 60 * 1000,
	});
};

// Per-strategic-partner reaction roster for a post (staff only). Mirrors
// useAckRoster; each org shows the emoji of its earliest reaction.
export interface ReactionRosterRow {
	id: number;
	org: string;
	initials: string;
	color: string;
	reacted: boolean;
	emoji: string | null;
	reacted_on: string | null;
}

export interface ReactionRosterResponse {
	post: number;
	react_total: number;
	react_count: number;
	roster: ReactionRosterRow[];
}

export const useReactionRoster = (postId: string | number | null) => {
	const enabled = postId != null && isRealPostId(postId);
	return useQuery<ReactionRosterResponse>({
		queryKey: [MESSAGE_BOARD_QUERY_KEY, "reaction-roster", String(postId)],
		queryFn: async () => {
			const res = await api.get<ReactionRosterResponse>(
				`${postsUrl()}/${postId}/reaction-roster/`,
			);
			return res.data;
		},
		enabled,
		staleTime: 60 * 1000,
	});
};

// Record reminders to one or more partners (staff only). Persists the roster's
// "Reminded" state so it survives across sessions; refreshes both rosters.
export const useRemindPartner = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			strategicPartnerIds: number[];
		}) => {
			if (!isRealPostId(vars.postId)) return null;
			const res = await api.post(`${postsUrl()}/${vars.postId}/remind/`, {
				strategic_partner_ids: vars.strategicPartnerIds,
			});
			return res.data;
		},
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({
				queryKey: [MESSAGE_BOARD_QUERY_KEY, "roster", String(vars.postId)],
			});
			qc.invalidateQueries({
				queryKey: [MESSAGE_BOARD_QUERY_KEY, "rsvp-roster", String(vars.postId)],
			});
		},
	});
};

export const useAcknowledgePost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			strategicPartnerId?: number | null;
		}) => {
			if (!isRealPostId(vars.postId)) return null;
			const res = await api.post(`${postsUrl()}/${vars.postId}/acknowledge/`, {
				strategic_partner_id: vars.strategicPartnerId ?? undefined,
			});
			return res.data;
		},
		onSuccess: () => invalidateBoard(qc),
	});
};

export const useRsvpPost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			status: "going" | "not_going";
			strategicPartnerId?: number | null;
		}) => {
			if (!isRealPostId(vars.postId)) return null;
			const res = await api.post(`${postsUrl()}/${vars.postId}/rsvp/`, {
				status: vars.status,
				strategic_partner_id: vars.strategicPartnerId ?? undefined,
			});
			return res.data;
		},
		onSuccess: () => invalidateBoard(qc),
	});
};

export const useReactToPost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			emoji: string | null;
			strategicPartnerId?: number | null;
		}) => {
			if (!isRealPostId(vars.postId)) return null;
			const res = await api.post(`${postsUrl()}/${vars.postId}/react/`, {
				emoji: vars.emoji,
				strategic_partner_id: vars.strategicPartnerId ?? undefined,
			});
			return res.data;
		},
		onSuccess: () => invalidateBoard(qc),
	});
};

export const useMarkPostSeen = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			strategicPartnerId?: number | null;
		}) => {
			if (!isRealPostId(vars.postId)) return;
			await api.post(`${postsUrl()}/${vars.postId}/seen/`, {
				strategic_partner_id: vars.strategicPartnerId ?? undefined,
			});
		},
		// "seen" is fire-and-forget UX; refresh in background so the dot clears.
		onSuccess: () => invalidateBoard(qc),
	});
};

export const useAddComment = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			body: string;
			parentCommentId?: number | null;
			strategicPartnerId?: number | null;
		}) => {
			if (!isRealPostId(vars.postId)) return null;
			const res = await api.post(`${commentsUrl()}/`, {
				post: Number(vars.postId),
				parent_comment: vars.parentCommentId ?? null,
				body: vars.body,
				strategic_partner_id: vars.strategicPartnerId ?? undefined,
			});
			return res.data;
		},
		onSuccess: () => invalidateBoard(qc),
	});
};

export const useDeleteComment = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (commentId: number) => {
			await api.delete(`${commentsUrl()}/${commentId}/`);
		},
		onSuccess: () => invalidateBoard(qc),
	});
};

// ---- Post create / update / delete (Issara staff only) ----------------------

export interface PostFormValues {
	post_type: "announcement" | "report" | "event";
	title: string;
	description: string;
	name?: string;
	// "draft" keeps the post hidden from partners (staff-only); omit ⇒ backend
	// default "published". The Team Console sets this from Save-draft / Publish.
	status?: "draft" | "published";
	strategic_partner?: number | null;
	strategic_partner_all?: boolean;
	// Grouping-based audience (new). When set, takes priority over the fields above.
	audience_grouping?: string | null;
	audience_partner_ids?: number[] | null;
	pinned: boolean;
	ack_required: boolean;
	ack_by?: string | null;
	event_starts_at?: string | null;
	event_ends_at?: string | null;
	event_location?: string | null;
	sort_number?: number | null;
	image?: File | null;
	removeImage?: boolean;
	attachment_files?: File[];
	attachment_ids?: number[];
}

export const buildPostFormData = (values: PostFormValues): FormData => {
	const fd = new FormData();
	fd.append("post_type", normalizeMessageBoardPostType(values.post_type));
	fd.append("title", values.title);
	fd.append("description", values.description);
	fd.append("name", values.name ?? values.title ?? "");
	if (values.status) fd.append("status", values.status);
	if (values.strategic_partner_all) {
		fd.append("strategic_partner_all", "true");
	} else if (values.audience_partner_ids != null) {
		// Custom multi-select (and grouping-with-snapshot) audiences carry an
		// explicit id list. Always send it — previously it was only appended
		// inside the `audience_grouping != null` branch, so a custom multi-select
		// (grouping null) silently dropped the ids and the server fell back to
		// broadcasting to every partner.
		if (values.audience_grouping != null) {
			fd.append("audience_grouping", values.audience_grouping);
		}
		fd.append(
			"audience_partner_ids",
			JSON.stringify(values.audience_partner_ids),
		);
	} else if (values.audience_grouping != null) {
		fd.append("audience_grouping", values.audience_grouping);
	} else {
		fd.append("strategic_partner", String(values.strategic_partner ?? ""));
	}
	fd.append("pinned", values.pinned ? "true" : "false");
	fd.append("ack_required", values.ack_required ? "true" : "false");
	if (values.ack_by) fd.append("ack_by", values.ack_by);
	if (values.event_starts_at)
		fd.append("event_starts_at", values.event_starts_at);
	if (values.event_ends_at) fd.append("event_ends_at", values.event_ends_at);
	if (values.event_location != null)
		fd.append("event_location", values.event_location);
	if (values.sort_number != null)
		fd.append("sort_number", String(values.sort_number));
	if (values.image) fd.append("image", values.image);
	else if (values.removeImage) fd.append("image", "");
	(values.attachment_files ?? []).forEach((f) => {
		fd.append("attachment_files", f);
	});
	if (values.attachment_ids) {
		for (const id of values.attachment_ids) {
			if (Number.isInteger(id) && id > 0) {
				fd.append("attachment_ids", String(id));
			}
		}
	}
	return fd;
};

export const useCreatePost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (values: PostFormValues) => {
			const res = await api.post(`${postsUrl()}/`, buildPostFormData(values));
			return res.data;
		},
		onSuccess: (data, values) => {
			const post = buildPostFromMutationResponse(data, values);
			if (post) upsertPostInBoardCaches(qc, post);
			invalidateBoard(qc);
		},
	});
};

export const useUpdatePost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: {
			postId: string | number;
			values: PostFormValues;
		}) => {
			const res = await api.patch(
				`${postsUrl()}/${vars.postId}/`,
				buildPostFormData(vars.values),
			);
			return res.data;
		},
		onSuccess: (data, vars) => {
			const post = buildPostFromMutationResponse(
				data,
				vars.values,
				vars.postId,
			);
			if (post) upsertPostInBoardCaches(qc, post);
			invalidateBoard(qc);
		},
	});
};

export const useDeletePost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (postId: string | number) => {
			try {
				await api.delete(`${postsUrl()}/${postId}/`);
			} catch (err) {
				// A 404 means the post is already gone (e.g. a double-click or a
				// retry after a transient error) — treat it as a successful delete
				// so the UI reconciles instead of surfacing a spurious error toast.
				const status = (err as { response?: { status?: number } })?.response
					?.status;
				if (status !== 404) throw err;
			}
		},
		onSuccess: (_data, postId) => {
			removePostFromBoardCaches(qc, postId);
			invalidateBoard(qc);
		},
	});
};

export const useTogglePinPost = () => {
	const qc = useQueryClient();
	return useMutation({
		meta: MESSAGE_BOARD_MUTATION_META,
		mutationFn: async (vars: { postId: string | number; pinned: boolean }) => {
			const res = await api.patch(`${postsUrl()}/${vars.postId}/`, {
				pinned: vars.pinned,
			});
			return res.data;
		},
		onSuccess: (data, vars) => {
			if (isObject(data) && (data.title != null || data.name != null)) {
				const post = buildPostFromMutationResponse(
					data,
					undefined,
					vars.postId,
				);
				if (post) upsertPostInBoardCaches(qc, post);
			} else {
				patchPostInBoardCaches(qc, vars.postId, { pinned: vars.pinned });
			}
			invalidateBoard(qc);
		},
	});
};
