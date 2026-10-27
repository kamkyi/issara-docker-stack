import {
	CheckCircledIcon, // For Operational (matches fa-circle-check)
	CrossCircledIcon, // For PermanentlyBlacklisted (matches fa-circle-xmark)
	ExclamationTriangleIcon, // For LicenseIsNotExtended (matches fa-triangle-exclamation)
	GearIcon, // For Processing (matches fa-cog)
	PauseIcon, // For TemporarilySuspended (matches fa-pause-circle)
} from "@radix-ui/react-icons"; // Import Radix UI Icons
import { Flex, Text } from "@radix-ui/themes"; // Import Radix UI components, Box might be useful for icons
import moment from "moment"; // Assuming moment is used for date formatting
import type React from "react";
import { CompanyStatus, type CompanyStatusDisplayProps } from "./types";
import "@radix-ui/themes/styles.css"; // Import Radix UI Themes styles

const CompanyStatusDisplay: React.FC<CompanyStatusDisplayProps> = ({
	status,
	statusFromDate,
	statusToDate,
}) => {
	// Radix UI specific props for common text styling
	const commonTextProps = {
		weight: "bold" as const,
		size: "2" as const,
	};

	// Radix UI specific props for date text styling
	const dateTextProps = {
		color: "gray" as const,
		size: "1" as const,
	};

	const formatReadableDate = (
		dateString: string | null | undefined,
	): string | null => {
		if (!dateString) return null;
		try {
			return moment(dateString).format("LL");
		} catch (e) {
			console.error("Error formatting date:", dateString, e);
			return dateString;
		}
	};

	// Use a switch statement based on the status ENUM value
	switch (status) {
		case CompanyStatus.Operational: {
			return (
				<Flex align="center" direction="row" gap="1" mb="1">
					{" "}
					{/* Added mb for consistency */}
					<CheckCircledIcon color="green" />{" "}
					{/* Use Radix Icon with color prop */}
					<Text {...commonTextProps} color="green">
						{CompanyStatus.Operational}
					</Text>
				</Flex>
			);
		}

		case CompanyStatus.TemporarilySuspended: {
			const tempSuspendedFrom = formatReadableDate(statusFromDate);
			const tempSuspendedTo = formatReadableDate(statusToDate);
			return (
				<Flex direction="column" gap="0" mb="1">
					{" "}
					{/* Use Flex column for stacking, added mb */}
					<Flex align="center" direction="row" gap="1">
						<PauseIcon color="orange" /> {/* Use Radix Icon with color prop */}
						<Text {...commonTextProps} color="orange">
							{CompanyStatus.TemporarilySuspended}
						</Text>
					</Flex>
					{tempSuspendedFrom && (
						<Text {...dateTextProps}>{`from: ${tempSuspendedFrom}`}</Text>
					)}
					{tempSuspendedTo && (
						<Text {...dateTextProps}>{`to: ${tempSuspendedTo}`}</Text>
					)}
				</Flex>
			);
		}

		case CompanyStatus.PermanentlyBlacklisted: {
			const blacklistedFrom = formatReadableDate(statusFromDate);
			return (
				<Flex direction="column" gap="0" mb="1">
					{" "}
					{/* Added mb */}
					<Flex align="center" direction="row" gap="1">
						<CrossCircledIcon color="red" />{" "}
						{/* Use Radix Icon with color prop */}
						<Text {...commonTextProps} color="red">
							{CompanyStatus.PermanentlyBlacklisted}
						</Text>
					</Flex>
					{blacklistedFrom && (
						<Text {...dateTextProps}>{`from: ${blacklistedFrom}`}</Text>
					)}
				</Flex>
			);
		}

		case CompanyStatus.LicenseIsNotExtended: {
			const licenseNotExtendedFrom = formatReadableDate(statusFromDate);
			return (
				<Flex direction="column" gap="0" mb="1">
					{" "}
					{/* Added mb */}
					<Flex align="center" direction="row" gap="1">
						<ExclamationTriangleIcon color="amber" />{" "}
						{/* Use Radix Icon with color prop, mapped darkorange */}
						<Text {...commonTextProps} color="amber">
							{CompanyStatus.LicenseIsNotExtended}
						</Text>
					</Flex>
					{licenseNotExtendedFrom && (
						<Text {...dateTextProps}>{`from: ${licenseNotExtendedFrom}`}</Text>
					)}
				</Flex>
			);
		}

		case CompanyStatus.Processing: {
			const processingFrom = formatReadableDate(statusFromDate);
			return (
				<Flex direction="column" gap="0" mb="1">
					{" "}
					{/* Added mb */}
					<Flex align="center" direction="row" gap="1">
						<GearIcon color="blue" />{" "}
						{/* Use Radix Icon with color prop, mapped #2196F3 */}
						<Text {...commonTextProps} color="blue">
							{CompanyStatus.Processing}
						</Text>
					</Flex>
					{processingFrom && (
						<Text {...dateTextProps}>{`from: ${processingFrom}`}</Text>
					)}
				</Flex>
			);
		}

		default:
			console.warn(`Unknown recruitment agency status: ${status}`);
			return null;
	}
};

// Export the component and the ENUM
export default CompanyStatusDisplay;

// Note: Ensure you have installed Radix UI Themes and Radix UI Icons:
// npm install @radix-ui/themes @radix-ui/react-icons
// Make sure to include the Radix UI Theme provider higher up in your component tree
// and import the Radix UI Themes styles as shown.
