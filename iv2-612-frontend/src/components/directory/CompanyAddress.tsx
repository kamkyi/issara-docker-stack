import { Card, Flex, Text } from "@radix-ui/themes";
import type React from "react";
import Contact from "./CompanyPersonContact"; // Assuming Contact component exists

interface AddressProps {
	street?: string;
	city?: string | null; // Allow null if city might not always be present
	state?: string | null; // Allow null if state might not always be present
	country?: string | null; // Allow null if country might not always be present
	zip?: string;
	name_en?: string;
	addressContacts: any[]; // Define a more specific type for addressContacts
}

const Address: React.FC<AddressProps> = (props) => {
	return (
		<Card className="mt-2">
			<Flex align="start" direction="column" gap="1" p="1">
				<Flex align="center" gap="1">
					<Text align="center" size="2">
						{props.street && `${props.street}, `}
						{props.city && `${props.city}, `}
						{props.state && `${props.state}, `}
						{props.country && `${props.country}, `}
						{props.zip}
					</Text>
					{props.name_en && (
						<a
							className="location-icon"
							href={`https://www.google.com/maps/search/?api=1&query=$$${props.name_en}`}
							rel="noopener noreferrer"
							target="_blank"
						>
							<i className="fa fa-location-arrow fa-sm"></i>
						</a>
					)}
				</Flex>
			</Flex>
			<Flex direction="column" p="1">
				{props.addressContacts.filter((contact) => contact.translation).length >
				0 ? (
					props.addressContacts.map((contact, key) => {
						if (contact.translation) {
							return <Contact contact={contact} key={key} />;
						}
						return null;
					})
				) : (
					<div></div>
				)}
			</Flex>
		</Card>
	);
};

export default Address;
