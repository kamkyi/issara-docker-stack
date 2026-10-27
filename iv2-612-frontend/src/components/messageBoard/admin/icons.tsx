import type { SVGProps } from "react";

// Shared icon set for the Issara Team Console (admin) surfaces. Ported from the
// CASCADE design bundle so the console matches the partner board pixel-for-pixel.
type P = SVGProps<SVGSVGElement>;

const stroke = {
	fill: "none",
	stroke: "currentColor",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	strokeWidth: 2,
	viewBox: "0 0 24 24",
} as const;

export const I = {
	smile: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Reactions</title>
			<circle cx="12" cy="12" r="10" />
			<path d="M8 14s1.5 2 4 2 4-2 4-2" />
			<line x1="9" x2="9.01" y1="9" y2="9" />
			<line x1="15" x2="15.01" y1="9" y2="9" />
		</svg>
	),
	bell: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Notifications</title>
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
			<path d="M13.7 21a2 2 0 0 1-3.4 0" />
		</svg>
	),
	board: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Posts</title>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	),
	cal: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Event</title>
			<rect height="18" rx="2" width="18" x="3" y="4" />
			<line x1="16" x2="16" y1="2" y2="6" />
			<line x1="8" x2="8" y1="2" y2="6" />
			<line x1="3" x2="21" y1="10" y2="10" />
		</svg>
	),
	check: (p: P) => (
		<svg {...stroke} strokeWidth={2.4} {...p}>
			<title>Check</title>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	),
	chev: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Chevron</title>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	),
	checkCircle: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Confirm</title>
			<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
			<polyline points="22 4 12 14.01 9 11.01" />
		</svg>
	),
	clock: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Deadline</title>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	),
	comment: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Comments</title>
			<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
		</svg>
	),
	doc: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Document</title>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	),
	download: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Download</title>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" x2="12" y1="15" y2="3" />
		</svg>
	),
	edit: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Edit</title>
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
			<path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
		</svg>
	),
	eye: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Preview</title>
			<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	),
	image: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Image</title>
			<rect height="18" rx="2" width="18" x="3" y="3" />
			<circle cx="8.5" cy="8.5" r="1.5" />
			<polyline points="21 15 16 10 5 21" />
		</svg>
	),
	inbox: (p: P) => (
		<svg {...stroke} strokeWidth={1.8} {...p}>
			<title>Empty</title>
			<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
			<path d="M5.5 5.5L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" />
		</svg>
	),
	link: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Link</title>
			<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
			<path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
		</svg>
	),
	maximize: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Full screen</title>
			<path d="M8 3H5a2 2 0 0 0-2 2v3" />
			<path d="M16 3h3a2 2 0 0 1 2 2v3" />
			<path d="M8 21H5a2 2 0 0 1-2-2v-3" />
			<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
		</svg>
	),
	mapPin: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Location</title>
			<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	),
	minimize: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Exit full screen</title>
			<path d="M8 3v3a2 2 0 0 1-2 2H3" />
			<path d="M16 3v3a2 2 0 0 0 2 2h3" />
			<path d="M8 21v-3a2 2 0 0 0-2-2H3" />
			<path d="M16 21v-3a2 2 0 0 1 2-2h3" />
		</svg>
	),
	pinAlt: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Pin</title>
			<line x1="12" x2="12" y1="17" y2="22" />
			<path d="M9 9V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5l2 3v2H7v-2z" />
		</svg>
	),
	plus: (p: P) => (
		<svg {...stroke} strokeWidth={2.2} {...p}>
			<title>Add</title>
			<line x1="12" x2="12" y1="5" y2="19" />
			<line x1="5" x2="19" y1="12" y2="12" />
		</svg>
	),
	search: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Search</title>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" x2="16.65" y1="21" y2="16.65" />
		</svg>
	),
	send2: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Send</title>
			<line x1="22" x2="11" y1="2" y2="13" />
			<polygon points="22 2 15 22 11 13 2 9 22 2" />
		</svg>
	),
	upload: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Upload</title>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" x2="12" y1="3" y2="15" />
		</svg>
	),
	user: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Audience</title>
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
			<circle cx="12" cy="7" r="4" />
		</svg>
	),
	users: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Roster</title>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	),
	verified: (p: P) => (
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
	x: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Close</title>
			<line x1="18" x2="6" y1="6" y2="18" />
			<line x1="6" x2="18" y1="6" y2="18" />
		</svg>
	),
	spinner: (p: P) => (
		<svg
			{...stroke}
			{...p}
			className={`mb-spin${p.className ? ` ${p.className}` : ""}`}
		>
			<title>Loading</title>
			<path d="M21 12a9 9 0 1 1-6.219-8.56" />
		</svg>
	),
	arrow: (p: P) => (
		<svg {...stroke} strokeWidth={2.2} {...p}>
			<title>Go</title>
			<line x1="5" x2="19" y1="12" y2="12" />
			<polyline points="12 5 19 12 12 19" />
		</svg>
	),
	trash: (p: P) => (
		<svg {...stroke} {...p}>
			<title>Delete</title>
			<polyline points="3 6 5 6 21 6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			<line x1="10" x2="10" y1="11" y2="17" />
			<line x1="14" x2="14" y1="11" y2="17" />
		</svg>
	),
};
