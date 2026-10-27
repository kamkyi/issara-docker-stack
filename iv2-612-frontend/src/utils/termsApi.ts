import axios, { type AxiosResponse } from "axios";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

export interface TermsStatus {
	accepted_version: string | null;
	current_version: string;
	needs_acceptance: boolean;
	accepted_at: string | null;
}

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

const authHeaders = () => {
	const token =
		localStorage.getItem("auth_token") ||
		localStorage.getItem("refresh_token") ||
		"";
	return token
		? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
		: { "Content-Type": "application/json" };
};

export const getTermsStatus = async (): Promise<TermsStatus> => {
	const res = await axios.get(`${CASCADE_API_URL}/me/terms`, {
		headers: authHeaders(),
	});
	captureRotatedTokens(res);
	return res.data?.data as TermsStatus;
};

export const acceptTerms = async (): Promise<TermsStatus> => {
	const res = await axios.post(
		`${CASCADE_API_URL}/me/terms/accept`,
		{},
		{ headers: authHeaders() },
	);
	captureRotatedTokens(res);
	return res.data?.data as TermsStatus;
};
