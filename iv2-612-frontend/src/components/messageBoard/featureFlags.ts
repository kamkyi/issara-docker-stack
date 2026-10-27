import flagsmith from "flagsmith";

// Flagsmith feature that gates the message-board comments feature.
// When off, all comment UI (SP announcements + Team Console) is hidden.
export const MESSAGE_BOARD_COMMENTS_FLAG = "message_board_comments";

export const isCommentsEnabled = () =>
	flagsmith.hasFeature(MESSAGE_BOARD_COMMENTS_FLAG);
