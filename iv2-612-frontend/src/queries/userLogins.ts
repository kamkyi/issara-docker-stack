import { useQuery } from "@tanstack/react-query";
import { api } from "$src/api/axios";
import { getCascadeApiUrl } from "$src/utils/config";

/**
 * Data for the "User Logins" page — a live proxy over the WorkOS User
 * Management API (scoped to the internal Issara organization) exposed by
 * cascade-api at `/user-logins`. WorkOS retains sessions for ~30 days, so
 * per-user session history and counts reflect recent activity only.
 */

/** One internal user, as shown in the roster (main list). */
export interface RosterUser {
	userId: string;
	email: string | null;
	name: string;
	avatarUrl: string | null;
	lastSignInAt: string | null;
	createdAt: string | null;
	signInCount: number;
	sessionStatus: string | null;
}

/** One session in a user's history (details page). */
export interface SessionSummary {
	id: string;
	status: string | null;
	authMethod: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string | null;
	expiresAt: string | null;
	endedAt: string | null;
	isImpersonated: boolean;
}

/** A single user's profile plus recent sessions and sign-in count. */
export interface UserLoginDetail {
	user: {
		userId: string;
		email: string | null;
		name: string;
		avatarUrl: string | null;
		createdAt: string | null;
		lastSignInAt: string | null;
	};
	signInCount: number;
	sessions: SessionSummary[];
	/** Curated WorkOS custom metadata (secrets removed server-side). */
	metadata: Record<string, string>;
}

function requireBase(): string {
	const base = getCascadeApiUrl();
	if (!base) {
		throw new Error("Cascade API URL is not configured");
	}
	return base;
}

/** The roster: internal users, newest sign-in first (server-sorted). */
export const useUserRoster = () =>
	useQuery<RosterUser[]>({
		queryKey: ["user-logins", "roster"],
		queryFn: async () => {
			const response = await api.get<{ data: { users: RosterUser[] } }>(
				`${requireBase()}/user-logins`,
			);
			return response.data.data.users;
		},
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
	});

/** One user's session history + sign-in count. */
export const useUserLoginDetail = (userId: string | undefined) =>
	useQuery<UserLoginDetail>({
		queryKey: ["user-logins", "detail", userId],
		queryFn: async () => {
			const response = await api.get<{ data: UserLoginDetail }>(
				`${requireBase()}/user-logins/${encodeURIComponent(userId ?? "")}`,
			);
			return response.data.data;
		},
		enabled: !!userId,
		staleTime: 60 * 1000,
		gcTime: 5 * 60 * 1000,
	});
