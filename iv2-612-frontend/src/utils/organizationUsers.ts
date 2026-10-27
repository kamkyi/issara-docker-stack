/**
 * Shared shapes and response normalisation for the ILM "users of an
 * organization" endpoints (`/ilm/strategic-partner-users` and
 * `/ilm/supplier-users`). Both return the same user records, so the parsing
 * lives here and the role-specific hooks only own their endpoint and query key.
 */

export interface OrganizationUserDetail {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	email: string;
	is_active: number;
	is_staff: number;
	role: string;
	last_active: string;
}

export interface OrganizationUser {
	user_id: number;
	strategic_partner_id?: number;
	supplier_id?: number;
	user: OrganizationUserDetail;
}

export interface OrganizationUsersResponse {
	status: string;
	data: {
		users: OrganizationUser[];
	};
}

/**
 * The endpoints have been seen returning the users under `data.users`, `data`
 * and `users`, so accept all three and always hand callers the same shape.
 */
export const normalizeUsersResponse = (
	response: unknown,
): OrganizationUsersResponse => {
	if (!response || typeof response !== "object") {
		return {
			status: "success",
			data: { users: [] },
		};
	}

	const payload = response as {
		status?: string;
		data?: { users?: OrganizationUser[] } | OrganizationUser[];
		users?: OrganizationUser[];
	};

	const users = Array.isArray(payload.data)
		? payload.data
		: Array.isArray(payload.data?.users)
			? payload.data.users
			: Array.isArray(payload.users)
				? payload.users
				: [];

	return {
		status: payload.status ?? "success",
		data: {
			users,
		},
	};
};
