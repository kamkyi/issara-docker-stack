import { motion } from "framer-motion";
import { useState } from "react";
import {
	useCascadeCountries,
	useCascadeIndustries,
} from "$src/hooks/useCommonData";

interface FilterCardProps {
	onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
	country: string;
	industry: string;
	year: string;
}

interface FilterOption {
	label: string;
	value: string;
}

const years = [
	"All Years",
	"2025",
	"2024",
	"2023",
	"2022",
	"2021",
	"2020",
	"2019",
	"2018",
];

export const FilterCard = ({ onFilterChange }: FilterCardProps) => {
	const [filters, setFilters] = useState<FilterState>({
		country: "All Countries",
		industry: "All Industries",
		year: "All Years",
	});
	const { data: countriesData } = useCascadeCountries();
	const countries: FilterOption[] = countriesData?.data?.countries
		? [
				{ label: "All Countries", value: "All Countries" },
				...countriesData.data.countries
					.map(
						(country: { id?: number; country_id?: number; name: string }) => ({
							label: country.name,
							value: String(country.id ?? country.country_id ?? country.name),
						}),
					)
					.filter((v) => v.value !== "35")
					.sort((a, b) => a.label.localeCompare(b.label)), // Exclude duplicate "Taiwan" and sort alphabetically
			]
		: [{ label: "All Countries", value: "All Countries" }];

	const { data: industriesData } = useCascadeIndustries();
	const industries: FilterOption[] = industriesData?.data?.industries
		? [
				{ label: "All Industries", value: "All Industries" },
				...industriesData.data.industries.map(
					(industry: { id?: number; name: string }) => ({
						label: industry.name,
						value: String(industry.id ?? industry.name),
					}),
				),
			]
		: [{ label: "All Industries", value: "All Industries" }];

	const handleFilterChange = (filterName: keyof FilterState, value: string) => {
		const newFilters = { ...filters, [filterName]: value };
		setFilters(newFilters);
		onFilterChange?.(newFilters);
	};

	const resetFilters = () => {
		const defaultFilters: FilterState = {
			country: "All Countries",
			industry: "All Industries",
			year: "All Years",
		};
		setFilters(defaultFilters);
		onFilterChange?.(defaultFilters);
	};

	return (
		<motion.div
			className="sticky top-8"
			initial={{ opacity: 0, x: 30 }}
			transition={{ duration: 0.6, delay: 0.3 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, x: 0 }}
		>
			<div className="bg-white rounded-md p-6 shadow-lg">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
						<div className="w-3 h-3 bg-gradient-to-r from-[#148696] to-[#0d5f6d] rounded-full"></div>
						Filters
					</h3>
					<button
						className="text-xs text-[#148696] hover:text-[#0d5f6d] font-medium transition-colors"
						onClick={resetFilters}
						type="button"
					>
						Reset All
					</button>
				</div>

				<div className="space-y-4">
					{/* Country Filter */}
					<div>
						<label
							className="block text-sm font-medium text-gray-700 mb-2"
							htmlFor="country"
						>
							Country
						</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#148696] focus:border-transparent text-sm"
							id={"country"}
							onChange={(e) => handleFilterChange("country", e.target.value)}
							value={filters.country}
						>
							{countries.map((country) => (
								<option key={country.value} value={country.value}>
									{country.label}
								</option>
							))}
						</select>
					</div>

					{/* Industry Filter */}
					<div>
						<label
							className="block text-sm font-medium text-gray-700 mb-2"
							htmlFor="industry"
						>
							Industry
						</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#148696] focus:border-transparent text-sm"
							id={"industry"}
							onChange={(e) => handleFilterChange("industry", e.target.value)}
							value={filters.industry}
						>
							{industries.map((industry) => (
								<option key={industry.value} value={industry.value}>
									{industry.label}
								</option>
							))}
						</select>
					</div>

					{/* Year Filter */}
					<div>
						<label
							className="block text-sm font-medium text-gray-700 mb-2"
							htmlFor="year"
						>
							Year
						</label>
						<select
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#148696] focus:border-transparent text-sm"
							id={"year"}
							onChange={(e) => handleFilterChange("year", e.target.value)}
							value={filters.year}
						>
							{years.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Apply Button */}
				<button
					className="w-full mt-6 bg-gradient-to-r from-[#148696] to-[#0d5f6d] text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:from-[#0d5f6d] hover:to-[#084a57] transition-all duration-300 shadow-md hover:shadow-lg"
					type="button"
				>
					Apply Filters
				</button>
			</div>
		</motion.div>
	);
};

export default FilterCard;
