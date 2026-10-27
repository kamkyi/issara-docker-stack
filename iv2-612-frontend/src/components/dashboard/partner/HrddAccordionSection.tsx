import { type ReactNode, useId, useState } from "react";

interface HrddAccordionSectionProps {
	children: ReactNode;
	defaultExpanded?: boolean;
	noPrint?: boolean;
	printSectionBreak?: boolean;
	title: string;
}

export default function HrddAccordionSection({
	children,
	defaultExpanded = false,
	noPrint = false,
	printSectionBreak = false,
	title,
}: HrddAccordionSectionProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const headingId = useId();
	const panelId = useId();

	return (
		<section
			className={`${isExpanded ? "mb-8" : "mb-0"} transition-[margin-bottom] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none${printSectionBreak ? " print-section-break" : ""}${noPrint ? " no-print" : ""}`}
		>
			<div className="container mx-auto px-4">
				<h2 className="heading-display" id={headingId}>
					<button
						aria-controls={panelId}
						aria-expanded={isExpanded}
						className="hrdd-accordion-trigger flex w-full cursor-pointer items-center justify-between gap-4 border-b border-[var(--color-border)] py-4 text-left [font:inherit] [text-transform:inherit] transition-colors hover:text-[var(--color-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] focus-visible:ring-inset"
						onClick={() => setIsExpanded((expanded) => !expanded)}
						type="button"
					>
						<span className="hrdd-accordion-title min-w-0">{title}</span>
						<span
							aria-hidden="true"
							className="no-print relative h-8 w-8 shrink-0 text-3xl font-normal leading-none text-[#148696]"
						>
							<span
								className={`absolute inset-0 flex items-center justify-center text-[#148696] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
									isExpanded
										? "rotate-90 scale-75 opacity-0"
										: "rotate-0 scale-100 opacity-100"
								}`}
							>
								+
							</span>
							<span
								className={`absolute inset-0 flex items-center justify-center text-[#148696] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
									isExpanded
										? "rotate-0 scale-100 opacity-100"
										: "-rotate-90 scale-75 opacity-0"
								}`}
							>
								−
							</span>
						</span>
					</button>
				</h2>
			</div>
			<section
				aria-hidden={!isExpanded}
				aria-labelledby={headingId}
				className={`hrdd-accordion-panel grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
					isExpanded
						? "grid-rows-[1fr] opacity-100"
						: "grid-rows-[0fr] opacity-0"
				}`}
				id={panelId}
				inert={!isExpanded}
			>
				<div className="hrdd-accordion-panel-content min-h-0 overflow-hidden">
					<div className="pt-6">{children}</div>
				</div>
			</section>
		</section>
	);
}
