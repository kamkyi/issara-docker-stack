import axios, { type AxiosResponse } from "axios";

/**
 * "Request a Quote - Wages" — the WageIndicator next step. Separate from
 * {@link quoteRequestService}, which backs the generic Request a Quote form.
 */

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

const authHeaders = (contentType?: string) => {
	const token =
		localStorage.getItem("auth_token") ||
		localStorage.getItem("refresh_token") ||
		"";
	return {
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...(contentType ? { "Content-Type": contentType } : {}),
	};
};

/** How the requester supplied their per-country wage figures. */
export type WageInputMode = "MANUAL" | "EXCEL";

export interface WageQuoteLocationPayload {
	country: string;
	currency: string;
	living_wage: string | null;
	minimum_wage: string | null;
}

export interface SubmitWageQuoteRequestPayload {
	solution_id: number;
	supplier_id?: number | string | null;
	partner_id?: number | string | null;
	submitted_by_user_id?: number | null;
	full_name: string;
	email: string;
	company: string;
	notes: string;
	/** ISO `YYYY-MM-DD`. */
	preferred_date: string;
	/**
	 * One NACE Rev. 2.1 code at whichever level the respondent narrowed down to
	 * ("A", "01", "01.1", "01.11"). The API expands it into the section /
	 * division / group / class columns it stores.
	 */
	nace_code: string;
	operating_locations_count: number;
	suppliers_count: number;
	wage_input_mode: WageInputMode;
	locations?: WageQuoteLocationPayload[];
	certifications: string[];
	total_workers?: number;
	languages_spoken: string[];
}

export const wageQuoteRequestService = {
	/**
	 * Wage figures typed into the form post as JSON; an uploaded spreadsheet
	 * posts as multipart, with the same object JSON-encoded under `payload`.
	 */
	submit: async (
		payload: SubmitWageQuoteRequestPayload,
		wageFile?: File | null,
	) => {
		const { solution_id, ...body } = payload;
		const url = `${CASCADE_API_URL}/solutions/${solution_id}/wage-quote-requests`;

		if (wageFile) {
			const formData = new FormData();
			formData.append("payload", JSON.stringify(body));
			formData.append("wage_file", wageFile);
			const res = await axios.post(url, formData, { headers: authHeaders() });
			captureRotatedTokens(res);
			return res.data;
		}

		const res = await axios.post(url, body, {
			headers: authHeaders("application/json"),
		});
		captureRotatedTokens(res);
		return res.data;
	},
};
