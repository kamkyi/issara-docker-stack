// The logged-in Issara staff member, as shown in the Team Console (composer
// preview author + comments-inbox reply avatar). Derived from auth_user, with a
// safe "ILM Cascade Team" fallback for WorkOS-only sessions.
export interface AdminUser {
	name: string;
	role: string;
	initials: string;
	color: string;
}

export const readAdminUser = (): AdminUser => {
	try {
		const raw = localStorage.getItem("auth_user");
		const u = raw ? JSON.parse(raw) : {};
		const name = (
			u?.full_name ||
			u?.name ||
			u?.username ||
			u?.email ||
			"ILM Cascade Team"
		).toString();
		// The preview already renders "ILM Cascade Team" after the role, so leave
		// the role blank unless the user has a real job title (avoids the doubled
		// "ILM Cascade Team · ILM Cascade Team").
		const role = (u?.title || u?.role_label || "").toString();
		const parts = name.split(/\s+/).filter(Boolean);
		const initials =
			parts
				.slice(0, 2)
				.map((p: string) => p[0]?.toUpperCase())
				.join("") || "IC";
		return { name, role, initials, color: "#148696" };
	} catch {
		return {
			name: "ILM Cascade Team",
			role: "ILM Cascade Team",
			initials: "IC",
			color: "#148696",
		};
	}
};
