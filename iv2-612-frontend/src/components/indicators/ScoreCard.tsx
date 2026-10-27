import { Card, Flex, Text } from "@radix-ui/themes"; // Import necessary components
import type React from "react";

// Keeping the provided interface with width and height
interface ScoreCardProps {
	value: number | string; // Allowing string for flexibility
	label: string;
	width?: number;
	height?: number;
	aggregatedValue?: React.ReactNode;
}

// Using the provided default values for width and height
const ScoreCard: React.FC<ScoreCardProps> = ({
	value,
	label,
	width = 200, // Adjusted default width slightly for better text display
	height = 150, // Kept default height
	aggregatedValue,
}) => {
	// Using Radix UI Themes Card and Text components

	return (
		// Radix UI Themes Card component
		// Apply width and height via style prop.
		<Card
			style={{
				width: `${width}px`,
				height: `${height}px`,
				padding: "var(--space-5)",
			}}
		>
			{/* Use Flex to arrange content vertically and center it */}
			{/* direction="column": stacks children vertically */}
			{/* align="center": centers children horizontally along the cross axis */}
			{/* justify="center": centers children vertically along the main axis */}
			<Flex
				align="center"
				direction="column"
				gap="2"
				justify="center"
				style={{ height: "100%" }}
			>
				{/* Radix UI Themes Text for the value */}
				{!aggregatedValue && (
					<Text
						size="8"
						style={{ color: "var(--color-secondary)" }}
						weight="bold"
					>
						{value}
					</Text>
				)}

				{/* Radix UI Themes Text for the label */}
				{/* Add textAlign: 'center' to center the text within the label block */}
				<Text
					size="3"
					style={{ textAlign: "center", color: "var(--color-ink)" }}
					weight="medium"
				>
					{label}
				</Text>

				{aggregatedValue && (
					<div
						className="flex flex-col items-center justify-center"
						style={{
							minWidth: "72px", // golden ratio: 44px*1.618 ≈ 72px
							fontWeight: 600,
							fontSize: "1.125rem", // 18px, golden ratio to 11px
							color: "#333",
							zIndex: 2,
							position: "relative",
							textAlign: "center",
						}}
					>
						{aggregatedValue}
					</div>
				)}
			</Flex>
		</Card>
	);
};

export default ScoreCard;
