import type React from "react";

interface PageContainerProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Standard outer wrapper for authenticated pages. Single source of outer page
 * padding (style-guide spacing scale: L 25px horizontal, XL 40px vertical) so
 * routes stop hand-rolling `px-4 py-8` / `px-4 my-4` / `px-6 py-12`.
 */
export default function PageContainer({
	children,
	className,
}: PageContainerProps) {
	return (
		<div className={`mx-auto md:px-xl py-xl ${className ?? ""}`}>
			{children}
		</div>
	);
}
