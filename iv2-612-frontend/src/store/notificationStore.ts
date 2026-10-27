import axios, { type AxiosResponse } from "axios";
import flagsmith from "flagsmith";
import type { IFlagsmithFeature } from "flagsmith/types";
import { create } from "zustand";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;
export const MOCK_NOTIFICATIONS_FLAG = "use_mock_data";
const MOCK_NOTIFICATION_READ_KEY = "mock-notification-read-ids";

const captureRotatedTokens = (res: AxiosResponse) => {
	const newAccess =
		res.headers?.["x-new-access-token"] ?? res.headers?.["X-New-Access-Token"];
	const newRefresh =
		res.headers?.["x-new-refresh-token"] ??
		res.headers?.["X-New-Refresh-Token"];
	if (typeof newAccess === "string" && newAccess) {
		localStorage.setItem("auth_token", newAccess);
	}
	if (typeof newRefresh === "string" && newRefresh) {
		localStorage.setItem("refresh_token", newRefresh);
	}
};

export type MarketplaceNotificationType =
	| "SPONSOR"
	| "RECOMMEND"
	| "ACCEPT"
	| "DECLINE"
	| "PAYMENT_SUCCESS";

// Partner Message Board events, emitted by the frontend after a board action.
export type MessageBoardNotificationType =
	| "MB_POST" // Cascade staff published a post → partner audience
	| "MB_REPLY" // Cascade staff replied to a comment → partner audience
	| "MB_COMMENT" // partner added a comment/reply → Issara staff
	| "MB_RSVP" // partner RSVP'd "going" to an event → Issara staff
	| "MB_ACK" // partner acknowledged a post → Issara staff
	| "MB_REACT" // partner reacted to a post → Issara staff
	| "MB_REMIND"; // Cascade staff reminded a partner to acknowledge / RSVP

export type CompanyProfileNotificationType = "COMPANY_PROFILE_UPDATE";

// Emitted when a non pre-approved user submits an access request → Issara staff.
export type AccessRequestNotificationType = "ACCESS_REQUEST";

export type NotificationType =
	| MarketplaceNotificationType
	| MessageBoardNotificationType
	| CompanyProfileNotificationType
	| AccessRequestNotificationType;

export interface NotificationItem {
	id: number;
	recipient_id: string;
	recipient_role: string;
	sender_id: string;
	type: NotificationType;
	title: string;
	message: string;
	data: {
		sender_name?: string;
		sender_id?: string | number;
		[key: string]: unknown;
	} | null;
	is_read: boolean;
	createdAt: string;
	updatedAt: string;
}

export const isMockNotificationFeatureEnabled = (
	feature?: IFlagsmithFeature | null,
) => {
	if (!feature) return false;
	if (typeof feature.value === "boolean") return feature.value;
	if (typeof feature.value === "string") {
		const normalizedValue = feature.value.trim().toLowerCase();
		if (normalizedValue === "true") return true;
		if (normalizedValue === "false") return false;
	}
	return feature.enabled;
};

const isMockNotificationsFlagEnabled = () => {
	try {
		const feature = flagsmith.getAllFlags()[MOCK_NOTIFICATIONS_FLAG];
		if (feature) return isMockNotificationFeatureEnabled(feature);
		return flagsmith.hasFeature(MOCK_NOTIFICATIONS_FLAG, { fallback: false });
	} catch {
		return false;
	}
};

const shouldUseMockNotifications = () => {
	return isMockNotificationsFlagEnabled();
};

const mockTimestamp = (minutesAgo: number) =>
	new Date(Date.now() - minutesAgo * 60_000).toISOString();

const getMockReadIds = () => {
	try {
		const raw = localStorage.getItem(MOCK_NOTIFICATION_READ_KEY);
		if (!raw) return new Set<number>();
		const parsed = JSON.parse(raw);
		return new Set(
			Array.isArray(parsed)
				? parsed
						.map((value) => Number(value))
						.filter((value) => Number.isFinite(value))
				: [],
		);
	} catch {
		return new Set<number>();
	}
};

