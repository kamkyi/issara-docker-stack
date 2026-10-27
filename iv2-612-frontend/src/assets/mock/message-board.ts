export type PostType = "announcement" | "report" | "event";

export type RsvpStatus = "going" | "not_going" | null;

export interface BoardComment {
	id?: number;
	authorId?: number | null;
	who: string;
	role: string | null;
	initials: string;
	color: string;
	when: string;
	text: string;
	// True when the comment author is Issara staff/management (set by the
	// backend). Drives the Team Console "awaiting reply" flag.
	isStaff?: boolean;
	// Strategic partner the comment came from (denormalised server-side), so the
	// Team Console can filter comments per partner.
	strategicPartnerId?: number | null;
	strategicPartnerName?: string | null;
	replies?: BoardComment[];
}

export interface BoardDoc {
	id?: number;
	name: string;
	size: string;
	kind: "pdf" | "xls" | "other";
	url?: string | null;
}

export interface BoardEvent {
	month: string;
	day: string;
	when: string;
	where: string;
}

export interface BoardPost {
	id: string;
	type: PostType;
	// Draft posts are authored by Issara staff but withheld from partners until
	// published. Absent ⇒ treat as "published" (the partner feed never carries
	// drafts). Only the staff Team Console surfaces drafts.
	status?: "draft" | "published";
	pinned: boolean;
	unread: boolean;
	author: {
		id?: number | null;
		name: string;
		role: string;
		initials: string;
		color: string;
		isStaff?: boolean;
	};
	time: string;
	date: string;
	title: string;
	body: string;
	attachments?: BoardDoc[];
	image?: boolean | string;
	event?: BoardEvent;
	ackRequired: boolean;
	ackBy?: string;
	acked?: number;
	ackTotal?: number;
	userHasAcked?: boolean;
	rsvpStatus?: RsvpStatus;
	// Number of partners who RSVP'd "going" — shown in the Team Console for events.
	goingCount?: number;
	// Aggregated per-emoji reaction tally (key → count), visible to everyone.
	reactionCounts?: Record<string, number>;
	// The current user's own reaction key (one per user), or null.
	userReaction?: string | null;
	comments: BoardComment[];
	// Raw fields preserved verbatim for the edit composer (not used by the
	// reader UI, which derives display strings from these).
	strategicPartnerId?: number | null;
	audienceGrouping?: string | null;
	audiencePartnerIds?: number[] | null;
	eventStartsAt?: string | null;
	eventEndsAt?: string | null;
	eventLocation?: string | null;
	sortNumber?: number | null;
}

export const TYPE_LABEL: Record<PostType, string> = {
	announcement: "Announcement",
	report: "Document",
	event: "Event",
};

