import type React from "react";

interface PageHeaderProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	/** Right-aligned slot for actions, filters, or buttons. */
	actions?: React.ReactNode;
	className?: string;
}

/**
 * Canonical page title block for authenticated pages.
 * Title renders as the style-guide H1 (40/52, navy, Fugaz One) in UPPERCASE.
 * The global `h1` rule in global.css supplies size/color/font; we only add the
 * display treatment (uppercase, tight tracking) and layout here.
 */
export default function PageHeader({
	title,
	subtitle,
	actions,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={`mb-xl flex flex-wrap items-start justify-between gap-m ${className ?? ""}`}
		>
			<div>
				<h1 className="heading-display uppercase tracking-[-0.022em]">
					{title}
				</h1>
				{subtitle && <p className="mt-s text-base text-body">{subtitle}</p>}
			</div>
			{actions && <div className="flex items-center gap-s">{actions}</div>}
		</div>
	);
}
