import axios from "axios";
import type {
	CompanyProfileNotificationType,
	MessageBoardNotificationType,
} from "$src/store/notificationStore";
import { getCascadeApiUrl } from "$src/utils/config";

// Sentinel recipient_id that addresses the whole Issara/Cascade staff team.
// Mirrors ISSARA_STAFF_RECIPIENT in cascade-api's notificationController.
export const ISSARA_STAFF_RECIPIENT = "issara-staff";

export interface EmitNotificationPayload {
	// Numeric strategic-partner id (as string/number) or the staff sentinel.
	recipient_id: string | number;
	recipient_role: "buyer" | "supplier" | "staff";
	type: MessageBoardNotificationType | CompanyProfileNotificationType;
	title: string;
	message: string;
	data?: {
		sender_name?: string;
		sender_id?: string | number;
		post_id?: string | number;
		post_title?: string;
		post_type?: string;
		comment_id?: string | number;
		[key: string]: unknown;
	};
}

const authHeaders = () => {
	const token =
		localStorage.getItem("auth_token") ||
		localStorage.getItem("refresh_token") ||
		"";
	return token
		? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
		: { "Content-Type": "application/json" };
};

/**
 * Fire-and-forget emit of one or more client-emitted notifications to cascade-api.
 *
 * The board itself is served by Django, which can't write the cascade-api
 * notifications table. This must NEVER throw or block the originating action:
 * all errors are swallowed (the source write already landed).
 */
export const emitNotifications = (
	payloads: EmitNotificationPayload | EmitNotificationPayload[],
): void => {
	const list = Array.isArray(payloads) ? payloads : [payloads];
	if (list.length === 0) return;

	const base = getCascadeApiUrl();
	if (!base) return;

	void axios
		.post(
			`${base}/notifications`,
			{ notifications: list },
			{ headers: authHeaders() },
		)
		.catch(() => {
			// Best-effort: the board action already succeeded. Don't surface errors.
		});
};

export const deleteMessageBoardPostNotifications = async (
	postId: string | number,
): Promise<number> => {
	const base = getCascadeApiUrl();
	if (!base) return 0;

	try {
		const res = await axios.delete(
			`${base}/notifications/message-board/${postId}`,
			{
				headers: authHeaders(),
			},
		);
		return Number(res.data?.data?.deleted ?? 0);
	} catch {
		// Best-effort: the source post action already succeeded.
		return 0;
	}
};
