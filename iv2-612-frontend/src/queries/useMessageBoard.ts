import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import {
	BOARD_POSTS,
	type BoardComment,
	type BoardDoc,
	type BoardEvent,
	type BoardPost,
	type RsvpStatus,
} from "$src/assets/mock/message-board";
import { getApiUrl, useMockDataStrict } from "$src/utils/config";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";
import { normalizeMessageBoardPostType } from "$src/utils/messageBoardPostType";

export interface BackendAuthor {
	id: number | null;
	name: string;
	role: string;
	initials: string;
	is_staff?: boolean;
}

export interface BackendAttachment {
	id: number;
	name: string;
	size: string;
	kind: "pdf" | "xls" | "other";
	file_url: string | null;
}

export interface BackendComment {
	id: number;
	post: number;
	parent_comment: number | null;
	body: string;
	author: BackendAuthor;
	strategic_partner?: number | null;
	strategic_partner_name?: string | null;
	created_at: string;
	updated_at: string;
	replies: BackendComment[];
}

export interface PartnerNewsUpdate {
	id: number;
	name: string | null;
	title: string | null;
	description: string | null;
	created: string | null;
	sort_number: number | null;
	strategic_partner: number | null;
	audience_grouping?: string | null;
	audience_partner_ids?: number[] | null;
	status: "draft" | "published" | null;
	post_type: string | null;
	pinned: boolean;
	ack_required: boolean;
	ack_by: string | null;
	image: string | null;
	event_starts_at: string | null;
	event_ends_at: string | null;
	event_location: string | null;
	author: BackendAuthor;
	attachments: BackendAttachment[];
	comments: BackendComment[];
	ack_count: number;
	ack_total: number;
	user_has_acked: boolean;
	going_count: number;
	user_rsvp_status: RsvpStatus;
	has_seen: boolean;
	reaction_counts?: Record<string, number>;
	user_reaction?: string | null;
}

interface PaginatedPartnerNews {
	count: number;
	next: string | null;
	previous: string | null;
	results: PartnerNewsUpdate[];
}

const DEFAULT_AUTHOR_COLOR = "#004A60";

// Deterministic palette so the same author renders with the same color across
// re-fetches and across reader/comment surfaces.
const AUTHOR_PALETTE = [
	"#004A60",
	"#148696",
	"#6F2E97",
	"#FB8379",
	"#FDDA61",
	"#3f7e8c",
	"#B26A1A",
];

export const colorFor = (key: string | number | null | undefined): string => {
	if (key == null || key === "") return DEFAULT_AUTHOR_COLOR;
	const s = String(key);
	let hash = 0;
	for (let i = 0; i < s.length; i++) {
		hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
	}
	return AUTHOR_PALETTE[hash % AUTHOR_PALETTE.length];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatDate = (iso: string | null): string => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

const formatRelative = (iso: string | null): string => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const diffDays = Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
	if (diffDays <= 0) return "today";
	if (diffDays === 1) return "1 day ago";
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 14) return "1 week ago";
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	if (diffDays < 60) return "1 month ago";
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
	return `${Math.floor(diffDays / 365)} years ago`;
};

const MONTH_SHORT = [
	"JAN",
	"FEB",
	"MAR",
	"APR",
	"MAY",
	"JUN",
	"JUL",
	"AUG",
	"SEP",
	"OCT",
	"NOV",
	"DEC",
];

const formatEvent = (
	starts: string | null,
	ends: string | null,
	where: string | null,
): BoardEvent | undefined => {
	if (!starts) return undefined;
	const d = new Date(starts);
	if (Number.isNaN(d.getTime())) return undefined;
	const month = MONTH_SHORT[d.getMonth()];
	const day = String(d.getDate());
	const whenDate = d.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
	const startTime = d.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
	let when = `${whenDate} · ${startTime}`;
	if (ends) {
		const e = new Date(ends);
		if (!Number.isNaN(e.getTime())) {
			when += `–${e.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
			})}`;
		}
	}
	return {
		month,
		day,
		when,
		where: where ?? "",
	};
};

const mapAttachment = (a: BackendAttachment): BoardDoc => ({
	id: a.id,
	name: a.name,
	size: a.size || "",
	kind: a.kind,
	url: a.file_url,
});

// Issara staff accounts often have no display name, so the backend falls back
// to their email. Never surface that — present staff uniformly as the team.
export const STAFF_DISPLAY_NAME = "ILM Cascade Team";
export const STAFF_INITIALS = "CT";

export const initialsOf = (name: string): string =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join("") || STAFF_INITIALS;

// Every message-board post is authored by the Cascade team (partners can't
// create posts — only the staff Team Console can). Always present the author as
// the team and never surface the individual staff member's name/email, which
// the backend can't reliably detect as staff for a serialized (non-requester)
// author.
const mapAuthor = (a: BackendAuthor): BoardPost["author"] => ({
	id: a.id,
	name: STAFF_DISPLAY_NAME,
	role: "",
	initials: STAFF_INITIALS,
	color: colorFor(a.id ?? STAFF_DISPLAY_NAME),
	isStaff: true,
});

