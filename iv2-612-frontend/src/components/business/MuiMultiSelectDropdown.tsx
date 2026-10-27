import { autocompleteClasses } from "@mui/material/Autocomplete";
import { styled } from "@mui/material/styles";
import useAutocomplete from "@mui/material/useAutocomplete";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";

interface Item {
	id: string | number;
	name: string;
}

interface MuiMultiSelectDropdownProps<T extends Item> {
	items: T[];
	selectedIds: (string | number)[];
	onChange: (selected: (string | number)[]) => void;
	placeholder?: string;
	label?: string;
	width?: string;
}

const Root = styled("div")({
	color: "rgba(0,0,0,0.85)",
	fontSize: "14px",
	position: "relative",
});

const LabelStyled = styled("label")({
	padding: "0 0 4px",
	lineHeight: "1.5",
	display: "block",
	fontSize: "14px",
	fontWeight: 500,
	color: "#666",
});

const InputWrapper = styled("div")({
	width: "100%",
	border: "1px solid #d9d9d9",
	backgroundColor: "#fff",
	borderRadius: "4px",
	padding: "1px",
	display: "flex",
	flexWrap: "wrap",
	cursor: "pointer",
	minHeight: "32px",
	"&:hover": {
		borderColor: "#40a9ff",
	},
	"&.focused": {
		borderColor: "#40a9ff",
		boxShadow: "0 0 0 2px rgb(24 144 255 / 0.2)",
	},
	"& input": {
		backgroundColor: "#fff",
		color: "rgba(0,0,0,.85)",
		height: "30px",
		boxSizing: "border-box",
		padding: "4px 6px",
		width: "0",
		minWidth: "30px",
		flexGrow: 1,
		border: 0,
		margin: 0,
		outline: 0,
		fontSize: "14px",
	},
});

interface ItemProps {
	label: string;
	onDelete?: (event: any) => void;
	"data-item-index"?: number;
	tabIndex?: number;
	[key: string]: any;
}

function ItemComponent(props: ItemProps) {
	const { label, onDelete, ...other } = props;
	return (
		<div {...other}>
			<span>{label}</span>
			<button
				aria-label="Remove item"
				onClick={(e) => {
					e.stopPropagation();
					onDelete?.(e);
				}}
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					padding: "4px",
					display: "flex",
					alignItems: "center",
				}}
				type="button"
			>
				<Cross2Icon className="w-3 h-3" />
			</button>
		</div>
	);
}

const StyledItem = styled(ItemComponent)<ItemProps>({
	display: "flex",
	alignItems: "center",
	height: "24px",
	margin: "2px",
	lineHeight: "22px",
	backgroundColor: "#fafafa",
	border: "1px solid #e8e8e8",
	borderRadius: "2px",
	boxSizing: "content-box",
	padding: "0 4px 0 10px",
	outline: 0,
	overflow: "hidden",
	"&:focus": {
		borderColor: "#40a9ff",
		backgroundColor: "#e6f7ff",
	},
	"& span": {
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
		fontSize: "12px",
	},
});

const Listbox = styled("ul")({
	margin: "2px 0 0",
	padding: 0,
	position: "absolute",
	listStyle: "none",
	backgroundColor: "#fff",
	overflow: "auto",
	maxHeight: "250px",
	borderRadius: "4px",
	boxShadow: "0 2px 8px rgb(0 0 0 / 0.15)",
	zIndex: 50,
	minWidth: "200px",
	"& li": {
		padding: "5px 12px",
		display: "flex",
		alignItems: "center",
		fontSize: "14px",
		"& span": {
			flexGrow: 1,
		},
		"& svg": {
			color: "transparent",
			marginLeft: "8px",
		},
	},
	"& li[aria-selected='true']": {
		backgroundColor: "#fafafa",
		fontWeight: 600,
		"& svg": {
			color: "#1890ff",
		},
	},
	[`& li.${autocompleteClasses.focused}`]: {
		backgroundColor: "#e6f7ff",
		cursor: "pointer",
		"& svg": {
			color: "currentColor",
		},
	},
});

export default function MuiMultiSelectDropdown<T extends Item>({
	items,
	selectedIds,
	onChange,
	placeholder = "Select items",
	label,
	width = "100%",
}: MuiMultiSelectDropdownProps<T>) {
	const selectedItems = items.filter((item) => selectedIds.includes(item.id));

	const {
		getRootProps,
		getInputLabelProps,
		getInputProps,
		getItemProps,
		getListboxProps,
		getOptionProps,
		groupedOptions,
		focused,
	} = useAutocomplete({
		multiple: true,
		options: items,
		value: selectedItems as T[],
		onChange: (_, newValue) => {
			onChange(newValue.map((item) => item.id));
		},
		getOptionLabel: (option) =>
			typeof option === "string" ? option : option.name,
		disableCloseOnSelect: true,
		isOptionEqualToValue: (option, val) => option.id === val.id,
	});

	return (
		<Root style={{ width }}>
			<div {...getRootProps()}>
				{label && <LabelStyled {...getInputLabelProps()}>{label}</LabelStyled>}
				<InputWrapper className={focused ? "focused" : ""}>
					{selectedItems.map((item, index) => {
						const { key, ...itemProps } = getItemProps({ index });
						return <StyledItem key={key} {...itemProps} label={item.name} />;
					})}
					{selectedItems.length === 0 && !focused && (
						<span
							style={{ color: "#999", padding: "4px 6px", fontSize: "14px" }}
						>
							{placeholder}
						</span>
					)}
					<input
						{...getInputProps()}
						placeholder={selectedItems.length === 0 ? "" : ""}
					/>
				</InputWrapper>
			</div>
			{groupedOptions.length > 0 && (
				<Listbox {...getListboxProps()}>
					{groupedOptions.map((option, index) => {
						const { key, ...optionProps } = getOptionProps({
							option,
							index,
						});
						return (
							<li key={key} {...optionProps}>
								<span>{option.name}</span>
								<CheckIcon className="w-4 h-4" />
							</li>
						);
					})}
				</Listbox>
			)}
		</Root>
	);
}
