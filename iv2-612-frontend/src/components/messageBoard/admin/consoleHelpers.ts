import type { BoardComment, BoardPost } from "$src/assets/mock/message-board";
import type { ComposerInitial } from "./ComposerModal";
import type { PreviewData } from "./ComposerPreview";

// A comment from the Cascade team rather than a partner. A partner comment is
// always stamped with its `strategicPartnerId`; a Cascade-team comment never is
// — a far more reliable signal than the backend `is_staff` flag (Issara accounts
// outside the staff group resolve as non-staff). Used to flag threads "awaiting
// reply": once the team has the last word, the thread is answered.
export const isStaffComment = (c: BoardComment): boolean =>
	!c.strategicPartnerId;

// Flatten a thread (top-level comments + their replies) in display order.
const flatten = (comments: BoardComment[]): BoardComment[] => {
	const out: BoardComment[] = [];
	for (const c of comments) {
		out.push(c);
		if (c.replies?.length) out.push(...flatten(c.replies));
	}
	return out;
};

// A post "awaits reply" when it has comments and the most recent one is from a
// partner (i.e. the team hasn't responded yet).
export const postNeedsReply = (comments: BoardComment[]): boolean => {
	const flat = flatten(comments);
	if (flat.length === 0) return false;
	return !isStaffComment(flat[flat.length - 1]);
};

const toISODate = (value: string | null | undefined): string | null => {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Map a BoardPost into the read-only partner-preview shape, so the Team Console
// can show a post exactly as a strategic partner sees it (reusing ComposerPreview).
export const boardPostToPreview = (post: BoardPost): PreviewData => {
	const start = post.eventStartsAt ? new Date(post.eventStartsAt) : null;
	const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
	const firstDoc = post.attachments?.[0];
	return {
		type: post.type,
		title: post.title,
		body: post.body,
		pinned: post.pinned,
		ackRequired: post.ackRequired,
		image:
			post.type === "announcement" && typeof post.image === "string"
				? post.image
				: "",
		docName: firstDoc?.name ?? "",
		docKind: firstDoc?.kind ?? "other",
		// Every saved attachment, so staff can reopen documents after sending —
		// not just the first one's name.
		docs: post.attachments ?? [],
		evMonth: validStart
			? validStart.toLocaleString("en-US", { month: "short" }).toUpperCase()
			: "—",
		evDay: validStart ? String(validStart.getDate()) : "",
		evWhen: validStart
			? validStart.toLocaleDateString("en-US", {
					weekday: "long",
					month: "long",
					day: "numeric",
				})
			: "",
		evWhere: post.eventLocation ?? "",
	};
};

// Map a BoardPost into the composer's initial values for editing.
export const boardPostToInitial = (post: BoardPost): ComposerInitial => ({
	post_type: post.type,
	title: post.title,
	description: post.body,
	strategic_partner: post.strategicPartnerId ?? null,
	audience_all:
		post.audienceGrouping == null &&
		post.strategicPartnerId == null &&
		(post.audiencePartnerIds?.length ?? 0) === 0,
	audience_grouping: post.audienceGrouping ?? null,
	audience_partner_ids: post.audiencePartnerIds ?? null,
	pinned: post.pinned,
	ack_required: post.ackRequired,
	ack_by: toISODate(post.ackBy),
	event_starts_at: post.eventStartsAt ?? null,
	event_location: post.eventLocation ?? null,
	image_url: typeof post.image === "string" ? post.image : null,
	existing_attachments: (post.attachments ?? []).map((a) => ({
		id: a.id ?? 0,
		name: a.name,
		url: a.url ?? null,
	})),
});
