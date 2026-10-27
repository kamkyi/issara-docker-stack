import { api } from "$src/api/axios";
import {
	getMockGrievance,
	saveMockGrievance,
	updateMockGrievanceAttachments,
} from "$src/services/mockSupplierKpiGrievanceStore";
import type { ServerAttachment } from "$src/services/workerFeedbackGrievanceService";
import { useMockData } from "$src/utils/config";

interface SupplierKpiGrievanceEnvelope {
	id?: number;
	information_collection_attachments?: ServerAttachment[];
	[key: string]: unknown;
}

export const ATTACHMENT_VISIBILITY = {
	INTERNAL_ONLY: "Supplier Only",
	INTERNAL_AND_ISSARA: "Supplier + Issara",
	INTERNAL_ISSARA_AND_CUSTOMERS: "Both",
} as const;

export type AttachmentVisibility =
	(typeof ATTACHMENT_VISIBILITY)[keyof typeof ATTACHMENT_VISIBILITY];

export interface PendingGrievanceAttachment {
	file: File;
	permission: AttachmentVisibility;
}

export interface GrievanceHistoryEntry {
	id: string;
	datetime: string;
	actor: string;
	action: string;
	section: string;
	source_type: string;
	system_generated: boolean;
}

const buildSupplierApiBaseUrl = () => {
	const appApiUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, "");
	if (appApiUrl) {
		return appApiUrl;
	}

	const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	if (!baseUrl) {
		throw new Error("API base URL is not defined");
	}

	return `${baseUrl}/api/v2`;
};

const buildSupplierKpiGrievanceUrl = (supplierKpiId: number, path = "") =>
	`${buildSupplierApiBaseUrl()}/supplier-kpis/${supplierKpiId}/grievance${path}`;

export const fetchSupplierKpiGrievance = async (supplierKpiId: number) => {
	// Mock mode (staging build, Flagsmith flag, or an internal role — including a
	// management user in Supplier view on production) has no server-side
	// grievance for the fixture KPI rows, so the whole form runs off localStorage.
	if (useMockData()) {
		return getMockGrievance(supplierKpiId) as SupplierKpiGrievanceEnvelope;
	}

	const { data } = await api.get<SupplierKpiGrievanceEnvelope[]>(
		`${buildSupplierKpiGrievanceUrl(supplierKpiId, "/")}`,
	);

	return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

export const saveSupplierKpiGrievance = async ({
	supplierKpiId,
	grievanceId,
	payload,
	isDraft,
	sendEmail = false,
}: {
	supplierKpiId: number;
	grievanceId?: number | null;
	payload: Record<string, unknown>;
	isDraft: boolean;
	sendEmail?: boolean;
}) => {
	if (useMockData()) {
		return saveMockGrievance({
			supplierKpiId,
			payload,
			isDraft,
		}) as SupplierKpiGrievanceEnvelope;
	}

	const requestPayload = {
		...payload,
		is_draft: isDraft,
		send_email: sendEmail,
		...(grievanceId ? {} : { supplier_kpi: supplierKpiId }),
	};

	if (grievanceId) {
		const { data } = await api.patch<SupplierKpiGrievanceEnvelope>(
			buildSupplierKpiGrievanceUrl(supplierKpiId, `/${grievanceId}/`),
			requestPayload,
		);
		return data;
	}

	const { data } = await api.post<SupplierKpiGrievanceEnvelope>(
		`${buildSupplierKpiGrievanceUrl(supplierKpiId, "/")}`,
		requestPayload,
	);

	return data;
};

export const uploadSupplierKpiGrievanceAttachments = async ({
	supplierKpiId,
	grievanceId,
	newFiles = [],
	removedIds = [],
	visibilityUpdates = {},
}: {
	supplierKpiId: number;
	grievanceId: number;
	newFiles?: PendingGrievanceAttachment[];
	removedIds?: number[];
	visibilityUpdates?: Record<number, AttachmentVisibility>;
}) => {
	// Read before the early return below: useMockData is a plain helper, but its
	// `use` prefix trips the rules-of-hooks lint if it is called after one.
	const isMockData = useMockData();

	if (
		newFiles.length === 0 &&
		removedIds.length === 0 &&
		Object.keys(visibilityUpdates).length === 0
	) {
		return null;
	}

	if (isMockData) {
		return updateMockGrievanceAttachments({
			supplierKpiId,
			newFiles,
			removedIds,
			visibilityUpdates,
		}) as SupplierKpiGrievanceEnvelope;
	}

	const formData = new FormData();
	for (const attachment of newFiles) {
		formData.append("information_collection_attachments", attachment.file);
		formData.append(
			"information_collection_attachment_permissions",
			attachment.permission,
		);
	}
	for (const id of removedIds) {
		formData.append("remove_information_collection_attachments", String(id));
	}
	formData.append(
		"information_collection_attachment_visibility",
		JSON.stringify(visibilityUpdates),
	);

	const { data } = await api.post<SupplierKpiGrievanceEnvelope>(
		buildSupplierKpiGrievanceUrl(
			supplierKpiId,
			`/${grievanceId}/information_collection_attachments/`,
		),
		formData,
	);

	return data;
};

export const fetchSupplierKpiGrievanceHistory = async ({
	supplierKpiId,
	grievanceId,
}: {
	supplierKpiId: number;
	grievanceId: number;
}) => {
	// The History widget renders its own mock entries; nothing to fetch here.
	if (useMockData()) return [] as GrievanceHistoryEntry[];

	const { data } = await api.get<GrievanceHistoryEntry[]>(
		buildSupplierKpiGrievanceUrl(supplierKpiId, `/${grievanceId}/history/`),
	);
	return data;
};
