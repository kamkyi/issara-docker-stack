import type React from "react";
import SectionHeader from "./SectionHeader";

interface SectionCardProps {
	children: React.ReactNode;
	/** Optional section title rendered via the shared SectionHeader. */
	title?: React.ReactNode;
	icon?: React.ReactNode;
	caption?: React.ReactNode;
	/** Right-aligned slot in the header for actions. */
	actions?: React.ReactNode;
	headingAs?: "h2" | "h3";
	className?: string;
}

/**
 * Generic white panel on the cream page background — the style-guide
 * "card on cream" composition. Use for section panels across authenticated
 * pages instead of hand-rolling `bg-white rounded-md border ... p-6` divs.
 *
 * Note: the editable profile sections use the specialized
 * `company-profile/SectionCard` (save/cancel + i18n); this is the plain layout
 * panel for everything else.
 */
export default function SectionCard({
	children,
	title,
	icon,
	caption,
	actions,
	headingAs = "h3",
	className,
}: SectionCardProps) {
	return (
		<div
			className={`mb-l rounded-md border border-[var(--color-border)] bg-white p-l shadow-sm ${className ?? ""}`}
		>
			{(title || actions) && (
				<SectionHeader
					actions={actions}
					as={headingAs}
					caption={caption}
					icon={icon}
					title={title}
				/>
			)}
			{children}
		</div>
	);
}
