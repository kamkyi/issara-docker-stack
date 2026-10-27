import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	type CsoKpiFilters,
	type CsoKpiPatch,
	fetchCaseManagementContext,
	fetchCsoCaseCall,
	fetchCsoKpiCycles,
	fetchCsoKpiDetail,
	fetchCsoKpiHistory,
	fetchCsoKpis,
	fetchCsoOrganizations,
	patchCsoKpi,
} from "$src/services/csoCaseManagementService";

export const CSO_CASE_KEY = ["cso-case-management"] as const;

export const useCaseManagementContext = (
	selectedOrganizationId?: number | null,
) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "context", selectedOrganizationId],
		queryFn: () => fetchCaseManagementContext(selectedOrganizationId),
	});

export const useCsoOrganizations = (enabled: boolean) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "organizations"],
		queryFn: fetchCsoOrganizations,
		enabled,
		staleTime: 30 * 60 * 1000,
	});

export const useCsoKpis = (filters: CsoKpiFilters, enabled: boolean) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "list", filters],
		queryFn: () => fetchCsoKpis(filters),
		enabled,
		placeholderData: keepPreviousData,
	});

export const useCsoKpiCycles = (filters: CsoKpiFilters, enabled: boolean) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "cycles", filters],
		queryFn: () => fetchCsoKpiCycles(filters),
		enabled,
		placeholderData: keepPreviousData,
	});

export const useCsoKpiDetail = (
	id: number | null,
	selectedOrganizationId?: number | null,
) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "detail", selectedOrganizationId, id],
		queryFn: () => fetchCsoKpiDetail(id as number, selectedOrganizationId),
		enabled: id !== null,
	});

export const useCsoKpiHistory = (
	id: number | null,
	selectedOrganizationId?: number | null,
) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "history", selectedOrganizationId, id],
		queryFn: () => fetchCsoKpiHistory(id as number, selectedOrganizationId),
		enabled: id !== null,
	});

export const useCsoCaseCall = (
	kpiId: number | null,
	callId: number | null,
	selectedOrganizationId?: number | null,
) =>
	useQuery({
		queryKey: [...CSO_CASE_KEY, "call", selectedOrganizationId, kpiId, callId],
		queryFn: () =>
			fetchCsoCaseCall(
				kpiId as number,
				callId as number,
				selectedOrganizationId,
			),
		enabled: kpiId !== null && callId !== null,
	});

/**
 * Fold a PATCH response into a cached KPI detail.
 *
 * Only the fields the write owns are taken. `can_edit` is the caller's
 * permission on the record rather than record data, and `calls` is not in the
 * write response at all — merging either would make the drawer hide its own
 * Edit action, or drop the related-calls list, right after a successful save.
 *
 * Exported so the behaviour is testable rather than buried in a callback.
 */
export const mergePatchedDetail = (
	previous: unknown,
	updated: unknown,
	id: number,
): unknown => {
	const current = previous as Record<string, unknown> | undefined;
	if (!current || current.id !== id) return previous;
	const { calls, can_edit, ...patched } = updated as Record<string, unknown>;
	void calls;
	void can_edit;
	return { ...current, ...patched };
};

export const usePatchCsoKpi = () => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: number; payload: CsoKpiPatch }) =>
			patchCsoKpi(id, payload),
		onSuccess: (updated, { id }) => {
			// The queue and the cycle table both change shape after an edit, so
			// they are refetched. Everything else is left alone: invalidating the
			// whole `CSO_CASE_KEY` prefix also refetched the context and *every*
			// open KPI detail, which on the bulk page means one save re-requests
			// every card on screen.
			void client.invalidateQueries({ queryKey: [...CSO_CASE_KEY, "list"] });
			void client.invalidateQueries({ queryKey: [...CSO_CASE_KEY, "cycles"] });
			// The PATCH returns the saved record, so the detail cache can be
			// updated from it rather than re-requested.
			client.setQueriesData(
				{ queryKey: [...CSO_CASE_KEY, "detail"] },
				(previous: unknown) =>
					mergePatchedDetail(previous, updated as unknown, id),
			);
			void client.invalidateQueries({
				queryKey: [...CSO_CASE_KEY, "history"],
			});
		},
	});
};
