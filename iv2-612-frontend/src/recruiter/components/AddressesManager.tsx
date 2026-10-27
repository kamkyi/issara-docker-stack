import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
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

interface AddressesManagerProps {
	addresses: any[];
	setAddresses: (addresses: any[]) => void;
	companyData: Partial<Company> | null;
	setCompanyData: (data: Partial<Company> | null) => void;
}

export const AddressesManager: React.FC<AddressesManagerProps> = ({
	addresses,
	setAddresses,
	companyData,
	setCompanyData,
}) => {
	// Address management state
	const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
	const [newAddress, setNewAddress] = useState({
		street: "",
		city_id: "",
		state_id: "",
		country_id: "",
		zip: "",
	});

	// Handle address management
	const handleAddAddress = () => {
		// Basic validation
		if (!newAddress.street || !newAddress.country_id) {
			return;
		}

		const updatedAddresses = [...addresses, newAddress];
		setAddresses(updatedAddresses);
		setCompanyData({ ...companyData, addresses: updatedAddresses });
		setShowAddAddressDialog(false);
		setNewAddress({
			street: "",
			city_id: "",
			state_id: "",
			country_id: "",
			zip: "",
		});
	};

	return (
		<Card className="p-5 border border-gray-200 rounded-md mt-6 bg-gradient-to-br from-slate-50 to-amber-50 shadow-sm hover:shadow-md transition-all duration-300">
			<Flex align="center" justify="between" mb="5">
				<Heading className="text-slate-800" size="4">
					Company Addresses
				</Heading>
				<Button
					className="rounded-full px-4 py-0"
					color="amber"
					onClick={() => setShowAddAddressDialog(true)}
					variant="soft"
				>
					<PlusIcon /> Add Address
				</Button>
			</Flex>

			{addresses.length === 0 ? (
				<div className="bg-white/60 rounded-md p-8 text-center border border-amber-100">
					<Text align="center" className="p-4" color="gray">
						No addresses added yet. Add your company's physical locations.
					</Text>
				</div>
			) : (
				<div className="space-y-4">
					{addresses.map((address, index) => (
						<Card
							className="p-4 border border-gray-100 bg-white/80 hover:bg-white transition-colors duration-200"
							key={address.id}
						>
							<Flex align="start" justify="between">
								<div>
									<Text>
										{address.street}
										{address.city_id && `, ${address.city_id}`}
										{address.state_id && `, ${address.state_id}`}
										{address.country_id && `, ${address.country_id}`}
										{address.zip && ` ${address.zip}`}
									</Text>
								</div>

								<Button
									color="red"
									onClick={() => {
										const updated = addresses.filter((_, i) => i !== index);
										setAddresses(updated);
										setCompanyData({
											...companyData,
											addresses: updated,
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

			{/* Add Address Dialog */}
			<Dialog.Root
				onOpenChange={setShowAddAddressDialog}
				open={showAddAddressDialog}
			>
				<Dialog.Content aria-describedby="address-dialog-description">
					<Dialog.Title>Add Company Address</Dialog.Title>
					<Dialog.Description id={"address-dialog-description"} mb="4" size="2">
						Add a physical address for your company
					</Dialog.Description>

					<Flex direction="column" gap="3">
						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor="street"
							>
								Street <span className="text-red-500">*</span>
							</label>
							<TextField.Root
								id={"street"}
								onChange={(e) =>
									setNewAddress({
										...newAddress,
										street: e.target.value,
									})
								}
								placeholder="Street address"
								value={newAddress.street}
							/>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium" htmlFor="city">
								City
							</label>
							<TextField.Root
								id={"city"}
								onChange={(e) =>
									setNewAddress({
										...newAddress,
										city_id: e.target.value,
									})
								}
								placeholder="City"
								value={newAddress.city_id}
							/>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium" htmlFor="state">
								State/Province
							</label>
							<TextField.Root
								id={"state"}
								onChange={(e) =>
									setNewAddress({
										...newAddress,
										state_id: e.target.value,
									})
								}
								placeholder="State or Province"
								value={newAddress.state_id}
							/>
						</div>

						<div>
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor="country"
							>
								Country <span className="text-red-500">*</span>
							</label>
							<TextField.Root
								id={"country"}
								onChange={(e) =>
									setNewAddress({
										...newAddress,
										country_id: e.target.value,
									})
								}
								placeholder="Country"
								value={newAddress.country_id}
							/>
						</div>

						<div>
							<label className="block mb-1 text-sm font-medium" htmlFor="zip">
								ZIP/Postal Code
							</label>
							<TextField.Root
								id={"zip"}
								onChange={(e) =>
									setNewAddress({
										...newAddress,
										zip: e.target.value,
									})
								}
								placeholder="ZIP or postal code"
								value={newAddress.zip}
							/>
						</div>
					</Flex>

					<Flex gap="3" justify="end" mt="4">
						<Dialog.Close>
							<Button color="gray" variant="soft">
								Cancel
							</Button>
						</Dialog.Close>
						<Button onClick={handleAddAddress}>Add Address</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</Card>
	);
};
