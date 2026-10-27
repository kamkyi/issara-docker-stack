import { Checkbox } from "@radix-ui/themes";
import { FormField } from "./FormField";

interface CertificationCheckboxProps {
	id: string;
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	dateFieldLabel?: string;
	dateValue?: string;
	onDateChange?: (value: string) => void;
	dateFieldId?: string;
	type?: "month" | "date";
	description?: string;
}

/**
 * Reusable certification checkbox component
 * Combines checkbox with conditional date field
 * Used for "Employer Pays Policy", "On the Level", "RBA", etc.
 */
export function CertificationCheckbox({
	id,
	label,
	checked,
	onCheckedChange,
	dateFieldLabel,
	dateValue,
	onDateChange,
	dateFieldId,
	type = "month",
	description,
}: CertificationCheckboxProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<Checkbox
					checked={checked}
					id={id}
					onCheckedChange={(val) => onCheckedChange(val === true)}
				/>
				<label className="text-sm font-medium cursor-pointer" htmlFor={id}>
					{label}
				</label>
			</div>
			{description && (
				<p className="text-sm text-gray-600 ml-6">{description}</p>
			)}
			{checked && dateFieldLabel && onDateChange && dateFieldId && (
				<div className="ml-6">
					<FormField
						id={dateFieldId}
						label={dateFieldLabel}
						onChange={(e) => onDateChange(e.target.value)}
						type={type}
						value={dateValue || ""}
					/>
				</div>
			)}
		</div>
	);
}

interface CertificationSectionProps {
	title: string;
	certifications: CertificationCheckboxProps[];
	className?: string;
}

/**
 * Reusable component for grouping multiple certifications
 * Useful for ethical recruitment and compliance sections
 */
export function CertificationSection({
	title,
	certifications,
	className = "p-5 rounded-md border border-teal-200",
}: CertificationSectionProps) {
	return (
		<div className={className}>
			<h3 className="font-medium mb-4">{title}</h3>
			<div className="space-y-5">
				{certifications.map((cert) => (
					<CertificationCheckbox key={cert.id} {...cert} />
				))}
			</div>
		</div>
	);
}
