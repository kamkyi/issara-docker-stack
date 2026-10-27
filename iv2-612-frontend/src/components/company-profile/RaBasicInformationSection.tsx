import { ReaderIcon } from "@radix-ui/react-icons";
import { useId, useMemo } from "react";
import MuiMultiSelectDropdown from "$src/components/business/MuiMultiSelectDropdown";
import { FieldLabel } from "$src/components/company-profile/FieldLabel";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { inputCls, textareaCls } from "$src/components/company-profile/styles";
import { CompanyStatus } from "$src/components/directory/types";
import AppDatePicker from "$src/components/inputs/AppDatePicker";
import Selector from "$src/components/inputs/selector";

interface OptionItem {
	id: number;
	name: string;
}

interface CountryOptionItem {
	id: string;
	name: string;
}

export interface RaBasicInformationValues {
	companyName: string;
	companyDescription: string;
	dateOfRegistration: string | null;
	country: string;
	licenseNumber: string;
	licenseValidDate: string | null;
	thaiLicenseNumber: string;
	thaiLicenseValidDate: string | null;
	cambodiaRecruiterRegistrationYear: string;
	latitude: string;
	longitude: string;
	status: CompanyStatus | string;
	statusFromDate: string | null;
	statusToDate: string | null;
	sendingCountries: string[];
	industries: number[];
	subIndustries: number[];
}

interface RaBasicInformationSectionProps {
	value: RaBasicInformationValues;
	onChange: (patch: Partial<RaBasicInformationValues>) => void;
	onSave: () => void;
	onCancel: () => void;
	saving?: boolean;
	actionDisabled?: boolean;
	countryOptions: CountryOptionItem[];
	sendingCountryOptions: CountryOptionItem[];
	industryItems: OptionItem[];
	subIndustryItems: Array<OptionItem & { industry: number }>;
}

const STATUS_OPTIONS = [
	CompanyStatus.Operational,
	CompanyStatus.TemporarilySuspended,
	CompanyStatus.PermanentlyBlacklisted,
	CompanyStatus.LicenseIsNotExtended,
	CompanyStatus.Processing,
].map((status) => ({ value: status, label: status }));

const toDate = (value: string | null) => (value ? new Date(value) : null);
const toIso = (date: Date | null) =>
	date ? date.toISOString().split("T")[0] : null;

const currentYear = new Date().getFullYear();
const CAMBODIA_YEAR_OPTIONS = Array.from({ length: 40 }, (_, i) => {
	const year = currentYear - i;
	return { value: String(year), label: String(year) };
});

