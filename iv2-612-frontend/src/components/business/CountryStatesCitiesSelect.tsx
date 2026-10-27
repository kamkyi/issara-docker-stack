import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useCities } from "$src/hooks/useCities";
import { useCountries } from "$src/hooks/useCommonData";
import { useStates } from "$src/hooks/useStates";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

interface CountryStatesCitiesSelectProps {
	onSelect: (v: {
		country_ids: number[];
		state_ids: number[];
		city_ids: number[];
	}) => void;
	country_ids?: number[];
	state_ids?: number[];
	city_ids?: number[];
	showCountries?: boolean;
	showStates?: boolean;
	showCities?: boolean;
}

export const CountryStatesCitiesSelect: React.FC<
	CountryStatesCitiesSelectProps
> = ({
	onSelect,
	country_ids = [],
	state_ids = [],
	city_ids = [],
	showCountries = true,
	showStates = true,
	showCities = true,
}) => {
	const [countryIds, setCountryIds] = useState<number[]>(country_ids);
	const [stateIds, setStateIds] = useState<number[]>(state_ids);
	const [cityIds, setCityIds] = useState<number[]>(city_ids);

	// Update local state when props change
	useEffect(() => {
		setCountryIds(country_ids || []);
		setStateIds(state_ids || []);
		setCityIds(city_ids || []);
	}, [country_ids, state_ids, city_ids]);

	// Fetch data using hooks
	const { data: countriesData = [] } = useCountries();
	const { data: statesData = [] } = useStates();
	const { data: citiesData = [] } = useCities();

	// Transform data for MultiSelectDropdown
	const countries = useMemo(() => {
		return countriesData.map((country: any) => ({
			id: country.id,
			name: country.name,
		}));
	}, [countriesData]);

	const states = useMemo(() => {
		return statesData.map((state: any) => ({
			id: state.id,
			name: state.name,
			country_id: state.country_id, // Assuming states have country_id field
		}));
	}, [statesData]);

	const cities = useMemo(() => {
		return citiesData.map((city: any) => ({
			id: city.id,
			name: city.name,
			state_id: city.state_id, // Assuming cities have state_id field
			country_id: city.country_id, // Assuming cities have country_id field
		}));
	}, [citiesData]);

	// Filter states based on selected countries
	const filteredStates = useMemo(() => {
		if (countryIds.length === 0) return states;
		return states.filter((state: any) => countryIds.includes(state.country_id));
	}, [states, countryIds]);

	// Filter cities based on selected states or countries
	const filteredCities = useMemo(() => {
		if (stateIds.length > 0) {
			return cities.filter((city: any) => stateIds.includes(city.state_id));
		} else if (countryIds.length > 0) {
			return cities.filter((city: any) => countryIds.includes(city.country_id));
		}
		return cities;
	}, [cities, stateIds, countryIds]);

	const handleCountryChange = (ids: number[]) => {
		setCountryIds(ids);
		setStateIds([]);
		setCityIds([]);
		onSelect({ country_ids: ids, state_ids: [], city_ids: [] });
	};

	const handleStateChange = (ids: number[]) => {
		setStateIds(ids);
		setCityIds([]);
		onSelect({ country_ids: countryIds, state_ids: ids, city_ids: [] });
	};

	const handleCityChange = (ids: number[]) => {
		setCityIds(ids);
		onSelect({
			country_ids: countryIds,
			state_ids: stateIds,
			city_ids: ids,
		});
	};

	// Calculate grid columns based on what's shown
	const visibleComponents = [showCountries, showStates, showCities].filter(
		Boolean,
	).length;
	const gridClass =
		visibleComponents === 3
			? "w-1/3"
			: visibleComponents === 2
				? "w-1/2"
				: "w-full";

	return (
		<div className="flex gap-4 w-full">
			{showCountries && (
				<div className={gridClass}>
					<MultiSelectDropdown
						items={countries}
						label="Countries"
						onChange={handleCountryChange}
						placeholder="Select countries"
						selectedIds={countryIds}
					/>
				</div>
			)}

			{showStates && (
				<div className={gridClass}>
					<MultiSelectDropdown
						items={filteredStates}
						label="States/Provinces"
						onChange={handleStateChange}
						placeholder="Select states"
						selectedIds={stateIds}
					/>
				</div>
			)}

			{showCities && (
				<div className={gridClass}>
					<MultiSelectDropdown
						items={filteredCities}
						label="Cities"
						onChange={handleCityChange}
						placeholder="Select cities"
						selectedIds={cityIds}
					/>
				</div>
			)}
		</div>
	);
};

export default CountryStatesCitiesSelect;
