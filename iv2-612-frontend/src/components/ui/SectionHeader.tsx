import type React from "react";

interface SectionHeaderProps {
	title?: React.ReactNode;
	/** Heading level for the section title. Defaults to h2. */
	as?: "h2" | "h3";
	caption?: React.ReactNode;
	/** Right-aligned slot for actions. */
	actions?: React.ReactNode;
	icon?: React.ReactNode;
	className?: string;
}

/**
 * Standardized section/subsection header. Uses the global heading scale (navy)
 * so section titles look identical across pages instead of the ad-hoc
 * `text-2xl font-semibold uppercase` / local `SectionTitle` variants.
 */
export default function SectionHeader({
	title,
	as = "h2",
	caption,
	actions,
	icon,
	className,
}: SectionHeaderProps) {
	const Heading = as;
	return (
		<div
			className={`mb-m flex flex-wrap items-center justify-between gap-s ${className ?? ""}`}
		>
			<div>
				{title && (
					<Heading className="flex items-center gap-s">
						{icon}
						{title}
					</Heading>
				)}
				{caption && <p className="mt-xs text-sm text-body">{caption}</p>}
			</div>
			{actions && <div className="flex items-center gap-s">{actions}</div>}
		</div>
	);
}
