import { Cross2Icon } from "@radix-ui/react-icons";
import { Box, Button, Dialog, Flex, Text } from "@radix-ui/themes";
import moment from "moment";
import { useTheme } from "next-themes";
import type React from "react";
import ReactionButtonGroup from "$src/components/reaction/reactionButtonGroup";

// Define the message structure for the detail modal
interface Message {
	id: number;
	article: string;
	posted: string;
	file?: string;
	avatar?: string;
	username: string;
	comments_count: number;
	reaction_counts: {
		comment_reaction_count: {
			like: number;
			love: number;
			sad: number;
		};
	};
	comments: any[];
	description: string;
}

interface AnnouncementDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	message: Message | null;
	onOpenComment: (id: number) => void;
}

export const AnnouncementDetailModal: React.FC<
	AnnouncementDetailModalProps
> = ({ isOpen, onClose, message, onOpenComment }) => {
	const { theme } = useTheme();

	if (!message) return null;

	return (
		<Dialog.Root onOpenChange={onClose} open={isOpen}>
			<Dialog.Content
				style={{
					maxWidth: 900,
					background: theme === "dark" ? "#004A60" : "rgba(239, 253, 255, 1)",
					maxHeight: "90vh",
				}}
			>
				<Flex align="center" justify="between" mb="2">
					<Dialog.Title mb="0">{message.article}</Dialog.Title>
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

				<Flex direction="column" gap="3">
					{/* Author and Date Info */}
					<Flex justify={"between"}>
						<Text size="2" weight="bold">
							{message.username}
						</Text>
						<Text className="block opacity-80" size="2">
							{moment(message.posted).format("MMMM Do YYYY, h:mm a")}
						</Text>
					</Flex>

					{message.file && (
						<Box className="w-full">
							<img
								alt="announcement-img"
								className="w-full max-h-86 object-cover rounded-[5px]"
								src={message.file}
							/>
						</Box>
					)}

					{/* Description */}
					<Box>
						<Text className="whitespace-pre-wrap leading-relaxed">
							{message.description}
						</Text>
					</Box>

					{/* Divider */}
					<hr className="opacity-20" />

					{/* Reactions and Comments */}
					<ReactionButtonGroup
						handleOpenComment={onOpenComment}
						message={message}
					/>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
