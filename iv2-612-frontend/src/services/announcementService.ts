import { api } from "$src/api/axios";

const APP_ENVIRONMENT = import.meta.env.VITE_APP_ENVIRONMENT;

const CASCADE_API_URL =
	APP_ENVIRONMENT === "staging"
		? "https://cascadestagingbackend.issarainstitute.org/api/v1"
		: APP_ENVIRONMENT === "production"
			? "https://cascadebackend.issarainstitute.org/api/v1"
			: (import.meta.env.VITE_APP_CASCADE_API_URL ?? "").replace(/\/$/, "");
const DEFAULT_MESSAGE_BOARD_POSTS_PATH = "/message-board/manage";
const MESSAGE_BOARD_POSTS_PATH = (
	import.meta.env.VITE_CASCADE_MESSAGE_BOARD_POSTS_PATH?.trim() ||
	DEFAULT_MESSAGE_BOARD_POSTS_PATH
)
	.replace(/\/+$/, "")
	.replace(/^([^/])/, "/$1");
const MESSAGE_BOARD_POSTS_BASE = `${CASCADE_API_URL}${MESSAGE_BOARD_POSTS_PATH}`;

export interface CreateAnnouncementPayload {
	title: string;
	description: string;
	images?: File[];
	status?: "draft" | "published";
	targetId?: number | string | null;
	targetType?: "supplier" | "recruiter" | null;
}

export type UpdateAnnouncementPayload = CreateAnnouncementPayload;

export interface AnnouncementListItem {
	id: number;
	title: string;
	description: string;
	image_url: string | null;
	posted: string;
	username: string;
	like_count: number;
	love_count: number;
	sad_count: number;
	comments_count: number;
}

export type AnnouncementReactionType = "like" | "love" | "sad";

export interface AnnouncementCommentItem {
	id: number;
	author_name: string;
	content: string;
	is_anonymous: boolean;
	created_at: string;
}

export interface AnnouncementDetailItem extends AnnouncementListItem {
	comments: AnnouncementCommentItem[];
}

interface RawAnnouncementListItem {
	id?: number | string;
	title?: string | null;
	description?: string | null;
	body?: string | null;
	content?: string | null;
	image_url?: string | null;
	image?: string | null;
	posted?: string | null;
	created_at?: string | null;
	username?: string | null;
	author_name?: string | null;
	author?: string | null;
	created_by_email?: string | null;
	like_count?: number | string | null;
	love_count?: number | string | null;
	sad_count?: number | string | null;
	comments_count?: number | string | null;
}

interface AnnouncementListResponse {
	results?: RawAnnouncementListItem[];
	data?: RawAnnouncementListItem[];
	posts?: RawAnnouncementListItem[];
}

