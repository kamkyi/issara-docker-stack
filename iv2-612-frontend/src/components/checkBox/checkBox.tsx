import { Checkbox, FormControlLabel } from "@mui/material";
import type { CasCheckboxProps } from "$src/types/components";

const CasCheckbox = (props: CasCheckboxProps) => {
	const { checked, handleChange, label } = props;
	return (
		<FormControlLabel
			control={
				<Checkbox
					checked={checked}
					onChange={handleChange}
					size="medium"
					sx={{
						"&.MuiCheckbox-colorPrimary": {
							color: "#1AAEC3",
						},
					}}
				/>
			}
			label={label}
			sx={{
				"& .MuiFormControlLabel-label": {
					fontSize: "1rem",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					maxWidth: "100%",
				},
				height: "2rem",
				maxWidth: "100%",
				overflow: "hidden",
			}}
			title={typeof label === "string" ? label : undefined}
		/>
	);
};

export default CasCheckbox;
