import { CheckIcon } from "@radix-ui/react-icons";
import type React from "react";
import {
	POLICY_CATEGORIES,
	type PolicyCategorySlug,
} from "$src/types/policies";

interface CoverageTrackerProps {
	categorySlugsByPolicy: PolicyCategorySlug[][];
}

export const CoverageTracker: React.FC<CoverageTrackerProps> = ({
	categorySlugsByPolicy,
}) => {
	const counts = new Map<PolicyCategorySlug, number>();
	for (const cat of POLICY_CATEGORIES) counts.set(cat.slug, 0);
	for (const list of categorySlugsByPolicy) {
		for (const slug of list) {
			if (counts.has(slug)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
		}
	}
	const covered = POLICY_CATEGORIES.filter(
		(c) => (counts.get(c.slug) ?? 0) > 0,
	).length;
	const pct = Math.round((covered / POLICY_CATEGORIES.length) * 100);

	return (
		<div className="border border-gray-100 rounded-xl bg-linear-to-b from-amber-50/30 to-amber-50/10 p-4 mb-5">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-3">
				<span className="text-xs font-bold tracking-wide uppercase text-gray-800">
					Policy category coverage
				</span>
				<span className="text-sm text-gray-500">
					<b className="text-base font-extrabold text-[#004A60]">{covered}</b>{" "}
					of {POLICY_CATEGORIES.length} categories covered
				</span>
			</div>
			<div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
				<div
					className="h-full bg-linear-to-r from-[#148696] to-[#2ba3b1] transition-all duration-500"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				{POLICY_CATEGORIES.map((c) => {
					const n = counts.get(c.slug) ?? 0;
					const on = n > 0;
					return (
						<span
							className={`inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs font-semibold border ${
								on
									? "bg-[#e4f4f3] border-[#A6DFDD] text-[#0c6c7d]"
									: "bg-white border-gray-200 text-gray-500"
							}`}
							key={c.slug}
						>
							<span
								className={`w-4 h-4 rounded-full grid place-items-center ${
									on
										? "bg-[#2ba3b1] text-white"
										: "border border-gray-300 bg-white"
								}`}
							>
								{on && <CheckIcon className="w-3 h-3" />}
							</span>
							{c.label}
							{on && <span className="text-[#148696]">· {n}</span>}
						</span>
					);
				})}
			</div>
		</div>
	);
};
