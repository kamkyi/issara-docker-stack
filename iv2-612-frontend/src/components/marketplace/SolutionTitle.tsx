interface SolutionTitleParts {
	prefix: string | null;
	remainder: string;
}

export const splitSolutionTitle = (title: string): SolutionTitleParts => {
	const colonIndex = title.indexOf(":");

	if (colonIndex === -1) {
		return { prefix: null, remainder: title };
	}

	return {
		prefix: title.slice(0, colonIndex + 1).trim(),
		remainder: title.slice(colonIndex + 1).trim(),
	};
};

interface SolutionTitleProps {
	title: string;
}

export const SolutionTitle = ({ title }: SolutionTitleProps) => {
	const { prefix, remainder } = splitSolutionTitle(title);

	return (
		<span
			className="min-w-0 flex-1 basis-60 font-bold leading-snug whitespace-normal"
			title={title}
		>
			{prefix ? (
				<>
					<span className="block uppercase whitespace-nowrap overflow-hidden text-ellipsis text-[#148696]">
						{prefix}
					</span>
					{remainder && <span className="block line-clamp-1">{remainder}</span>}
				</>
			) : (
				<span className="line-clamp-2 [text-wrap:balance]">{remainder}</span>
			)}
		</span>
	);
};
