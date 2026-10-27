import { motion } from "motion/react";
import { useId } from "react";

export interface TabItem {
	value: string;
	label: string;
}

interface AnimatedTabsProps {
	tabs: TabItem[];
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}

/**
 * Pill-style animated tab bar with a sliding Framer Motion indicator.
 * Drop-in replacement for any tab switcher — no Radix dependency.
 *
 * Usage:
 *   <AnimatedTabs
 *     tabs={[{ value: "a", label: "Tab A" }, { value: "b", label: "Tab B" }]}
 *     value={activeTab}
 *     onValueChange={setActiveTab}
 *   />
 */
export default function AnimatedTabs({
	tabs,
	value,
	onValueChange,
	className,
}: AnimatedTabsProps) {
	const layoutId = useId();

	return (
		<div
			className={`flex w-full items-center gap-1 rounded-xl bg-white p-1 ${className ?? ""}`}
			role="tablist"
		>
			{tabs.map((tab) => {
				const isActive = tab.value === value;
				return (
					<button
						aria-selected={isActive}
						className={`relative flex-1 px-5 py-2 text-sm font-medium rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus-visible:ring-offset-1 transition-colors duration-200 cursor-pointer whitespace-nowrap ${
							isActive ? "" : "hover:bg-[#FFF8DE]"
						}`}
						key={tab.value}
						onClick={() => onValueChange(tab.value)}
						role="tab"
						type="button"
					>
						{/* Sliding pill background */}
						{isActive && (
							<motion.span
								aria-hidden="true"
								className="absolute inset-0 rounded-xl bg-[#A6DFDD]"
								layoutId={layoutId}
								transition={{ type: "spring", stiffness: 380, damping: 34 }}
							/>
						)}
						{/* Label */}
						<span
							className={`relative z-10 transition-colors duration-200 ${
								isActive
									? "text-[#004A60] font-bold"
									: "text-gray-500 hover:text-[#004A60]"
							}`}
						>
							{tab.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
