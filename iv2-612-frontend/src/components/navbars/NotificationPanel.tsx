import * as Icons from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { BoardPost } from "$src/assets/mock/message-board";
import { MESSAGE_BOARD_QUERY_KEY } from "$src/queries/useMessageBoard";
import {
	type NotificationItem,
	type NotificationType,
	useNotificationStore,
} from "$src/store/notificationStore";
import { getNotificationParams } from "$src/utils/auth-utils";

interface NotificationPanelProps {
	open: boolean;
	onClose: () => void;
}

const typeIcon: Record<NotificationType, ReactNode> = {
	SPONSOR: <Icons.Paid style={{ fontSize: 18, color: "#148696" }} />,
	RECOMMEND: <Icons.Recommend style={{ fontSize: 18, color: "#1f6ed4" }} />,
	ACCEPT: <Icons.CheckCircle style={{ fontSize: 18, color: "#16a34a" }} />,
	DECLINE: <Icons.Cancel style={{ fontSize: 18, color: "#dc2626" }} />,
	PAYMENT_SUCCESS: (
		<Icons.AccountBalanceWallet style={{ fontSize: 18, color: "#523bae" }} />
	),
	// Partner Message Board events
	MB_POST: <Icons.Campaign style={{ fontSize: 18, color: "#148696" }} />,
	MB_REPLY: <Icons.Reply style={{ fontSize: 18, color: "#1f6ed4" }} />,
	MB_COMMENT: (
		<Icons.ChatBubbleOutline style={{ fontSize: 18, color: "#1f6ed4" }} />
	),
	MB_RSVP: <Icons.EventAvailable style={{ fontSize: 18, color: "#6f2e97" }} />,
	MB_ACK: <Icons.TaskAlt style={{ fontSize: 18, color: "#16a34a" }} />,
	MB_REACT: <Icons.EmojiEmotions style={{ fontSize: 18, color: "#d97706" }} />,
	MB_REMIND: (
		<Icons.NotificationsActive style={{ fontSize: 18, color: "#b26a1a" }} />
	),
	COMPANY_PROFILE_UPDATE: (
		<Icons.Business style={{ fontSize: 18, color: "#148696" }} />
	),
	ACCESS_REQUEST: (
		<Icons.PersonAdd style={{ fontSize: 18, color: "#148696" }} />
	),
};

// Message-board notifications deep-link to the board (and the specific post via
// ?post=), everything else keeps the existing marketplace behaviour.
const MB_TYPES = new Set<NotificationType>([
	"MB_POST",
	"MB_REPLY",
	"MB_COMMENT",
	"MB_RSVP",
	"MB_ACK",
	"MB_REACT",
	"MB_REMIND",
]);

// Notifications that originate from Cascade staff and are sent to partners. The
// individual staff member must never be surfaced to partners — these always
// present as the team, regardless of any sender stored on the row.
const CASCADE_TEAM_TYPES = new Set<NotificationType>(["MB_POST", "MB_REPLY"]);

const COMPANY_PROFILE_TYPES = new Set<NotificationType>([
	"COMPANY_PROFILE_UPDATE",
]);

const formatTime = (iso: string) => {
	try {
		const d = new Date(iso);
		const now = Date.now();
		const diffMin = Math.floor((now - d.getTime()) / 60000);
		if (diffMin < 1) return "just now";
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDay = Math.floor(diffHr / 24);
		if (diffDay < 7) return `${diffDay}d ago`;
		return d.toLocaleDateString();
	} catch {
		return "";
	}
};

