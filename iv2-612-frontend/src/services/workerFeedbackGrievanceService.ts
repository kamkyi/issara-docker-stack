import { api } from "$src/api/axios";
import workerFeedbackGrievanceMockData from "$src/assets/mock/worker-feedback-grievances.json";
import { isWorkerFeedbackMockEnabled } from "$src/services/workerFeedbackService";

export interface ServerAttachment {
	id: number;
	name: string;
	type: string;
	file_path: string;
	permission: string;
	size: string;
}

export interface WorkerFeedbackGrievanceApiData {
	id: number;
	worker_feedback?: unknown;
	issara_context: string;
	check_with_hr: string;
	repeat_issue: string;
	information_collection_notes: string;
	zero_tolerance: string;
	reviewed_individual: string;
	involved_in_grievance: string;
	safeguarding_notes: string;
	ethical_reviewed: string;
	professional_ensured: string;
	impartial_ensured: string;
	inclusive_and_accessible: string;
	timely_and_effective: string;
	ethical_investigation_notes: string;
	investigation_their_wellbeing: string;
	need_help_with_complex_consequences: boolean;
	communication_notes: string;
	remediation: string;
	system_strengthening: string;
	trainings: string[];
	received_the_training: string;
	has_trained_impartial: string;
	information_collection_attachments?: ServerAttachment[];
	created_at?: string;
	updated_at?: string;
}

interface WorkerFeedbackGrievanceEnvelope {
	success?: boolean;
	data?: WorkerFeedbackGrievanceApiData;
	error?: string;
}

interface CreateOrUpdateWorkerFeedbackGrievancePayload {
	worker_feedback_id: number;
	issara_context: string;
	check_with_hr: string;
	repeat_issue: string;
	information_collection_notes: string;
	zero_tolerance: string;
	reviewed_individual: string;
	involved_in_grievance: string;
	safeguarding_notes: string;
	ethical_reviewed: string;
	professional_ensured: string;
	impartial_ensured: string;
	inclusive_and_accessible: string;
	timely_and_effective: string;
	ethical_investigation_notes: string;
	investigation_their_wellbeing: string;
	need_help_with_complex_consequences: boolean;
	communication_notes: string;
	remediation: string;
	system_strengthening: string;
	trainings: string[];
	received_the_training: string;
	has_trained_impartial: string;
}

const MOCK_WORKER_FEEDBACK_GRIEVANCES =
	workerFeedbackGrievanceMockData as Record<
		string,
		WorkerFeedbackGrievanceApiData
	>;

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

const buildWorkerFeedbackGrievanceUrl = (path = "") => {
	return `${buildSupplierApiBaseUrl()}/supplier/grievances${path}`;
};

export const fetchWorkerFeedbackGrievance = async (
	workerFeedbackId: number,
) => {
	if (isWorkerFeedbackMockEnabled()) {
		return MOCK_WORKER_FEEDBACK_GRIEVANCES[String(workerFeedbackId)] || null;
	}

	try {
		const { data } = await api.get<WorkerFeedbackGrievanceEnvelope>(
			`${buildWorkerFeedbackGrievanceUrl("/by_worker_feedback/")}?worker_feedback_id=${workerFeedbackId}`,
		);

		return data?.data ?? null;
	} catch (error: any) {
		if (error?.response?.status === 404) {
			return null;
		}

		throw error;
	}
};

const appendPayloadToFormData = (
	formData: FormData,
	payload: CreateOrUpdateWorkerFeedbackGrievancePayload,
) => {
	for (const [key, value] of Object.entries(payload)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				formData.append(key, String(item));
			}
			continue;
		}

		if (typeof value === "boolean") {
			formData.append(key, value ? "true" : "false");
			continue;
		}

		if (value === null || value === undefined) {
			continue;
		}

		formData.append(key, String(value));
	}
};

export const createOrUpdateWorkerFeedbackGrievance = async ({
	payload,
	newFiles = [],
	removedIds = [],
}: {
	payload: CreateOrUpdateWorkerFeedbackGrievancePayload;
	newFiles?: File[];
	removedIds?: number[];
}) => {
	if (isWorkerFeedbackMockEnabled()) {
		const mockAttachments: ServerAttachment[] = newFiles.map((file, index) => ({
			id: Date.now() + index,
			name: file.name,
			type: file.type.startsWith("image/")
				? "SPA"
				: file.type.startsWith("video/")
					? "SVA"
					: "O",
			file_path: URL.createObjectURL(file),
			permission: "Both",
			size: String(file.size),
		}));

		return {
			id: payload.worker_feedback_id,
			worker_feedback: payload.worker_feedback_id,
			issara_context: payload.issara_context,
			check_with_hr: payload.check_with_hr,
			repeat_issue: payload.repeat_issue,
			information_collection_notes: payload.information_collection_notes,
			zero_tolerance: payload.zero_tolerance,
			reviewed_individual: payload.reviewed_individual,
			involved_in_grievance: payload.involved_in_grievance,
			safeguarding_notes: payload.safeguarding_notes,
			ethical_reviewed: payload.ethical_reviewed,
			professional_ensured: payload.professional_ensured,
			impartial_ensured: payload.impartial_ensured,
			inclusive_and_accessible: payload.inclusive_and_accessible,
			timely_and_effective: payload.timely_and_effective,
			ethical_investigation_notes: payload.ethical_investigation_notes,
			investigation_their_wellbeing: payload.investigation_their_wellbeing,
			need_help_with_complex_consequences:
				payload.need_help_with_complex_consequences,
			communication_notes: payload.communication_notes,
			remediation: payload.remediation,
			system_strengthening: payload.system_strengthening,
			trainings: payload.trainings,
			received_the_training: payload.received_the_training,
			has_trained_impartial: payload.has_trained_impartial,
			information_collection_attachments: mockAttachments,
		} satisfies WorkerFeedbackGrievanceApiData;
	}

	const hasAttachmentChanges = newFiles.length > 0 || removedIds.length > 0;

	if (!hasAttachmentChanges) {
		const { data } = await api.post<WorkerFeedbackGrievanceEnvelope>(
			buildWorkerFeedbackGrievanceUrl("/create_or_update/"),
			payload,
		);
		return data?.data ?? null;
	}

	const formData = new FormData();
	appendPayloadToFormData(formData, payload);
	for (const file of newFiles) {
		formData.append("information_collection_attachments", file);
	}
	for (const id of removedIds) {
		formData.append("remove_information_collection_attachments", String(id));
	}

	const { data } = await api.post<WorkerFeedbackGrievanceEnvelope>(
		buildWorkerFeedbackGrievanceUrl("/create_or_update/"),
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		},
	);

	return data?.data ?? null;
};
