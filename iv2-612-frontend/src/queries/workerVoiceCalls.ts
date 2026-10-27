/**
 * Worker voice calls logged by CSO partners (IV2-582).
 *
 * A CSO records each signal it receives from a worker so forced-labour risks
 * can be monitored across supply chains. Each call is stored as an ILM `case`;
 * scoping to the signed-in user's organization is enforced server-side, so no
 * organization id is sent from the client.
 *
 * Backed by Django `/cascade/worker-voice-calls/`.
 */
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	createWorkerVoiceCase,
	deleteWorkerVoiceCase,
	fetchWorkerVoiceCase,
	fetchWorkerVoiceCases,
	updateWorkerVoiceCase,
	type WorkerVoiceCaseListParams,
	type WorkerVoiceCasePayload,
	type WorkerVoiceCaseRecord,
} from "$src/services/workerVoiceCaseService";

const LIST_KEY = ["worker-voice-calls", "list"] as const;

/**
 * The signed-in CSO's caseload, newest first: the calls its own officers logged
 * plus the ones other organizations referred to it.
 *
 * Paging, searching and the scope tabs are all server-side, so the query key
 * carries them and each change is its own request. `keepPreviousData` holds the
 * current page on screen while the next one loads, so paging, typing and
 * switching tabs never blank the table.
 */
export const useWorkerVoiceCases = ({
	limit = 25,
	offset = 0,
	search = "",
	filters = {},
	scope = "all",
	lang = "",
}: WorkerVoiceCaseListParams = {}) =>
	useQuery({
		// `lang` is part of the key because it is part of the request: the KPI
		// descriptions come back translated, and the persisted cache would
		// otherwise keep serving the previous language's rows after a switch.
		queryKey: [
			...LIST_KEY,
			{ limit, offset, search: search.trim(), filters, scope, lang },
		],
		queryFn: () =>
			fetchWorkerVoiceCases({ limit, offset, search, filters, scope, lang }),
		placeholderData: keepPreviousData,
		staleTime: 30 * 1000,
		gcTime: 5 * 60 * 1000,
	});

/** One logged call, for the edit flow. */
export const useWorkerVoiceCase = (id?: number) =>
	useQuery({
		queryKey: ["worker-voice-calls", "detail", id],
		queryFn: () => fetchWorkerVoiceCase(id as number),
		enabled: Number.isFinite(id),
		staleTime: 30 * 1000,
	});

interface SaveVariables {
	payload: WorkerVoiceCasePayload;
	attachments?: File[];
	/** Saved attachments the officer removed while editing. */
	removedAttachmentIds?: number[];
	/** Present when editing an existing call. */
	id?: number;
}

/** Log a new call, or update one the caller's organization already owns. */
export const useSaveWorkerVoiceCase = () => {
	const queryClient = useQueryClient();

	return useMutation<WorkerVoiceCaseRecord, unknown, SaveVariables>({
		mutationFn: ({
			payload,
			attachments = [],
			removedAttachmentIds = [],
			id,
		}) =>
			id
				? updateWorkerVoiceCase(id, payload, attachments, removedAttachmentIds)
				: createWorkerVoiceCase(payload, attachments),
		onSuccess: (record) => {
			void queryClient.invalidateQueries({ queryKey: LIST_KEY });
			void queryClient.invalidateQueries({
				queryKey: ["worker-voice-calls", "detail", record.id],
			});
		},
	});
};

/** Permanently remove a logged call. Organization scoping is enforced server-side. */
export const useDeleteWorkerVoiceCase = () => {
	const queryClient = useQueryClient();

	return useMutation<void, unknown, number>({
		mutationFn: (id) => deleteWorkerVoiceCase(id),
		onSuccess: (_result, id) => {
			void queryClient.invalidateQueries({ queryKey: LIST_KEY });
			// The call is gone, so a cached detail for it can only mislead the
			// next reader of that key.
			queryClient.removeQueries({
				queryKey: ["worker-voice-calls", "detail", id],
			});
		},
	});
};
