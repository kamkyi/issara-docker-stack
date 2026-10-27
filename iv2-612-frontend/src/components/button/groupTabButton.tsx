import { ListBulletIcon, ViewGridIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import type React from "react";
import type { ViewMode, ViewOption } from "$src/types/components";

export type { ViewMode };

interface GroupTabButtonProps {
	activeView: ViewMode;
	onViewChange: (view: ViewMode) => void;
	size?: "1" | "2" | "3" | "4";
	variant?: "solid" | "soft" | "outline" | "ghost";
	showLabels?: boolean;
	disabled?: boolean;
	className?: string;
}

const GroupTabButton: React.FC<GroupTabButtonProps> = ({
	activeView,
	onViewChange,
	size = "1",
	variant = "soft",
	disabled = false,
	className = "",
}) => {
	const viewOptions: ViewOption[] = [
		{
			mode: "grid",
			icon: <ViewGridIcon height="16" width="16" />,
			label: "Grid",
			ariaLabel: "Switch to grid view",
		},
		{
			mode: "list",
			icon: <ListBulletIcon height="16" width="16" />,
			label: "List",
			ariaLabel: "Switch to list view",
		},
	];

	const getButtonVariant = (viewMode: ViewMode) => {
		return activeView === viewMode ? "solid" : variant;
	};

	const getButtonStyles = (
		index: number,
		total: number,
		viewMode: ViewMode,
	) => {
		const baseStyle = {
			cursor: disabled ? "not-allowed" : "pointer",
			transition: "all 0.2s ease-in-out",
			opacity: disabled ? 0.6 : 1,
			background:
				activeView === viewMode ? "#148696" : "rgba(20, 134, 150, 0.3)",
			color: "white",
			borderRadius: 5,
		};

		if (total === 2) {
			if (index === 0) {
				return {
					...baseStyle,
					borderTopRightRadius: 0,
					borderBottomRightRadius: 0,
					borderRight:
						activeView === viewOptions[index].mode
							? "none"
							: "1px solid var(--gray-6)",
				};
			} else {
				return {
					...baseStyle,
					borderTopLeftRadius: 0,
					borderBottomLeftRadius: 0,
					borderLeft:
						activeView === viewOptions[index].mode
							? "none"
							: "1px solid var(--gray-6)",
				};
			}
		}

		return baseStyle;
	};

	return (
		<div
			className={`inline-flex rounded-md p-1 border border-[#148696] shadow-sm ${className}`}
		>
			{viewOptions.map((option, index) => (
				<Button
					aria-label={option.ariaLabel}
					aria-pressed={activeView === option.mode}
					disabled={disabled}
					key={option.mode}
					onClick={() => !disabled && onViewChange(option.mode)}
					size={size}
					style={getButtonStyles(index, viewOptions.length, option.mode)}
					variant={getButtonVariant(option.mode)}
				>
					{option.icon}
					{option.label}
				</Button>
			))}
		</div>
	);
};

export default GroupTabButton;
