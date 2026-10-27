import { Tabs } from "@radix-ui/themes";

export interface TabItem {
	value: string;
	label: string;
}

interface AppTabsProps {
	tabs: TabItem[];
	value: string;
	onValueChange: (value: string) => void;
	color?: React.ComponentProps<typeof Tabs.List>["color"];
	className?: string;
}

export default function AppTabs({
	tabs,
	value,
	onValueChange,
	color = "teal",
	className,
}: AppTabsProps) {
	return (
		<div className={className ?? "mb-6"}>
			<Tabs.Root onValueChange={onValueChange} value={value}>
				<Tabs.List color={color}>
					{tabs.map((tab) => (
						<Tabs.Trigger
							className="cascade-tab px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							key={tab.value}
							value={tab.value}
						>
							{tab.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>
			</Tabs.Root>
		</div>
	);
}
