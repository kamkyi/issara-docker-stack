import type { PostType } from "$src/assets/mock/message-board";

const VALID_POST_TYPES = ["announcement", "report", "event"] as const;

export const normalizeMessageBoardPostType = (value: unknown): PostType => {
	if (typeof value !== "string") return "announcement";

	const type = value.trim().toLowerCase();
	if ((VALID_POST_TYPES as readonly string[]).includes(type)) {
		return type as PostType;
	}

	if ("announcement".startsWith(type) && type.length >= 6) {
		return "announcement";
	}

	return "announcement";
};