const NotificationRow = ({
	item,
	onClick,
	postTitle,
}: {
	item: NotificationItem;
	onClick: () => void;
	postTitle?: string;
}) => {
	// Cascade→partner notifications always show as the team, never the individual
	// staff member who triggered them (and hide the staff sender id).
	const isCascadeTeam = CASCADE_TEAM_TYPES.has(item.type);
	const senderName = isCascadeTeam
		? "ILM Cascade Team"
		: item.data?.sender_name;
	const senderId = isCascadeTeam ? undefined : item.data?.sender_id;

	return (
		<button
			className={`w-full text-left p-5 border-b border-gray-50 hover:bg-gray-50 transition-all flex gap-4 items-start ${
				item.is_read ? "bg-white" : "bg-blue-50/30"
			}`}
			onClick={onClick}
			type="button"
		>
			<div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
				{typeIcon[item.type] ?? (
					<Icons.Notifications style={{ fontSize: 18 }} />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<h5 className="text-[13px] font-black text-[#004A60] truncate">
						{item.title}
					</h5>
					{!item.is_read && (
						<span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm shadow-blue-200" />
					)}
				</div>

				{senderName && (
					<div className="flex items-center gap-1.5 mt-0.5">
						<span className="text-[11px] font-bold text-gray-700">
							{senderName}
						</span>
						{senderId && (
							<span className="text-[10px] text-gray-400 font-medium">
								(ID: {senderId})
							</span>
						)}
					</div>
				)}

				<p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-3">
					{postTitle ?? item.message}
				</p>
				<span className="text-[10px] text-gray-400 mt-2 block font-medium">
					{formatTime(item.createdAt)}
				</span>
			</div>
		</button>
	);
};

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
	const {
		notifications,
		allNotifications,
		unreadCount,
		isLoading,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
	} = useNotificationStore();
	const [viewAll, setViewAll] = useState(false);
	const queryClient = useQueryClient();
	const boardPostTitleById = useMemo(() => {
		const titleById = new Map<string, string>();
		const queries = queryClient.getQueriesData<unknown>({
			queryKey: [MESSAGE_BOARD_QUERY_KEY],
		});
		for (const [, data] of queries) {
			if (!Array.isArray(data)) continue;
			for (const item of data) {
				const post = item as Partial<BoardPost>;
				if (post.id != null && typeof post.title === "string") {
					titleById.set(String(post.id), post.title);
				}
			}
		}
		return titleById;
	}, [queryClient, notifications, allNotifications, open]);

	useEffect(() => {
		if (open) {
			const params = getNotificationParams();
			fetchNotifications(params);
			// ensure mark operations use the same recipient scope
			// pass params into markAllAsRead/markAsRead calls below via closures
		}
	}, [open, fetchNotifications]);

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						animate={{ opacity: 1 }}
						className="fixed inset-0 bg-black/40 z-999"
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
						onClick={onClose}
					/>
					<motion.aside
						animate={{ x: 0 }}
						className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-white shadow-2xl z-1000 flex flex-col"
						exit={{ x: 400 }}
						initial={{ x: 400 }}
						transition={{ type: "spring", damping: 28, stiffness: 240 }}
					>
						<header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 bg-[#e6f6f8] rounded-xl flex items-center justify-center">
									<Icons.Notifications
										style={{ color: "#148696", fontSize: 22 }}
									/>
								</div>
								<div>
									<div className="flex items-center gap-3">
										<h3 className="font-black text-[#004A60] text-lg leading-none">
											Notifications
										</h3>
										<div className="ml-4 flex items-center gap-2">
											<button
												className={`text-[12px] px-3 py-1 rounded-md uppercase tracking-wider transition-all font-semibold ${
													!viewAll
														? "bg-[#cdeeea] text-[#004b45] shadow-sm ring-1 ring-[#148696]/30"
														: "bg-white text-gray-600"
												}`}
												onClick={() => setViewAll(false)}
												type="button"
											>
												Unread
											</button>
											<button
												className={`text-[12px] px-3 py-1 rounded-md uppercase tracking-wider transition-all font-semibold ${
													viewAll
														? "bg-[#dbeafe] text-[#153e75] shadow-sm ring-1 ring-[#1f6ed4]/30"
														: "bg-white text-gray-600"
												}`}
												onClick={() => setViewAll(true)}
												type="button"
											>
												All
											</button>
										</div>
									</div>
									{!viewAll && unreadCount > 0 && (
										<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
											{unreadCount} unread messages
										</p>
									)}
								</div>
							</div>
							<button
								className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
								onClick={onClose}
								type="button"
							>
								<Icons.Close style={{ fontSize: 20 }} />
							</button>
						</header>

						{!viewAll && unreadCount > 0 && (
							<div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
								<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
									Recent Updates
								</span>
								<button
									className="text-[11px] font-black text-[#148696] hover:text-[#004A60] transition-colors uppercase tracking-wider"
									onClick={() => markAllAsRead(getNotificationParams())}
									type="button"
								>
									Mark all as read
								</button>
							</div>
						)}

						<div className="flex-1 overflow-y-auto">
							{isLoading ? (
								<div className="p-8 text-center text-sm text-gray-400">
									Loading…
								</div>
							) : (viewAll ? allNotifications : notifications).length === 0 ? (
								<div className="p-12 text-center flex flex-col items-center gap-3 text-gray-400">
									<Icons.NotificationsOff style={{ fontSize: 40 }} />
									<div className="text-sm font-bold">No notifications yet</div>
									<div className="text-xs leading-relaxed max-w-[220px]">
										You'll see updates here when partners, suppliers, or
										marketplace activity changes.
									</div>
								</div>
							) : (
								(viewAll ? allNotifications : notifications).map((n) => (
									<NotificationRow
										item={n}
										key={n.id}
										onClick={() => {
											if (!n.is_read) {
												markAsRead(n.id, getNotificationParams());
											}
											try {
												if (MB_TYPES.has(n.type)) {
													// Deep-link to the board, opening the specific post.
													const postId = n.data?.post_id;
													window.location.href = postId
														? `/message-board?post=${encodeURIComponent(String(postId))}`
														: "/message-board";
												} else if (COMPANY_PROFILE_TYPES.has(n.type)) {
													onClose();
												} else if (n.type === "ACCESS_REQUEST") {
													window.location.href = "/access-requests";
												} else {
													// signal the marketplace to open the plan tab
													localStorage.setItem(
														"cascade-marketplace-target-tab",
														"plan",
													);
													window.location.href = "/cascade-marketplace";
												}
											} catch {
												// fallback: do nothing
											}
										}}
										postTitle={
											MB_TYPES.has(n.type) && n.data?.post_id != null
												? boardPostTitleById.get(String(n.data.post_id))
												: undefined
										}
									/>
								))
							)}
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	);
}