export const BOARD_POSTS: BoardPost[] = [
	{
		id: "p1",
		type: "report",
		pinned: true,
		unread: true,
		author: {
			name: "Priya Raman",
			role: "Programs Director",
			initials: "PR",
			color: "#004A60",
		},
		time: "2 days ago",
		date: "Jun 2, 2026",
		title: "Q2 2026 Worker Voice Coverage Report — now available",
		body: "The quarterly Worker Voice Coverage Report is published. This edition covers grievance resolution rates across all Tier 1 facilities, remediation timelines, and benchmark comparisons against the program cohort. Please review the executive summary and confirm receipt by June 13.",
		attachments: [
			{
				id: 1,
				name: "Q2-2026_Worker_Voice_Coverage.pdf",
				size: "4.2 MB · 28 pages",
				kind: "pdf",
			},
		],
		ackRequired: true,
		ackBy: "Jun 13, 2026",
		acked: 14,
		ackTotal: 22,
		reactionCounts: { thumbs_up: 8, heart: 2, clap: 3 },
		userReaction: "thumbs_up",
		comments: [
			{
				who: "Daniel Osei",
				role: null,
				initials: "DO",
				color: "#6F2E97",
				when: "1 day ago",
				text: "Helpful breakdown this quarter. Is the facility-level appendix available as a separate export for our internal teams?",
			},
			{
				who: "Priya Raman",
				role: "CASCADE Team",
				initials: "PR",
				color: "#004A60",
				when: "22 hrs ago",
				text: "Yes — @Daniel Osei the appendix ships as an XLSX in the Reports archive later today. I'll reply here once it's up.",
			},
		],
	},
	{
		id: "p2",
		type: "announcement",
		pinned: true,
		unread: true,
		author: {
			name: "Marcus Lindqvist",
			role: "Head of Partnerships",
			initials: "ML",
			color: "#148696",
		},
		time: "4 days ago",
		date: "May 31, 2026",
		title: "Updated escalation protocol effective July 1",
		body: "We are streamlining the buyer escalation pathway to reduce case resolution time. Starting July 1, all Tier 1 escalations route through the new triage workflow, with a committed first response within 48 hours. A short briefing deck is attached. No action is required from partners today — this note is for awareness ahead of the rollout.",
		image: true,
		ackRequired: false,
		reactionCounts: { thumbs_up: 5, party: 4 },
		userReaction: null,
		comments: [],
	},
	{
		id: "p3",
		type: "event",
		pinned: false,
		unread: true,
		author: {
			name: "Aisha Bello",
			role: "Engagement Lead",
			initials: "AB",
			color: "#6F2E97",
		},
		time: "5 days ago",
		date: "May 30, 2026",
		title: "Strategic Partner Roundtable — Responsible Recruitment",
		body: "Join the CASCADE team and fellow strategic partners for a 90-minute virtual roundtable on responsible recruitment practices across shared supply chains. We'll share early findings from the pilot cohort and open the floor for partner input on the 2027 framework.",
		event: {
			month: "JUN",
			day: "18",
			when: "Thursday, June 18 · 3:00–4:30 PM GMT",
			where: "Virtual · Microsoft Teams",
		},
		ackRequired: false,
		comments: [
			{
				who: "Lena Fischer",
				role: null,
				initials: "LF",
				color: "#FB8379",
				when: "3 days ago",
				text: "Will the session be recorded for colleagues in other time zones?",
			},
		],
	},
	{
		id: "p4",
		type: "report",
		pinned: false,
		unread: false,
		author: {
			name: "Daniel Osei",
			role: "Data & Insights",
			initials: "DO",
			color: "#148696",
		},
		time: "1 week ago",
		date: "May 28, 2026",
		title: "Supply Chain Engagement Activity Log — May 2026",
		body: "The monthly activity log summarising trainings, surveys, and on-site events across the network is attached as a spreadsheet. This month includes 32 logged activities, with detail on participation rates by facility tier.",
		attachments: [
			{
				id: 2,
				name: "Engagement_Activities_May-2026.xlsx",
				size: "1.1 MB · 6 sheets",
				kind: "xls",
			},
		],
		ackRequired: false,
		comments: [],
	},
	{
		id: "p5",
		type: "announcement",
		pinned: false,
		unread: false,
		author: {
			name: "Marcus Lindqvist",
			role: "Head of Partnerships",
			initials: "ML",
			color: "#148696",
		},
		time: "2 weeks ago",
		date: "May 21, 2026",
		title: "Welcome to the CASCADE Message Board",
		body: "This is your new home for announcements, reports, and event notices from the ILM Cascade team. You'll find everything posted here — confirm receipt on items that request acknowledgement, and use the comments to raise questions directly with our team. We'll keep important items pinned to the top.",
		ackRequired: false,
		comments: [
			{
				who: "Sofia Marchetti",
				role: null,
				initials: "SM",
				color: "#004A60",
				when: "12 days ago",
				text: "Great to have everything consolidated in one place. Much easier than tracking email threads.",
			},
			{
				who: "Raj Patel",
				role: null,
				initials: "RP",
				color: "#FDDA61",
				when: "11 days ago",
				text: "Agreed. The acknowledgement feature will help our compliance team a lot.",
			},
		],
	},
];
