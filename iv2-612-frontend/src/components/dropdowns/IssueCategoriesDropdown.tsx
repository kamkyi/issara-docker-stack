import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { Flex } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import type {
	IssueCategoriesDropdownProps,
	IssueCategory,
} from "$src/types/dropdowns";
import "./IssueCategoriesDropdown.css";

export type { IssueCategory };

const fetchIssueCategories = async (lang: string): Promise<IssueCategory[]> => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION || "3.0";
	const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

	const token = localStorage.getItem("auth_token");
	if (!token) {
		throw new Error("Authentication token not found");
	}

	const response = await axios.get(
		`${baseUrl}/api/v2/issuecategories/?lang=${lang}&client_version=${clientVersion}`,
		{
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		},
	);
	return response.data;
};

const IssueCategoriesDropdown: React.FC<IssueCategoriesDropdownProps> = ({
	onSelect,
	defaultValue,
	placeholder = "Select Issue Category",
	className = "",
	disabled = false,
}) => {
	const [selectedValue, setSelectedValue] = useState<string | undefined>(
		defaultValue?.toString(),
	);
	const lang = useActiveLanguage();

	const {
		data: issueCategories = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["issueCategories", lang],
		queryFn: () => fetchIssueCategories(lang),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	// Ensure issueCategories is always an array to prevent map errors
	const issueCategoriesArray = Array.isArray(issueCategories)
		? issueCategories
		: [];

	useEffect(() => {
		if (defaultValue) {
			setSelectedValue(defaultValue.toString());
		}
	}, [defaultValue]);

	const handleValueChange = (value: string) => {
		setSelectedValue(value);

		if (!value) {
			onSelect(null);
			return;
		}

		const selectedCategory = issueCategoriesArray.find(
			(category) => category.id.toString() === value,
		);

		if (selectedCategory) {
			onSelect(selectedCategory);
		}
	};

	if (error) {
		console.error("Error loading issue categories:", error);
	}

	return (
		<Flex className={`issue-categories-dropdown-container ${className}`}>
			<Select.Root
				disabled={disabled || isLoading || issueCategoriesArray.length === 0}
				onValueChange={handleValueChange}
				value={selectedValue}
			>
				<Select.Trigger
					aria-label="Issue Category"
					className="issue-categories-trigger"
				>
					<Select.Value placeholder={placeholder} />
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>

				<Select.Portal>
					<Select.Content
						className="issue-categories-content"
						position="popper"
						sideOffset={5}
					>
						<Select.ScrollUpButton className="issue-categories-scroll-button">
							<ChevronUpIcon />
						</Select.ScrollUpButton>

						<Select.Viewport>
							{isLoading ? (
								<Select.Item
									className="issue-categories-item"
									disabled
									value="loading"
								>
									Loading...
								</Select.Item>
							) : (
								issueCategoriesArray.map((category) => (
									<Select.Item
										className="issue-categories-item"
										key={category.id}
										value={category.id.toString()}
									>
										<Select.ItemText>{category.name}</Select.ItemText>
									</Select.Item>
								))
							)}

							{!isLoading && issueCategoriesArray.length === 0 && (
								<Select.Item
									className="issue-categories-item"
									disabled
									value="none"
								>
									No issue categories found
								</Select.Item>
							)}
						</Select.Viewport>

						<Select.ScrollDownButton className="issue-categories-scroll-button">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</Flex>
	);
};

export default IssueCategoriesDropdown;
