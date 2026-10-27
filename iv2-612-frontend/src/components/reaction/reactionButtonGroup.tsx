import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import SentimentDissatisfiedRoundedIcon from "@mui/icons-material/SentimentDissatisfiedRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";

// NOTE: The 'message' prop type is inferred from its usage in 'message-board.tsx'.
// The reaction types 'love' and 'sad' are assumed based on the icons used.
interface ReactionButtonGroupProps {
	message: {
		id: number;
		comments_count: number;
		reaction_counts: {
			comment_reaction_count: {
				like: number;
				love: number;
				sad: number;
			};
		};
	};
	handleOpenComment: (id: number) => void;
	noComment?: boolean;
}

const ReactionButtonGroup = ({
	message,
	handleOpenComment,
	noComment,
}: ReactionButtonGroupProps) => {
	const reactIconClass =
		"hover:scale-110 transition-transform duration-300 ease-in-out cursor-pointer opacity-[0.5]";
	const { love, like, sad } = message.reaction_counts.comment_reaction_count;
	const iconSize = noComment ? "small" : "medium";
	return (
		<div className={"flex flex-row gap-2 items-center text-sm py-2"}>
			<div className={reactIconClass} id={`love-reaction-${message.id}`}>
				<FavoriteBorderRoundedIcon fontSize={iconSize} />
			</div>
			<label htmlFor={`love-reaction-${message.id}`}>{love}</label>

			<div className={reactIconClass} id={`like-reaction-${message.id}`}>
				<ThumbUpOutlinedIcon fontSize={iconSize} />
			</div>
			<label htmlFor={`like-reaction-${message.id}`}>{like}</label>

			{!noComment && (
				<>
					<div
						className={reactIconClass}
						id={`comment-reaction-${message.id}`}
						onClick={() => handleOpenComment(message.id)}
					>
						<ChatBubbleOutlineOutlinedIcon />
					</div>
					<label htmlFor={`comment-reaction-${message.id}`}>
						{message.comments_count}
					</label>
				</>
			)}

			<div className={reactIconClass} id={`sad-reaction-${message.id}`}>
				<SentimentDissatisfiedRoundedIcon fontSize={iconSize} />
			</div>
			<label htmlFor={`sad-reaction-${message.id}`}>{sad}</label>
		</div>
	);
};

export default ReactionButtonGroup;
