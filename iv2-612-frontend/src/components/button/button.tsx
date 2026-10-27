import { Button } from "@radix-ui/themes";

/**
 * Style guide button intents:
 * - "primary"  → teal #148696 fill (default)
 * - "alt1"     → navy #004A60 fill, hover teal, disabled #D2D2D2
 * - "alt2"     → white fill, teal border + text, hover light-teal #A6DFDD
 * Each maps to a CSS class in global.css so hover/disabled states work.
 */
export type ButtonIntent = "primary" | "alt1" | "alt2";

interface CascadeButtonType {
	handleOnClick: () => void;
	buttonText: string;
	size: "1" | "2" | "3" | "4";
	className?: string;
	disabled?: boolean;
	fullWidth?: boolean;
	intent?: ButtonIntent;
	variant?:
		| "outline"
		| "ghost"
		| "solid"
		| "classic"
		| "soft"
		| "surface"
		| undefined;
	color?: string;
	iconLeft?: React.ReactNode;
	iconRight?: React.ReactNode;
}

const intentClass: Record<ButtonIntent, string> = {
	primary: "cascade-btn cascade-btn--primary",
	alt1: "cascade-btn cascade-btn--alt1",
	alt2: "cascade-btn cascade-btn--alt2",
};

const CascadeButton = (props: CascadeButtonType) => {
	const {
		handleOnClick,
		buttonText,
		size,
		className,
		disabled,
		fullWidth,
		intent,
		variant,
		iconLeft,
		iconRight,
		color,
	} = props;

	// New style-guide path: intent drives colors via CSS classes.
	if (intent) {
		return (
			<Button
				className={`${intentClass[intent]} ${className ?? ""}`}
				disabled={disabled}
				onClick={handleOnClick}
				size={size}
				style={{
					cursor: disabled ? "not-allowed" : "pointer",
					width: fullWidth ? "100%" : "auto",
					fontWeight: "bold",
					borderRadius: "5px",
				}}
				variant={intent === "alt2" ? "outline" : "solid"}
			>
				{iconLeft} {buttonText} {iconRight}
			</Button>
		);
	}

	// Backwards-compatible path (default = Primary teal).
	return (
		<Button
			className={className}
			color="cyan"
			disabled={disabled}
			onClick={handleOnClick}
			size={size}
			style={{
				cursor: disabled ? "not-allowed" : "pointer",
				background: !variant && !color ? "#148696" : color ? color : "none",
				width: fullWidth ? "100%" : "auto",
				fontWeight: "bold",
				borderRadius: "5px",
			}}
			variant={variant ? variant : "solid"}
		>
			{iconLeft} {buttonText} {iconRight}
		</Button>
	);
};

export default CascadeButton;
