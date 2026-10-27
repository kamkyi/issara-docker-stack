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

export interface NotifyItem {
	supplier_id: number;
	solution_id: number;
	type: "SPONSORED" | "RECOMMENDED";
}

export interface PendingSolution {
	id: number;
	supplier_id: number;
	solution_id: number;
	buyer_id: string;
	type: "SPONSORED" | "RECOMMENDED";
	status: "PENDING" | "ACCEPTED" | "DECLINED" | "REDEEMED";
	createdAt: string;
	solution?: {
		id: number;
		title: string;
		description?: string;
		price?: number;
		impact?: number;
	};
}

const authHeaders = () => {
	const token =
		localStorage.getItem("auth_token") ||
		localStorage.getItem("refresh_token") ||
		"";
	return token
		? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
		: { "Content-Type": "application/json" };
};

export const marketplaceService = {
	notifySuppliers: async (
		items: NotifyItem[],
		strategicPartnerId?: number,
		submittedByUserId?: number | null,
	) => {
		const res = await axios.post(
			`${CASCADE_API_URL}/marketplace/notify`,
			{
				items,
				strategic_partner_id: strategicPartnerId,
				submitted_by_user_id: submittedByUserId,
			},
			{ headers: authHeaders() },
		);
		captureRotatedTokens(res);
		return res.data;
	},

	respondToSolution: async (
		supplierSolutionId: number,
		action: "ACCEPT" | "DECLINE",
		supplierId?: string | number,
	) => {
		const res = await axios.post(
			`${CASCADE_API_URL}/marketplace/respond`,
			{
				supplier_solution_id: supplierSolutionId,
				action,
				supplier_id: supplierId,
			},
			{ headers: authHeaders() },
		);
		captureRotatedTokens(res);
		return res.data;
	},

	listPending: async (
		supplierId?: string | number,
	): Promise<PendingSolution[]> => {
		const url = new URL(`${CASCADE_API_URL}/marketplace/pending`);
		if (supplierId) url.searchParams.append("supplier_id", String(supplierId));
		const res = await axios.get(url.toString(), {
			headers: authHeaders(),
		});
		captureRotatedTokens(res);
		return res.data?.data ?? [];
	},
};
