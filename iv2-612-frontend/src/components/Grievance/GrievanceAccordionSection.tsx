import { ChevronDown, FileText } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
	getStickyHeaderOffset,
	scheduleReveal,
} from "$src/utils/revealElement";

interface GrievanceAccordionSectionProps {
	badge?: string;
	children: ReactNode;
	icon?: ReactNode;
	isOpen: boolean;
	onToggle: () => void;
	subtitle: string;
	title: string;
}

export default function GrievanceAccordionSection({
	badge,
	children,
	icon,
	isOpen,
	onToggle,
	subtitle,
	title,
}: GrievanceAccordionSectionProps) {
	const panelId = useId();
	const sectionRef = useRef<HTMLElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	// Mount is not an "open" event: these sections live inside an expandable
	// table row, so the first step being open by default would otherwise scroll
	// the page the moment the row is expanded — before the row itself has
	// finished opening.
	const wasOpenRef = useRef(isOpen);

	// When the user opens a step, bring it into view — but only after the
	// grid-rows transition has settled (its height is 0 until then) and only if
	// it is actually clipped, so an already-visible step never jumps.
	useEffect(() => {
		const wasOpen = wasOpenRef.current;
		wasOpenRef.current = isOpen;
		if (!isOpen || wasOpen) return;

		return scheduleReveal(sectionRef.current, {
			offsetTop: getStickyHeaderOffset(),
			transitionTarget: panelRef.current,
		});
	}, [isOpen]);

	return (
		<section
			className="scroll-mt-24 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-sm"
			ref={sectionRef}
		>
			<button
				aria-controls={panelId}
				aria-expanded={isOpen}
				className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-secondary)] ${
					isOpen
						? "bg-[var(--color-secondary)] text-white"
						: "bg-white text-[var(--color-ink)] hover:bg-gray-50"
				}`}
				onClick={onToggle}
				type="button"
			>
				<span
					className={`shrink-0 [&_svg]:h-4 [&_svg]:w-4 ${
						isOpen
							? "text-[var(--color-action-teal)]"
							: "text-[var(--color-secondary)]"
					}`}
				>
					{icon ?? <FileText aria-hidden="true" className="h-4 w-4" />}
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex flex-wrap items-center gap-2">
						<span
							className={`text-sm font-semibold ${isOpen ? "text-white" : "text-[var(--color-ink)]"}`}
						>
							{title}
						</span>
						{badge && (
							<span className="rounded bg-[var(--color-action-teal)]/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#0f6b78]">
								{badge}
							</span>
						)}
					</span>
					<span
						className={`mt-0.5 block text-[11px] ${
							isOpen
								? "text-[var(--color-action-teal)]"
								: "text-[var(--color-caption)]"
						}`}
					>
						{subtitle}
					</span>
				</span>
				<ChevronDown
					aria-hidden="true"
					className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
						isOpen
							? "rotate-180 text-[var(--color-action-teal)]"
							: "text-[var(--color-caption)]"
					}`}
				/>
			</button>

			<div
				aria-hidden={!isOpen}
				className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
				}`}
				id={panelId}
				inert={!isOpen}
				ref={panelRef}
			>
				<div className="overflow-hidden">
					<div className="border-t border-[var(--color-action-teal)]/50 p-5">
						{children}
					</div>
				</div>
			</div>
		</section>
	);
}
