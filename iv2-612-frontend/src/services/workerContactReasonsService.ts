import { api } from "$src/api/axios";

// const DEFAULT_CASCADE_API_URL = "https://staging.cms.issarainstitute.org";

export interface WorkerContactReason {
	id: number;
	name: string;
	description: string | null;
	sort_order: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export const fetchWorkerContactReasons = async (
	lang: string,
): Promise<WorkerContactReason[]> => {
	const cascadeApiUrl = import.meta.env.VITE_API_BASE_URL;

	const { data } = await api.get<WorkerContactReason[]>(
		`${cascadeApiUrl}/cascade/supplier/worker-contact-reasons/?lang=${lang}`,
	);

	const reasons = Array.isArray(data) ? data : [];

	return reasons
		.filter((reason) => reason.is_active)
		.sort((a, b) => a.sort_order - b.sort_order);
};
