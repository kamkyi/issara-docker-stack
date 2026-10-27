import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import { useEffect, useState } from "react";
import { type ClientType, useClientTypes } from "../../queries/clientTypes";
import "./ClientTypesDropdown.css";

interface ClientTypesDropdownProps {
	onSelect: (clientType: ClientType | null) => void;
	defaultValue?: number | null;
	placeholder?: string;
	className?: string;
	language?: string;
}

const ClientTypesDropdown: React.FC<ClientTypesDropdownProps> = ({
	onSelect,
	defaultValue = null,
	placeholder = "Select Client Type",
	className = "",
	language = "en",
}) => {
	const { data: clientTypes = [], isLoading, error } = useClientTypes(language);

	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "placeholder",
	);

	// Set initial value from props when client types are loaded (only if not already selected)
	useEffect(() => {
		if (
			defaultValue &&
			clientTypes.length > 0 &&
			selectedValue === "placeholder"
		) {
			const clientType = clientTypes.find((c) => c.id === defaultValue);
			if (clientType) {
				setSelectedValue(String(clientType.id));
				onSelect(clientType);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clientTypes, defaultValue]);

	const handleValueChange = (value: string) => {
		setSelectedValue(value);
		if (value === "placeholder") {
			onSelect(null);
		} else {
			try {
				const selectedId = parseInt(value, 10);
				const clientType = clientTypes.find((c) => c.id === selectedId) || null;
				onSelect(clientType);
			} catch (err) {
				console.error("Error selecting client type:", err);
			}
		}
	};

	if (error) {
		return <div className="text-red-500">Error loading client types</div>;
	}

	return (
		<div className="client-types-dropdown-container">
			<Select.Root
				defaultValue="placeholder"
				onValueChange={handleValueChange}
				value={selectedValue}
			>
				<Select.Trigger
					aria-label={placeholder}
					className={`client-types-trigger ${className}`}
				>
					<Select.Value placeholder={placeholder}>
						{selectedValue !== "placeholder"
							? clientTypes.find((c) => c.id === Number(selectedValue))?.name
							: placeholder}
					</Select.Value>
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>

				<Select.Portal>
					<Select.Content
						align="start"
						avoidCollisions={false}
						className="client-types-content"
						position="item-aligned"
						sideOffset={5}
					>
						<Select.ScrollUpButton className="client-types-scroll-button">
							<ChevronUpIcon />
						</Select.ScrollUpButton>

						<Select.Viewport className="p-1">
							{isLoading ? (
								<div className="flex items-center justify-center py-2">
									Loading...
								</div>
							) : (
								<>
									<Select.Item
										className="client-types-item"
										value="placeholder"
									>
										<Select.ItemText>-- {placeholder} --</Select.ItemText>
									</Select.Item>
									{clientTypes.map((clientType) => (
										<Select.Item
											className="client-types-item"
											key={clientType.id}
											value={String(clientType.id)}
										>
											<Select.ItemText>{clientType.name}</Select.ItemText>
										</Select.Item>
									))}
								</>
							)}
						</Select.Viewport>

						<Select.ScrollDownButton className="client-types-scroll-button">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
};

export default ClientTypesDropdown;
