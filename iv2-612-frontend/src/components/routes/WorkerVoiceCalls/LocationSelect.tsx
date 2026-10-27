/**
 * Country -> Province -> District cascade for the worker's origin and crossing
 * locations. The existing `CountryProvinceDistrictSelect` is multi-select and
 * feeds directory filters; `cases` stores a single id per level, so this is the
 * single-select counterpart over the same endpoints.
 */
import type React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	useCountries,
	useDistricts,
	useProvinces,
} from "$src/queries/caseLookups";
import { Field, LookupSelect } from "./fields";

interface LocationValue {
	countryId: number | null;
	provinceId: number | null;
	districtId: number | null;
}

interface LocationSelectProps {
	label: string;
	required?: boolean;
	value: LocationValue;
	onChange: (value: LocationValue) => void;
	error?: string;
}

const LocationSelect: React.FC<LocationSelectProps> = ({
	label,
	required,
	value,
	onChange,
	error,
}) => {
	const { t } = useTranslation();
	const { data: countries = [] } = useCountries();
	const { data: provinces = [] } = useProvinces();
	const { data: districts = [] } = useDistricts();

	const availableProvinces = useMemo(
		() =>
			value.countryId === null
				? []
				: provinces.filter((province) => province.country === value.countryId),
		[provinces, value.countryId],
	);

	const availableDistricts = useMemo(
		() =>
			value.provinceId === null
				? []
				: districts.filter(
						(district) => district.province === value.provinceId,
					),
		[districts, value.provinceId],
	);

	return (
		<Field error={error} label={label} required={required}>
			{() => (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<LookupSelect
						controlId={`${label}-country`}
						invalid={Boolean(error)}
						onChange={(countryId) =>
							// Clearing the children keeps the case from storing a province
							// that does not belong to the newly chosen country.
							onChange({ countryId, provinceId: null, districtId: null })
						}
						options={countries}
						placeholder={t("workerVoiceForm.fields.location.country")}
						value={value.countryId}
					/>
					<LookupSelect
						controlId={`${label}-province`}
						disabled={value.countryId === null}
						onChange={(provinceId) =>
							onChange({ ...value, provinceId, districtId: null })
						}
						options={availableProvinces}
						placeholder={t("workerVoiceForm.fields.location.province")}
						value={value.provinceId}
					/>
					<LookupSelect
						controlId={`${label}-district`}
						disabled={value.provinceId === null}
						onChange={(districtId) => onChange({ ...value, districtId })}
						options={availableDistricts}
						placeholder={t("workerVoiceForm.fields.location.district")}
						value={value.districtId}
					/>
				</div>
			)}
		</Field>
	);
};

export default LocationSelect;
