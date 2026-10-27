import { Box, Text } from "@radix-ui/themes";
import type React from "react";
import type { InputFieldProps } from "$src/types/components";

export const InputField: React.FC<InputFieldProps> = ({
	label,
	error,
	className,
	...props
}) => {
	return (
		<Box className="space-y-2">
			{label && (
				<Text
					as="label"
					size="3"
					style={{ color: "var(--color-ink)" }}
					weight="medium"
				>
					{label}
				</Text>
			)}
			<input
				className={`w-full rounded-md px-3 h-[44px] py-2 text-base border placeholder:text-base placeholder:text-[var(--color-caption)] focus:outline-none focus:ring-2 ${
					error
						? "border-[#fb8379] focus:ring-[#fb8379]"
						: "border-[var(--color-border)] focus:ring-[var(--color-secondary)]"
				} ${className || ""}`}
				{...props}
			/>
			{error && (
				<Text as="p" size="2" style={{ color: "#fb8379" }}>
					{error}
				</Text>
			)}
		</Box>
	);
};
