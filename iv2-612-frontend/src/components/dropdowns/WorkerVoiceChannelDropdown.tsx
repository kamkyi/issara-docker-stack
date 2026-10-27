import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import * as Select from "@radix-ui/react-select";
import type React from "react";
import { useEffect, useState } from "react";

interface OptionType {
	id: number;
	name: string;
}

interface WorkerVoiceChannelDropdownProps {
	onSelect: (channel: OptionType | null) => void;
	defaultValue?: number;
	placeholder?: string;
	className?: string;
	options?: OptionType[];
	offlineOnly?: boolean;
}

const WorkerVoiceChannelDropdown: React.FC<WorkerVoiceChannelDropdownProps> = ({
	onSelect,
	defaultValue,
	placeholder = "Select worker voice channel",
	className = "",
	options = [],
	offlineOnly = false,
}) => {
	// Use offline options only
	const [channelOptions, setChannelOptions] = useState<OptionType[]>(options);

	useEffect(() => {
		if (offlineOnly) {
			setChannelOptions(options);
		}
		// If you want to support online fetch, add logic here
	}, [options, offlineOnly]);

	const [selectedValue, setSelectedValue] = useState<string>(
		defaultValue ? String(defaultValue) : "",
	);

	useEffect(() => {
		setSelectedValue(defaultValue ? String(defaultValue) : "");
	}, [defaultValue]);

	const handleValueChange = (value: string) => {
		setSelectedValue(value);
		const selected = channelOptions.find((c) => String(c.id) === value) || null;
		onSelect(selected);
	};

	return (
		<div className="worker-voice-channel-dropdown-container">
			<Select.Root onValueChange={handleValueChange} value={selectedValue}>
				<Select.Trigger
					aria-label={placeholder}
					className={`worker-voice-channel-trigger ${className}`}
				>
					<Select.Value placeholder={placeholder}>
						{selectedValue
							? channelOptions.find((c) => String(c.id) === selectedValue)?.name
							: placeholder}
					</Select.Value>
					<Select.Icon>
						<ChevronDownIcon />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Content
						className="worker-voice-channel-content"
						sideOffset={4}
					>
						<Select.ScrollUpButton className="worker-voice-channel-scroll-button">
							<ChevronUpIcon />
						</Select.ScrollUpButton>
						<Select.Viewport className="p-1">
							{channelOptions.map((option) => (
								<Select.Item
									className="worker-voice-channel-item"
									key={option.id}
									value={String(option.id)}
								>
									<Select.ItemText>{option.name}</Select.ItemText>
								</Select.Item>
							))}
						</Select.Viewport>
						<Select.ScrollDownButton className="worker-voice-channel-scroll-button">
							<ChevronDownIcon />
						</Select.ScrollDownButton>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
};

export default WorkerVoiceChannelDropdown;
