import { useEffect, useState } from "react";

import { useIndustries, useSubIndustries } from "../../hooks/useIndustries";

interface Props {
	multiple?: boolean;
	industry_values?: number[] | null;
	subindustry_values?: number[] | null;
	onSelect?: (selection: {
		industry_id: number[] | null;
		subindustry_id: number[] | null;
	}) => void;
}

export const IndustriesSubIndustriesDropdown = ({
	industry_values = [],
	subindustry_values = [],
	onSelect = () => {},
}: Props) => {
	const [industryId, setIndustryId] = useState<number[]>(industry_values || []);
	const [subIndustryId, setSubIndustryId] = useState<number[]>(
		subindustry_values || [],
	);

	const { data: industries = [] } = useIndustries();
	const { data: subIndustries = [] } = useSubIndustries();

	useEffect(() => {
		setIndustryId(industry_values || []);
		setSubIndustryId(subindustry_values || []);
	}, [industry_values, subindustry_values]);

	// Handle multi-select for industries
	const handleIndustryChange = (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const selected = Array.from(event.target.selectedOptions).map((o) =>
			Number(o.value),
		);
		setIndustryId(selected);
		setSubIndustryId([]); // Reset subindustries when industries change
		onSelect({ industry_id: selected, subindustry_id: [] });
	};

	// Handle multi-select for subindustries
	const handleSubIndustryChange = (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const selected = Array.from(event.target.selectedOptions).map((o) =>
			Number(o.value),
		);
		setSubIndustryId(selected);
		onSelect({
			industry_id: industryId,
			subindustry_id: selected,
		});
	};

	// Filter subindustries based on selected industries
	const filteredSubIndustries = subIndustries.filter((sub) => {
		if (!industryId || industryId.length === 0) return false;
		return industryId.includes(sub.industry_id);
	});

	return (
		<div className="flex gap-4 w-full">
			<div className="w-1/2">
				<label
					className="text-sm mb-1 block text-gray-600"
					htmlFor="industry-select"
				>
					Industry
				</label>
				<select
					className="w-full border border-gray-300 rounded px-3 py-2 min-h-[40px]"
					id={"industry-select"}
					multiple
					onChange={handleIndustryChange}
					value={industryId.map(String)}
				>
					<option disabled value="">
						Select industry
					</option>
					{industries.map((industry) => (
						<option key={industry.id} value={industry.id}>
							{industry.name}
						</option>
					))}
				</select>
			</div>

			<div className="w-1/2">
				<label
					className="text-sm mb-1 block text-gray-600"
					htmlFor={"subindustry-select"}
				>
					Sub-industry
				</label>
				<select
					className="w-full border border-gray-300 rounded px-3 py-2 min-h-[40px]"
					disabled={!industryId || industryId.length === 0}
					id={"subindustry-select"}
					multiple
					onChange={handleSubIndustryChange}
					value={subIndustryId.map(String)}
				>
					<option disabled value="">
						Select sub-industry
					</option>
					{filteredSubIndustries.map((sub) => (
						<option key={sub.id} value={sub.id}>
							{sub.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
