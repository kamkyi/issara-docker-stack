import { UploadIcon } from "@radix-ui/react-icons";
import {
	Avatar,
	Card,
	Checkbox,
	Flex,
	Heading,
	TextArea,
	TextField,
} from "@radix-ui/themes";
import type React from "react";
import type { Company, CompanyStatus } from "$src/components/directory/types";
import { showToast } from "$src/components/toast/toastUtil";
import { updateGdUserAvatar } from "$src/services/gdUserService";

interface CompanyProfileFormProps {
	companyData: Partial<Company> | null;
	setCompanyData: (data: Partial<Company> | null) => void;
	logoPreview: string;
	setLogoPreview: (logo: string) => void;
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
	companyData,
	setCompanyData,
	logoPreview,
	setLogoPreview,
}) => {
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

					// Update companyData with the logo data reference (ILM)
					setCompanyData({
						...companyData,
						logo: reader.result, // Store in logo field instead of logoData
					} as Partial<Company>);
				}
			};
			reader.readAsDataURL(file);

			// Keep the GD-linked avatar in sync too. The pk in the URL is
			// ignored server-side (it always operates on request.user).
			updateGdUserAvatar(0, file).catch((error) => {
				console.error("Failed to update GD user avatar", error);
				showToast.error("Failed to sync logo to GD.");
			});
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			{/* Company Profile Section */}
			<Card className="p-5 border border-gray-200 rounded-md bg-gradient-to-br from-slate-50 to-blue-50 shadow-sm hover:shadow-md transition-all duration-300">
				<Heading className="mb-5 text-slate-800" size="4">
					Company Profile
				</Heading>

				<div className="flex flex-col md:flex-row gap-5 mb-5">
					<div className="flex flex-col items-center gap-3">
						<Avatar
							className="border-2 border-blue-100 shadow-sm"
							fallback={companyData?.name?.[0] || "?"}
							radius="full"
							size="8"
							src={logoPreview || companyData?.logo || undefined}
						/>
						<label className="cursor-pointer" htmlFor="logo-upload">
							<input
								accept="image/*"
								className="hidden"
								id={"logo-upload"}
								onChange={handleLogoChange}
								type="file"
							/>
							<Flex
								align="center"
								className="text-blue-600 text-sm hover:text-blue-700 transition-colors"
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
								htmlFor="company-name"
							>
								Company Name
							</label>
							<TextField.Root
								className="w-full"
								id={"company-name"}
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
								htmlFor="company-name-en"
							>
								English Name (if different)
							</label>
							<TextField.Root
								className="w-full"
								id={"company-name-en"}
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
								htmlFor="company-status"
							>
								Company Status
							</label>
							<select
								className="w-full rounded-xs border border-gray-200 p-2"
								id={"company-status"}
								onChange={(e) =>
									setCompanyData({
										...companyData,
										status: e.target.value as CompanyStatus,
									})
								}
								value={companyData?.status || "Processing"}
							>
								<option value="Operational">Operational</option>
								<option value="Processing">Processing</option>
								<option value="TemporarilySuspended">
									Temporarily Suspended
								</option>
								<option value="LicenseIsNotExtended">
									License is not extended
								</option>
							</select>
						</div>

						<div className="mb-4">
							<label
								className="block mb-1 text-sm font-medium"
								htmlFor="company-description"
							>
								Company Description
							</label>
							<TextArea
								className="w-full"
								id={"company-description"}
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

				{/* Registration Info */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 pt-3 border-t border-gray-100">
					<div>
						<label
							className="block mb-1 text-sm font-medium"
							htmlFor="license-number"
						>
							License Number
						</label>
						<TextField.Root
							className="w-full"
							id={"license-number"}
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
							htmlFor="license-valid-date"
						>
							License Valid Until
						</label>
						<TextField.Root
							className="w-full"
							id={"license-valid-date"}
							onChange={(e) =>
								setCompanyData({
									...companyData,
									license_valid_date: e.target.value,
								})
							}
							type="date"
							value={companyData?.license_valid_date?.split("T")[0] || ""}
						/>
					</div>

					<div>
						<label
							className="block mb-1 text-sm font-medium"
							htmlFor="registration-date"
						>
							Registration Date
						</label>
						<TextField.Root
							className="w-full"
							id={"registration-date"}
							onChange={(e) =>
								setCompanyData({
									...companyData,
									date_of_registration: e.target.value,
								})
							}
							type="date"
							value={companyData?.date_of_registration?.split("T")[0] || ""}
						/>
					</div>

					<div className="flex items-center gap-2 mt-4">
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
						<label className="text-sm" htmlFor="epp-policy">
							Have Employer Pays Policy
						</label>
					</div>
				</div>
			</Card>

			{/* Contact Information Section */}
			<div className="p-5 border border-gray-200 rounded-md bg-gradient-to-br from-slate-50 to-purple-50 shadow-sm hover:shadow-md transition-all duration-300">
				<Heading className="mb-5" size="4">
					Contact Information
				</Heading>

				<div className="mb-4">
					<label className="block mb-1 text-sm font-medium" htmlFor="email">
						Email
					</label>
					<TextField.Root
						className="w-full"
						id={"email"}
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
						htmlFor="phone-numbers"
					>
						Phone Numbers (comma separated)
					</label>
					<TextField.Root
						className="w-full"
						id={"phone-numbers"}
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
					<label className="block mb-1 text-sm font-medium" htmlFor="website">
						Website
					</label>
					<TextField.Root
						className="w-full"
						id={"website"}
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
					<label className="block mb-1 text-sm font-medium" htmlFor="facebook">
						Facebook
					</label>
					<TextField.Root
						className="w-full"
						id={"facebook"}
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

				<div className="grid grid-cols-2 gap-4">
					<div className="mb-4">
						<label className="block mb-1 text-sm font-medium" htmlFor="viber">
							Viber
						</label>
						<TextField.Root
							className="w-full"
							id={"viber"}
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
						<label className="block mb-1 text-sm font-medium" htmlFor="line">
							Line
						</label>
						<TextField.Root
							className="w-full"
							id={"line"}
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
			</div>
		</div>
	);
};
