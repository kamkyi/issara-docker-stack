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

const authHeadersMultipart = () => {
	const token =
		localStorage.getItem("auth_token") ||
		localStorage.getItem("refresh_token") ||
		"";
	return token ? { Authorization: `Bearer ${token}` } : {};
};

export type SelfCertificationScoreType = "PERCENTAGE" | "SCORE" | "OUTCOME";

export interface SubmitSelfCertificationPayload {
	completion_date: string;
	score_type: SelfCertificationScoreType;
	score_value: string;
	key_learnings: string;
	signatory_name: string;
	signatory_title: string;
	certified: boolean;
	proof_file: File;
	supplier_id?: number | string | null;
	partner_id?: number | string | null;
	submitted_by_user_id?: number | null;
}

export const selfCertificationService = {
	submit: async (
		solutionId: number,
		payload: SubmitSelfCertificationPayload,
	) => {
		const formData = new FormData();
		formData.append("completion_date", payload.completion_date);
		formData.append("score_type", payload.score_type);
		formData.append("score_value", payload.score_value);
		formData.append("key_learnings", payload.key_learnings);
		formData.append("signatory_name", payload.signatory_name);
		formData.append("signatory_title", payload.signatory_title);
		formData.append("certified", String(payload.certified));
		formData.append("proof_file", payload.proof_file);
		if (payload.supplier_id)
			formData.append("supplier_id", String(payload.supplier_id));
		if (payload.partner_id)
			formData.append("partner_id", String(payload.partner_id));
		if (payload.submitted_by_user_id)
			formData.append(
				"submitted_by_user_id",
				String(payload.submitted_by_user_id),
			);

		const res = await axios.post(
			`${CASCADE_API_URL}/solutions/${solutionId}/self-certification`,
			formData,
			{ headers: authHeadersMultipart() },
		);
		captureRotatedTokens(res);
		return res.data;
	},
};
