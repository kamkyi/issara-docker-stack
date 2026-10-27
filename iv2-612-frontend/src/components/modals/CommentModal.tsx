import { Cross2Icon, PaperPlaneIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import { useTheme } from "next-themes";
import type React from "react";
import { useState } from "react";
import Comment from "./Comment";
import type { CommentType } from "./types";

interface CommentModalProps {
	isOpen: boolean; // Controls whether the modal is open
	onClose: () => void; // Function to call when the modal should be closed
	comments: CommentType[] | [];
	totalComment?: number;
	onSubmit?: (comment: string) => Promise<void>;
}

export const CommentModal: React.FC<CommentModalProps> = ({
	isOpen,
	onClose,
	comments,
	totalComment,
	onSubmit,
}) => {
	const [newComment, setNewComment] = useState<string>("");
	const [isSending, setIsSending] = useState(false);

	const handleSend = async () => {
		if (!newComment.trim() || !onSubmit) return;
		setIsSending(true);
		try {
			await onSubmit(newComment.trim());
			setNewComment("");
		} finally {
			setIsSending(false);
		}
	};

	const { theme } = useTheme();
	const handleNewCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setNewComment(e.target.value);
	};

	return (
		<Dialog.Root onOpenChange={onClose} open={isOpen}>
			<Dialog.Content
				style={{
					maxWidth: 600,
					background: theme === "dark" ? "#004A60" : "rgba(239, 253, 255, 1)",
				}}
			>
				<Flex align="center" justify="between">
					<Dialog.Title mb="0">{totalComment} Comments</Dialog.Title>
					<Dialog.Close>
						<Button
							className="rounded-full"
							onClick={onClose}
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</Button>
					</Dialog.Close>
				</Flex>
				<hr className="opacity-[0.1] my-4" />
				<Flex direction="column" gap="3">
					{comments?.length > 0 ? (
						<CommentSection comments={comments} />
					) : (
						<p className="text-center">No comments yet</p>
					)}
				</Flex>
				<hr className="opacity-[0.1] my-4" />

				<div className="w-full flex flex-row gap-2">
					<input
						className="p-2 px-3 rounded-md w-full"
						name="comment"
						onChange={handleNewCommentChange}
						placeholder="Write a comment"
						required
						style={{
							background: theme === "dark" ? "#004A60" : "#ffffff",
							border: "1px solid #777777",
						}}
						type="text"
					/>
					<Button
						className="cursor-pointer"
						disabled={!newComment || isSending || !onSubmit}
						onClick={handleSend}
						size={"3"}
						style={{ background: "#148696" }}
					>
						<PaperPlaneIcon />
						{isSending ? "Sending..." : "Send"}
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
};

const CommentSection = ({ comments }) => {
	return comments.map((comment, index) => (
		<div key={index}>
			<Comment comment={comment} />
			<div className="mt-2 relative">
				{comment.child_comments.length > 0
					? comment.child_comments.map((childComment, index) => (
							<div className="ms-8 mt-2" key={index}>
								<div
									className="absolute"
									style={{
										borderLeft: "1px solid #777777",
										borderBottom: "1px solid #777777",
										borderRadius: "0px 0px 0px 10px",
										left: 0,
										height: "20%",
										width: "120px",
										zIndex: "-1",
										opacity: 0.4,
									}}
								/>
								<Comment comment={childComment} key={index} />
							</div>
						))
					: null}
			</div>
		</div>
	));
};
