import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useIndustries, useSubIndustries } from "../../hooks/useIndustries";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

interface IndustriesSubindustriesProps {
	onSelect: (v: { industry_id: number[]; subindustry_id: number[] }) => void;
	industry_values?: number[]; // Add this prop
	subindustry_values?: number[]; // Add this prop
}

const IndustriesSubindustries: React.FC<IndustriesSubindustriesProps> = ({
	onSelect,
	industry_values = [],
	subindustry_values = [],
}) => {
	const [industryId, setIndustryId] = useState<number[]>(industry_values);
	const [subIndustryId, setSubIndustryId] =
		useState<number[]>(subindustry_values);

	const { data: industries = [] } = useIndustries();
	const { data: subIndustries = [] } = useSubIndustries();

	// Update local state when props change
	useEffect(() => {
		setIndustryId(industry_values || []);
		setSubIndustryId(subindustry_values || []);
	}, [industry_values, subindustry_values]);

	// Filter sub-industries by selected industry IDs, but deduplicate "Other"
	const filteredSubIndustries = useMemo(() => {
		if (industryId.length === 0) return [];
		const seen = new Set<string>();
		return subIndustries.filter((sub: any) => {
			if (!industryId.includes(sub.industry)) return false;
			// Deduplicate "Other" by name (case-insensitive)
			if (sub.name.trim().toLowerCase() === "other") {
				if (seen.has("other")) return false;
				seen.add("other");
				return true;
			}
			return true;
		});
	}, [subIndustries, industryId]);

	const handleIndustryChange = (ids: number[]) => {
		setIndustryId(ids);
		setSubIndustryId([]); // Reset subindustries on industry change
		onSelect({ industry_id: ids, subindustry_id: [] });
	};

	const handleSubIndustryChange = (ids: number[]) => {
		setSubIndustryId(ids);
		onSelect({ industry_id: industryId, subindustry_id: ids });
	};

	return (
		<div className="flex gap-4 w-full">
			<div className="w-1/2">
				<MultiSelectDropdown
					items={industries}
					label="Industries"
					onChange={handleIndustryChange}
					selectedIds={industryId}
				/>
			</div>
			<div className="w-1/2">
				<MultiSelectDropdown
					items={filteredSubIndustries}
					label="Sub-industries"
					onChange={handleSubIndustryChange}
					selectedIds={subIndustryId}
				/>
			</div>
		</div>
	);
};

export default IndustriesSubindustries;