export default function RaBasicInformationSection({
	value,
	onChange,
	onSave,
	onCancel,
	saving = false,
	actionDisabled = false,
	countryOptions,
	sendingCountryOptions,
	industryItems,
	subIndustryItems,
}: RaBasicInformationSectionProps) {
	const countrySelectorId = useId();
	const statusSelectorId = useId();
	const cambodiaYearSelectorId = useId();

	const filteredSubIndustryItems = useMemo(
		() =>
			subIndustryItems.filter((item) =>
				value.industries.includes(item.industry),
			),
		[subIndustryItems, value.industries],
	);

	// sendingCountries is stored/sent as country names (matching the GD API
	// contract), so the dropdown must key items by name, not numeric id.
	const sendingCountryNameOptions = useMemo(
		() => sendingCountryOptions.map((c) => ({ id: c.name, name: c.name })),
		[sendingCountryOptions],
	);

	const isMyanmar = value.country === "Myanmar";
	const isThailand = value.country === "Thailand";
	const isCambodia = value.country === "Cambodia";
	const isVietnam = value.country === "Vietnam";

	const isTemporarilySuspended =
		value.status === CompanyStatus.TemporarilySuspended;
	const isPermanentlyBlacklisted =
		value.status === CompanyStatus.PermanentlyBlacklisted;

	return (
		<SectionCard
			actionDisabled={actionDisabled}
			editing
			icon={<ReaderIcon className="text-[#148696] w-5 h-5" />}
			onCancel={onCancel}
			onSave={onSave}
			saveButtonText={saving ? "Saving..." : "Save"}
			title="Basic Information"
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div className="md:col-span-2">
					<FieldLabel isPublic label="Company Name" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ companyName: e.target.value })}
						type="text"
						value={value.companyName}
					/>
				</div>

				<div className="md:col-span-2">
					<FieldLabel isPublic label="Company Description" />
					<textarea
						className={textareaCls}
						onChange={(e) => onChange({ companyDescription: e.target.value })}
						placeholder="Describe your agency's services, specializations, and experience..."
						rows={3}
						value={value.companyDescription}
					/>
				</div>

				<div>
					<FieldLabel label="Date of Registration" />
					<AppDatePicker
						className={inputCls}
						onChange={(date) => onChange({ dateOfRegistration: toIso(date) })}
						placeholderText="mm/dd/yyyy"
						selected={toDate(value.dateOfRegistration)}
					/>
					<p className="text-xs text-gray-400 mt-1">
						Date when the first license was issued
					</p>
				</div>

				<div>
					<FieldLabel label="Country" />
					<Selector
						fullWidth
						id={countrySelectorId}
						onChange={(next) => onChange({ country: String(next) })}
						options={countryOptions.map((c) => ({
							value: c.name,
							label: c.name,
						}))}
						placeholder="Select country"
						value={value.country}
					/>
				</div>

				{(isMyanmar || isThailand || isCambodia || isVietnam) && (
					<div className="md:col-span-2 border border-[#148696]/30 bg-[#eaf7f8] rounded-md p-4">
						<p className="text-xs font-bold uppercase tracking-wide text-[#148696] mb-3">
							{isMyanmar && "Myanmar License Details"}
							{isThailand && "Thailand License Details"}
							{isCambodia && "Cambodia Registration Details"}
							{isVietnam && "Vietnam License Details"}
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							{isCambodia && (
								<div className="md:col-span-2">
									<FieldLabel label="Cambodia Recruiter Registration Year" />
									<Selector
										fullWidth
										id={cambodiaYearSelectorId}
										onChange={(next) =>
											onChange({
												cambodiaRecruiterRegistrationYear: String(next),
											})
										}
										options={CAMBODIA_YEAR_OPTIONS}
										placeholder="Select year"
										value={value.cambodiaRecruiterRegistrationYear}
									/>
									<p className="text-xs text-gray-400 mt-1">
										Select the year the Cambodia recruitment agency was
										registered.
									</p>
								</div>
							)}

							{isThailand ? (
								<>
									<div>
										<FieldLabel label="Thai License Number" />
										<input
											className={inputCls}
											onChange={(e) =>
												onChange({ thaiLicenseNumber: e.target.value })
											}
											placeholder="e.g. TH-2023-001"
											type="text"
											value={value.thaiLicenseNumber}
										/>
									</div>
									<div>
										<FieldLabel label="Thai License Valid Date" />
										<AppDatePicker
											className={inputCls}
											onChange={(date) =>
												onChange({ thaiLicenseValidDate: toIso(date) })
											}
											placeholderText="mm/dd/yyyy"
											selected={toDate(value.thaiLicenseValidDate)}
										/>
									</div>
								</>
							) : (
								<>
									<div>
										<FieldLabel label="License Number" />
										<input
											className={inputCls}
											onChange={(e) =>
												onChange({ licenseNumber: e.target.value })
											}
											placeholder={
												isMyanmar
													? "e.g. MLS-2023-001"
													: isCambodia
														? "e.g. KH-2023-001"
														: "e.g. VN-2023-001"
											}
											type="text"
											value={value.licenseNumber}
										/>
									</div>
									<div>
										<FieldLabel label="License Valid Date" />
										{isVietnam ? (
											<>
												<input
													className={`${inputCls} bg-gray-100 text-gray-500`}
													disabled
													readOnly
													type="text"
													value="Till Termination"
												/>
												<p className="text-xs text-gray-400 mt-1">
													Vietnam license is valid till termination
												</p>
											</>
										) : (
											<AppDatePicker
												className={inputCls}
												onChange={(date) =>
													onChange({ licenseValidDate: toIso(date) })
												}
												placeholderText="mm/dd/yyyy"
												selected={toDate(value.licenseValidDate)}
											/>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				)}

				<div>
					<FieldLabel label="Latitude" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ latitude: e.target.value })}
						placeholder="e.g. 16.8661"
						type="text"
						value={Number(value.latitude).toFixed(4)}
					/>
				</div>

				<div>
					<FieldLabel label="Longitude" />
					<input
						className={inputCls}
						onChange={(e) => onChange({ longitude: e.target.value })}
						placeholder="e.g. 96.1951"
						type="text"
						value={Number(value.longitude).toFixed(4)}
					/>
				</div>

				<div>
					<FieldLabel label="Status" />
					<Selector
						fullWidth
						id={statusSelectorId}
						onChange={(next) => onChange({ status: String(next) })}
						options={STATUS_OPTIONS}
						placeholder="Select status"
						value={value.status}
					/>
				</div>

				{isTemporarilySuspended && (
					<div className="md:col-span-2 border border-amber-200 bg-amber-50 rounded-md p-4">
						<p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-3">
							Suspension Period
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
							<div>
								<FieldLabel label="Status From Date" />
								<AppDatePicker
									className={inputCls}
									onChange={(date) => onChange({ statusFromDate: toIso(date) })}
									placeholderText="mm/dd/yyyy"
									selected={toDate(value.statusFromDate)}
								/>
							</div>
							<div>
								<FieldLabel label="Status To Date" />
								<AppDatePicker
									className={inputCls}
									onChange={(date) => onChange({ statusToDate: toIso(date) })}
									placeholderText="mm/dd/yyyy"
									selected={toDate(value.statusToDate)}
								/>
							</div>
						</div>
					</div>
				)}

				{isPermanentlyBlacklisted && (
					<div className="md:col-span-2 border border-red-200 bg-red-50 rounded-md p-4">
						<p className="text-xs font-bold uppercase tracking-wide text-red-600 mb-3">
							Blacklist Date
						</p>
						<div>
							<FieldLabel label="Status From Date" />
							<AppDatePicker
								className={inputCls}
								onChange={(date) => onChange({ statusFromDate: toIso(date) })}
								placeholderText="mm/dd/yyyy"
								selected={toDate(value.statusFromDate)}
							/>
						</div>
					</div>
				)}

				<div className="md:col-span-2">
					<FieldLabel label="Sending Countries" />
					<MuiMultiSelectDropdown
						items={sendingCountryNameOptions}
						onChange={(selected) =>
							onChange({ sendingCountries: selected.map(String) })
						}
						placeholder="Select sending countries"
						selectedIds={value.sendingCountries}
					/>
				</div>

				<div className="md:col-span-2">
					<FieldLabel label="Industries" />
					<MuiMultiSelectDropdown
						items={industryItems}
						onChange={(selected) => {
							const nextIndustries = selected.map(Number);
							const allowedSubIndustryIds = new Set(
								subIndustryItems
									.filter((item) => nextIndustries.includes(item.industry))
									.map((item) => item.id),
							);
							onChange({
								industries: nextIndustries,
								subIndustries: value.subIndustries.filter((id) =>
									allowedSubIndustryIds.has(id),
								),
							});
						}}
						placeholder="Select industries"
						selectedIds={value.industries}
					/>
				</div>

				<div className="md:col-span-2">
					<FieldLabel label="Sub-Industries" />
					<MuiMultiSelectDropdown
						items={filteredSubIndustryItems}
						onChange={(selected) =>
							onChange({ subIndustries: selected.map(Number) })
						}
						placeholder="Select options"
						selectedIds={value.subIndustries}
					/>
				</div>
			</div>
		</SectionCard>
	);
}
