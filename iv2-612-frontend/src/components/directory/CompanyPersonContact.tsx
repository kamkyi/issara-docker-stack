import {
	EnvelopeClosedIcon,
	MobileIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { Avatar, Flex, Link, Text } from "@radix-ui/themes";
import type React from "react";

interface ContactProps {
	contact: {
		image?: string | null;
		email?: string | null;
		phone_number?: string | null;
		translation: {
			first_name?: string | null;
			last_name?: string | null;
			position?: string | null;
		};
	};
}

const Contact: React.FC<ContactProps> = (props) => {
	const { contact } = props;
	const fullName = `${contact.translation?.first_name || ""} ${
		contact.translation?.last_name || ""
	}`.trim();

	return (
		<Flex align="center" className="ContactCard mt-1" gap="3" pb="4">
			<Avatar
				crossOrigin="anonymous"
				fallback={<PersonIcon />}
				radius="full"
				size="3"
				src={contact.image || "/static/media/astronaut.png"}
			/>
			<Flex direction="column" gap="1" style={{ flex: 1 }}>
				<Text as="p" size="3" weight="bold">
					{fullName || "No Name"}
				</Text>
				<Text color="gray" size="2">
					{contact.translation?.position || "No Position"}
				</Text>
				{contact.email && (
					<Link
						color="gray"
						href={`mailto: ${contact.email}`}
						size="2"
						style={{ textDecoration: "none" }}
					>
						<Flex align="center" gap="1">
							<EnvelopeClosedIcon />
							<Text>{contact.email}</Text>
						</Flex>
					</Link>
				)}
				{contact.phone_number && (
					<Link
						color="gray"
						href={`tel:${contact.phone_number}`}
						size="2"
						style={{ display: "block", textDecoration: "none" }}
					>
						<Flex align="center" gap="1">
							<MobileIcon />
							<Text>{contact.phone_number}</Text>
						</Flex>
					</Link>
				)}
			</Flex>
		</Flex>
	);
};

export default Contact;
