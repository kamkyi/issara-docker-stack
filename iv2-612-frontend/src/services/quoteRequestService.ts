import axios, { type AxiosResponse } from "axios";

const CASCADE_API_URL = import.meta.env.VITE_APP_CASCADE_API_URL;

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

export interface SubmitQuoteRequestPayload {
	solution_id: number;
	supplier_id?: number | string | null;
	partner_id?: number | string | null;
	submitted_by_user_id?: number | null;
	full_name: string;
	email: string;
	company?: string;
	worker_nationalities: string[];
	languages_spoken: string[];
	total_workers?: number;
	notes?: string;
}

export const quoteRequestService = {
	submit: async (payload: SubmitQuoteRequestPayload) => {
		const { solution_id, ...body } = payload;
		const res = await axios.post(
			`${CASCADE_API_URL}/solutions/${solution_id}/quote-requests`,
			body,
			{ headers: authHeaders() },
		);
		captureRotatedTokens(res);
		return res.data;
	},
};