function getAuthHeaders() {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function readInt(v: unknown): number {
	const n = Number(v);
	return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function normalizeAnnouncement(row: RawAnnouncementListItem) {
	const id = Number(row.id);
	if (!Number.isFinite(id)) {
		return null;
	}

	return {
		id,
		title: row.title?.trim() || "Untitled Announcement",
		description: row.description?.trim() || row.body?.trim() || "",
		image_url: row.image_url || row.image || null,
		posted: row.posted || row.created_at || new Date().toISOString(),
		username:
			row.username ||
			row.author_name ||
			row.author ||
			row.created_by_email ||
			"Issara Institute",
		like_count: readInt(row.like_count),
		love_count: readInt(row.love_count),
		sad_count: readInt(row.sad_count),
		comments_count: readInt(row.comments_count),
	};
}

function getAnnouncementRows(
	data: AnnouncementListResponse | RawAnnouncementListItem[],
) {
	if (Array.isArray(data)) {
		return data;
	}

	if (Array.isArray(data.results)) {
		return data.results;
	}

	if (Array.isArray(data.data)) {
		return data.data;
	}

	if (Array.isArray(data.posts)) {
		return data.posts;
	}

	return [];
}

export async function createAnnouncement({
	title,
	description,
	images = [],
	status = "published",
	targetId,
	targetType,
}: CreateAnnouncementPayload) {
	const formData = new FormData();
	formData.append("title", title);
	formData.append("description", description);
	formData.append("body", description);
	formData.append("status", status);

	if (targetId !== null && targetId !== undefined && targetType) {
		formData.append("target_id", String(targetId));
		formData.append("target_type", targetType);
	}

	const [primaryImage] = images;
	if (primaryImage) {
		formData.append("image", primaryImage);
	}

	const response = await api.post(MESSAGE_BOARD_POSTS_BASE, formData, {
		headers: getAuthHeaders(),
	});
	return response.data;
}

export async function updateAnnouncement(
	announcementId: number,
	{
		title,
		description,
		images = [],
		status = "published",
		targetId,
		targetType,
	}: UpdateAnnouncementPayload,
) {
	const formData = new FormData();
	formData.append("title", title);
	formData.append("description", description);
	formData.append("body", description);
	formData.append("status", status);

	if (targetId !== null && targetId !== undefined && targetType) {
		formData.append("target_id", String(targetId));
		formData.append("target_type", targetType);
	}

	const [primaryImage] = images;
	if (primaryImage) {
		formData.append("image", primaryImage);
	}

	const response = await api.patch(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}`,
		formData,
		{ headers: getAuthHeaders() },
	);
	return response.data;
}

export async function deleteAnnouncement(announcementId: number) {
	const response = await api.delete(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}`,
		{ headers: getAuthHeaders() },
	);
	return {
		data: response.data,
		status: response.status,
	};
}

export async function fetchAnnouncements(pageSize = 100) {
	const { data } = await api.get<
		AnnouncementListResponse | RawAnnouncementListItem[]
	>(MESSAGE_BOARD_POSTS_BASE, {
		headers: getAuthHeaders(),
		params: {
			page: 1,
			page_size: pageSize,
		},
	});

	return getAnnouncementRows(data)
		.map(normalizeAnnouncement)
		.filter((row): row is AnnouncementListItem => row !== null);
}

export async function fetchAnnouncementDetail(
	id: number,
): Promise<AnnouncementDetailItem> {
	const { data } = await api.get<Record<string, unknown>>(
		`${MESSAGE_BOARD_POSTS_BASE}/${id}`,
		{ headers: getAuthHeaders() },
	);

	const rawComments = Array.isArray(data.comments)
		? (data.comments as Record<string, unknown>[])
		: [];

	const comments: AnnouncementCommentItem[] = rawComments
		.map((c) => ({
			id: Number(c.id),
			author_name: String(c.author_name ?? "Anonymous"),
			content: String(c.content ?? ""),
			is_anonymous: c.is_anonymous === true,
			created_at: String(c.created_at ?? ""),
		}))
		.filter((c) => c.id > 0);

	return {
		id: Number(data.id),
		title: String(data.title ?? "").trim() || "Untitled Announcement",
		description: String(data.description ?? data.body ?? "").trim(),
		image_url: typeof data.image_url === "string" ? data.image_url : null,
		posted: String(data.posted ?? data.created_at ?? new Date().toISOString()),
		username: String(
			data.username ?? data.created_by_email ?? "Issara Institute",
		),
		like_count: readInt(data.like_count),
		love_count: readInt(data.love_count),
		sad_count: readInt(data.sad_count),
		comments_count: readInt(data.comments_count),
		comments,
	};
}

export async function postAnnouncementComment(
	announcementId: number,
	opts: {
		content: string;
		authorName: string;
		sessionKey: string;
		isAnonymous?: boolean;
	},
): Promise<AnnouncementCommentItem> {
	const { data } = await api.post<Record<string, unknown>>(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}/comments`,
		{
			content: opts.content.trim(),
			author_name: opts.isAnonymous ? "Anonymous" : opts.authorName.trim(),
			author_session_key: opts.sessionKey,
			is_anonymous: opts.isAnonymous ?? false,
		},
		{ headers: getAuthHeaders() },
	);
	return {
		id: Number(data.id),
		content: String(data.content ?? ""),
		author_name: String(data.author_name ?? "Anonymous"),
		is_anonymous: data.is_anonymous === true,
		created_at: String(data.created_at ?? ""),
	};
}

export async function markAnnouncementAsRead(announcementId: number) {
	const response = await api.post(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}/read`,
		undefined,
		{
			headers: getAuthHeaders(),
		},
	);
	return {
		data: response.data,
		status: response.status,
	};
}

export async function addAnnouncementReaction(
	announcementId: number,
	reaction: AnnouncementReactionType,
) {
	const response = await api.post(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}/reactions`,
		{
			reaction,
		},
		{
			headers: getAuthHeaders(),
		},
	);
	return {
		data: response.data,
		status: response.status,
	};
}

export async function removeAnnouncementReaction(
	announcementId: number,
	reaction: AnnouncementReactionType,
) {
	const response = await api.delete(
		`${MESSAGE_BOARD_POSTS_BASE}/${announcementId}/reactions`,
		{
			data: {
				reaction,
			},
			headers: getAuthHeaders(),
		},
	);
	return {
		data: response.data,
		status: response.status,
	};
}
