interface Props {
	label: string;
	htmlFor?: string;
	required?: boolean;
	uppercase?: boolean;
}

/** Field label used by the CSO prototype (title case, without visibility icons). */
export default function ProfileFieldLabel({
	label,
	htmlFor,
	required = false,
	uppercase = false,
}: Props) {
	return (
		<label
			className={`mb-1 block text-sm font-semibold text-gray-900 ${uppercase ? "uppercase tracking-wide" : ""}`}
			htmlFor={htmlFor}
		>
			{label}
			{required && (
				<span aria-hidden="true" className="ml-1 text-[#FB8379]">
					*
				</span>
			)}
		</label>
	);
}
