import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguages } from "$hooks/useLanguages";
import NaceLevelSelects, {
	EMPTY_NACE_SELECTION,
	type NaceSelection,
} from "$src/components/dropdowns/NaceLevelSelects";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import { useCurrencies } from "$src/hooks/useCurrencies";
import {
	type WageInputMode,
	type WageQuoteLocationPayload,
	wageQuoteRequestService,
} from "$src/services/wageQuoteRequestService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

/**
 * "Request a Quote - Wages" — the next step behind the WageIndicator
 * activities. Unlike the generic Request a Quote form it asks for the sector
 * (NACE Rev. 2.1), per-country wage benchmarks and certification scope, so it
 * has its own modal, service and API table.
 */

/** Certification schemes the quote can be scoped against, in screen order. */
const CERTIFICATION_OPTIONS = [
	"SMETA",
	"RSPO",
	"EcoVadis",
	"Fairtrade International",
	"Rainforest Alliance",
	"ASC",
	"ASI",
	"Bonsucro",
	"GOTS",
	"Other",
];

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];
/** Matches the 20 MB cap the API's multipart parser enforces. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** Earliest bookable date, matching the ScheduleModal's two-week lead time. */
const LEAD_TIME_DAYS = 14;
/** Guards against a typo'd location count rendering thousands of cards. */
const MAX_LOCATION_ROWS = 25;

const FIELD_CLASS =
	"w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]";
const SECTION_HEADING_CLASS =
	"text-xs font-black text-gray-500 uppercase tracking-widest";
const SUBFIELD_LABEL_CLASS =
	"text-[11px] font-black text-gray-500 uppercase tracking-widest block mb-1";

interface LocationRow {
	country: string;
	currency: string;
	livingWage: string;
	minimumWage: string;
}

const emptyLocation = (): LocationRow => ({
	country: "",
	currency: "USD",
	livingWage: "",
	minimumWage: "",
});

/** `days` from today as the ISO string a date input's `min` wants. */
const isoDaysFromToday = (days: number) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};

interface ChipInputProps {
	values: string[];
	onChange: (values: string[]) => void;
	suggestions?: string[];
	placeholder?: string;
	inputId: string;
}

