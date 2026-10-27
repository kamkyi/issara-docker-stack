import {
	EnvelopeClosedIcon,
	MobileIcon,
	PlusIcon,
	TrashIcon,
} from "@radix-ui/react-icons";
import {
	Button,
	Card,
	Dialog,
	Flex,
	Heading,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useState } from "react";
import type { Company } from "$src/components/directory/types";

interface ContactsManagerProps {
	contacts: any[];
	setContacts: (contacts: any[]) => void;
	companyData: Partial<Company> | null;
	setCompanyData: (data: Partial<Company> | null) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
	contacts,
	setContacts,
	companyData,
	setCompanyData,
}) => {
	// Contact management state
	const [showAddContactDialog, setShowAddContactDialog] = useState(false);
	const [newContact, setNewContact] = useState({
		first_name: "",
		last_name: "",
		position: "",
		email: "",
		phone_number: "",
	});

	// Handle contact management
	const handleAddContact = () => {
		// Basic validation
		if (!newContact.first_name || !newContact.last_name) {
			return;
		}

		const updatedContacts = [
			...contacts,
			{
				translation: {
					first_name: newContact.first_name,
					last_name: newContact.last_name,
					position: newContact.position,
				},
				email: newContact.email,
				phone_number: newContact.phone_number,
			},
		];

		setContacts(updatedContacts);
		setCompanyData({ ...companyData, contacts: updatedContacts as [] });
		setShowAddContactDialog(false);
		setNewContact({
			first_name: "",
			last_name: "",
			position: "",
			email: "",
			phone_number: "",
		});
	};

	return (
		<Card className="p-5 border border-gray-200 rounded-md mt-6 bg-gradient-to-br from-slate-50 to-green-50 shadow-sm hover:shadow-md transition-all duration-300">
			<Flex align="center" justify="between" mb="5">
				<Heading className="text-slate-800" size="4">
					Contact People
				</Heading>
				<Button
					className="rounded-full px-4 py-0"
					color="green"
					onClick={() => setShowAddContactDialog(true)}
					variant="soft"
				>
					<PlusIcon /> Add Contact
				</Button>
			</Flex>

			{contacts.length === 0 ? (
				<div className="bg-white/60 rounded-md p-8 text-center border border-green-100">
					<Text align="center" className="p-4" color="gray">
						No contacts added yet. Add contact people to help clients reach your
						company.
					</Text>
				</div>
			) : (
				<div className="space-y-4">
					{contacts.map((contact, index) => (
						<Card
							className="p-4 border border-gray-100 bg-white/80 hover:bg-white transition-colors duration-200"
							key={contact.id}
						>
							<Flex align="start" justify="between">
								<div>
									<Text weight="bold">
										{contact.translation?.first_name}{" "}
										{contact.translation?.last_name}
									</Text>
									{contact.translation?.position && (
										<Text color="gray" size="2">
											{contact.translation.position}
										</Text>
									)}

									{contact.email && (
										<Flex align="center" gap="1" mt="1">
											<EnvelopeClosedIcon />
											<Text size="2">{contact.email}</Text>
										</Flex>
									)}

									{contact.phone_number && (
										<Flex align="center" gap="1" mt="1">
											<MobileIcon />
											<Text size="2">{contact.phone_number}</Text>
										</Flex>
									)}
								</div>

								<Button
									color="red"
									onClick={() => {
										const updated = contacts.filter((_, i) => i !== index);
										setContacts(updated);
										setCompanyData({
											...companyData,
											contacts: updated as [],
										});
									}}
									size="1"
									variant="soft"
								>
									<TrashIcon />
								</Button>
							</Flex>
						</Card>
					))}
				</div>
			)}

			{/* Add Contact Dialog */}
			<Dialog.Root
				onOpenChange={setShowAddContactDialog}
				open={showAddContactDialog}
			>
				<Dialog.Content aria-describedby="contact-dialog-description">
					<Dialog.Title>Add Contact Person</Dialog.Title>
					<Dialog.Description id={"contact-dialog-description"} mb="4" size="2">
						Add contact information for a person at your company
					</Dialog.Description>

					<Flex direction="column" gap="3">
						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor={"first-name-input"}
							>
								First Name <span className="text-red-500">*</span>
							</label>
							<TextField.Root
								id={"first-name-input"}
								onChange={(e) =>
									setNewContact({
										...newContact,
										first_name: e.target.value,
									})
								}
								placeholder="First name"
								value={newContact.first_name}
							/>
						</div>

						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor={"last-name-input"}
							>
								Last Name <span className="text-red-500">*</span>
							</label>
							<TextField.Root
								id={"last-name-input"}
								onChange={(e) =>
									setNewContact({
										...newContact,
										last_name: e.target.value,
									})
								}
								placeholder="Last name"
								value={newContact.last_name}
							/>
						</div>

						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor={"job-title-input"}
							>
								Position
							</label>
							<TextField.Root
								id={"job-title-input"}
								onChange={(e) =>
									setNewContact({
										...newContact,
										position: e.target.value,
									})
								}
								placeholder="Job title"
								value={newContact.position}
							/>
						</div>

						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor={"email-input"}
							>
								Email
							</label>
							<TextField.Root
								id={"email-input"}
								onChange={(e) =>
									setNewContact({
										...newContact,
										email: e.target.value,
									})
								}
								placeholder="Email address"
								value={newContact.email}
							/>
						</div>

						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor={"phone-number-input"}
							>
								Phone Number
							</label>
							<TextField.Root
								id={"phone-number-input"}
								onChange={(e) =>
									setNewContact({
										...newContact,
										phone_number: e.target.value,
									})
								}
								placeholder="Phone number"
								value={newContact.phone_number}
							/>
						</div>
					</Flex>

					<Flex gap="3" justify="end" mt="4">
						<Dialog.Close>
							<Button color="gray" variant="soft">
								Cancel
							</Button>
						</Dialog.Close>
						<Button onClick={handleAddContact}>Add Contact</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</Card>
	);
};
