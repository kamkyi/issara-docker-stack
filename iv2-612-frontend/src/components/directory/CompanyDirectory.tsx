import { CheckCircledIcon } from "@radix-ui/react-icons";
import {
	Avatar,
	Badge,
	Box,
	Card,
	Flex,
	Grid,
	Heading,
	Text,
} from "@radix-ui/themes";
import { useMemo, useState } from "react";
import RatingStars from "$src/components/indicators/RatingStars";
import workplaceStyles from "$src/routes/suppliers.module.css";
import CompanyDetails from "./CompanyDetails";
import CompanyFilters from "./CompanyFilters";
import type { Company, DirectoryProps, Filters } from "./types";

const COUNTRIES = [
	"Thailand",
	"Myanmar",
	"Laos",
	"Cambodia",
	"Nepal",
	"Bangladesh",
	"Japan",
];

const Directory: React.FC<DirectoryProps> = ({ companies }) => {
	const [filters, setFilters] = useState<Filters>({
		status: "All",
		managedBy: "All",
		search: "",
		eppPolicy: null,
		sortByScore: "high-to-low",
		operationalCountry: "",
		sendingCountry: "",
	});
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

	const filteredCompanies = useMemo(() => {
		// Safely sort companies with null check
		const sortedCompanies = [...companies].sort((a, b) => {
			const scoreA = a?.rating_score || 0;
			const scoreB = b?.rating_score || 0;
			return filters.sortByScore === "low-to-high"
				? scoreA - scoreB
				: scoreB - scoreA;
		});

		return sortedCompanies.filter((company) => {
			// Handle possible undefined arrays
			const addresses = company?.addresses || [];
			const sendingCountries = company?.sending_countries || [];

			// Check operational country with appropriate type conversion if needed
			const operationalCountryMatch =
				!filters.operationalCountry ||
				addresses.some((address) => {
					// Convert to string for comparison if needed
					const addressCountry = String(address?.country_id || "");
					return addressCountry === filters.operationalCountry;
				});

			// Check sending country
			const sendingCountryMatch =
				!filters.sendingCountry ||
				sendingCountries.includes(filters.sendingCountry);

			// Check EPP policy
			const eppPolicyMatch =
				filters.eppPolicy === null || company.epp_policy === filters.eppPolicy;

			return operationalCountryMatch && sendingCountryMatch && eppPolicyMatch;
		});
	}, [companies, filters]);

	const handleCardClick = (company: Company) => {
		setSelectedCompany(company);
	};

	const handleFilterChange = (name: keyof Filters, value: string | null) => {
		setFilters((prevFilters) => ({ ...prevFilters, [name]: value }));
	};

	const handleResetFilters = () => {
		// Reset all filters to their default values
		setFilters({
			status: "All",
			managedBy: "All",
			search: "",
			eppPolicy: null,
			sortByScore: "high-to-low",
			operationalCountry: "",
			sendingCountry: "",
		});
	};

	const handleCloseDetails = () => {
		setSelectedCompany(null);
	};

	return (
		<Flex direction="column" gap="4">
			<CompanyFilters
				filters={filters}
				onFilterChange={handleFilterChange}
				onResetFilters={handleResetFilters}
				operationalCountriesOptions={COUNTRIES}
				sendingCountriesOptions={COUNTRIES}
			/>

			{/* Display message when no results match filters */}
			{filteredCompanies.length === 0 && (
				<Box className="p-8 text-center bg-gray-50 rounded-md border border-gray-100">
					<Text align="center" color="gray" size="4" weight="medium">
						No recruitment agencies match your selected filters.
					</Text>
					<Text align="center" color="gray" mt="2" size="2">
						Try adjusting your filters or
						<button
							className="text-blue-600 hover:text-blue-800 font-medium ml-1 focus:outline-none underline"
							onClick={handleResetFilters}
						>
							reset all filters
						</button>
					</Text>
				</Box>
			)}

			<Grid columns={{ initial: "1", sm: "1", md: "2", lg: "3" }} gap="5">
				{filteredCompanies.map((company) => (
					<Card
						className={
							workplaceStyles.chartCard +
							"hover:shadow-lg transition-shadow duration-200"
						}
						key={company.id}
						onClick={() => handleCardClick(company)}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = "scale(1.03)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = "scale(1)";
						}}
						style={{
							cursor: "pointer",
							overflow: "hidden",
							transition: "transform 0.2s ease-in-out",
						}}
					>
						<Flex direction="column" gap="3">
							{/* Header section with logo and badges */}
							<Flex align="start" justify="between">
								<Avatar
									alt={company.name as string}
									className="border border-gray-100"
									fallback={(
										company?.name_en?.[0] ||
										company.name?.[0] ||
										"?"
									).toUpperCase()}
									radius="medium"
									size="6"
									src={company.logo as string}
									style={{ backgroundColor: "#f9fafb" }}
								/>
								<Flex gap="2" justify="end" wrap="wrap">
									{company.epp_policy && (
										<Badge color="green" radius="full" variant="soft">
											<CheckCircledIcon style={{ marginRight: "4px" }} />
											EPP Policy
										</Badge>
									)}
									<Badge
										color={
											company.status === "Operational"
												? "blue"
												: company.status === "Processing"
													? "orange"
													: company.status === "Permanently Blacklisted"
														? "red"
														: "gray"
										}
										variant="soft"
									>
										{company.status || "Unknown"}
									</Badge>
								</Flex>
							</Flex>

							{/* Company name and rating */}
							<Box>
								<Heading size="3" style={{ marginBottom: "6px" }} trim="start">
									{company.name_en || company.name}
								</Heading>
								<RatingStars score={company.rating_score || 0} />
							</Box>

							{/* Company details */}
							<Flex direction="column" gap="1">
								{company.license_number && (
									<Text className="flex items-center" color="gray" size="2">
										<span className="w-20 text-gray-500">License:</span>
										<span className="font-medium">
											{company.license_number}
										</span>
									</Text>
								)}

								{company.sending_countries &&
									company.sending_countries.length > 0 && (
										<Text className="flex" color="gray" size="2">
											<span className="w-20 text-gray-500">Sending:</span>
											<span
												className="font-medium truncate"
												style={{ maxWidth: "70%" }}
											>
												{company.sending_countries.join(", ")}
											</span>
										</Text>
									)}
							</Flex>

							{/* View more link - visual indicator to click */}
							<Box pt="1">
								<Text
									className="flex items-center justify-end"
									color="blue"
									size="1"
									weight="medium"
								>
									View details
									<svg
										className="ml-1"
										fill="none"
										height="14"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										viewBox="0 0 24 24"
										width="14"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path d="M5 12h14"></path>
										<path d="m12 5 7 7-7 7"></path>
									</svg>
								</Text>
							</Box>
						</Flex>
					</Card>
				))}
			</Grid>

			{selectedCompany && (
				<CompanyDetails
					company={selectedCompany}
					onClose={handleCloseDetails}
				/>
			)}
		</Flex>
	);
};

export default Directory;
