import { ChevronDown, ChevronUp, Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Change-history popover above "Preview & Submit".
 *
 * Cloned from the revamp reference (revamp/src/App.tsx HistoryWidget) — layout,
 * timeline treatment and the collapse-to-three behaviour all mirror it. Type and
 * colour follow the facelift design system (AGENTS.md) rather than the
 * prototype's 10/11px slate scale: Tailwind sizes only (text-xs/text-sm) and
 * palette tokens (#333333 ink, #8A979C caption, #D2D2D2 border, #A6DFDD teal).
 *
 * Deliberately mock-only: the entries below are the revamp's sample data and are
 * shown in every environment, staging and production alike. Nothing is fetched
 * from the server yet, so the widget no longer takes a grievance id. Restoring
 * live data means swapping GRIEVANCE_HISTORY for
 * fetchSupplierKpiGrievanceHistory() (still exported by
 * services/supplierKpiGrievanceService) and feeding the result to `entries`.
 */

type GrievanceHistoryMockEntry = {
	datetime: string;
	user: string;
	action: string;
	/**
	 * Which accordion step the change belongs to. Named and valued to match the
	 * `section` the live history endpoint already emits per entry (see
	 * issara/grievance/views.py: "Safeguarding", "Investigation",
	 * "Communications", "Case Update / Closure", "Form"), so switching this
	 * widget to live data is a swap of the array, not of the markup.
	 */
	section: string;
};

const GRIEVANCE_HISTORY: GrievanceHistoryMockEntry[] = [
	{
		datetime: "Jul 18, 2026, 9:14 a.m.",
		user: "supplier@fishseafood.co (Ananya K.)",
		action: "Additional notes updated and saved as draft.",
		section: "Investigation",
	},
	{
		datetime: "Jul 16, 2026, 10:05 a.m.",
		user: "supplier@fishseafood.co (Ananya K.)",
		action: "Worker well-being check-in recorded in the internal notes.",
		section: "Communications",
	},
	{
		datetime: "Jul 15, 2026, 3:42 p.m.",
		user: "alfred@issarainstitute.org (Zin Min Khant)",
		action: "Reviewed safeguarding section. Added comment on PPE provision.",
		section: "Safeguarding",
	},
	{
		datetime: "Jul 14, 2026, 11:07 a.m.",
		user: "alfred@issarainstitute.org (Zin Min Khant)",
		action: "Form created and linked to issue #1006.",
		section: "Form",
	},
	{
		datetime: "Jul 13, 2026, 8:55 a.m.",
		user: "system@cascade.issara",
		action: "Issue #1006 escalated to Level 3. ILM form auto-generated.",
		section: "Case Update / Closure",
	},
	{
		datetime: "Jul 10, 2026, 4:22 p.m.",
		user: "worker-hotline@issarainstitute.org",
		action: "Issue #1006 reported via worker feedback channel.",
		section: "Form",
	},
];

const COLLAPSED_COUNT = 3;

/** "alfred@issarainstitute.org (Zin Min Khant)" → "Zin · issarainstitute". */
const shortUser = (user: string) => {
	const name = user.match(/\(([^)]+)\)/)?.[1]?.split(" ")[0];
	const domain = user.split("@")[1]?.split(".")[0];
	return name ? `${name} · ${domain}` : user.split("@")[0];
};

export default function GrievanceHistoryWidget({
	entries = GRIEVANCE_HISTORY,
}: {
	entries?: GrievanceHistoryMockEntry[];
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const widgetRef = useRef<HTMLDivElement | null>(null);
	const visible = isExpanded ? entries : entries.slice(0, COLLAPSED_COUNT);

	// Kept from the previous implementation: the revamp prototype has no outside
	// click / Escape handling, but the popover overlaps the form's action row here.
	useEffect(() => {
		if (!isOpen) return;

		const closeOnOutsideClick = (event: MouseEvent) => {
			if (
				widgetRef.current &&
				!widgetRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};

		document.addEventListener("mousedown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	return (
		<div className="relative" ref={widgetRef}>
			<button
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				className="group flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-[#56666C] transition-colors hover:bg-[#FFF8DE] hover:text-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
				onClick={() => setIsOpen((value) => !value)}
				type="button"
			>
				<Clock aria-hidden="true" className="shrink-0" size={14} />
				<span>History</span>
				<span className="rounded-full bg-[#A6DFDD]/30 px-2 py-0.5 text-xs font-semibold text-[#004A60] transition-colors group-hover:bg-[#A6DFDD]">
					{entries.length}
				</span>
				{isOpen ? (
					<ChevronUp aria-hidden="true" size={14} />
				) : (
					<ChevronDown aria-hidden="true" size={14} />
				)}
			</button>

			{isOpen && (
				<div
					aria-label="Change History"
					className="absolute bottom-8 right-0 z-50 w-96 max-w-[80vw] overflow-hidden rounded-2xl border border-[#D2D2D2] bg-white shadow-xl"
					role="dialog"
				>
					<div className="flex items-center justify-between border-b border-[#D2D2D2] px-4 py-3">
						<span className="text-sm font-semibold text-[#333333]">
							Change History
						</span>
						<button
							aria-label="Close history"
							className="rounded-lg p-1 text-[#8A979C] transition-colors hover:bg-[#FFF8DE] hover:text-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={() => setIsOpen(false)}
							type="button"
						>
							<X size={14} />
						</button>
					</div>
					<div className="px-4 py-2">
						{visible.map((entry, index) => (
							<div
								className="flex gap-3 border-b border-[#D2D2D2]/40 py-3 last:border-0"
								key={`${entry.datetime}-${entry.action}`}
							>
								<div className="flex shrink-0 flex-col items-center pt-1">
									<div className="h-2 w-2 rounded-full bg-[#A6DFDD]" />
									{index < visible.length - 1 && (
										<div className="mt-1 w-px flex-1 bg-[#D2D2D2]/60" />
									)}
								</div>
								<div className="min-w-0">
									<span className="mb-1 inline-block rounded-full bg-[#FFF8DE] px-2 py-0.5 text-xs font-semibold text-[#004A60]">
										{entry.section}
									</span>
									<p className="text-sm leading-snug text-[#333333]">
										{entry.action}
									</p>
									<p className="mt-1 text-xs text-[#8A979C]">
										{shortUser(entry.user)} · {entry.datetime}
									</p>
								</div>
							</div>
						))}
					</div>
					{entries.length > COLLAPSED_COUNT && (
						<button
							className="w-full border-t border-[#D2D2D2] py-3 text-center text-xs font-semibold text-[#148696] transition-colors hover:bg-[#FFF8DE] hover:text-[#00516a] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#148696]"
							onClick={() => setIsExpanded((value) => !value)}
							type="button"
						>
							{isExpanded
								? "Show less"
								: `+${entries.length - COLLAPSED_COUNT} more`}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
