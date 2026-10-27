import { InfoCircledIcon } from "@radix-ui/react-icons";
import { HoverCard } from "@radix-ui/themes";
import type React from "react";

/**
 * Small info icon that opens a readable, scrollable card on hover with the
 * metric's definition.
 */
export function InfoTip({
	title,
	children,
	label,
}: {
	title: string;
	children: React.ReactNode;
	label?: string;
}) {
	return (
		<HoverCard.Root closeDelay={150} openDelay={100}>
			<HoverCard.Trigger>
				<button
					aria-label={label ?? `About ${title}`}
					className="ml-1.5 inline-flex shrink-0 translate-y-[-1px] items-center justify-center rounded-full p-0.5 align-middle text-[#148696] transition hover:bg-[#148696]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] cursor-pointer"
					onClick={(e) => e.stopPropagation()}
					title={label ?? `About ${title}`}
					type="button"
				>
					<InfoCircledIcon className="h-4 w-4" />
				</button>
			</HoverCard.Trigger>
			<HoverCard.Content
				className="z-50 rounded-2xl bg-white shadow-xl"
				maxWidth="480px"
				size="2"
			>
				<div className="border-b border-[#D2D2D2] pb-2 mb-2">
					<h4 className="text-sm font-semibold text-[#004A60]">{title}</h4>
				</div>
				<div className="max-h-[60vh] overflow-y-auto text-xs leading-relaxed text-[#56666C]">
					{children}
				</div>
			</HoverCard.Content>
		</HoverCard.Root>
	);
}

export default InfoTip;
