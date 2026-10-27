import { Cross2Icon } from "@radix-ui/react-icons";
import { Badge, Button, Checkbox, Flex, Select, Text } from "@radix-ui/themes";
import { useId } from "react";
import type { Filters } from "./types";

interface CompanyFiltersProps {
	filters: Filters;
	onFilterChange: (name: keyof Filters, value: any) => void;
	onResetFilters: () => void;
	operationalCountriesOptions: string[]; // Example: ['Thailand', 'USA', 'Japan']
	sendingCountriesOptions: string[]; // Example: ['Thailand', 'Singapore', 'Malaysia']
}

const CompanyFilters: React.FC<CompanyFiltersProps> = ({
	filters,
	onFilterChange,
	onResetFilters,
	operationalCountriesOptions,
	sendingCountriesOptions,
}) => {
	const eppPolicyFilterId = useId();

	// Count active filters to show badge on reset button
	const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
		if (key === "status" && value !== "All") return true;
		if (key === "managedBy" && value !== "All") return true;
		if (key === "search" && value) return true;
		if (key === "eppPolicy" && value !== null) return true;
		if (key === "operationalCountry" && value) return true;
		if (key === "sendingCountry" && value) return true;
		if (key === "sortByScore" && value && value !== "high-to-low") return true;
		return false;
	}).length;

	// Helper function to convert filter values for display and comparison
	// const getFilterValue = (value: string | null | undefined) => {
	//   return value === 'all' || !value ? '' : value
	// }

	// Helper function to convert empty values to 'all' for Select.Item
	const getSelectValue = (value: string | null | undefined) => {
		return !value ? "all" : value;
	};

	return (
		<Flex direction="column" gap="3">
			<Flex align="center" gap="3" wrap="wrap">
				<Select.Root
					onValueChange={(value) =>
						onFilterChange("operationalCountry", value === "all" ? "" : value)
					}
					value={getSelectValue(filters.operationalCountry)}
				>
					<Select.Trigger placeholder="Operational Country" />
					<Select.Content>
						<Select.Group>
							<Select.Label>Filter by Operational Country</Select.Label>
							<Select.Item value="all">All Countries</Select.Item>
							{operationalCountriesOptions.map((country) => (
								<Select.Item key={country} value={country}>
									{country}
								</Select.Item>
							))}
						</Select.Group>
					</Select.Content>
				</Select.Root>

				<Select.Root
					onValueChange={(value) =>
						onFilterChange("sendingCountry", value === "all" ? "" : value)
					}
					value={getSelectValue(filters.sendingCountry)}
				>
					<Select.Trigger placeholder="Sending Country" />
					<Select.Content>
						<Select.Group>
							<Select.Label>Filter by Sending Country</Select.Label>
							<Select.Item value="all">All Countries</Select.Item>
							{sendingCountriesOptions.map((country) => (
								<Select.Item key={country} value={country}>
									{country}
								</Select.Item>
							))}
						</Select.Group>
					</Select.Content>
				</Select.Root>

				<Flex align="center" gap="1">
					<Checkbox
						checked={filters.eppPolicy === true}
						id={eppPolicyFilterId}
						onCheckedChange={(checked) =>
							onFilterChange("eppPolicy", checked === true ? true : null)
						}
					></Checkbox>
					<label htmlFor={eppPolicyFilterId}>Show EPP Policy Only</label>
				</Flex>

				<Select.Root
					defaultValue="high-to-low"
					onValueChange={(value) => onFilterChange("sortByScore", value)}
					value={filters.sortByScore ?? ""}
				>
					<Select.Trigger placeholder="Sort by Score" />
					<Select.Content>
						<Select.Group>
							<Select.Label>Sort by Score</Select.Label>
							<Select.Item value="high-to-low">High to Low</Select.Item>
							<Select.Item value="low-to-high">Low to High</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>

				<Button
					color={activeFilterCount > 0 ? "red" : "gray"}
					onClick={onResetFilters}
					variant={activeFilterCount > 0 ? "soft" : "surface"}
				>
					Reset Filters
					{activeFilterCount > 0 && (
						<Badge color="red" ml="1" radius="full" size="1" variant="solid">
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</Flex>

			{/* Display active filters */}
			{activeFilterCount > 0 && (
				<Flex gap="2" mt="2" wrap="wrap">
					<Text color="gray" size="1">
						Active filters:
					</Text>
					{filters.operationalCountry && (
						<Badge color="blue" variant="soft">
							Operational: {filters.operationalCountry}
							<Cross2Icon
								onClick={() => onFilterChange("operationalCountry", "")}
								style={{ marginLeft: "4px", cursor: "pointer" }}
							/>
						</Badge>
					)}
					{filters.sendingCountry && (
						<Badge color="blue" variant="soft">
							Sending: {filters.sendingCountry}
							<Cross2Icon
								onClick={() => onFilterChange("sendingCountry", "")}
								style={{ marginLeft: "4px", cursor: "pointer" }}
							/>
						</Badge>
					)}
					{filters.eppPolicy === true && (
						<Badge color="blue" variant="soft">
							EPP Policy Only
							<Cross2Icon
								onClick={() => onFilterChange("eppPolicy", null)}
								style={{ marginLeft: "4px", cursor: "pointer" }}
							/>
						</Badge>
					)}
					{filters.sortByScore === "low-to-high" && (
						<Badge color="blue" variant="soft">
							Sorted: Low to High
							<Cross2Icon
								onClick={() => onFilterChange("sortByScore", "high-to-low")}
								style={{ marginLeft: "4px", cursor: "pointer" }}
							/>
						</Badge>
					)}
				</Flex>
			)}
		</Flex>
	);
};

export default CompanyFilters;
