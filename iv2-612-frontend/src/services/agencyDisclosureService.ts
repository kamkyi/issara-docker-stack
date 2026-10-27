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

export interface AgencyDisclosureEntryPayload {
	agency_name: string;
	origin_country: string | null;
	destination_countries: string;
}

export interface SubmitAgencyDisclosurePayload {
	solution_id: number;
	supplier_id?: number | string | null;
	partner_id?: number | string | null;
	submitted_by_user_id?: number | null;
	agencies: AgencyDisclosureEntryPayload[];
}

export const agencyDisclosureService = {
	submit: async (payload: SubmitAgencyDisclosurePayload) => {
		const { solution_id, ...body } = payload;
		const res = await axios.post(
			`${CASCADE_API_URL}/solutions/${solution_id}/agency-disclosure`,
			body,
			{ headers: authHeaders() },
		);
		captureRotatedTokens(res);
		return res.data;
	},
};