// A comment is identified by its PARTNER org (partners are stamped with a
// strategic_partner) or, when there's none, the Cascade team — never the
// individual person/email the backend may fall back to. Issara staff /
// management ALWAYS present as the Cascade team, even if a partner id slipped
// onto the row (e.g. staff previewing in buyer-view carry a mock partner id).
const mapComment = (c: BackendComment): BoardComment => {
	const isStaff = !!c.author.is_staff;
	const partnerName = isStaff ? null : (c.strategic_partner_name ?? null);
	const partnerId = isStaff ? null : (c.strategic_partner ?? null);
	const who = partnerName || STAFF_DISPLAY_NAME;
	return {
		id: c.id,
		authorId: c.author.id,
		who,
		role: c.author.role || null,
		initials: partnerName ? initialsOf(partnerName) : STAFF_INITIALS,
		color: colorFor(partnerId ?? c.author.id ?? who),
		when: formatRelative(c.created_at),
		text: c.body,
		isStaff,
		strategicPartnerId: partnerId,
		strategicPartnerName: partnerName,
		replies: c.replies?.map(mapComment) ?? [],
	};
};

const DEFAULT_BACKEND_AUTHOR: BackendAuthor = {
	id: null,
	name: STAFF_DISPLAY_NAME,
	role: "",
	initials: STAFF_INITIALS,
	is_staff: true,
};

export const mapToBoardPost = (r: PartnerNewsUpdate): BoardPost => ({
	id: String(r.id),
	type: normalizeMessageBoardPostType(r.post_type),
	status: r.status ?? "published",
	pinned: !!r.pinned,
	unread: !r.has_seen,
	author: mapAuthor(r.author ?? DEFAULT_BACKEND_AUTHOR),
	time: formatRelative(r.created),
	date: formatDate(r.created),
	title: r.title ?? r.name ?? "Untitled",
	body: r.description ?? "",
	attachments: r.attachments?.map(mapAttachment) ?? [],
	image: r.image ?? undefined,
	event: formatEvent(r.event_starts_at, r.event_ends_at, r.event_location),
	ackRequired: !!r.ack_required,
	ackBy: r.ack_by ?? undefined,
	acked: r.ack_count ?? 0,
	ackTotal: r.ack_total ?? 0,
	userHasAcked: !!r.user_has_acked,
	rsvpStatus: r.user_rsvp_status ?? null,
	goingCount: r.going_count ?? 0,
	reactionCounts: r.reaction_counts ?? {},
	userReaction: r.user_reaction ?? null,
	comments: (r.comments ?? []).map(mapComment),
	strategicPartnerId: r.strategic_partner ?? null,
	audienceGrouping: r.audience_grouping ?? null,
	audiencePartnerIds: r.audience_partner_ids ?? null,
	eventStartsAt: r.event_starts_at ?? null,
	eventEndsAt: r.event_ends_at ?? null,
	eventLocation: r.event_location ?? null,
	sortNumber: r.sort_number ?? null,
});

// Hide all legacy posts/announcements migrated from the old board — only
// surface posts created on or after this cutoff. Applies to both the Team
// Console and the SP UI (both read through useMessageBoard). Posts with no
// `created` (e.g. freshly created in this session) are kept.
const HIDE_POSTS_BEFORE = new Date("2026-07-01T00:00:00Z").getTime();

const isAfterCutoff = (r: PartnerNewsUpdate): boolean => {
	if (!r.created) return true;
	const t = new Date(r.created).getTime();
	if (Number.isNaN(t)) return true;
	return t >= HIDE_POSTS_BEFORE;
};

const sortPosts = (a: PartnerNewsUpdate, b: PartnerNewsUpdate): number => {
	// Backend already sorts (-pinned, -id), but resort by sort_number then id desc
	// to honour the legacy ordering knob.
	const sa = a.sort_number ?? Number.POSITIVE_INFINITY;
	const sb = b.sort_number ?? Number.POSITIVE_INFINITY;
	if (sa !== sb) return sa - sb;
	return b.id - a.id;
};

export const MESSAGE_BOARD_QUERY_KEY = "message-board";

export const useMessageBoard = () => {
	const shouldUseMock = useMockDataStrict();
	const { partnerId } = getUserIdentifiers();

	const isIssaraStaffOrManagement = (() => {
		try {
			const authUser = JSON.parse(localStorage.getItem("auth_user") ?? "{}");
			const role =
				authUser?.role_slug ||
				(Array.isArray(authUser?.groups) && authUser.groups[0]) ||
				null;
			return role === "org-issara-staff" || role === "org-issara-management";
		} catch {
			return false;
		}
	})();

	const useMockForThisUser = shouldUseMock && !isIssaraStaffOrManagement;

	return useQuery<BoardPost[]>({
		queryKey: [
			MESSAGE_BOARD_QUERY_KEY,
			useMockForThisUser
				? "mock"
				: isIssaraStaffOrManagement
					? "issara-staff"
					: partnerId,
		],
		queryFn: async () => {
			if (useMockForThisUser) return BOARD_POSTS;
			// Scope the feed to the active strategic partner. The backend trusts
			// this to filter posts to that SP + broadcasts (staff get every post
			// regardless). Omitted for staff, who have no partnerId.
			const res = await api.get<PaginatedPartnerNews>(
				`${getApiUrl()}/partnernewsupdates/`,
				partnerId ? { params: { strategic_partner_id: partnerId } } : undefined,
			);
			const results = res.data?.results ?? [];
			return results.filter(isAfterCutoff).sort(sortPosts).map(mapToBoardPost);
		},
		// Issara staff / management have no partnerId but must still load the live
		// feed (they see every post), so enable the query for them explicitly.
		enabled: useMockForThisUser || isIssaraStaffOrManagement || !!partnerId,
		// Short stale window + refetch on focus so the Team Console picks up
		// activity from other sessions (e.g. a partner posting a comment) when
		// staff return to the tab, rather than holding a 5-minute-stale cache.
		staleTime: 30 * 1000,
		refetchOnWindowFocus: true,
	});
};
