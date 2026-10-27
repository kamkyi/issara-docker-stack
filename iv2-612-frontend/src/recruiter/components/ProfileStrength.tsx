import { Card, Heading, Text } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import type { Company } from "$src/components/directory/types";
import styles from "$src/routes/our-workplace.module.css";

interface ProfileStrengthProps {
	companyData: Partial<Company> | null;
	contacts: any[];
	addresses: any[];
}

export const ProfileStrength: React.FC<ProfileStrengthProps> = ({
	companyData,
	contacts,
	addresses,
}) => {
	const profileStrengthRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
	const [isProfileStrengthSticky, setIsProfileStrengthSticky] = useState(false);
	const [cardHeight, setCardHeight] = useState(0);

	const calculateProfileStrength = () => {
		// Define the sections with their weights and fields
		const sections = {
			// Company Profile section - 20% (unchanged)
			companyProfile: {
				weight: 20,
				fields: [
					{
						name: "name",
						value: companyData?.name?.trim(),
					},
					{
						name: "name_en",
						value: companyData?.name_en?.trim(),
					},
					{
						name: "description",
						value: companyData?.description?.trim(),
					},
					{ name: "status", value: companyData?.status },
					{
						name: "logo",
						value: companyData?.logo || companyData?.logo,
					},
					{
						name: "license_number",
						value: companyData?.license_number?.trim(),
					},
					{
						name: "license_valid_date",
						value: companyData?.license_valid_date,
					},
					{
						name: "date_of_registration",
						value: companyData?.date_of_registration,
					},
				],
				// Required fields
				requiredFields: ["name"],
			},

			// Contact Information section - 15% (unchanged)
			contactInfo: {
				weight: 15,
				fields: [
					{
						name: "email",
						value: companyData?.email?.trim(),
					},
					{
						name: "phone_numbers",
						value: companyData?.phone_numbers?.trim(),
					},
					{
						name: "website",
						value: companyData?.website?.trim(),
					},
					{
						name: "facebook",
						value: companyData?.facebook?.trim(),
					},
					{
						name: "viber",
						value: companyData?.viber?.trim(),
					},
					{
						name: "line",
						value: companyData?.line?.trim(),
					},
				],
				// Required fields
				requiredFields: ["email", "phone_numbers"],
			},

			// Contact People section - 15% (unchanged)
			contactPeople: {
				weight: 15,
				// Has at least one contact
				completeness: contacts?.length > 0 ? 100 : 0,
			},

			// Company Addresses section - 15% (unchanged)
			companyAddresses: {
				weight: 15,
				// Has at least one address
				completeness: addresses?.length > 0 ? 100 : 0,
			},

			// Ethical Recruitment section - 15% (unchanged)
			ethicalRecruitment: {
				weight: 15,
				fields: [
					{
						name: "epp_policy",
						value: companyData?.epp_policy,
					},
					{
						name: "epp_policy_date",
						value: companyData?.epp_policy && companyData?.epp_policy_date,
					},
					{
						name: "on_the_level_cert",
						value: companyData?.on_the_level_cert,
					},
					{
						name: "on_the_level_date",
						value:
							companyData?.on_the_level_cert && companyData?.on_the_level_date,
					},
					{
						name: "rba_cert",
						value: companyData?.rba_cert,
					},
					{
						name: "rba_cert_date",
						value: companyData?.rba_cert && companyData?.rba_cert_date,
					},
				],
			},

			// Industries section - NEW 5% section
			industries: {
				weight: 5,
				// Binary check - either 0% or 100% based on any selection
				completeness: (companyData?.industries?.length || 0) > 0 ? 100 : 0,
			},

			// Destination Countries section - Improved detection logic
			destinationCountries: {
				weight: 5,
				completeness: (() => {
					// Enhanced check to detect countries correctly
					const hasDestinationCountries =
						Array.isArray(companyData?.destination_countries) &&
						companyData.destination_countries.length > 0;

					const hasDestinationCountryIds =
						Array.isArray(companyData?.destination_country_ids) &&
						companyData.destination_country_ids.length > 0;

					// Log what we found for debugging
					console.log("Destination countries check:", {
						hasDestinationCountries,
						hasDestinationCountryIds,
						countries: companyData?.destination_countries,
						countryIds: companyData?.destination_country_ids,
					});

					return hasDestinationCountryIds ? 100 : 0;
				})(),
			},
		};

		// Calculate score for sections with fields
		const calculateSectionScore = (section) => {
			if ("completeness" in section) {
				return section.completeness;
			}

			// Count filled fields
			const filledFields = section.fields.filter(
				(field) => !!field.value,
			).length;
			const totalFields = section.fields.length;

			// Check if required fields are filled
			const requiredFieldsFilled = section.requiredFields
				? section.requiredFields.every(
						(fieldName) =>
							section.fields.find((f) => f.name === fieldName)?.value,
					)
				: true;

			// If required fields aren't filled, max score is 50%
			const maxScore = requiredFieldsFilled ? 100 : 50;

			// Calculate percentage of completion
			return Math.min(
				Math.round((filledFields / totalFields) * maxScore),
				maxScore,
			);
		};

		// Calculate section scores
		const sectionScores = {
			companyProfile: calculateSectionScore(sections.companyProfile),
			contactInfo: calculateSectionScore(sections.contactInfo),
			contactPeople: sections.contactPeople.completeness,
			companyAddresses: sections.companyAddresses.completeness,
			ethicalRecruitment: calculateSectionScore(sections.ethicalRecruitment),
			industries: sections.industries.completeness,
			destinationCountries: sections.destinationCountries.completeness,
		};

		// --- Count total filled fields for percentage ---
		// Gather all fields from all sections with fields
		const allFields = [
			...sections.companyProfile.fields,
			...sections.contactInfo.fields,
			...sections.ethicalRecruitment.fields,
		];
		const totalFields = allFields.length;
		const filledFields = allFields.filter((field) => !!field.value).length;
		let binaryFilled = 0;
		const binaryTotal = 4;
		if (contacts?.length > 0) binaryFilled++;
		if (addresses?.length > 0) binaryFilled++;
		if ((companyData?.industries?.length || 0) > 0) binaryFilled++;
		if (
			(companyData?.destination_countries?.length || 0) > 0 ||
			(companyData?.destination_country_ids?.length || 0) > 0
		)
			binaryFilled++;
		const totalFieldCount = totalFields + binaryTotal;
		const filledFieldCount = filledFields + binaryFilled;
		const fieldPercent = Math.round((filledFieldCount / totalFieldCount) * 100);

		// Calculate weighted average
		const totalWeight = Object.values(sections).reduce(
			(sum, section) => sum + section.weight,
			0,
		);

		const weightedScore =
			(sectionScores.companyProfile * sections.companyProfile.weight +
				sectionScores.contactInfo * sections.contactInfo.weight +
				sectionScores.contactPeople * sections.contactPeople.weight +
				sectionScores.companyAddresses * sections.companyAddresses.weight +
				sectionScores.ethicalRecruitment * sections.ethicalRecruitment.weight +
				sectionScores.industries * sections.industries.weight +
				sectionScores.destinationCountries *
					sections.destinationCountries.weight) /
			totalWeight;

		const percentage = Math.round(weightedScore);

		// Determine strength text and color
		let strengthText = "Basic";
		let color = "text-orange-500";

		if (percentage >= 80) {
			strengthText = "Excellent";
			color = "text-green-600";
		} else if (percentage >= 60) {
			strengthText = "Good";
			color = "text-blue-600";
		} else if (percentage >= 40) {
			strengthText = "Decent";
			color = "text-yellow-600";
		}

		return {
			percentage,
			strengthText,
			color,
			sectionScores,
			fieldPercent, // <-- add this
			filledFieldCount,
			totalFieldCount,
		};
	};

	const profileStrength = calculateProfileStrength();

	// Debounce scroll handler for better performance
	const debounce = (fn: () => void, ms = 10) => {
		let timeoutId: ReturnType<typeof setTimeout>;
		return function (this: any, ...args: []) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fn.apply(this, args), ms);
		};
	};

	// Get element height on mount and when content changes
	useEffect(() => {
		if (cardRef.current) {
			setCardHeight(cardRef.current.offsetHeight);
		}
	}, [companyData, contacts, addresses, profileStrength.percentage]);

	// Improved scroll handler with debounce for better performance
	useEffect(() => {
		const handleScroll = debounce(() => {
			if (!cardRef.current || !profileStrengthRef.current) return;

			const rect = profileStrengthRef.current.getBoundingClientRect();
			const shouldBeSticky = rect.top <= 0;

			if (isProfileStrengthSticky !== shouldBeSticky) {
				setIsProfileStrengthSticky(shouldBeSticky);
			}
		}, 5);

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isProfileStrengthSticky]);

	return (
		<div className="w-full">
			<div className="w-full" ref={profileStrengthRef}>
				<div
					className={`${
						isProfileStrengthSticky
							? "fixed top-0 left-0 right-0 z-50 py-3 transition-all duration-200 transform shadow-lg rounded-none backdrop-blur-md flex justify-center before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-sm before:-z-10 before:bg-[url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E\")]"
							: "mb-4 transition-all duration-200"
					}`}
				>
					<div
						className={`container mx-auto max-w-[1100px] ${isProfileStrengthSticky ? "px-4" : "px-0"}`}
					>
						<Card
							className={
								styles.chartCard +
								" shadow-sm rounded-md overflow-hidden w-full"
							}
						>
							<div className="p-4" ref={cardRef}>
								<div className="flex items-center justify-between mb-2">
									<Heading size="2">Profile Strength</Heading>
									<Text
										className={profileStrength.color}
										size="4"
										weight="bold"
									>
										{profileStrength.strengthText} ({profileStrength.percentage}
										%)
									</Text>
								</div>

								{/* Progress Bar */}
								<div className="w-full bg-gray-300 rounded-full h-2.5">
									<div
										className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"
										style={{
											width: `${profileStrength.percentage}%`,
											transition: "width 1s ease-in-out",
										}}
									></div>
								</div>

								{/* Show profile completion details only when not sticky */}
								{!isProfileStrengthSticky && (
									<div className="flex flex-col mt-3">
										<Text className="font-medium" size="2">
											Complete your company profile:
										</Text>
										<div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
											{/* Company Profile Section Status */}
											<Text className="flex items-center" size="2">
												<span
													className={`w-2 h-2 rounded-full mr-1 ${(() => {
														// Calculate section score
														const fields = [
															{
																name: "name",
																value: companyData?.name?.trim(),
															},
															{
																name: "name_en",
																value: companyData?.name_en?.trim(),
															},
															{
																name: "description",
																value: companyData?.description?.trim(),
															},
															{
																name: "status",
																value: companyData?.status,
															},
															{
																name: "logo",
																value: companyData?.logo || companyData?.logo,
															},
														];
														const filledFields = fields.filter(
															(field) => !!field.value,
														).length;
														return filledFields >= 3
															? "bg-green-500"
															: "bg-orange-500";
													})()}`}
												></span>
												1. Company Profile
											</Text>

											{/* Contact Information Section Status */}
											<Text className="flex items-center" size="2">
												<span
													className={`w-2 h-2 rounded-full mr-1 ${(() => {
														// Calculate section score
														const fields = [
															{
																name: "email",
																value: companyData?.email?.trim(),
															},
															{
																name: "phone_numbers",
																value: companyData?.phone_numbers?.trim(),
															},
															{
																name: "website",
																value: companyData?.website?.trim(),
															},
														];
														const filledFields = fields.filter(
															(field) => !!field.value,
														).length;
														return filledFields >= 2
															? "bg-green-500"
															: "bg-orange-500";
													})()}`}
												></span>
												2. Contact Information
											</Text>

											{/* Contact People Section Status */}
											<Text className="flex items-center" size="2">
												<span
													className={`w-2 h-2 rounded-full mr-1 ${contacts?.length > 0 ? "bg-green-500" : "bg-orange-500"}`}
												></span>
												3. Contact People
											</Text>

											{/* Company Addresses Section Status */}
											<Text className="flex items-center" size="2">
												<span
													className={`w-2 h-2 rounded-full mr-1 ${addresses?.length > 0 ? "bg-green-500" : "bg-orange-500"}`}
												></span>
												4. Company Addresses
											</Text>

											{/* Ethical Recruitment Section Status */}
											<Text className="flex items-center" size="2">
												<span
													className={`w-2 h-2 rounded-full mr-1 ${(() => {
														// Calculate if there's any ethical recruitment data
														const hasEthicalFields =
															companyData?.epp_policy ||
															companyData?.on_the_level_cert ||
															companyData?.rba_cert;

														return hasEthicalFields
															? "bg-green-500"
															: "bg-orange-500";
													})()}`}
												></span>
												5. Ethical Recruitment
											</Text>

											{/* Markets & Industries Section Status - Combined indicator for both subsections */}
											<Text
												className="flex items-center"
												size="2"
												style={{ display: "flex" }}
											>
												<span
													className={`w-2 h-2 rounded-full mr-1 ${(() => {
														// Improved check for industries or countries
														const hasIndustries =
															Array.isArray(companyData?.industries) &&
															companyData.industries.length > 0;

														const hasDestinationCountries =
															Array.isArray(
																companyData?.destination_countries,
															) && companyData.destination_countries.length > 0;

														const hasDestinationCountryIds =
															Array.isArray(
																companyData?.destination_country_ids,
															) &&
															companyData.destination_country_ids.length > 0;

														return hasIndustries ||
															hasDestinationCountries ||
															hasDestinationCountryIds
															? "bg-green-500"
															: "bg-orange-500";
													})()}`}
												></span>
												6. Markets & Industries
											</Text>
										</div>
										{/* --- Show field count and percent --- */}
										<Text className="font-bold pt-2 text-end" size="2">
											Fields completed: {profileStrength.filledFieldCount} /{" "}
											{profileStrength.totalFieldCount} (
											{profileStrength.fieldPercent}%)
										</Text>
									</div>
								)}
							</div>
						</Card>
					</div>
				</div>
			</div>

			{/* Improved placeholder with dynamic height */}
			{isProfileStrengthSticky && (
				<div
					className="mb-4 transition-all duration-300"
					style={{ height: `${cardHeight + 24}px` }}
				></div>
			)}
		</div>
	);
};
