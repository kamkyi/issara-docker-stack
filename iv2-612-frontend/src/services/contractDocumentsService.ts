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

export type ContractDocumentInputMode = "LINK" | "FILE";

export interface ContractDocumentRowPayload {
	document_name: string;
	input_mode: ContractDocumentInputMode;
	link_url?: string;
}

export const contractDocumentsService = {
	submit: async (
		solutionId: number,
		rows: ContractDocumentRowPayload[],
		files: Record<number, File>,
		identity: {
			supplier_id?: number | string | null;
			partner_id?: number | string | null;
			submitted_by_user_id?: number | null;
		},
	) => {
		const formData = new FormData();
		formData.append("payload", JSON.stringify(rows));
		if (identity.supplier_id)
			formData.append("supplier_id", String(identity.supplier_id));
		if (identity.partner_id)
			formData.append("partner_id", String(identity.partner_id));
		if (identity.submitted_by_user_id)
			formData.append(
				"submitted_by_user_id",
				String(identity.submitted_by_user_id),
			);
		for (const [index, file] of Object.entries(files)) {
			formData.append(`file_${index}`, file);
		}

		const res = await axios.post(
			`${CASCADE_API_URL}/solutions/${solutionId}/contract-documents`,
			formData,
			{ headers: authHeadersMultipart() },
		);
		captureRotatedTokens(res);
		return res.data;
	},
};
