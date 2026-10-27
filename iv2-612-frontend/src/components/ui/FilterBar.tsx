import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useId, useMemo, useState } from "react";
import { MultiSelect } from "$src/components/ui/MultiSelect";
import { PartnerAudienceSelector } from "$src/components/ui/PartnerAudienceSelector";
import { useChoroplethData } from "$src/hooks/useChoroplethData";
import {
	useCascadeCountries,
	useCascadeDistricts,
	useCascadeIndustries,
	useCascadeProvinces,
} from "$src/hooks/useCommonData";
import { useSubIndustries } from "$src/hooks/useIndustries";
import { useSupplierSearch } from "$src/queries/suppliers";

export interface FilterBarOption {
	value: string;
	label: string;
}

export interface FilterBarFilters {
	countries?: string[];
	provinces?: string[];
	districts?: string[];
	industries?: string[];
	subIndustries?: string[];
	from?: string;
	strategicPartnerGroupings?: string[];
	suppliers?: string[];
	strategicPartners?: string[];
	operators?: string[];
	to?: string;
	search?: string;
}

interface FilterBarProps {
	filters: FilterBarFilters;
	onChange: (filters: FilterBarFilters) => void;
	supplierOptions?: FilterBarOption[];
	countryOptions?: FilterBarOption[];
	provinceOptions?: FilterBarOption[];
	districtOptions?: FilterBarOption[];
	industryOptions?: FilterBarOption[];
	subIndustryOptions?: FilterBarOption[];
	operatorOptions?: FilterBarOption[];
	showSearch?: boolean;
	showDateRange?: boolean;
	showSupplier?: boolean;
	showCountry?: boolean;
	showProvince?: boolean;
	showDistrict?: boolean;
	showIndustry?: boolean;
	showSubIndustry?: boolean;
	showOperator?: boolean;
	showStrategicPartners?: boolean;
	showStrategicPartnerGrouping?: boolean;
	searchPlaceholder?: string;
	className?: string;
	/** Date range restored when "Reset filters" is clicked (defaults to empty). */
	defaultFrom?: string;
	defaultTo?: string;
	/**
	 * Load the Supplier dropdown via server-side type-ahead search instead of a
	 * pre-loaded `supplierOptions` list. Avoids walking the full (~10k) supplier
	 * list on mount.
	 */
	supplierServerSearch?: boolean;
}

