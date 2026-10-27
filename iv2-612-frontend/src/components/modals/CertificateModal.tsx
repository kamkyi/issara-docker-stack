import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex } from "@radix-ui/themes";

const CertificateModal = ({ company, open, onClose }) => {
	return (
		<Dialog.Root onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
			<Dialog.Content style={{ maxWidth: 450 }}>
				<Flex align="center" justify="between">
					<Dialog.Title mb="0">
						Collaboration with Civil Society Organizations
					</Dialog.Title>
					<Dialog.Close>
						<Button
							className="rounded-full"
							onClick={onClose}
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>
				<Dialog.Description mb="4" size="2">
					Information about the collaboration between {company.name} and civil
					society organizations to improve workplace conditions.
				</Dialog.Description>

				<p>
					We are actively engaged with various CSOs to ensure transparent and
					fair labor practices. These collaborations focus on worker rights,
					safety training, and grievance mechanisms.
				</p>

				<Flex gap="3" justify="end" mt="4">
					<Dialog.Close>
						<Button color="gray" onClick={onClose} variant="soft">
							Close
						</Button>
					</Dialog.Close>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default CertificateModal;
