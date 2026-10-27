import type { IFlagsmithFeature } from "flagsmith/types";

// Flagsmith feature that gates emoji reactions on message-board posts.
// Separate from the message_board_comments flag; read via the useFlags hook.
export const MESSAGE_BOARD_REACTIONS_FLAG = "message_board_reactions";

// Curated, fixed set of reactions (Facebook-style). The `key` is the wire value
// stored/returned by the backend; keep this list and its order as the single
// source of truth for both the buttons and the count summary.
export interface ReactionOption {
	key: string;
	emoji: string;
	label: string;
}

export const REACTIONS: ReactionOption[] = [
	{ key: "thumbs_up", emoji: "👍", label: "Understood" },
	{ key: "heart", emoji: "❤️", label: "Appreciate" },
	{ key: "party", emoji: "🎉", label: "Great news" },
	{ key: "clap", emoji: "👏", label: "Yay, thanks" },
];

export const REACTION_EMOJI: Record<string, string> = Object.fromEntries(
	REACTIONS.map((r) => [r.key, r.emoji]),
);

// Normalize a Flagsmith feature into a boolean. Mirrors
// isMockNotificationFeatureEnabled in notificationStore.ts: prefer an explicit
// value (boolean or "true"/"false" string), then fall back to `enabled`.
export const isReactionFeatureEnabled = (
	feature?: IFlagsmithFeature | null,
): boolean => {
	if (!feature) return false;
	if (typeof feature.value === "boolean") return feature.value;
	if (typeof feature.value === "string") {
		const normalizedValue = feature.value.trim().toLowerCase();
		if (normalizedValue === "true") return true;
		if (normalizedValue === "false") return false;
	}
	return feature.enabled;
};
