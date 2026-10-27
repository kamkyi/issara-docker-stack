import { useMemo } from "react";
import { sanitizeMessageHtml } from "$src/utils/messageBoardRichText";

interface RichMessageBodyProps {
	html: string;
	compact?: boolean;
	emptyText?: string;
}

export function RichMessageBody({
	html,
	compact,
	emptyText = "",
}: RichMessageBodyProps) {
	const safeHtml = useMemo(
		() => sanitizeMessageHtml(html || emptyText),
		[html, emptyText],
	);

	return (
		<div
			className={`text rich-text${compact ? " clamp" : ""}`}
			dangerouslySetInnerHTML={{ __html: safeHtml }}
		/>
	);
}
