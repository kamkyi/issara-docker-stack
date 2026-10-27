import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";
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

interface CountrySelectProps {
	onSelect: (country_ids: number[]) => void;
	country_ids?: number[];
	label?: string;
	placeholder?: string;
	className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
	onSelect,
	country_ids = [],
	label = "Countries",
	placeholder = "Select countries",
	className = "",
}) => {
	const [countryIds, setCountryIds] = useState<number[]>(country_ids);

	// Update local state when props change
	useEffect(() => {
		setCountryIds(country_ids || []);
	}, [country_ids]);

	const { data: countries = [] } = useQuery({
		queryKey: ["countries"],
		queryFn: fetchCountries,
	});

	const handleCountryChange = (ids: number[]) => {
		setCountryIds(ids);
		onSelect(ids);
	};

	return (
		<div className={`w-full ${className}`}>
			<MultiSelectDropdown
				items={countries}
				label={label}
				onChange={handleCountryChange}
				placeholder={placeholder}
				selectedIds={countryIds}
			/>
		</div>
	);
};

export default CountrySelect;
