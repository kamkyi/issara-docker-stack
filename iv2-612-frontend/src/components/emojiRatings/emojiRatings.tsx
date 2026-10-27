import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import type React from "react";
import { memo } from "react";

interface EmojiRatingProps {
	score?: number | null;
	color?: string;
	emptyColor?: string;
	gapClassName?: string;
	size?: number;
}

const EmojiRating: React.FC<EmojiRatingProps> = ({
	score,
	color = "#148696",
	emptyColor = color,
	gapClassName = "gap-1",
	size = 15,
}) => {
	const emojis = [
		{ id: 1, ratingLabel: "Poor" },
		{ id: 2, ratingLabel: "Bad" },
		{ id: 3, ratingLabel: "Normal" },
		{ id: 4, ratingLabel: "Good" },
		{ id: 5, ratingLabel: "Excellent" },
	];

	return (
		<div className={`flex ${gapClassName}`}>
			{emojis.map((emoji, index) =>
				!score || (score && score < emoji.id) ? (
					<StarIcon color={emptyColor} height={size} key={index} width={size} />
				) : (
					<StarFilledIcon
						color={color}
						height={size}
						key={index}
						width={size}
					/>
				),
			)}
		</div>
	);
};

export default memo(EmojiRating);