const saveMockReadIds = (ids: Set<number>) => {
	localStorage.setItem(MOCK_NOTIFICATION_READ_KEY, JSON.stringify([...ids]));
};

const getMockNotifications = (): NotificationItem[] => {
	const readIds = getMockReadIds();
	const mockNotifications: NotificationItem[] = [
		{
			id: -1003,
			recipient_id: "mock-buyer",
			recipient_role: "org-global-partner",
			sender_id: "ilm-cascade-team",
			type: "RECOMMEND",
			title: "Recommended action available",
			message:
				"A recommended improvement action has been added to the marketplace plan.",
			data: {
				sender_name: "ILM Cascade Team",
				solution_id: "mock-recommendation",
			},
			is_read: true,
			createdAt: mockTimestamp(1210),
			updatedAt: mockTimestamp(1210),
		},
	];

	return mockNotifications.map((notification) => ({
		...notification,
		is_read: notification.is_read || readIds.has(notification.id),
	}));
};

interface NotificationState {
	notifications: NotificationItem[];
	allNotifications: NotificationItem[];
	unreadCount: number;
	isLoading: boolean;
	error: string | null;
	fetchNotifications: (params?: Record<string, any>) => Promise<void>;
	markAsRead: (id?: number, params?: Record<string, any>) => Promise<void>;
	markAllAsRead: (params?: Record<string, any>) => Promise<void>;
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
	notifications: [],
	allNotifications: [],
	unreadCount: 0,
	isLoading: false,
	error: null,

	fetchNotifications: async (params?: Record<string, any>) => {
		set({ isLoading: true, error: null });
		try {
			if (shouldUseMockNotifications()) {
				const mockNotifications = getMockNotifications();
				set({
					allNotifications: mockNotifications,
					notifications: mockNotifications.filter((n) => !n.is_read),
					unreadCount: mockNotifications.filter((n) => !n.is_read).length,
					isLoading: false,
				});
				return;
			}

			const res = await axios.get(`${CASCADE_API_URL}/notifications`, {
				headers: {
					...authHeaders(),
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
				},
				params: params || {},
			});
			captureRotatedTokens(res);
			const payload = res.data?.data ?? {};
			set({
				allNotifications: payload.notifications ?? [],
				// panel shows only unread by default
				notifications: (payload.notifications ?? []).filter(
					(n: NotificationItem) => !n.is_read,
				),
				unreadCount: payload.unreadCount ?? 0,
				isLoading: false,
			});
		} catch (error: any) {
			set({
				isLoading: false,
				error: error?.message ?? "Failed to load notifications",
			});
		}
	},

	markAsRead: async (id?: number, params?: Record<string, any>) => {
		try {
			if (shouldUseMockNotifications()) {
				const { allNotifications } = get();
				const readIds = getMockReadIds();
				if (id) {
					readIds.add(id);
				} else {
					allNotifications.forEach((n) => {
						readIds.add(n.id);
					});
				}
				saveMockReadIds(readIds);
				const updatedAll = allNotifications.map((n) =>
					!id || n.id === id ? { ...n, is_read: true } : n,
				);
				const remaining = updatedAll.filter((n) => !n.is_read);
				set({
					allNotifications: updatedAll,
					notifications: remaining,
					unreadCount: remaining.length,
				});
				return;
			}

			const body = id ? { id } : {};
			const res = await axios.patch(
				`${CASCADE_API_URL}/notifications/read`,
				body,
				{
					headers: authHeaders(),
					params: params || {},
				},
			);
			captureRotatedTokens(res);
			// update both allNotifications and the panel (notifications)
			const { allNotifications } = get();
			const updatedAll = allNotifications.map((n) =>
				!id || n.id === id ? { ...n, is_read: true } : n,
			);
			const remaining = updatedAll.filter((n) => !n.is_read);
			set({
				allNotifications: updatedAll,
				notifications: remaining,
				unreadCount: remaining.length,
			});
		} catch (error: any) {
			set({ error: error?.message ?? "Failed to update notification" });
		}
	},

	markAllAsRead: async (params?: Record<string, any>) => {
		await get().markAsRead(undefined, params);
	},
}));
