import { Avatar, Button, Dialog, Flex, Text } from "@radix-ui/themes";
import type React from "react";
import { Fragment } from "react";
import RatingStars from "$src/components/indicators/RatingStars";
import CompanyAddress from "./CompanyAddress";
import CompanyContacts from "./CompanyContacts";
import CompanyStatusDisplay from "./CompanyStatus";
import type { Company } from "./types"; // Assuming you create a types.ts file for the Company interface

interface CompanyDetailsProps {
	company: Company;
	onClose: () => void;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({
	company,
	onClose,
}) => {
	const sendingCountries = company?.sending_countries?.join(", ");
	return (
		<Dialog.Root onOpenChange={() => onClose()} open={!!company}>
			<Dialog.Content style={{ maxWidth: 600 }}>
				<Dialog.Title>{company.name_en || company.name}</Dialog.Title>

				<Flex align="center" direction="column" gap="1" justify="center" mb="4">
					<Avatar
						alt={"Company Logo"}
						className="shadow-md" // Added check for name_en
						fallback={company.name_en ? company.name_en[0] : ""}
						radius="full"
						size="8"
						src={company.logo as string}
						style={{
							// borderRadius: '4px',
							// width: '100%',
							// height: '300px',
							objectFit: "contain",
						}}
					/>
					<Text align="center" mb="1" size="2" weight="bold">
						{company.name_en || company.name}
					</Text>
					<RatingStars score={company.rating_score} />
				</Flex>

				<Flex direction="column">
					<CompanyStatusDisplay status={company.status as string} />
					{company?.date_of_registration && (
						<BoxDetail
							label="Registered:"
							value={company.date_of_registration}
						/>
					)}

					{company?.license_number && (
						<BoxDetail label="License Number:" value={company.license_number} />
					)}
					{company.license_valid_date && (
						<BoxDetail label="Valid to:" value={company.license_valid_date} />
					)}
					<br />
					{company.epp_policy && (
						<Flex direction="row" gap="1">
							<i className="fa-solid fa-medal"></i>
							<Text color="blue" size="2">
								Have Employer Pays Policy
							</Text>
						</Flex>
					)}
					{company.certificate && (
						<Flex direction="row" gap="1">
							<Avatar
								fallback="On the level"
								size="2"
								src={company.certificate}
							/>
							<Text mt="2" size="2">
								Certificate
							</Text>
						</Flex>
					)}

					{sendingCountries && (
						<Fragment>
							<br />
							<Text as="div" mb="1" size="2" weight="bold">
								This recruitment agency has experience sending workers to{" "}
								<span style={{ color: "#094099" }}>{sendingCountries}</span>
							</Text>
						</Fragment>
					)}
					{company?.description && (
						<Fragment>
							<br />
							<BoxDetail label="" value={company.description} />
						</Fragment>
					)}
					<br />
					<CompanyContacts
						email={company.email}
						facebook={company.facebook}
						line={company.line}
						phone_numbers={company.phone_numbers}
						viber={company.viber}
						website={company.website}
					/>
					<br />
					{company?.addresses?.map((address, i) => (
						<CompanyAddress
							addressContacts={address.contacts}
							city={address.city_id}
							country={address.country_id}
							key={i}
							name_en={company.name_en as string}
							state={address.state_id}
							street={address.street as string}
							zip={address.zip as string}
						/>
					))}
				</Flex>

				<Flex justify="end" mt="4">
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

interface BoxDetailProps {
	label: string;
	value: string | number | boolean | null;
}

const BoxDetail: React.FC<BoxDetailProps> = ({ label, value }) => (
	<Flex direction="row">
		<Text as="div" mb="1" size="2" weight="bold">
			{label}
		</Text>
		<Text size="2">{value !== null ? String(value) : "-"}</Text>
	</Flex>
);

export default CompanyDetails;
