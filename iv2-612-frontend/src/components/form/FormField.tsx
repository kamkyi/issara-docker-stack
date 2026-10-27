import { TextField } from "@radix-ui/themes";
import type React from "react";

interface FormFieldProps {
	id: string;
	label: string;
	placeholder?: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	type?: "text" | "email" | "tel" | "url" | "date" | "month" | "number";
	required?: boolean;
	className?: string;
	disabled?: boolean;
}

/**
 * Reusable form field component that combines label + input
 * Reduces repetitive code for form inputs throughout the account page
 */
export function FormField({
	id,
	label,
	placeholder,
	value,
	onChange,
	type = "text",
	required = false,
	className = "w-full",
	disabled = false,
}: FormFieldProps) {
	return (
		<div>
			<label className="block mb-1 text-sm font-medium" htmlFor={id}>
				{label}
				{required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<TextField.Root
				className={className}
				disabled={disabled}
				id={id}
				onChange={onChange}
				placeholder={placeholder}
				type={type}
				value={value}
			/>
		</div>
	);
}

interface FormFieldGroupProps {
	fields: FormFieldProps[];
	className?: string;
	grid?: boolean;
	columns?: number;
}

/**
 * Reusable component for grouping multiple form fields
 * Supports grid layout for organized field arrangement
 */
export function FormFieldGroup({
	fields,
	className = "flex flex-col gap-3",
	grid = false,
	columns = 2,
}: FormFieldGroupProps) {
	const containerClassName = grid
		? `grid gap-4 grid-cols-${columns}`
		: className;

	return (
		<div className={containerClassName}>
			{fields.map((field) => (
				<FormField key={field.id} {...field} />
			))}
		</div>
	);
}