function ChipInput({
	values,
	onChange,
	suggestions = [],
	placeholder,
	inputId,
}: ChipInputProps) {
	const [draft, setDraft] = useState("");

	const filteredSuggestions = useMemo(() => {
		if (!draft.trim()) return [];
		const lower = draft.trim().toLowerCase();
		return suggestions
			.filter((s) => s.toLowerCase().includes(lower) && !values.includes(s))
			.slice(0, 6);
	}, [draft, suggestions, values]);

	const addValue = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed || values.includes(trimmed)) {
			setDraft("");
			return;
		}
		onChange([...values, trimmed]);
		setDraft("");
	};

	const removeValue = (value: string) =>
		onChange(values.filter((v) => v !== value));

	return (
		<div>
			<div className="flex flex-wrap gap-1.5 mb-1.5">
				{values.map((value) => (
					<span
						className="inline-flex items-center gap-1 bg-[rgba(20,134,150,0.1)] text-[#148696] border border-[#148696]/30 rounded-md px-2 py-0.5 text-xs font-semibold"
						key={value}
					>
						{value}
						<button
							aria-label={`Remove ${value}`}
							className="hover:text-red-500"
							onClick={() => removeValue(value)}
							type="button"
						>
							<Icons.Close style={{ fontSize: 12 }} />
						</button>
					</span>
				))}
			</div>
			<div className="relative">
				<input
					className={FIELD_CLASS}
					id={inputId}
					onBlur={() => addValue(draft)}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							addValue(draft);
						}
					}}
					placeholder={placeholder}
					type="text"
					value={draft}
				/>
				{filteredSuggestions.length > 0 && (
					<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
						{filteredSuggestions.map((s) => (
							<button
								className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
								key={s}
								onClick={() => addValue(s)}
								onMouseDown={(e) => e.preventDefault()}
								type="button"
							>
								{s}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface RequestWageQuoteModalProps {
	item: any | null;
	onClose: () => void;
}

export function RequestWageQuoteModal({
	item,
	onClose,
}: RequestWageQuoteModalProps) {
	const { t } = useTranslation();
	const uid = useId();
	const { data: languagesData = [] } = useLanguages();
	const { data: currenciesData } = useCurrencies();
	const { data: countriesData } = useCascadeCountries();
	const countries: { id: number; name: string }[] = Array.isArray(countriesData)
		? countriesData
		: (countriesData?.results ?? countriesData?.data?.countries ?? []);
	const currencyCodes = useMemo(() => {
		const codes = (currenciesData ?? []).map((currency) => currency.code);
		return codes.length > 0 ? codes : ["USD"];
	}, [currenciesData]);

	const earliestDate = useMemo(() => isoDaysFromToday(LEAD_TIME_DAYS), []);

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [notes, setNotes] = useState("");
	const [preferredDate, setPreferredDate] = useState("");
	const [nace, setNace] = useState<NaceSelection>(EMPTY_NACE_SELECTION);
	const [locationsCount, setLocationsCount] = useState("");
	const [suppliersCount, setSuppliersCount] = useState("");
	const [wageInputMode, setWageInputMode] = useState<WageInputMode>("MANUAL");
	const [locations, setLocations] = useState<LocationRow[]>([emptyLocation()]);
	const [wageFile, setWageFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [certifications, setCertifications] = useState<string[]>([]);
	const [totalWorkers, setTotalWorkers] = useState("");
	const [languages, setLanguages] = useState<string[]>([]);
	const [showOthers, setShowOthers] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setFullName("");
		setEmail("");
		setCompany("");
		setNotes("");
		setPreferredDate("");
		setNace(EMPTY_NACE_SELECTION);
		setLocationsCount("");
		setSuppliersCount("");
		setWageInputMode("MANUAL");
		setLocations([emptyLocation()]);
		setWageFile(null);
		setFileError(null);
		setCertifications([]);
		setTotalWorkers("");
		setLanguages([]);
		setShowOthers(false);
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	/**
	 * How many location cards the respondent committed to filling in. Cards up
	 * to this index are mandatory; anything past it — a card left behind after
	 * lowering the count, or one added by hand — stays on screen as optional.
	 */
	const requiredLocations = useMemo(() => {
		const parsed = Number.parseInt(locationsCount, 10);
		if (!Number.isFinite(parsed)) return 1;
		return Math.min(Math.max(parsed, 1), MAX_LOCATION_ROWS);
	}, [locationsCount]);

	const handleLocationsCountChange = (value: string) => {
		setLocationsCount(value);
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) return;
		const needed = Math.min(Math.max(parsed, 1), MAX_LOCATION_ROWS);
		// Only ever grow: lowering the count demotes the extra cards to optional
		// rather than discarding whatever was already typed into them.
		setLocations((prev) =>
			prev.length >= needed
				? prev
				: [
						...prev,
						...Array.from({ length: needed - prev.length }, emptyLocation),
					],
		);
	};

	const updateLocation = (index: number, patch: Partial<LocationRow>) =>
		setLocations((prev) =>
			prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);

	const addLocation = () => setLocations((prev) => [...prev, emptyLocation()]);

	const removeLocation = (index: number) =>
		setLocations((prev) => prev.filter((_, i) => i !== index));

	const toggleCertification = (certification: string) =>
		setCertifications((prev) =>
			prev.includes(certification)
				? prev.filter((entry) => entry !== certification)
				: [...prev, certification],
		);

	const handleFileChange = (file: File | null) => {
		setFileError(null);
		if (!file) {
			setWageFile(null);
			return;
		}
		const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
		if (!SPREADSHEET_EXTENSIONS.includes(extension)) {
			setFileError(t("cascadeMarketplace.plan.wageQuoteModal.fileTypeError"));
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setFileError(t("cascadeMarketplace.plan.wageQuoteModal.fileSizeError"));
			return;
		}
		setWageFile(file);
	};

	const filledLocations = locations.filter((row) => row.country.trim());

	const requiredLocationsFilled = locations
		.slice(0, requiredLocations)
		.every((row) => row.country.trim());

	const submitMutation = useMutation({
		mutationFn: () => {
			const locationsPayload: WageQuoteLocationPayload[] = filledLocations.map(
				(row) => ({
					country: row.country.trim(),
					currency: row.currency,
					living_wage: row.livingWage.trim() || null,
					minimum_wage: row.minimumWage.trim() || null,
				}),
			);

			return wageQuoteRequestService.submit(
				{
					solution_id: item.id,
					supplier_id: getActiveSupplierId(),
					partner_id: getPartnerId(),
					submitted_by_user_id: getSubmittedByUserId(),
					full_name: fullName.trim(),
					email: email.trim(),
					company: company.trim(),
					notes: notes.trim(),
					preferred_date: preferredDate,
					// The deepest level the respondent reached; the API expands it
					// back out into the section / division / group / class columns.
					nace_code: nace.class || nace.group || nace.division || nace.section,
					operating_locations_count: Number(locationsCount),
					suppliers_count: Number(suppliersCount),
					wage_input_mode: wageInputMode,
					locations: wageInputMode === "MANUAL" ? locationsPayload : undefined,
					certifications,
					total_workers: totalWorkers.trim() ? Number(totalWorkers) : undefined,
					languages_spoken: languages,
				},
				wageInputMode === "EXCEL" ? wageFile : null,
			);
		},
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(t("cascadeMarketplace.plan.wageQuoteModal.submitError")),
	});

	const canSubmit = Boolean(
		fullName.trim() &&
			email.trim() &&
			company.trim() &&
			notes.trim() &&
			preferredDate &&
			nace.section &&
			locationsCount.trim() &&
			suppliersCount.trim() &&
			certifications.length > 0 &&
			(wageInputMode === "EXCEL" ? wageFile : requiredLocationsFilled),
	);

	const partnerName: string =
		item?.partners_display || item?.partners?.[0] || "";

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="640px">
				<div className="flex items-start justify-between">
					<Dialog.Title>
						{t("cascadeMarketplace.plan.wageQuoteModal.title")}
					</Dialog.Title>
					<Dialog.Close>
						<button
							aria-label={t("common.close")}
							className="text-gray-400 hover:text-gray-600"
							onClick={handleClose}
							type="button"
						>
							<Icons.Close style={{ fontSize: 20 }} />
						</button>
					</Dialog.Close>
				</div>
				{item && (
					<Dialog.Description className="text-sm text-gray-500 mb-2">
						{t("cascadeMarketplace.plan.wageQuoteModal.descriptionPrefix")}{" "}
						<strong>{partnerName || item.title}</strong>
						{t("cascadeMarketplace.plan.wageQuoteModal.descriptionSuffix")}
					</Dialog.Description>
				)}

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t("cascadeMarketplace.plan.wageQuoteModal.submittedTitle")}
						</h4>
						<p className="text-gray-500 text-sm">
							{t("cascadeMarketplace.plan.wageQuoteModal.submittedMessage")}
						</p>
						<Dialog.Close>
							<button
								className="mt-2 bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672]"
								onClick={handleClose}
								type="button"
							>
								{t("common.close")}
							</button>
						</Dialog.Close>
					</div>
				) : (
					<div className="mt-4 px-2 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
						{/* ---------------------------------------- Contact details */}
						<div className="border-t border-gray-100 pt-3">
							<p className={`${SECTION_HEADING_CLASS} mb-3`}>
								{t("cascadeMarketplace.plan.wageQuoteModal.contactDetails")}
							</p>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="text-sm font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-name`}
									>
										{t("forms.fullName")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className={FIELD_CLASS}
										id={`${uid}-name`}
										onChange={(e) => setFullName(e.target.value)}
										placeholder={t(
											"cascadeMarketplace.plan.wageQuoteModal.namePlaceholder",
										)}
										type="text"
										value={fullName}
									/>
								</div>
								<div>
									<label
										className="text-sm font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-email`}
									>
										{t("common.email")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className={FIELD_CLASS}
										id={`${uid}-email`}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="your@email.com"
										type="email"
										value={email}
									/>
								</div>
							</div>

							<div className="mt-3">
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-company`}
								>
									{t(
										"cascadeMarketplace.plan.wageQuoteModal.companyOrOrganization",
									)}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<input
									className={FIELD_CLASS}
									id={`${uid}-company`}
									onChange={(e) => setCompany(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.wageQuoteModal.companyOrOrganizationPlaceholder",
									)}
									type="text"
									value={company}
								/>
							</div>

							<div className="mt-3">
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-notes`}
								>
									{t(
										"cascadeMarketplace.plan.wageQuoteModal.describeYourNeeds",
									)}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<textarea
									className={`${FIELD_CLASS} resize-none`}
									id={`${uid}-notes`}
									onChange={(e) => setNotes(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.wageQuoteModal.describeYourNeedsPlaceholder",
									)}
									rows={3}
									value={notes}
								/>
							</div>

							<div className="mt-3">
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-date`}
								>
									{t("cascadeMarketplace.plan.wageQuoteModal.preferredDate")}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<p className="text-xs text-gray-400 mb-1">
									{t(
										"cascadeMarketplace.plan.wageQuoteModal.earliestAvailable",
									)}
								</p>
								<input
									className={FIELD_CLASS}
									id={`${uid}-date`}
									min={earliestDate}
									onChange={(e) => setPreferredDate(e.target.value)}
									type="date"
									value={preferredDate}
								/>
							</div>
						</div>

						{/* --------------------------------------- Sector / industry */}
						<div className="border-t border-gray-100 pt-3">
							<p className={SECTION_HEADING_CLASS}>
								{t("cascadeMarketplace.plan.wageQuoteModal.sectorIndustry")}
							</p>
							<p className="text-xs text-gray-400 mb-3">
								{t("cascadeMarketplace.plan.wageQuoteModal.sectorIndustryHelp")}
							</p>
							<NaceLevelSelects onChange={setNace} value={nace} />
						</div>

						{/* ------------------------------ Operating countries & wages */}
						<div className="border-t border-gray-100 pt-3">
							<p className={SECTION_HEADING_CLASS}>
								{t(
									"cascadeMarketplace.plan.wageQuoteModal.operatingCountriesWages",
								)}
							</p>
							<p className="text-xs text-gray-400 mb-3">
								{t(
									"cascadeMarketplace.plan.wageQuoteModal.operatingCountriesWagesHelp",
								)}
							</p>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="text-xs font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-locations-count`}
									>
										{t(
											"cascadeMarketplace.plan.wageQuoteModal.numberOfLocations",
										)}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className={FIELD_CLASS}
										id={`${uid}-locations-count`}
										max={MAX_LOCATION_ROWS}
										min={1}
										onChange={(e) => handleLocationsCountChange(e.target.value)}
										placeholder={t(
											"cascadeMarketplace.plan.wageQuoteModal.numberOfLocationsPlaceholder",
										)}
										type="number"
										value={locationsCount}
									/>
								</div>
								<div>
									<label
										className="text-xs font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-suppliers-count`}
									>
										{t(
											"cascadeMarketplace.plan.wageQuoteModal.numberOfSuppliers",
										)}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className={FIELD_CLASS}
										id={`${uid}-suppliers-count`}
										min={0}
										onChange={(e) => setSuppliersCount(e.target.value)}
										placeholder={t(
											"cascadeMarketplace.plan.wageQuoteModal.numberOfSuppliersPlaceholder",
										)}
										type="number"
										value={suppliersCount}
									/>
								</div>
							</div>

							<div className="flex gap-2 mt-3">
								{(
									[
										{
											mode: "MANUAL",
											icon: <Icons.Segment style={{ fontSize: 16 }} />,
											label: t(
												"cascadeMarketplace.plan.wageQuoteModal.addManually",
											),
										},
										{
											mode: "EXCEL",
											icon: <Icons.FileUpload style={{ fontSize: 16 }} />,
											label: t(
												"cascadeMarketplace.plan.wageQuoteModal.uploadExcel",
											),
										},
									] as const satisfies readonly {
										mode: WageInputMode;
										icon: React.ReactNode;
										label: string;
									}[]
								).map(({ mode, icon, label }) => {
									const active = wageInputMode === mode;
									return (
										<button
											className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold border ${
												active
													? "bg-[#0f2a33] border-[#0f2a33] text-white"
													: "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
											}`}
											key={mode}
											onClick={() => setWageInputMode(mode)}
											type="button"
										>
											{icon}
											{label}
										</button>
									);
								})}
							</div>

							{wageInputMode === "MANUAL" ? (
								<div className="mt-3 space-y-3">
									{locations.map((row, index) => (
										<div
											className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50"
											key={`${uid}-location-${index}`}
										>
											<div className="flex items-center justify-between">
												<p className="text-sm font-bold text-gray-700">
													{t(
														"cascadeMarketplace.plan.wageQuoteModal.locationLabel",
														{ n: index + 1 },
													)}
													{index < requiredLocations && (
														<>
															{" "}
															<span className="text-[#FB8379]">*</span>
														</>
													)}
												</p>
												{index >= requiredLocations && (
													<button
														aria-label={t("common.remove")}
														className="text-gray-400 hover:text-red-500"
														onClick={() => removeLocation(index)}
														type="button"
													>
														<Icons.Close style={{ fontSize: 18 }} />
													</button>
												)}
											</div>

											<div className="grid grid-cols-[2fr_1fr] gap-3">
												<div>
													<label
														className={SUBFIELD_LABEL_CLASS}
														htmlFor={`${uid}-country-${index}`}
													>
														{t(
															"cascadeMarketplace.plan.wageQuoteModal.countryLocation",
														)}
													</label>
													<select
														className={FIELD_CLASS}
														id={`${uid}-country-${index}`}
														onChange={(e) =>
															updateLocation(index, { country: e.target.value })
														}
														value={row.country}
													>
														<option value="">
															{t(
																"cascadeMarketplace.plan.wageQuoteModal.selectCountry",
															)}
														</option>
														{countries.map((country) => (
															<option key={country.id} value={country.name}>
																{country.name}
															</option>
														))}
													</select>
												</div>
												<div>
													<label
														className={SUBFIELD_LABEL_CLASS}
														htmlFor={`${uid}-currency-${index}`}
													>
														{t(
															"cascadeMarketplace.plan.wageQuoteModal.currency",
														)}
													</label>
													<select
														className={FIELD_CLASS}
														id={`${uid}-currency-${index}`}
														onChange={(e) =>
															updateLocation(index, {
																currency: e.target.value,
															})
														}
														value={row.currency}
													>
														{currencyCodes.map((code) => (
															<option key={code} value={code}>
																{code}
															</option>
														))}
													</select>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-3">
												<div>
													<label
														className={SUBFIELD_LABEL_CLASS}
														htmlFor={`${uid}-living-${index}`}
													>
														{t(
															"cascadeMarketplace.plan.wageQuoteModal.livingWage",
														)}
													</label>
													<input
														className={FIELD_CLASS}
														id={`${uid}-living-${index}`}
														min={0}
														onChange={(e) =>
															updateLocation(index, {
																livingWage: e.target.value,
															})
														}
														placeholder={t(
															"cascadeMarketplace.plan.wageQuoteModal.perMonth",
														)}
														type="number"
														value={row.livingWage}
													/>
												</div>
												<div>
													<label
														className={SUBFIELD_LABEL_CLASS}
														htmlFor={`${uid}-minimum-${index}`}
													>
														{t(
															"cascadeMarketplace.plan.wageQuoteModal.minimumWage",
														)}
													</label>
													<input
														className={FIELD_CLASS}
														id={`${uid}-minimum-${index}`}
														min={0}
														onChange={(e) =>
															updateLocation(index, {
																minimumWage: e.target.value,
															})
														}
														placeholder={t(
															"cascadeMarketplace.plan.wageQuoteModal.perMonth",
														)}
														type="number"
														value={row.minimumWage}
													/>
												</div>
											</div>
										</div>
									))}

									<button
										className="flex items-center gap-2 text-sm font-bold text-[#148696] hover:text-[#0f6672]"
										onClick={addLocation}
										type="button"
									>
										<Icons.AddCircleOutline style={{ fontSize: 20 }} />
										{t("cascadeMarketplace.plan.wageQuoteModal.addLocation")}
									</button>
								</div>
							) : (
								<div className="mt-3">
									<label
										className="flex flex-col items-center justify-center gap-1 border border-dashed border-gray-300 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#148696]"
										htmlFor={`${uid}-wage-file`}
									>
										<Icons.FileUpload
											className="text-gray-400"
											style={{ fontSize: 24 }}
										/>
										<span className="text-sm font-bold text-gray-700">
											{wageFile
												? wageFile.name
												: t(
														"cascadeMarketplace.plan.wageQuoteModal.clickToUploadOrDragDrop",
													)}
										</span>
										<span className="text-xs text-gray-400">
											{t("cascadeMarketplace.plan.wageQuoteModal.fileTypeHint")}
										</span>
										<input
											accept={SPREADSHEET_EXTENSIONS.join(",")}
											className="hidden"
											id={`${uid}-wage-file`}
											onChange={(e) =>
												handleFileChange(e.target.files?.[0] ?? null)
											}
											type="file"
										/>
									</label>
									{fileError && (
										<p className="text-xs text-red-500 mt-1">{fileError}</p>
									)}
								</div>
							)}
						</div>

						{/* -------------------------------- Certification requirement */}
						<div className="border-t border-gray-100 pt-3">
							<p className={SECTION_HEADING_CLASS}>
								{t(
									"cascadeMarketplace.plan.wageQuoteModal.certificationRequirement",
								)}{" "}
								<span className="text-[#FB8379]">*</span>
							</p>
							<p className="text-xs text-gray-400 mb-3">
								{t(
									"cascadeMarketplace.plan.wageQuoteModal.certificationRequirementHelp",
								)}
							</p>
							<div className="flex flex-wrap gap-2">
								{CERTIFICATION_OPTIONS.map((certification) => {
									const checked = certifications.includes(certification);
									return (
										<label
											className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
												checked
													? "border-[#148696] bg-[rgba(20,134,150,0.06)] text-[#0f6672] font-semibold"
													: "border-gray-200 text-gray-700 hover:bg-gray-50"
											}`}
											key={certification}
										>
											<input
												checked={checked}
												className="accent-[#148696]"
												onChange={() => toggleCertification(certification)}
												type="checkbox"
											/>
											{certification}
										</label>
									);
								})}
							</div>
						</div>

						{/* ------------------------------------ Additional information */}
						<div className="border-t border-gray-100 pt-3">
							<p className={`${SECTION_HEADING_CLASS} mb-3`}>
								{t(
									"cascadeMarketplace.plan.wageQuoteModal.additionalInformation",
								)}
							</p>

							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-workers`}
								>
									{t("cascadeMarketplace.plan.wageQuoteModal.numberOfWorkers")}
								</label>
								<input
									className={FIELD_CLASS}
									id={`${uid}-workers`}
									min={0}
									onChange={(e) => setTotalWorkers(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.wageQuoteModal.numberOfWorkersPlaceholder",
									)}
									type="number"
									value={totalWorkers}
								/>
							</div>

							<div className="mt-3">
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-languages`}
								>
									{t("cascadeMarketplace.plan.wageQuoteModal.languagesSpoken")}
								</label>
								<p className="text-xs text-gray-400 mb-1">
									{t(
										"cascadeMarketplace.plan.wageQuoteModal.languagesSpokenHelp",
									)}
								</p>
								<ChipInput
									inputId={`${uid}-languages`}
									onChange={setLanguages}
									placeholder={t(
										"cascadeMarketplace.plan.wageQuoteModal.languagesSpokenPlaceholder",
									)}
									suggestions={languagesData.map((l) => l.name)}
									values={languages}
								/>
							</div>

							{showOthers ? (
								<div className="mt-2">
									<label
										className="text-xs font-semibold text-gray-500 block mb-1"
										htmlFor={`${uid}-others`}
									>
										{t(
											"cascadeMarketplace.plan.wageQuoteModal.othersLanguagesLabel",
										)}
									</label>
									<ChipInput
										inputId={`${uid}-others`}
										onChange={(others) =>
											setLanguages((prev) =>
												Array.from(new Set([...prev, ...others])),
											)
										}
										placeholder={t(
											"cascadeMarketplace.plan.wageQuoteModal.othersLanguagesPlaceholder",
										)}
										values={[]}
									/>
								</div>
							) : (
								<button
									className="flex items-center gap-1 text-sm font-bold text-[#148696] hover:text-[#0f6672] mt-1"
									onClick={() => setShowOthers(true)}
									type="button"
								>
									<Icons.AddCircleOutline style={{ fontSize: 16 }} />
									{t(
										"cascadeMarketplace.plan.wageQuoteModal.othersLanguagesToggle",
									)}
								</button>
							)}
						</div>

						<div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
							{submitError && (
								<p className="text-sm text-red-500 text-right">{submitError}</p>
							)}
							<div className="flex gap-3 justify-end">
								<Dialog.Close>
									<button
										className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50"
										onClick={handleClose}
										type="button"
									>
										{t("common.cancel")}
									</button>
								</Dialog.Close>
								<button
									className="bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									disabled={!canSubmit || submitMutation.isPending}
									onClick={() => submitMutation.mutate()}
									type="button"
								>
									{submitMutation.isPending && (
										<Icons.HourglassTop style={{ fontSize: 14 }} />
									)}
									{t("cascadeMarketplace.plan.wageQuoteModal.submitRequest")}
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
