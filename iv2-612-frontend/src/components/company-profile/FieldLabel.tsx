import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";

export const FieldLabel = ({
	label,
	isPublic = false,
}: {
	label: string;
	isPublic?: boolean;
}) => (
	<div className="flex items-center gap-1 mb-1">
		<span className="text-sm font-bold uppercase tracking-wide">{label}</span>
		{isPublic ? (
			<EyeOpenIcon className="w-3 h-3 opacity-60" />
		) : (
			<EyeClosedIcon className="text-gray-400 w-3 h-3 opacity-60" />
		)}
	</div>
);
