import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { Company } from "$src/components/directory/types";
import { CompanyStatus } from "$src/components/directory/types";
import { useChangePassword } from "../queries/auth";

// Define AuthUser type based on actual WorkOS user properties

export const parseStoredJson = <T,>(key: string): T | null => {
	const raw = localStorage.getItem(key);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as unknown;
		return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
	} catch (error) {
		console.error(`Error parsing ${key} from localStorage:`, error);
		return null;
	}
};

const normalizeGroups = (
	value: string[] | string | null | undefined,
): string[] => {
	if (Array.isArray(value)) {
		return value.filter((group): group is string => typeof group === "string");
	}
	if (typeof value === "string" && value.trim()) {
		return [value];
	}
	return [];
};

const getDisplayValue = (value: unknown): string => {
	if (value === null || value === undefined) return "N/A";
	if (typeof value === "string" && value.trim().length === 0) return "N/A";
	return String(value);
};

const getBooleanValue = (value: boolean | null | undefined): string => {
	if (value === true) return "Yes";
	if (value === false) return "No";
	return "N/A";
};

import { CheckCircleRounded } from "@mui/icons-material";
import {
	EnvelopeClosedIcon,
	ExitIcon,
	EyeClosedIcon,
	EyeOpenIcon,
	HomeIcon,
	IdCardIcon,
	LockClosedIcon,
	MobileIcon,
	PersonIcon,
	PlusIcon,
	TrashIcon,
	UploadIcon,
} from "@radix-ui/react-icons";
import {
	Avatar,
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Container,
	Dialog,
	Flex,
	Heading,
	Tabs,
	Text,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@workos-inc/authkit-react";
import CountrySelect from "$src/components/business/CountrySelect";
import IndustriesSubindustries from "$src/components/business/IndustriesSubindustries";
import { ROLE_MAPPINGS } from "$src/constants/role";
import {
	COMPANY_DATA_PREFIX,
	COMPANY_LOGO_PREFIX,
} from "$src/constants/storage";
import { db } from "$src/db/database";
import { ManagementLayout } from "$src/layouts/ManagementLayout";
import { ProfileStrength } from "$src/recruiter/components/ProfileStrength";
import useAuthData from "$src/store/store.auth";
import type { AuthUser, MergedMainUser } from "$src/types";
import { compressImage } from "$src/utils/account/imageUtils";
import {
	createSafeKey,
	separateCompanyDataForStorage,
} from "$src/utils/account/storageUtils";
import { isWorkerVerificationRecruiterRole } from "$src/utils/workerVerification";
import {
	handleForceSignOut,
	handleSignOutOtherDevices,
} from "$src/utils/workos-utils";
import { showToast } from "../components/toast/toastUtil";
import styles from "./our-workplace.module.css";

export const Route = createFileRoute("/account")({
	component: RouteComponent,
});

function RouteComponent() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [mergedMainUser, setMergedMainUser] = useState<MergedMainUser | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const { signOut } = useAuth();
	const { role, session } = useAuthData();

	useEffect(() => {
		const checkAuthData = () => {
			const userData = parseStoredJson<AuthUser>("auth_user");
			const mergedData = parseStoredJson<MergedMainUser>("merged_main_user");

			if (userData) {
				setUser(userData);
			}
			if (mergedData) {
				setMergedMainUser(mergedData);
			}

			setIsLoading(false);
		};

		// Check on mount
		checkAuthData();

		// Listen for storage changes (from auth callback)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "auth_user" || e.key === "merged_main_user") {
				checkAuthData();
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);
	console.log(user);

	const changePasswordMutation = useChangePassword();

	// Add ref for the Profile Strength card and its container
	const profileStrengthRef = useRef<HTMLDivElement>(null);
	const profileStrengthContainerRef = useRef<HTMLDivElement>(null);
	const [isProfileStrengthSticky, setIsProfileStrengthSticky] = useState(false);

	// Password reset states
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [passwordSuccess, setPasswordSuccess] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSigningOutOtherDevices, setIsSigningOutOtherDevices] =
		useState(false);

	// Single state for password visibility
	const [showPasswords, setShowPasswords] = useState(false);

	// Company information states
	const [companyData, setCompanyData] = useState<Partial<Company> | null>(null);

	// Contact management
	const [contacts, setContacts] = useState<any[]>([]);
	const [showAddContactDialog, setShowAddContactDialog] = useState(false);
	const [newContact, setNewContact] = useState({
		first_name: "",
		last_name: "",
		position: "",
		email: "",
		phone_number: "",
	});

	// Address management
	const [addresses, setAddresses] = useState<any[]>([]);
	const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
	const [newAddress, setNewAddress] = useState({
		street: "",
		city_id: "",
		state_id: "",
		country_id: "",
		zip: "",
	});

	const [logoPreview, setLogoPreview] = useState("");

	// Resolve account role from stored auth state and merged authorization data.
	const userGroups = user?.groups || [];
	const mergedGroups = normalizeGroups(mergedMainUser?.authorization?.groups);
	const effectiveGroups = mergedGroups.length > 0 ? mergedGroups : userGroups;
	const roleValues = [
		role,
		mergedMainUser?.authorization?.userType,
		...effectiveGroups,
	];
	const isRecruiter = roleValues.some((roleValue) =>
		isWorkerVerificationRecruiterRole(roleValue),
	);

	// Use user data from auth_user (WorkOS) and fallback to merged data
	const firstName = (user?.firstName ||
		user?.firstName ||
		mergedMainUser?.user?.firstName ||
		"") as string;
	const lastName = (user?.lastName ||
		user?.lastName ||
		mergedMainUser?.user?.lastName ||
		"") as string;
	const userEmail = (user?.email ||
		mergedMainUser?.user?.email ||
		"N/A") as string;
	const userAvatarUrl = (user?.avatarUrl || mergedMainUser?.user?.avatarUrl) as
		| string
		| null;

	const mergedDisplayName = `${firstName} ${lastName}`.trim() || userEmail;
	const mergedDisplayEmail = userEmail;
	const mergedAccessLabel =
		mergedMainUser?.authorization?.userType || effectiveGroups[0] || "Member";
	// const mergedAccountStatus = mergedMainUser?.authorization?.isActive;

	// Use safe IDs for storage - ensure they are valid IndexedDB keys
	const userCompanyDataKey = createSafeKey(COMPANY_DATA_PREFIX, user?.id);
	const userCompanyLogoKey = createSafeKey(COMPANY_LOGO_PREFIX, user?.id);

	// Fetch company data from local database
	const { data: companyInfo } = useQuery({
		queryKey: ["localCompanyInfo", user?.id],
		queryFn: async () => {
			if (!user?.id) {
				return null;
			}

			try {
				const [storedData, logoResult] = await Promise.all([
					db.userData.where("key").equals(userCompanyDataKey).first(),
					db.userData.where("key").equals(userCompanyLogoKey).first(),
				]);

				const basicData = storedData?.value || {
					name: "",
					name_en: "",
					status: "Processing" as CompanyStatus,
					contacts: [],
					addresses: [],
				};

				return {
					...basicData,
					logoData: logoResult?.value || null,
				};
			} catch (error) {
				console.error("Failed to fetch local company information", error);
				return {
					name: "",
					name_en: "",
					status: "Processing" as CompanyStatus,
					contacts: [],
					addresses: [],
				};
			}
		},
		enabled: isRecruiter && !!user?.id,
	});

	// Update company information with separate storage for image data
	const updateCompanyMutation = useMutation({
		mutationFn: async (data: Partial<Company>) => {
			try {
				// Separate basic data and logo data with proper serialization
				const { basicData, logoData } = separateCompanyDataForStorage(data);

				// Store basic data in IndexedDB with safe error handling
				try {
					const existingBasicData = await db.userData
						.where("key")
						.equals(userCompanyDataKey)
						.first();

					if (existingBasicData?.id) {
						await db.userData.update(existingBasicData.id, {
							value: basicData,
							updatedAt: new Date(),
						});
					} else {
						await db.userData.add({
							userId: user?.id ? String(user.id) : "anonymous",
							key: userCompanyDataKey,
							value: basicData,
							updatedAt: new Date(),
						});
					}
				} catch (basicDataError) {
					console.error("Error saving basic company data:", basicDataError);
					// Continue with the logo save even if this fails
				}

				// Only store logo if it exists - with safe error handling
				if (logoData) {
					try {
						// Compress the image before storing
						const compressedLogoData = await compressImage(logoData);

						const existingLogo = await db.userData
							.where("key")
							.equals(userCompanyLogoKey)
							.first();

						if (existingLogo?.id) {
							await db.userData.update(existingLogo.id, {
								value: compressedLogoData,
								updatedAt: new Date(),
							});
						} else {
							await db.userData.add({
								userId: user?.id ? String(user.id) : "anonymous",
								key: userCompanyLogoKey,
								value: compressedLogoData,
								updatedAt: new Date(),
							});
						}
					} catch (logoError) {
						console.error("Error saving logo data:", logoError);
						// Continue execution - the basic data might have been saved
					}
				}

				// Try to store summary in localStorage (without the large image data)
				try {
					localStorage.setItem(
						userCompanyDataKey,
						JSON.stringify({
							...basicData,
							hasLogo: !!logoData,
						}),
					);
				} catch (storageError) {
					console.warn(
						"Couldn't store data in localStorage - continuing anyway",
						storageError,
					);
				}

				return true;
			} catch (error) {
				console.error("Error saving company data locally:", error);
				throw error;
			}
		},
		onSuccess: () => {
			showToast.success("Company information updated successfully");
		},
		onError: (error) => {
			showToast.error("Failed to update company information");
			console.error("Company update error:", error);
		},
	});

	// Set company data when fetched
	useEffect(() => {
		if (companyInfo) {
			setCompanyData(companyInfo);
			setContacts(companyInfo.contacts || []);
			setAddresses(companyInfo.addresses || []);

			// Set logo preview if available in stored data
			if (companyInfo.logoData) {
				setLogoPreview(companyInfo.logoData);
			}
		}
	}, [companyInfo]);

	// Improved scroll event listener to handle both fixing and unfixing
	useEffect(() => {
		const handleScroll = () => {
			if (!profileStrengthRef.current || !profileStrengthContainerRef.current)
				return;

			const containerRect =
				profileStrengthContainerRef.current.getBoundingClientRect();

			// If container top is at or above viewport top, make card sticky
			// If container top is back below viewport top, make card unsticky
			const shouldBeSticky = containerRect.top <= 0;

			if (isProfileStrengthSticky !== shouldBeSticky) {
				setIsProfileStrengthSticky(shouldBeSticky);
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [isProfileStrengthSticky]);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (!user) {
		return null;
	}

	const handlePasswordReset = async (e: React.FormEvent) => {
		e.preventDefault();

		// Reset messages
		setPasswordError("");
		setPasswordSuccess("");

		// Validation
		if (!oldPassword || !newPassword || !confirmPassword) {
			showToast.warning("All fields are required");
			return;
		}

		if (newPassword !== confirmPassword) {
			showToast.error("New passwords do not match");
			return;
		}

		setIsSubmitting(true);

		try {
			await changePasswordMutation.mutateAsync({
				userId: user.id,
				oldPassword,
				newPassword,
				confirmPassword,
			});

			showToast.success("Password changed successfully");
			// Clear form
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (error) {
			showToast.error(
				"Failed to change password. Please check your current password and try again.",
			);
			console.error("Password change error:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Optimized company information update handler
	const handleCompanyUpdate = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate image size before attempting to save
		const logoSize = logoPreview?.length || 0;
		if (logoSize > 5000000) {
			// 5MB in base64 is roughly 3.7MB file
			showToast.warning(
				"Image is too large. Please select a smaller image or use the built-in compression.",
			);
			return;
		}

		try {
			const dataToSave = {
				...companyData,
				logoData: logoPreview || companyData?.logo || null,
			};

			await updateCompanyMutation.mutateAsync(dataToSave as Partial<Company>);
		} catch (error) {
			console.error("Error updating company information:", error);
			showToast.error("Could not save data. Please try again later.");
		}
	};

	// Handle logo upload with compression
	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const file = e.target.files[0];

			// Check file size and warn if it's too large
			if (file.size > 5 * 1024 * 1024) {
				// 5MB
				console.warn("Image is large and will be compressed for storage");
			}

			const reader = new FileReader();
			reader.onload = () => {
				if (typeof reader.result === "string") {
					// Store the preview for display
					setLogoPreview(reader.result);

					// Update companyData with the logo data reference
					setCompanyData((prev) => ({
						...prev,
						logoData: reader.result as string,
					}));
				}
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle contact management
	const handleAddContact = () => {
		// Basic validation
		if (!newContact.first_name || !newContact.last_name) {
			showToast.warning("First name and last name are required");
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
		setCompanyData({
			...companyData,
			contacts: updatedContacts as [],
		} as Partial<Company>);
		setShowAddContactDialog(false);
		setNewContact({
			first_name: "",
			last_name: "",
			position: "",
			email: "",
			phone_number: "",
		});

		// Show a specific toast for adding a contact (not saving company)
		showToast.info("Contact added - don't forget to save your changes");
	};

	// Handle address management
	const handleAddAddress = () => {
		// Basic validation
		if (!newAddress.street || !newAddress.country_id) {
			showToast.warning("Street and country are required");
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

		// Show a specific toast for adding an address (not saving company)
		showToast.info("Address added - don't forget to save your changes");
	};

	// Also update the delete contact/address handlers
	const handleDeleteContact = (index: number) => {
		const updated = contacts.filter((_, i) => i !== index) as [];
		setContacts(updated);
		setCompanyData({
			...companyData,
			contacts: updated,
		} as Partial<Company>);
		showToast.info("Contact removed - don't forget to save your changes");
	};

	const handleDeleteAddress = (index: number) => {
		const updated = addresses.filter((_, i) => i !== index);
		setAddresses(updated);
		setCompanyData({
			...companyData,
			addresses: updated,
		});
		showToast.info("Address removed - don't forget to save your changes");
	};

	// --- FIX: Ensure Markets & Industries section updates companyData state correctly ---

	// Handler for Markets & Industries (IndustriesSubindustries) selection
	const handleIndustriesInSelect = ({
		industry_id,
		subindustry_id,
	}: {
		industry_id: number[];
		subindustry_id: number[];
	}) => {
		// Use the same update pattern as other fields that work correctly
		setCompanyData({
			...companyData,
			industries: industry_id,
			sub_industries: subindustry_id,
		} as Partial<Company>);
	};
	// Handler for CountrySelect that updates companyData
	const handleCountrySelect = (ids: number[]) => {
		setCompanyData({
			...companyData,
			destination_country_ids: ids,
			destination_province_ids: [],
			destination_district_ids: [],
		} as Partial<Company>);
	};

	return (
		<ManagementLayout>
			<Container className="py-8" size="3">
				<div className="flex flex-col gap-l">
					{/* User header card */}
					<Card
						className={
							styles.chartCard + " shadow-none border-0 bg-transparent p-0"
						}
						size="4"
					>
						<div className="flex flex-col sm:flex-row gap-m sm:items-center">
							<Avatar
								className="bg-[#1AAEC3] text-white"
								fallback={`${firstName?.[0] ?? "U"}`}
								radius="full"
								size="6"
								src={userAvatarUrl || undefined}
							/>
							<Box className="flex-grow">
								<Heading size="6">{mergedDisplayName}</Heading>
								<Text as="div" color="gray" size="2">
									{mergedDisplayEmail}
								</Text>
							</Box>
							<div className="flex gap-2 flex-wrap justify-start sm:justify-end mt-2 sm:mt-0">
								<Badge
									className="rounded-none shadow-none"
									color="blue"
									size="2"
									variant="outline"
								>
									{ROLE_MAPPINGS.find((mapping) =>
										effectiveGroups.includes(mapping.slug),
									)?.name || "Member"}
								</Badge>
							</div>
						</div>
					</Card>

					<Card
						className={
							styles.chartCard +
							" shadow-none border border-slate-200 bg-white/80 p-m"
						}
						size="4"
					>
						<Flex align="center" justify="between" mb="4" wrap="wrap">
							<div>
								<Heading size="4">Account Overview</Heading>
								<Text color="gray" size="2">
									Your profile and access details across connected platforms.
								</Text>
							</div>
							{/* <Badge
								color={mergedAccountStatus ? "green" : "gray"}
								size="2"
								variant="soft"
							>
								{mergedAccountStatus ? "Active Account" : "Account Pending"}
							</Badge> */}
						</Flex>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-m">
							<div className="rounded-md border border-slate-200 p-m bg-white">
								<Text as="div" size="2" weight="bold">
									Profile
								</Text>
								<div className="mt-3 space-y-2 text-sm">
									<Text as="div" size="2">
										Name: {mergedDisplayName}
									</Text>
									<Text as="div" size="2">
										Email: {mergedDisplayEmail}
									</Text>
									<Text as="div" className="flex items-center" size="2">
										Email Verified:{" "}
										{getBooleanValue(
											user?.emailVerified ||
												mergedMainUser?.user?.emailVerified,
										)}
										<CheckCircleRounded
											className="ml-2 text-teal-700"
											style={{
												fontSize: 14,
											}}
										/>
									</Text>
									<Text as="div" size="2">
										Account ID:{" "}
										{getDisplayValue(user?.id || mergedMainUser?.user?.id)}
									</Text>
								</div>
							</div>

							<div className="rounded-md border border-slate-200 p-m bg-white">
								<Text as="div" size="2" weight="bold">
									Access
								</Text>
								<div className="mt-3 space-y-2 text-sm">
									<Text as="div" size="2">
										Access Level: {getDisplayValue(mergedAccessLabel)}
									</Text>
									<Text as="div" size="2">
										Groups:{" "}
										{effectiveGroups.length > 0
											? effectiveGroups.join(", ")
											: "N/A"}
									</Text>
									<Text as="div" size="2">
										Organization:{" "}
										{getDisplayValue(
											mergedMainUser?.authorization?.organizationId,
										)}
									</Text>
									<Text as="div" size="2">
										Partner:{" "}
										{getDisplayValue(mergedMainUser?.authorization?.partnerId)}
									</Text>
									<Text as="div" size="2">
										Supplier:{" "}
										{getDisplayValue(mergedMainUser?.authorization?.supplierId)}
									</Text>
								</div>
							</div>
						</div>

						<div className="mt-4 rounded-md border border-slate-200 p-m bg-white">
							<Text as="div" size="2" weight="bold">
								Connected Platforms
							</Text>
							<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="rounded-md border border-slate-100 p-3">
									<Flex align="center" justify="between">
										<Text size="2" weight="medium">
											ILM
										</Text>
										<Badge
											color={
												user?.links?.ilm?.isActive ||
												mergedMainUser?.links?.ilm?.isActive
													? "green"
													: "gray"
											}
											variant="soft"
										>
											{user?.links?.ilm?.isActive ||
											mergedMainUser?.links?.ilm?.isActive
												? "Connected"
												: "Not linked"}
										</Badge>
									</Flex>
									<Text as="div" className="mt-2" color="gray" size="1">
										Member ID:{" "}
										{getDisplayValue(
											user?.links?.ilm?.userId ||
												mergedMainUser?.links?.ilm?.userId,
										)}
									</Text>
								</div>

								<div className="rounded-md border border-slate-100 p-3">
									<Flex align="center" justify="between">
										<Text size="2" weight="medium">
											GD
										</Text>
										<Badge
											color={
												user?.links?.gd?.isActive ||
												mergedMainUser?.links?.gd?.isActive
													? "green"
													: "gray"
											}
											variant="soft"
										>
											{user?.links?.gd?.isActive ||
											mergedMainUser?.links?.gd?.isActive
												? "Connected"
												: "Not linked"}
										</Badge>
									</Flex>
									<Text as="div" className="mt-2" color="gray" size="1">
										Member ID:{" "}
										{getDisplayValue(
											user?.links?.gd?.userId ||
												mergedMainUser?.links?.gd?.userId,
										)}
									</Text>
								</div>
							</div>
						</div>
					</Card>

					{/* Add Profile Strength Indicator with improved sticky behavior */}
					{isRecruiter && (
						<div className="w-full relative" ref={profileStrengthContainerRef}>
							<ProfileStrength
								addresses={addresses}
								companyData={companyData}
								contacts={contacts}
							/>

							{/* Debug output - hidden in production */}
							{import.meta.env.NODE_ENV !== "production" && (
								<div className="hidden">
									Markets data:{" "}
									{JSON.stringify({
										industries: companyData?.industries,
										destination_countries: companyData?.destination_countries,
									})}
								</div>
							)}
						</div>
					)}

					<Tabs.Root
						className="relative z-10"
						defaultValue={isRecruiter ? "company" : "personal"}
					>
						<Tabs.List
							className="mb-4 border-b border-none shadow-none bg-transparent"
							color="green"
						>
							{/* Show company tab for recruiters - adding extra check in case the group name has different casing */}
							{(isRecruiter ||
								effectiveGroups.some((g) =>
									String(g).toLowerCase().includes("recruit"),
								)) && (
								<Tabs.Trigger
									className="rounded-none shadow-none bg-transparent"
									value="company"
								>
									<div className="flex items-center gap-2">
										<HomeIcon />
										Company Information
									</div>
								</Tabs.Trigger>
							)}

							{/* Only show Personal Information tab for non-recruiters */}
							{!isRecruiter && (
								<Tabs.Trigger
									className="rounded-none shadow-none bg-transparent"
									value="personal"
								>
									<div className="flex items-center gap-2">
										<PersonIcon />
										Personal Information
									</div>
								</Tabs.Trigger>
							)}

							{/* <Tabs.Trigger
                value='settings'
                className='rounded-none shadow-none bg-transparent'
              >
                <div className='flex items-center gap-2'>
                  <GearIcon />
                  Account Settings
                </div>
              </Tabs.Trigger> */}
						</Tabs.List>

						<div className="mb-3">
							{/* Only show Personal Information tab content for non-recruiters */}
							{!isRecruiter && (
								<Tabs.Content value="personal">
									<div className="flex flex-col sm:flex-row gap-m">
										<Card
											className="flex-1 shadow-none border-0 bg-transparent p-0"
											size="3"
										>
											<Heading className="mb-4" mb="4" size="4">
												Personal Information
											</Heading>
											<div className="flex flex-col gap-3">
												<div className="flex items-center gap-2">
													<PersonIcon />
													<Text as="div" size="2" weight="bold">
														User name:
													</Text>
													<Text as="div" size="2">
														{mergedDisplayName}
													</Text>
												</div>
												<div className="flex items-center gap-2">
													<EnvelopeClosedIcon />
													<Text as="div" size="2" weight="bold">
														Email:
													</Text>
													<Text as="div" size="2">
														{mergedDisplayEmail}
													</Text>
												</div>
												<div className="flex items-center gap-2">
													<IdCardIcon />
													<Text as="div" size="2" weight="bold">
														ID:
													</Text>
													<Text as="div" size="2">
														#
														{getDisplayValue(
															user?.id || mergedMainUser?.user?.id,
														)}
													</Text>
												</div>
											</div>
										</Card>

										<Card
											className="flex-1 shadow-none border-0 bg-transparent p-0"
											size="3"
										>
											<Heading className="mb-4" size="4">
												Organization Details
											</Heading>
											<div className="flex flex-col gap-3">
												<Text as="div" size="2">
													<strong>Organization ID:</strong>{" "}
													{getDisplayValue(
														user?.organization ||
															mergedMainUser?.authorization?.organizationId,
													)}
												</Text>
												<Text as="div" size="2">
													<strong>Partner ID:</strong>{" "}
													{getDisplayValue(
														user?.partner ||
															mergedMainUser?.authorization?.partnerId,
													)}
												</Text>
												<Text as="div" size="2">
													<strong>Supplier ID:</strong>{" "}
													{getDisplayValue(
														user?.supplier ||
															mergedMainUser?.authorization?.supplierId,
													)}
												</Text>
											</div>
										</Card>
									</div>
								</Tabs.Content>
							)}

							{/* New Company Information Tab for Recruiters */}
							{(isRecruiter ||
								effectiveGroups.some((g) =>
									String(g).toLowerCase().includes("recruit"),
								)) && (
								<Tabs.Content value="company">
									<form onSubmit={handleCompanyUpdate}>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-l">
											{/* Company Profile Section - Updated styling */}
											<Card
												className={
													styles.chartCard +
													" p-m shadow-sm hover:shadow-md transition-all duration-300"
												}
											>
												<Heading className="pb-5" size="4">
													Company Profile
												</Heading>

												<div className="flex flex-col md:flex-row gap-5 mb-5">
													<div className="flex flex-col items-center gap-3">
														<Avatar
															className="border-2 border-blue-100 shadow-sm"
															fallback={companyData?.name?.[0] || "?"}
															radius="full"
															size="8"
															src={logoPreview || (companyData?.logo as string)}
														/>
														<label className="cursor-pointer">
															<input
																accept="image/*"
																className="hidden"
																onChange={handleLogoChange}
																type="file"
															/>
															<Flex
																align="center"
																className="text-sm hover:text-[#148696] transition-colors"
																gap="1"
															>
																<UploadIcon /> Change Logo
															</Flex>
														</label>
													</div>

													<div className="flex-1">
														<div className="mb-4">
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor={"company-name-input"}
															>
																Company Name
															</label>
															<TextField.Root
																className="w-full"
																id={"company-name-input"}
																onChange={(e) =>
																	setCompanyData({
																		...companyData,
																		name: e.target.value,
																	})
																}
																placeholder="Company name"
																value={companyData?.name || ""}
															/>
														</div>

														<div className="mb-4">
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="company-name-en-input"
															>
																English Name (if different)
															</label>
															<TextField.Root
																className="w-full"
																id={"company-name-en-input"}
																onChange={(e) =>
																	setCompanyData({
																		...companyData,
																		name_en: e.target.value,
																	})
																}
																placeholder="English company name"
																value={companyData?.name_en || ""}
															/>
														</div>

														<div className="mb-4">
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="company-status-select"
															>
																Company Status
															</label>
															<select
																className="w-full rounded-xs border border-[#D2D2D2] p-2"
																id={"company-status-select"}
																onChange={(e) =>
																	setCompanyData({
																		...companyData,
																		status: e.target.value as
																			| CompanyStatus
																			| undefined,
																	})
																}
																value={companyData?.status || "Processing"}
															>
																<option value={CompanyStatus.Operational}>
																	{CompanyStatus.Operational}
																</option>
																<option value={CompanyStatus.Processing}>
																	{CompanyStatus.Processing}
																</option>
																<option
																	value={CompanyStatus.TemporarilySuspended}
																>
																	{CompanyStatus.TemporarilySuspended}
																</option>
																<option
																	value={CompanyStatus.LicenseIsNotExtended}
																>
																	{CompanyStatus.LicenseIsNotExtended}
																</option>
															</select>
														</div>

														<div className="mb-4">
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="company-description-textarea"
															>
																Company Description
															</label>
															<TextArea
																className="w-full"
																id={"company-description-textarea"}
																onChange={(e) =>
																	setCompanyData({
																		...companyData,
																		description: e.target.value,
																	})
																}
																placeholder="Describe your company..."
																rows={3}
																value={companyData?.description || ""}
															/>
														</div>
													</div>
												</div>

												{/* Registration Info - Updated styling */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 pt-3 border-t border-[#D2D2D2]">
													<div>
														<label
															className="block mb-1 text-sm font-medium"
															htmlFor="license-number-input"
														>
															License Number
														</label>
														<TextField.Root
															className="w-full"
															id={"license-number-input"}
															onChange={(e) =>
																setCompanyData({
																	...companyData,
																	license_number: e.target.value,
																})
															}
															placeholder="License number"
															value={companyData?.license_number || ""}
														/>
													</div>

													<div>
														<label
															className="block mb-1 text-sm font-medium"
															htmlFor="license-valid-date-input"
														>
															License Valid Until
														</label>
														<TextField.Root
															className="w-full"
															id={"license-valid-date-input"}
															onChange={(e) =>
																setCompanyData({
																	...companyData,
																	license_valid_date: e.target.value,
																})
															}
															type="date"
															value={
																companyData?.license_valid_date?.split(
																	"T",
																)[0] || ""
															}
														/>
													</div>

													<div>
														<label
															className="block mb-1 text-sm font-medium"
															htmlFor="registration-date-input"
														>
															Registration Date
														</label>
														<TextField.Root
															className="w-full"
															id={"registration-date-input"}
															onChange={(e) =>
																setCompanyData({
																	...companyData,
																	date_of_registration: e.target.value,
																})
															}
															type="date"
															value={
																companyData?.date_of_registration?.split(
																	"T",
																)[0] || ""
															}
														/>
													</div>
												</div>
											</Card>

											{/* Contact Information - Updated styling */}
											<Card
												className={
													styles.chartCard +
													" p-m shadow-sm hover:shadow-md transition-all duration-300"
												}
											>
												<Heading className="mb-5" size="4">
													Contact Information
												</Heading>

												<div className="mb-4">
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="company-email-input"
													>
														Email
													</label>
													<TextField.Root
														className="w-full"
														id={"company-email-input"}
														onChange={(e) =>
															setCompanyData({
																...companyData,
																email: e.target.value,
															})
														}
														placeholder="company@example.com"
														value={companyData?.email || ""}
													/>
												</div>

												<div className="mb-4">
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="company-phone-input"
													>
														Phone Numbers (comma separated)
													</label>
													<TextField.Root
														className="w-full"
														id={"company-phone-input"}
														onChange={(e) =>
															setCompanyData({
																...companyData,
																phone_numbers: e.target.value,
															})
														}
														placeholder="+1234567890, +0987654321"
														value={companyData?.phone_numbers || ""}
													/>
												</div>

												<div className="mb-4">
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="company-website-input"
													>
														Website
													</label>
													<TextField.Root
														className="w-full"
														id={"company-website-input"}
														onChange={(e) =>
															setCompanyData({
																...companyData,
																website: e.target.value,
															})
														}
														placeholder="https://example.com"
														value={companyData?.website || ""}
													/>
												</div>

												<div className="mb-4">
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="company-facebook-input"
													>
														Facebook
													</label>
													<TextField.Root
														className="w-full"
														id={"company-facebook-input"}
														onChange={(e) =>
															setCompanyData({
																...companyData,
																facebook: e.target.value,
															})
														}
														placeholder="https://facebook.com/company"
														value={companyData?.facebook || ""}
													/>
												</div>

												<div className="grid grid-cols-2 gap-m">
													<div className="mb-4">
														<label
															className="block mb-1 text-sm font-medium"
															htmlFor="company-viber-input"
														>
															Viber
														</label>
														<TextField.Root
															className="w-full"
															id={"company-viber-input"}
															onChange={(e) =>
																setCompanyData({
																	...companyData,
																	viber: e.target.value,
																})
															}
															placeholder="+1234567890"
															value={companyData?.viber || ""}
														/>
													</div>

													<div className="mb-4">
														<label
															className="block mb-1 text-sm font-medium"
															htmlFor="company-line-input"
														>
															Line
														</label>
														<TextField.Root
															className="w-full"
															id={"company-line-input"}
															onChange={(e) =>
																setCompanyData({
																	...companyData,
																	line: e.target.value,
																})
															}
															placeholder="Line ID"
															value={companyData?.line || ""}
														/>
													</div>
												</div>
											</Card>
										</div>

										{/* --- FIX: Markets & Industries Form - use correct handlers and props --- */}
										<Card
											className={
												styles.chartCard +
												" mt-l p-m shadow-sm hover:shadow-md transition-all duration-300"
											}
										>
											<Heading className="mb-5" size="4">
												Markets & Industries
											</Heading>
											<br />
											<div className="space-y-6">
												{/* Industries with Experience */}
												<div className="p-5 rounded-md border border-indigo-100">
													<Text className="mb-" weight="medium">
														Industries with Experience
													</Text>
													<br />
													<br />
													<div className="grid gap-3">
														<Text className="mb-2" weight="medium">
															Select Industries & Sub-industries
														</Text>
														{/* Use the IndustriesSubindustries component with correct handler */}
														<IndustriesSubindustries
															industry_values={
																Array.isArray(companyData?.industries)
																	? companyData?.industries
																	: []
															}
															// Add these props to pass current values from companyData
															onSelect={handleIndustriesInSelect}
															subindustry_values={
																Array.isArray(companyData?.sub_industries)
																	? companyData?.sub_industries
																	: []
															}
														/>
													</div>
													{Array.isArray(companyData?.industries) &&
														companyData?.industries.includes(-1) && (
															<div className="mt-4">
																<label
																	className="block mb-1 text-sm font-medium"
																	htmlFor="other-industries-input"
																>
																	Please specify other industries
																</label>
																<TextField.Root
																	className="w-full"
																	id={"other-industries-input"}
																	onChange={(e) =>
																		setCompanyData((prev) => ({
																			...(typeof prev === "object" && prev
																				? prev
																				: {}),
																			other_industries: e.target.value,
																		}))
																	}
																	placeholder="Please specify other industries"
																	value={companyData?.other_industries || ""}
																/>
															</div>
														)}
												</div>

												{/* Destination Countries */}
												<div className="p-5 rounded-md border border-indigo-100">
													<Text className="mb-4" weight="medium">
														Sending countries experience and license
													</Text>
													<br />
													<CountrySelect
														country_ids={
															Array.isArray(
																companyData?.destination_country_ids,
															)
																? companyData?.destination_country_ids
																: []
														}
														label="Choose Countries"
														onSelect={handleCountrySelect}
														placeholder="Choose one or more countries"
													/>
												</div>
											</div>
										</Card>

										{/* Contact People Section - Updated styling */}
										<Card
											className={
												styles.chartCard +
												" p-m rounded-md mt-l shadow-sm hover:shadow-md transition-all duration-300"
											}
										>
											<Flex align="center" justify="between" mb="5">
												<Heading size="4">Contact People</Heading>
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
												<div className="rounded-md p-xl text-center border border-green-200">
													<Text align="center" className="p-4" color="gray">
														No contacts added yet. Add contact people to help
														clients reach your company.
													</Text>
												</div>
											) : (
												<div className="space-y-4">
													{contacts.map((contact, index) => (
														<Card
															className="p-m border border-[#D2D2D2] hover:bg-white transition-colors duration-200"
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
																			<Text size="2">
																				{contact.phone_number}
																			</Text>
																		</Flex>
																	)}
																</div>

																<Button
																	color="red"
																	onClick={() => handleDeleteContact(index)}
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
												<Dialog.Content
													aria-describedby="contact-dialog-description" // Add this for accessibility
												>
													<Dialog.Title>Add Contact Person</Dialog.Title>
													<Dialog.Description
														id={"contact-dialog-description"} // Connect to aria-describedby
														mb="4"
														size="2"
													>
														Add contact information for a person at your company
													</Dialog.Description>

													<Flex direction="column" gap="3">
														<div>
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="new-contact-first-name"
															>
																First Name{" "}
																<span className="text-[#FB8379]">*</span>
															</label>
															<TextField.Root
																id={"new-contact-first-name"}
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
																htmlFor="new-contact-last-name"
															>
																Last Name{" "}
																<span className="text-[#FB8379]">*</span>
															</label>
															<TextField.Root
																id={"new-contact-last-name"}
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
																htmlFor="new-contact-position"
															>
																Position
															</label>
															<TextField.Root
																id={"new-contact-position"}
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
																htmlFor="new-contact-email"
															>
																Email
															</label>
															<TextField.Root
																id={"new-contact-email"}
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
																htmlFor="new-contact-phone-number"
															>
																Phone Number
															</label>
															<TextField.Root
																id={"new-contact-phone-number"}
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
															<Button className="cascade-btn cascade-btn--alt2">
																Cancel
															</Button>
														</Dialog.Close>
														<Button onClick={handleAddContact}>
															Add Contact
														</Button>
													</Flex>
												</Dialog.Content>
											</Dialog.Root>
										</Card>

										{/* Addresses Section - Updated styling */}
										<Card
											className={
												styles.chartCard +
												" p-m rounded-md mt-l shadow-sm hover:shadow-md transition-all duration-300"
											}
										>
											<Flex align="center" justify="between" mb="5">
												<Heading size="4">Company Addresses</Heading>
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
												<div className="rounded-md p-xl text-center border border-amber-100">
													<Text align="center" className="p-4" color="gray">
														No addresses added yet. Add your company's physical
														locations.
													</Text>
												</div>
											) : (
												<div className="space-y-4">
													{addresses.map((address, index) => (
														<Card
															className="p-m border border-[#D2D2D2] hover:bg-white transition-colors duration-200"
															key={address.id}
														>
															<Flex align="start" justify="between">
																<div>
																	<Text>
																		{address.street}
																		{address.city_id && `, ${address.city_id}`}
																		{address.state_id &&
																			`, ${address.state_id}`}
																		{address.country_id &&
																			`, ${address.country_id}`}
																		{address.zip && ` ${address.zip}`}
																	</Text>
																</div>

																<Button
																	color="red"
																	onClick={() => handleDeleteAddress(index)}
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
												<Dialog.Content
													aria-describedby="address-dialog-description" // Add this for accessibility
												>
													<Dialog.Title>Add Company Address</Dialog.Title>
													<Dialog.Description
														id={"address-dialog-description"} // Connect to aria-describedby
														mb="4"
														size="2"
													>
														Add a physical address for your company
													</Dialog.Description>

													<Flex direction="column" gap="3">
														<div>
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="new-address-street"
															>
																Street <span className="text-[#FB8379]">*</span>
															</label>
															<TextField.Root
																id={"new-address-street"}
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
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="new-address-city"
															>
																City
															</label>
															<TextField.Root
																id={"new-address-city"}
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
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="new-address-state"
															>
																State/Province
															</label>
															<TextField.Root
																id={"new-address-state"}
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
																htmlFor="new-address-country"
															>
																Country{" "}
																<span className="text-[#FB8379]">*</span>
															</label>
															<TextField.Root
																id={"new-address-country"}
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
															<label
																className="block mb-1 text-sm font-medium"
																htmlFor="new-address-zip"
															>
																ZIP/Postal Code
															</label>
															<TextField.Root
																id={"new-address-zip"}
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
															<Button className="cascade-btn cascade-btn--alt2">
																Cancel
															</Button>
														</Dialog.Close>
														<Button onClick={handleAddAddress}>
															Add Address
														</Button>
													</Flex>
												</Dialog.Content>
											</Dialog.Root>
										</Card>

										{/* Ethical Recruitment Section - NEW SECTION */}
										<Card
											className={
												styles.chartCard +
												" p-m mt-l shadow-sm hover:shadow-md transition-all duration-300"
											}
										>
											<Heading mb="5" size="4">
												Ethical Recruitment
											</Heading>

											<div className="space-y-6">
												{/* Employer Pays Policy */}
												<div className="p-5 rounded-md border border-teal-200">
													<div className="flex flex-col gap-m">
														<div className="flex items-center gap-2">
															<Checkbox
																checked={companyData?.epp_policy || false}
																id={"epp-policy"}
																onCheckedChange={(checked) =>
																	setCompanyData({
																		...companyData,
																		epp_policy: checked === true,
																	})
																}
															/>
															<label
																className="text-sm font-medium"
																htmlFor="epp-policy"
															>
																Has Employer Pays Policy with zero fees to be
																paid by workers?
															</label>
														</div>

														{companyData?.epp_policy && (
															<div>
																<label
																	className="block mb-1 text-sm font-medium"
																	htmlFor="epp-policy-date"
																>
																	Date of Employer Pays Policy
																</label>
																<TextField.Root
																	className="w-full md:w-1/2"
																	id={"epp-policy-date"}
																	onChange={(e) =>
																		setCompanyData({
																			...companyData,
																			epp_policy_date: e.target.value,
																		})
																	}
																	type="month"
																	value={companyData?.epp_policy_date || ""}
																/>
															</div>
														)}
													</div>
												</div>

												{/* Ethical/Responsible Recruitment Certifications */}
												<div className="p-5 rounded-md border border-teal-200">
													<Text className="mb-4" weight="medium">
														Has ethical/responsible recruitment certifications?
													</Text>

													<div className="space-y-5">
														{/* On the Level Certification */}
														<div className="flex flex-col gap-3">
															<div className="flex items-center gap-2">
																<Checkbox
																	checked={
																		companyData?.on_the_level_cert || false
																	}
																	id={"on-the-level"}
																	onCheckedChange={(checked) =>
																		setCompanyData({
																			...companyData,
																			on_the_level_cert: checked === true,
																		})
																	}
																/>
																<label
																	className="text-sm"
																	htmlFor="on-the-level"
																>
																	On the Level
																</label>
															</div>

															{companyData?.on_the_level_cert && (
																<div className="ml-6">
																	<label
																		className="block mb-1 text-sm font-medium"
																		htmlFor={"on-the-level-date"}
																	>
																		Certification Date
																	</label>
																	<TextField.Root
																		className="w-full md:w-1/2"
																		id={"on-the-level-date"}
																		onChange={(e) =>
																			setCompanyData({
																				...companyData,
																				on_the_level_date: e.target.value,
																			})
																		}
																		type="month"
																		value={companyData?.on_the_level_date || ""}
																	/>
																</div>
															)}
														</div>

														{/* Responsible Business Alliance Certification */}
														<div className="flex flex-col gap-3">
															<div className="flex items-center gap-2">
																<Checkbox
																	checked={companyData?.rba_cert || false}
																	id={"rba-cert"}
																	onCheckedChange={(checked) =>
																		setCompanyData({
																			...companyData,
																			rba_cert: checked === true,
																		})
																	}
																/>
																<label className="text-sm" htmlFor="rba-cert">
																	Responsible Business Alliance
																</label>
															</div>

															{companyData?.rba_cert && (
																<div className="ml-6">
																	<label
																		className="block mb-1 text-sm font-medium"
																		htmlFor="rba-cert-date"
																	>
																		Certification Date
																	</label>
																	<TextField.Root
																		className="w-full md:w-1/2"
																		id={"rba-cert-date"}
																		onChange={(e) =>
																			setCompanyData({
																				...companyData,
																				rba_cert_date: e.target.value,
																			})
																		}
																		type="month"
																		value={companyData?.rba_cert_date || ""}
																	/>
																</div>
															)}
														</div>
													</div>
												</div>
											</div>
										</Card>

										{/* Save button for company information - Updated styling */}
										<Flex justify="end" mt="8">
											<Button
												color="red"
												disabled={updateCompanyMutation.isPending}
												size="3"
												// className='shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-r
												// from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-10 py-3 rounded-md font-medium'
												type="submit"
											>
												{updateCompanyMutation.isPending ? (
													<>
														<svg
															className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
															fill="none"
															viewBox="0 0 24 24"
															xmlns="http://www.w3.org/2000/svg"
														>
															<circle
																className="opacity-25"
																cx="12"
																cy="12"
																r="10"
																stroke="currentColor"
																strokeWidth="4"
															></circle>
															<path
																className="opacity-75"
																d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																fill="currentColor"
															></path>
														</svg>
														Saving...
													</>
												) : (
													"Save Company Information"
												)}
											</Button>
										</Flex>
									</form>
								</Tabs.Content>
							)}

							<Tabs.Content value="settings">
								<div className="flex flex-col gap-m">
									<Card
										className="shadow-none border-0 bg-transparent p-0"
										size="3"
									>
										<Heading className="mb-4" size="4">
											<div className="flex items-center gap-2 mb-4">
												<LockClosedIcon />
												Change Password
											</div>
										</Heading>

										{passwordError && (
											<div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-xs text-red-600">
												<Text size="2">{passwordError}</Text>
											</div>
										)}

										{passwordSuccess && (
											<div className="mb-4 p-2 bg-[#A6DFDD]/20 border border-[#148696]/30 rounded-xs text-[#148696]">
												<Text size="2">{passwordSuccess}</Text>
											</div>
										)}

										<form onSubmit={handlePasswordReset}>
											<div className="flex flex-col gap-3">
												<div>
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="current-password"
													>
														Current Password
													</label>
													<TextField.Root
														autoFocus
														className="w-full"
														id={"current-password"}
														onChange={(e) => setOldPassword(e.target.value)}
														placeholder="Enter your current password"
														type={showPasswords ? "text" : "password"}
														value={oldPassword}
													/>
												</div>

												<div>
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="new-password"
													>
														New Password
													</label>
													<TextField.Root
														className="w-full"
														id={"new-password"}
														onChange={(e) => setNewPassword(e.target.value)}
														placeholder="Enter your new password"
														type={showPasswords ? "text" : "password"}
														value={newPassword}
													/>
												</div>

												<div>
													<label
														className="block mb-1 text-sm font-medium"
														htmlFor="confirm-new-password"
													>
														Confirm New Password
													</label>
													<TextField.Root
														className="w-full"
														id={"confirm-new-password"}
														onChange={(e) => setConfirmPassword(e.target.value)}
														placeholder="Confirm your new password"
														type={showPasswords ? "text" : "password"}
														value={confirmPassword}
													/>
												</div>

												<div className="mt-2">
													<div className="flex items-center gap-2">
														<Button
															className="shadow-none"
															disabled={isSubmitting}
															type="submit"
														>
															{isSubmitting
																? "Changing Password..."
																: "Change Password"}
														</Button>
														<Button
															className="flex items-center shadow-none cascade-btn cascade-btn--alt2"
															onClick={() => setShowPasswords(!showPasswords)}
															type="button"
														>
															{showPasswords ? (
																<EyeClosedIcon className="mr-1" />
															) : (
																<EyeOpenIcon className="mr-1" />
															)}
															<span className="text-sm">
																{showPasswords ? "Hide" : "Show"} Passwords
															</span>
														</Button>
													</div>
												</div>
											</div>
										</form>
									</Card>
								</div>
							</Tabs.Content>
						</div>
					</Tabs.Root>
					<Card
						className={styles.chartCard + " mb-4 shadow-none border-0 p-0"}
						size="3"
					>
						<div className="flex justify-between items-center flex-wrap gap-2">
							<Heading size="4">Sign Out</Heading>
							<div className="flex flex-col gap-2 w-full sm:w-auto">
								<Button
									className="shadow-none"
									color="red"
									onClick={() => {
										handleForceSignOut({ signOut, session });
									}}
									variant="outline"
								>
									<ExitIcon />
									Sign Out
								</Button>
								<Button
									className="shadow-none"
									disabled={isSigningOutOtherDevices}
									onClick={async () => {
										try {
											setIsSigningOutOtherDevices(true);
											const success = await handleSignOutOtherDevices();
											if (success) {
												showToast.success(
													"Signed out from other devices successfully.",
												);
											} else {
												showToast.error(
													"Failed to sign out from other devices.",
												);
											}
										} catch (error) {
											console.error("Sign out other devices failed:", error);
											showToast.error("Failed to sign out from other devices.");
										} finally {
											setIsSigningOutOtherDevices(false);
										}
									}}
									variant="outline"
								>
									Sign out of other devices
								</Button>
							</div>
						</div>
					</Card>
				</div>
			</Container>
		</ManagementLayout>
	);
}
