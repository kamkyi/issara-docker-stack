import { MenuItem, Select } from "@mui/material";
import type { SelectorProps } from "$src/types/components";

// GuestNavbar palette (GuestNabar.tsx:375-379, 445-449).
const NAV_IDLE_TEXT = "#00516A";
const NAV_ACTIVE_TEXT = "#004A60";

const Selector = (
	props: SelectorProps & {
		id: string;
		allLabel?: string;
		/**
		 * "nav" adopts the GuestNavbar dropdown colours (borderless pill, cream
		 * hover, #A6DFDD when open/selected). Defaults to the original bordered
		 * teal treatment so existing call sites are unaffected.
		 */
		variant?: "default" | "nav";
	},
) => {
	const {
		id,
		options,
		allLabel,
		onChange,
		value,
		placeholder,
		fullWidth,
		variant = "default",
	} = props;
	const isNav = variant === "nav";

	return (
		<Select
			className={`${isNav ? "" : "border-1 border-[#148696]"} h-[37px] ${fullWidth ? " w-full" : ""}`}
			displayEmpty
			id={id}
			MenuProps={{
				PaperProps: {
					sx: isNav
						? {
								borderRadius: "12px",
								border: "1px solid #148696",
								boxShadow:
									"0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
								backgroundColor: "#ffffff",
								maxHeight: 280,
								padding: "6px",
								minWidth: "200px",
								"& .MuiMenuItem-root": {
									fontSize: "14px",
									fontWeight: 500,
									padding: "8px 14px",
									borderRadius: "8px",
									color: "#333333",
									transition: "all 0.15s ease",
									"&:hover": {
										backgroundColor: "#FBF6EC",
										color: "#004A60",
										fontWeight: 600,
									},
									"&.Mui-selected": {
										backgroundColor: "#148696",
										color: "#ffffff",
										fontWeight: 600,
										"&:hover": {
											backgroundColor: "#00516A",
											color: "#ffffff",
										},
									},
								},
							}
						: {
								border: "2px solid #148696",
								borderRadius: "5px",
								boxShadow:
									"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
								maxHeight: 240,
								padding: "4px",
								minWidth: "200px",
								"& .MuiMenuItem-root": {
									fontSize: "14px",
									fontWeight: 500,
									padding: "8px 12px",
									margin: "0 0 0 0",
									borderRadius: "4px",
									transition: "background-color 0.2s ease",
									"&:hover": {
										backgroundColor: "#f9fafb",
									},
									"&.Mui-selected": {
										backgroundColor: "#148696",
										color: "white",
										"&:hover": {
											backgroundColor: "#0f6b7a",
										},
									},
								},
							},
				},
			}}
			onChange={(e) => onChange(e.target.value)}
			size="small"
			style={{ borderRadius: isNav ? 12 : 5, fontSize: 14 }}
			sx={{
				backgroundColor: "#ffffff",
				borderRadius: isNav ? "12px" : "5px",
				"& .MuiSelect-icon": {
					color: isNav ? NAV_IDLE_TEXT : "#148696",
				},
				"& .MuiOutlinedInput-notchedOutline": {
					border: isNav ? "1px solid #148696" : "none",
				},
				"&:hover .MuiOutlinedInput-notchedOutline": {
					border: "1px solid #148696",
				},
				"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
					border: "2px solid #148696",
				},
				"& .MuiSelect-select": {
					padding: "6px 12px",
					fontSize: "14px",
					fontWeight: 500,
					backgroundColor: "#ffffff",
					...(isNav
						? {
								borderRadius: "12px",
								color: NAV_IDLE_TEXT,
								transition: "all 0.2s ease",
								"&:hover": {
									backgroundColor: "#FBF6EC",
									color: NAV_ACTIVE_TEXT,
									fontWeight: 600,
								},
								'&[aria-expanded="true"]': {
									backgroundColor: "#ffffff",
									color: NAV_ACTIVE_TEXT,
									fontWeight: 600,
								},
							}
						: {}),
				},
			}}
			value={value || ""}
		>
			{(!value || value === "") && (
				<MenuItem
					disabled
					sx={{
						opacity: "1 !important",
						color: "#8A979C !important",
						fontWeight: "500 !important",
						backgroundColor: "transparent !important",
						pointerEvents: "none",
					}}
					value=""
				>
					{placeholder || allLabel || "Select an option"}
				</MenuItem>
			)}
			{options.map((option, i) => (
				<MenuItem key={i} value={option.value}>
					{option.label}
				</MenuItem>
			))}
		</Select>
	);
};

export default Selector;
