import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTheme } from "next-themes";
import type React from "react";
import type { OptionType } from "../directory/types";

interface DataTableFilterBarProps {
	countryOptions: OptionType[];
	industryOptions?: OptionType[];
	epsOptions: OptionType[];
	workerVoiceOptions: OptionType[];
	eppPolicyOptions: OptionType[];
	handleSelectCountry: (country: string) => void;
	handleSelectIndustry: (industry: string) => void;
	handleSelectEps: (eps: string) => void;
	handleSelectWorkerVoice: (workerVoice: string) => void;
	handleSelectEppPolicy: (eppPolicy: string) => void;
}

interface FilterProps {
	label: string;
	options: OptionType[];
	onChange: (value: string) => void;
	allLabel: string;
	labelStyle: string;
	useValueAsLabel?: boolean;
	inputLabelClassName?: string;
	selectClassName?: string;
}

const FilterDropdown: React.FC<FilterProps> = ({
	label,
	options,
	onChange,
	allLabel,
	labelStyle,
	useValueAsLabel = false,
	inputLabelClassName,
	selectClassName,
}) => {
	const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-select-label`;
	const { theme } = useTheme();
	return (
		<FormControl
			className="rounded-xs"
			fullWidth
			size="small"
			variant="standard"
		>
			<InputLabel
				className={inputLabelClassName}
				id={labelId}
				style={{ color: labelStyle }}
			>
				{label}
			</InputLabel>
			<Select
				className={selectClassName}
				defaultValue="All"
				labelId={labelId}
				onChange={(e) => onChange(e.target.value as string)}
				style={{ color: labelStyle }}
				sx={{
					"& .MuiSelect-iconStandard": {
						color: theme === "dark" ? "#d4d4d4" : "#3d3d3d",
					},
				}}
			>
				<MenuItem value={"All"}>
					<em>{allLabel}</em>
				</MenuItem>
				{options.map((v, i) => (
					<MenuItem key={i} value={v.value}>
						{useValueAsLabel ? v.value : v.label}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);
};

const DataTableFilterBar = (props: DataTableFilterBarProps) => {
	const {
		countryOptions,
		industryOptions,
		epsOptions,
		workerVoiceOptions,
		eppPolicyOptions,
		handleSelectCountry,
		handleSelectIndustry,
		handleSelectEps,
		handleSelectWorkerVoice,
		handleSelectEppPolicy,
	} = props;
	const { theme } = useTheme();
	const labelStyle = theme === "dark" ? "#d4d4d4" : "#3d3d3d";

	const filters = industryOptions
		? [
				{
					label: "Country",
					options: countryOptions,
					onChange: handleSelectCountry,
					allLabel: "All Countries",
					useValueAsLabel: true,
					inputLabelClassName: "ms-2",
					selectClassName: "ps-2",
				},
				{
					label: "Industry",
					options: industryOptions,
					onChange: handleSelectIndustry,
					allLabel: "All Industries",
					useValueAsLabel: true,
					inputLabelClassName: "ms-2",
					selectClassName: "ps-2",
				},
				{
					label: "CI",
					options: epsOptions,
					onChange: handleSelectEps,
					allLabel: "All",
				},
				{
					label: "Worker Voice",
					options: workerVoiceOptions,
					onChange: handleSelectWorkerVoice,
					allLabel: "All",
				},
				{
					label: "EEP Policy",
					options: eppPolicyOptions,
					onChange: handleSelectEppPolicy,
					allLabel: "All",
				},
			]
		: [
				{
					label: "Country",
					options: countryOptions,
					onChange: handleSelectCountry,
					allLabel: "All Countries",
					useValueAsLabel: true,
					inputLabelClassName: "ms-2",
					selectClassName: "ps-2",
				},
				{
					label: "CI",
					options: epsOptions,
					onChange: handleSelectEps,
					allLabel: "All",
				},
				{
					label: "Worker Voice",
					options: workerVoiceOptions,
					onChange: handleSelectWorkerVoice,
					allLabel: "All",
				},
				{
					label: "EEP Policy",
					options: eppPolicyOptions,
					onChange: handleSelectEppPolicy,
					allLabel: "All",
				},
			];

	return (
		<Box className="flex flex-row gap-2 mb-2">
			{filters.map((filter) => (
				<FilterDropdown
					allLabel={filter.allLabel}
					inputLabelClassName={filter.inputLabelClassName}
					key={filter.label}
					label={filter.label}
					labelStyle={labelStyle}
					onChange={filter.onChange}
					options={filter.options}
					selectClassName={filter.selectClassName}
					useValueAsLabel={filter.useValueAsLabel}
				/>
			))}
		</Box>
	);
};

export default DataTableFilterBar;
