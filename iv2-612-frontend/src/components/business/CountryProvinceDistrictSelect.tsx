import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

const API_URL = import.meta.env.VITE_APP_API_URL;

const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchCountries = async () => {
	const { data } = await axios.get(`${API_URL}/countries/?client_version=3.0`, {
		headers: getAuthHeaders(),
	});
	return data.results;
};

const fetchProvinces = async () => {
	const { data } = await axios.get(`${API_URL}/provinces/?client_version=3.0`, {
		headers: getAuthHeaders(),
	});
	return data.results;
};

const fetchDistricts = async () => {
	const { data } = await axios.get(`${API_URL}/districts/?client_version=3.0`, {
		headers: getAuthHeaders(),
	});
	return data.results;
};

interface CountryProvinceDistrictSelectProps {
	onSelect: (v: {
		country_ids: number[];
		province_ids: number[];
		district_ids: number[];
	}) => void;
	country_ids?: number[]; // Add this prop
	province_ids?: number[]; // Add this prop
	district_ids?: number[]; // Add this prop
}

export const CountryProvinceDistrictSelect: React.FC<
	CountryProvinceDistrictSelectProps
> = ({ onSelect, country_ids = [], province_ids = [], district_ids = [] }) => {
	const [countryIds, setCountryIds] = useState<number[]>(country_ids);
	const [provinceIds, setProvinceIds] = useState<number[]>(province_ids);
	const [districtIds, setDistrictIds] = useState<number[]>(district_ids);

	// Update local state when props change
	useEffect(() => {
		setCountryIds(country_ids || []);
		setProvinceIds(province_ids || []);
		setDistrictIds(district_ids || []);
	}, [country_ids, province_ids, district_ids]);

	const { data: countries = [] } = useQuery({
		queryKey: ["countries-old"],
		queryFn: fetchCountries,
	});
	const { data: provinces = [] } = useQuery({
		queryKey: ["provinces-old"],
		queryFn: fetchProvinces,
	});
	const { data: districts = [] } = useQuery({
		queryKey: ["districts-old"],
		queryFn: fetchDistricts,
	});

	const filteredProvinces = useMemo(() => {
		if (countryIds.length === 0) return [];
		return (provinces as any[]).filter((prov: any) =>
			countryIds.includes(prov.country),
		);
	}, [provinces, countryIds]);

	const filteredDistricts = useMemo(() => {
		if (provinceIds.length === 0) return [];
		return (districts as any[]).filter((dist: any) =>
			provinceIds.includes(dist.province),
		);
	}, [districts, provinceIds]);

	const handleCountryChange = (ids: number[]) => {
		setCountryIds(ids);
		setProvinceIds([]);
		setDistrictIds([]);
		onSelect({ country_ids: ids, province_ids: [], district_ids: [] });
	};

	const handleProvinceChange = (ids: number[]) => {
		setProvinceIds(ids);
		setDistrictIds([]);
		onSelect({ country_ids: countryIds, province_ids: ids, district_ids: [] });
	};

	const handleDistrictChange = (ids: number[]) => {
		setDistrictIds(ids);
		onSelect({
			country_ids: countryIds,
			province_ids: provinceIds,
			district_ids: ids,
		});
	};

	return (
		<div className="flex gap-4 w-full">
			<div className="w-1/3">
				<MultiSelectDropdown
					items={countries as any[]}
					label="Countries"
					onChange={handleCountryChange}
					placeholder="Select countries"
					selectedIds={countryIds}
				/>
			</div>
			<div className="w-1/3">
				<MultiSelectDropdown
					items={filteredProvinces}
					label="Provinces"
					onChange={handleProvinceChange}
					placeholder="Select provinces"
					selectedIds={provinceIds}
				/>
			</div>
			<div className="w-1/3">
				<MultiSelectDropdown
					items={filteredDistricts}
					label="Districts"
					onChange={handleDistrictChange}
					placeholder="Select districts"
					selectedIds={districtIds}
				/>
			</div>
		</div>
	);
};

export default CountryProvinceDistrictSelect;
