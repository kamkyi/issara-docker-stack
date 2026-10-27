import axios from "axios";

const GD_API_V1_URL = (import.meta.env.VITE_APP_GD_API_V1_URL ?? "").replace(
	/\/$/,
	"",
);

const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface GdUser {
	id: number;
	avatar?: string | null;
}

export const updateGdUserAvatar = async (
	gdUserId: number,
	file: File,
): Promise<GdUser> => {
	const fd = new FormData();
	fd.append("avatar", file);
	const response = await axios.post<GdUser>(
		`${GD_API_V1_URL}/users/${gdUserId}`,
		fd,
		{ headers: getAuthHeaders() },
	);
	return response.data;
};
