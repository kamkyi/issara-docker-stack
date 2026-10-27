import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

export const StageIcons: Record<string, (p: IconProps) => ReactElement> = {
	learning: (p) => (
		<svg {...base} {...p}>
			<path d="M3 8l9-4 9 4-9 4-9-4z" />
			<path d="M7 10v4c0 2 2.5 3.5 5 3.5s5-1.5 5-3.5v-4" />
			<path d="M21 8v5" />
		</svg>
	),
	policy: (p) => (
		<svg {...base} {...p}>
			<path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
			<path d="M9 12l2 2 4-4" />
		</svg>
	),
	comms: (p) => (
		<svg {...base} {...p}>
			<path d="M4 11l11-5v12L4 13v-2z" />
			<path d="M8 13v3a2 2 0 0 0 4 0v-1.5" />
			<path d="M18 9a3 3 0 0 1 0 6" />
		</svg>
	),
	engagement: (p) => (
		<svg {...base} {...p}>
			<circle cx="9" cy="8" r="3" />
			<path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
			<circle cx="17" cy="9" r="2.4" />
			<path d="M15 19c0-2.4 1.9-4.5 4-4.5" />
		</svg>
	),
	techdata: (p) => (
		<svg {...base} {...p}>
			<rect height="13" rx="2" width="17" x="3.5" y="4" />
			<path d="M8 13v-3M12 13V8M16 13v-5" />
			<path d="M9 21h6" />
		</svg>
	),
};

export const CheckIcon = (p: IconProps) => (
	<svg {...base} strokeWidth={3} {...p}>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

export const ArrowRightIcon = (p: IconProps) => (
	<svg {...base} {...p}>
		<path d="M5 12h14" />
		<path d="M13 6l6 6-6 6" />
	</svg>
);

export const SearchIcon = (p: IconProps) => (
	<svg {...base} {...p}>
		<circle cx="11" cy="11" r="7" />
		<path d="M21 21l-4.3-4.3" />
	</svg>
);