export function FilterBar({
	filters,
	onChange,
	supplierOptions = [],
	countryOptions = [],
	provinceOptions = [],
	districtOptions = [],
	industryOptions = [],
	subIndustryOptions = [],
	operatorOptions = [],
	showSearch = false,
	showDateRange = true,
	showCountry = true,
	showProvince = false,
	showDistrict = false,
	showSupplier = false,
	showIndustry = true,
	showSubIndustry = false,
	showOperator = false,
	showStrategicPartners = false,
	showStrategicPartnerGrouping = false,
	searchPlaceholder = "Search…",
	className = "",
	defaultFrom = "",
	defaultTo = "",
	supplierServerSearch = false,
}: FilterBarProps) {
	const { data: cascadeCountriesResponse } = useCascadeCountries();
	const { data: cascadeIndustriesResponse } = useCascadeIndustries();
	const { data: cascadeProvincesResponse } = useCascadeProvinces(
		filters.countries ?? [],
	);
	const { data: cascadeDistrictsResponse } = useCascadeDistricts(
		filters.provinces ?? [],
	);

	// Server-side supplier type-ahead (only active when supplierServerSearch).
	const [supplierSearch, setSupplierSearch] = useState("");
	const {
		data: supplierSearchResults = [],
		isFetching: supplierSearchLoading,
	} = useSupplierSearch(supplierSearch, 50, supplierServerSearch);
	const serverSupplierOptions = useMemo<FilterBarOption[]>(
		() =>
			supplierSearchResults
				.map((s) => ({ value: String(s.id ?? ""), label: s.name ?? "" }))
				.filter((o) => o.value && o.label),
		[supplierSearchResults],
	);
	const { markers } = useChoroplethData();
	const fromId = useId();
	const toId = useId();
	const searchId = useId();

	const resolvedCountryOptions = useMemo<FilterBarOption[]>(() => {
		if (countryOptions.length > 0) {
			return countryOptions;
		}

		const countries = cascadeCountriesResponse?.results;

		return countries
			?.map((country: { id?: number; country_id?: number; name?: string }) => ({
				value: String(country.id ?? country.country_id ?? ""),
				label: country.name ?? "",
			}))
			?.filter((option: FilterBarOption) => option.value && option.label)
			?.sort((a: FilterBarOption, b: FilterBarOption) =>
				a.label.localeCompare(b.label),
			);
	}, [countryOptions, cascadeCountriesResponse]);

	const resolvedIndustryOptions = useMemo<FilterBarOption[]>(() => {
		if (industryOptions.length > 0) {
			return industryOptions;
		}

		const industriesRaw = cascadeIndustriesResponse?.data;
		const industries = Array.isArray(industriesRaw?.industries)
			? industriesRaw.industries
			: [];

		return industries
			?.map((industry: { id?: number; name?: string }) => ({
				value: String(industry.id ?? ""),
				label: industry.name ?? "",
			}))
			?.filter((option: FilterBarOption) => option.value && option.label)
			?.sort((a: FilterBarOption, b: FilterBarOption) =>
				a.label.localeCompare(b.label),
			);
	}, [industryOptions, cascadeIndustriesResponse]);

	const { data: subIndustriesResponse } = useSubIndustries();

	const resolvedSubIndustryOptions = useMemo<FilterBarOption[]>(() => {
		if (subIndustryOptions.length > 0) {
			return subIndustryOptions;
		}

		const subIndustries = subIndustriesResponse ?? [];
		// When one or more industries are selected, scope the sub-industry list to
		// those parents so the two filters stay coherent.
		const selectedIndustryIds = new Set(filters.industries ?? []);

		return subIndustries
			?.filter(
				(sub) =>
					selectedIndustryIds.size === 0 ||
					selectedIndustryIds.has(String(sub.industry_id)),
			)
			?.map((sub) => ({
				value: String(sub.id ?? ""),
				label: sub.name ?? "",
			}))
			?.filter((option) => option.value && option.label)
			?.sort((a, b) => a.label.localeCompare(b.label));
	}, [subIndustryOptions, subIndustriesResponse, filters.industries]);

	const resolvedSupplierOptions = useMemo<FilterBarOption[]>(() => {
		if (supplierOptions.length > 0) {
			return supplierOptions;
		}

		const seen = new Set<string>();

		return markers
			?.map((marker) => ({
				value: String(marker.id ?? ""),
				label: marker.name ?? "",
			}))
			?.filter((option) => {
				if (!option.value || !option.label || seen.has(option.value)) {
					return false;
				}
				seen.add(option.value);
				return true;
			})
			?.sort((a, b) => a.label.localeCompare(b.label));
	}, [supplierOptions, markers]);

	const resolvedProvinceOptions = useMemo<FilterBarOption[]>(() => {
		if (provinceOptions.length > 0) {
			return provinceOptions;
		}

		const provincesRaw =
			cascadeProvincesResponse?.results ??
			cascadeProvincesResponse?.data ??
			cascadeProvincesResponse;
		const provinces = Array.isArray(provincesRaw) ? provincesRaw : [];

		// The province endpoint ignores its `country_ids` param and returns every
		// province across all countries, so scope to the selected countries here
		// using the `country_id` each record carries.
		const selectedCountryIds = new Set(filters.countries ?? []);

		return provinces
			.filter(
				(province: { country_id?: number }) =>
					selectedCountryIds.size === 0 ||
					selectedCountryIds.has(String(province.country_id)),
			)
			.map(
				(province: { id?: number; province_id?: number; name?: string }) => ({
					value: String(province.id ?? province.province_id ?? ""),
					label: province.name ?? "",
				}),
			)
			.filter((option: FilterBarOption) => option.value && option.label)
			.sort((a: FilterBarOption, b: FilterBarOption) =>
				a.label.localeCompare(b.label),
			);
	}, [provinceOptions, cascadeProvincesResponse, filters.countries]);

	const resolvedDistrictOptions = useMemo<FilterBarOption[]>(() => {
		if (districtOptions.length > 0) {
			return districtOptions;
		}

		const districtsRaw =
			cascadeDistrictsResponse?.results ??
			cascadeDistrictsResponse?.data ??
			cascadeDistrictsResponse;
		const districts = Array.isArray(districtsRaw) ? districtsRaw : [];

		if (districts.length > 0) {
			// Mirror the province handling: scope to the selected provinces using the
			// `province_id` each district carries, in case the endpoint returns more.
			const selectedProvinceIds = new Set(filters.provinces ?? []);

			return districts
				.filter(
					(district: { province_id?: number }) =>
						selectedProvinceIds.size === 0 ||
						selectedProvinceIds.has(String(district.province_id)),
				)
				.map(
					(district: { id?: number; district_id?: number; name?: string }) => ({
						value: String(district.id ?? district.district_id ?? ""),
						label: district.name ?? "",
					}),
				)
				.filter((option: FilterBarOption) => option.value && option.label)
				.sort((a: FilterBarOption, b: FilterBarOption) =>
					a.label.localeCompare(b.label),
				);
		}

		const seen = new Set<string>();

		return markers
			?.map((marker) => {
				const district =
					typeof marker.district === "string"
						? marker.district
						: typeof marker.districtName === "string"
							? marker.districtName
							: "";

				return {
					value: district,
					label: district,
				};
			})
			?.filter((option) => {
				if (!option.value || !option.label || seen.has(option.value)) {
					return false;
				}
				seen.add(option.value);
				return true;
			})
			?.sort((a, b) => a.label.localeCompare(b.label));
	}, [districtOptions, markers, cascadeDistrictsResponse, filters.provinces]);

	const shouldShowProvince = showProvince || showDistrict;
	const isProvinceDisabled = (filters.countries?.length ?? 0) === 0;
	const isDistrictDisabled = (filters.provinces?.length ?? 0) === 0;

	const handleProvinceChange = (vals: string[]) => {
		update({
			provinces: vals,
			districts: [],
		});
	};

	const update = (patch: Partial<FilterBarFilters>) => {
		onChange({ ...filters, ...patch });
	};

	const reset = () => {
		onChange({
			suppliers: [],
			strategicPartners: [],
			strategicPartnerGroupings: [],
			countries: [],
			provinces: [],
			districts: [],
			industries: [],
			subIndustries: [],
			operators: [],
			from: defaultFrom,
			to: defaultTo,
			search: "",
		});
	};

	return (
		<div
			className={`bg-white rounded-md px-5 py-4 flex flex-wrap items-end gap-4 ${className}`}
		>
			{showSearch && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={searchId}
					>
						Search
					</label>
					<div className="relative">
						<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
						<input
							className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition placeholder:text-gray-400"
							id={searchId}
							onChange={(e) => update({ search: e.target.value })}
							placeholder={searchPlaceholder}
							type="text"
							value={filters.search ?? ""}
						/>
					</div>
				</div>
			)}

			{showSupplier && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-supplier`}
					>
						Supplier
					</label>
					<MultiSelect
						id={`${fromId}-supplier`}
						loading={supplierServerSearch ? supplierSearchLoading : false}
						onChange={(vals) => update({ suppliers: vals })}
						onSearchChange={
							supplierServerSearch ? setSupplierSearch : undefined
						}
						options={
							supplierServerSearch
								? serverSupplierOptions
								: resolvedSupplierOptions?.filter((opt) => opt.value !== "")
						}
						placeholder="All Suppliers"
						values={filters.suppliers ?? []}
					/>
				</div>
			)}

			{(showStrategicPartners || showStrategicPartnerGrouping) && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-strategic-partners`}
					>
						Strategic Partners
					</label>
					<PartnerAudienceSelector
						filters={filters}
						id={`${fromId}-strategic-partners`}
						onChange={(patch) => update(patch)}
					/>
				</div>
			)}

			{showCountry && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-country`}
					>
						Country
					</label>
					<MultiSelect
						id={`${fromId}-country`}
						onChange={(vals) =>
							update({
								countries: vals,
								provinces: [],
								districts: [],
							})
						}
						options={resolvedCountryOptions?.filter((opt) => opt.value !== "")}
						placeholder="All Countries"
						values={filters.countries ?? []}
					/>
				</div>
			)}

			{shouldShowProvince && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-province`}
					>
						Province
					</label>
					<MultiSelect
						disabled={isProvinceDisabled}
						id={`${fromId}-province`}
						onChange={handleProvinceChange}
						options={resolvedProvinceOptions?.filter((opt) => opt.value !== "")}
						placeholder={
							isProvinceDisabled ? "Select country first" : "All Provinces"
						}
						values={filters.provinces ?? []}
					/>
				</div>
			)}

			{showDistrict && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-district`}
					>
						District
					</label>
					<MultiSelect
						disabled={isDistrictDisabled}
						id={`${fromId}-district`}
						onChange={(vals) => update({ districts: vals })}
						options={resolvedDistrictOptions?.filter((opt) => opt.value !== "")}
						placeholder={
							isDistrictDisabled ? "Select province first" : "All Districts"
						}
						values={filters.districts ?? []}
					/>
				</div>
			)}

			{showIndustry && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-industry`}
					>
						Industry
					</label>
					<MultiSelect
						id={`${fromId}-industry`}
						onChange={(vals) => update({ industries: vals, subIndustries: [] })}
						options={resolvedIndustryOptions?.filter((opt) => opt.value !== "")}
						placeholder="All Industries"
						values={filters.industries ?? []}
					/>
				</div>
			)}

			{showSubIndustry && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-sub-industry`}
					>
						Sub-Industry
					</label>
					<MultiSelect
						disabled={(filters.industries ?? []).length === 0}
						id={`${fromId}-sub-industry`}
						onChange={(vals) => update({ subIndustries: vals })}
						options={resolvedSubIndustryOptions?.filter(
							(opt) => opt.value !== "",
						)}
						placeholder={
							(filters.industries ?? []).length === 0
								? "Select an industry first"
								: "All Sub-Industries"
						}
						values={filters.subIndustries ?? []}
					/>
				</div>
			)}

			{showOperator && (
				<div className="flex flex-col gap-1">
					<label
						className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
						htmlFor={`${fromId}-operator`}
					>
						Operator
					</label>
					<MultiSelect
						id={`${fromId}-operator`}
						onChange={(vals) => update({ operators: vals })}
						options={operatorOptions?.filter((opt) => opt.value !== "")}
						placeholder="All Operators"
						values={filters.operators ?? []}
					/>
				</div>
			)}

			{showDateRange && (
				<div className="flex items-end gap-2">
					<div className="flex flex-col gap-1">
						<label
							className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
							htmlFor={fromId}
						>
							From
						</label>
						<input
							className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition"
							id={fromId}
							max={new Date().toISOString().split("T")[0]}
							onChange={(e) => update({ from: e.target.value })}
							type="date"
							value={filters.from ?? ""}
						/>
					</div>
					<span className="text-gray-300 pb-2">—</span>
					<div className="flex flex-col gap-1">
						<label
							className="text-[11px] font-semibold text-[#56666C] uppercase tracking-wider"
							htmlFor={toId}
						>
							To
						</label>
						<input
							className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148696] focus:bg-white transition"
							id={toId}
							max={new Date().toISOString().split("T")[0]}
							min={filters.from ?? undefined}
							onChange={(e) => update({ to: e.target.value })}
							type="date"
							value={filters.to ?? ""}
						/>
					</div>
				</div>
			)}

			<div className="flex items-end ml-auto">
				<button
					className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:border-[#148696] hover:text-[#148696] transition"
					onClick={reset}
					type="button"
				>
					Reset filters
				</button>
			</div>
		</div>
	);
}
