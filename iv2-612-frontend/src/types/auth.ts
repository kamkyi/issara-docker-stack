export interface User {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	avatar_url?: string;
	groups?: string[];
	username?: string;
	organization?: string;
	partner?: string;
	supplier?: string;
	status?: "active" | "inactive";
	profile?: {
		[key: string]: any;
	};
}

export interface UserData {
	id?: number;
	userId: string;
	key: string;
	value: any;
	updatedAt: Date;
	lastSyncedAt?: Date;
}

export interface Company {
	id?: string;
	name: string;
	logo?: string;
	address?: string;
	country?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	phone?: string;
	website?: string;
	industry?: string;
	status?: "active" | "inactive";
	createdAt?: string;
	updatedAt?: string;
}

export type LegacyAuthUser = {
	id?: number | string;
	username?: string;
	first_name?: string;
	last_name?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	full_name?: string;
	email_verified?: boolean;
	profile_picture_url?: string | null;
	locale?: string;
	auth_source?: string;
	authentication_method?: string;
	is_active?: boolean;
	groups?: string[];
	organization?: string | number | null;
	partner?: string | number | null;
	supplier?: string | number | null;
};

export type CallbackData = {
	token?: string;
	session?: {
		accessToken?: string;
		authenticatedAt?: string;
		environment?: string;
		expiresIn?: number;
		provider?: string;
		tokenType?: string;
		refreshToken?: string;
		role?: string | null;
		roles?: string[] | null;
	};
	user?: Record<string, unknown>;
	authorization?: {
		appRole?: string | null;
		groups?: string[] | string | null;
		isActive?: boolean | null;
		organizationId?: string | number | null;
		partnerId?: string | number | null;
		supplierId?: string | number | null;
		userType?: string | null;
	};
	links?: {
		gd?: {
			isActive?: boolean | null;
			userId?: string | number | null;
		};
		ilm?: {
			isActive?: boolean | null;
			userId?: string | number | null;
		};
	};
	success?: boolean;
};

export interface AuthUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	username?: string;
	organization?: string;
	partner?: string;
	supplier?: string;
	groups?: string[];
	emailVerified?: boolean;
	avatarUrl?: string;
	links?: {
		ilm?: {
			isActive?: boolean;
			userId?: string;
		};
		gd?: {
			isActive?: boolean;
			userId?: string;
		};
	};
}

export interface MergedMainUser {
	success?: boolean;
	authorization?: {
		groups?: string[] | string | null;
		isActive?: boolean | null;
		organizationId?: string | number | null;
		partnerId?: string | number | null;
		supplierId?: string | number | null;
		userType?: string | null;
	};
	links?: {
		gd?: {
			isActive?: boolean | null;
			userId?: string | number | null;
		};
		ilm?: {
			isActive?: boolean | null;
			userId?: string | number | null;
		};
	};
	session?: {
		accessToken?: string;
		authenticatedAt?: string;
		environment?: string;
		expiresIn?: number;
		provider?: string;
		tokenType?: string;
	};
	user?: {
		avatarUrl?: string;
		email?: string;
		emailVerified?: boolean;
		firstName?: string;
		id?: string;
		lastName?: string;
	};
}
