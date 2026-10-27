import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ReplyIcon from "@mui/icons-material/Reply";
import moment from "moment";
import { useTheme } from "next-themes";
import ReactionButtonGroup from "../reaction/reactionButtonGroup";
import type { CommentType } from "./types";

const reactionData = {
	id: 1,
	comments_count: 2,
	reaction_counts: {
		comment_reaction_count: {
			total: 2,
			like: 1,
			love: 1,
			sad: 0,
		},
	},
};

const Comment = ({ comment }: { comment: CommentType }) => {
	const { theme } = useTheme();
	return (
		<div
			className="p-4 rounded-md shadow-sm"
			style={{
				background: theme === "dark" ? "#002a37" : "#ffffff",
			}}
		>
			<div className="flex justify-between text-xs">
				<b>
					<AccountCircleIcon
						style={{
							marginRight: 5,
						}}
					/>
					<span className="opacity-[0.6]">
						{comment.user.username as string}
					</span>
				</b>
				<b className="text-[#148696] cursor-pointer flex items-center gap-2">
					<ReplyIcon fontSize="small" />
					Reply
				</b>
			</div>
			<hr className="opacity-[0.1] mt-2" />
			<p className="text-md p-2 rounded-xs">{comment.body}</p>
			<p className="flex items-center justify-between text-xs">
				<ReactionButtonGroup
					handleOpenComment={() => {}}
					message={reactionData}
					noComment
				/>
				<span className="text-xs block opacity-[0.6]">
					{moment(comment.date).fromNow()}
				</span>
			</p>
		</div>
	);
};

export default Comment;
