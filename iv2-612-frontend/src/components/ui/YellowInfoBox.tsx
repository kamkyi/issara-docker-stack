import type React from "react";
import { useState } from "react";

interface YellowInfoBoxProps {
	summary: React.ReactNode;
	expanded: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const YellowInfoBox: React.FC<YellowInfoBoxProps> = ({
	summary,
	expanded,
	className = "",
	style,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className={`flex justify-center ${className}`} style={style}>
			<div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[36rem] z-50">
				<div className="rounded-b-xl bg-yellow-100 shadow-2xl text-gray-800 text-center p-2">
					{!isExpanded ? (
						<div>
							{summary}
							&nbsp;
							<a
								className="underline text-blue-500"
								href="#"
								onClick={(e) => {
									e.preventDefault();
									setIsExpanded(true);
								}}
							>
								See more
							</a>
						</div>
					) : (
						<div className="transition-all duration-300 ease-linear overflow-y-auto max-h-96">
							<div className="p-2">{expanded}</div>
							<a
								className="underline text-blue-500 block mb-2"
								href="#"
								onClick={(e) => {
									e.preventDefault();
									setIsExpanded(false);
								}}
							>
								See less
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default YellowInfoBox;
