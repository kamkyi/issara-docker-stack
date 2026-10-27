import type React from "react";

export interface TagChipsProps {
	items: string[];
	editing: boolean;
	onRemove: (item: string) => void;
}

export const TagChips: React.FC<TagChipsProps> = ({
	items,
	editing,
	onRemove,
}) => (
	<div className="flex flex-wrap gap-2 mt-1">
		{items?.map((tag) => (
			<span
				className="flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 text-sm text-gray-700 bg-gray-50"
				key={tag}
			>
				{tag}
				{editing && (
					<button
						aria-label={`Remove ${tag}`}
						className="text-gray-400 hover:text-red-500 transition-colors"
						onClick={() => onRemove(tag)}
						type="button"
					>
						{/* ...Cross2Icon... */}
					</button>
				)}
			</span>
		))}
	</div>
);
