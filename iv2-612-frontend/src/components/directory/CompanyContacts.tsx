import {
	EnvelopeClosedIcon,
	GlobeIcon,
	MobileIcon,
} from "@radix-ui/react-icons";

import { Box, Flex, Link, Text } from "@radix-ui/themes";
import type React from "react";
import "@radix-ui/themes/styles.css";

interface CompanyContactsProps {
	website?: string | null;
	email?: string | null;
	phone_numbers?: string | string[] | null;
	facebook?: string | null;
	viber?: string | null;
	line?: string | null;
}

const convertPhoneNumberLinks = (
	phoneNumberString: string | string[] | null,
): React.ReactNode => {
	if (!phoneNumberString) return null;

	const phoneNumbers =
		typeof phoneNumberString === "string"
			? phoneNumberString.split(",").map((num) => num.trim())
			: phoneNumberString;

	if (!Array.isArray(phoneNumbers)) {
		console.error("Invalid phone_numbers format provided:", phoneNumberString);
		return null;
	}

	return phoneNumbers.map((phoneNumber, index) => (
		<Link
			color="gray"
			href={`tel:${phoneNumber}`}
			key={`${phoneNumber}-${index}`}
			size="2"
			style={{ display: "block", textDecoration: "none" }}
		>
			<Flex align="center" gap="1">
				<MobileIcon />
				<Text>{phoneNumber}</Text>
			</Flex>
		</Link>
	));
};

const CompanyContacts: React.FC<CompanyContactsProps> = (props) => {
	return (
		<Flex direction="column" gap="3">
			{props.website && (
				<Link
					color="gray"
					href={props.website}
					rel="noopener noreferrer"
					size="2"
					style={{ textDecoration: "none" }}
					target="_blank"
				>
					<Flex align="center" gap="1">
						<GlobeIcon /> {/* Use Radix GlobeIcon */}
						<Text>{props.website.split("//").slice(-1)[0]}</Text>
					</Flex>
				</Link>
			)}

			{props.email && (
				<Link
					color="gray"
					href={`mailto: ${props.email}`}
					size="2"
					style={{ textDecoration: "none" }}
				>
					<Flex align="center" gap="1">
						<EnvelopeClosedIcon />
						<Text>{props.email}</Text>
					</Flex>
				</Link>
			)}

			{/* Handle both string and array phone numbers using the refactored utility */}
			{props.phone_numbers && convertPhoneNumberLinks(props.phone_numbers)}

			<Flex className="socials" gap="3">
				{props.facebook && (
					<Link
						color="gray"
						href={props.facebook}
						rel="noopener noreferrer"
						target="_blank"
					>
						<Box>
							<i className="fa-brands fa-square-facebook fa-2x"></i>
						</Box>
					</Link>
				)}
				{props.viber && (
					<Link
						color="gray"
						href={`viber://chat?number=${props.viber.slice(1)}`}
					>
						<Box>
							<i className="fab fa-viber fa-2x"></i>
						</Box>
					</Link>
				)}
				{props.line && (
					<Link color="gray" href={`line://ti/p/${props.line}`}>
						<Box>
							<i className="fab fa-line fa-2x"></i>
						</Box>
					</Link>
				)}
			</Flex>
		</Flex>
	);
};

export default CompanyContacts;
