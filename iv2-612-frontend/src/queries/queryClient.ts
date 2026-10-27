/* eslint-disable @typescript-eslint/no-explicit-any */
import { MutationCache, QueryClient } from "@tanstack/react-query";

interface GenericContext {
	data?: any;
	newData?: any;
	previousData?: any;
	queryKey?: any[];
}
type ContextDefinition = GenericContext & {
	[key: string]: any;
};

const shouldSkipGlobalInvalidation = (mutation: unknown) =>
	(mutation as { options?: { meta?: Record<string, unknown> } })?.options?.meta
		?.skipGlobalInvalidation === true;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// data is considered stale immediately by default
			gcTime: 1000 * 60 * 60 * 1, // 1 hour
			experimental_prefetchInRender: true,
		},
	},
	mutationCache: new MutationCache({
		onSuccess(data, variables, context, mutation) {
			if (shouldSkipGlobalInvalidation(mutation)) return;
			console.debug("queryClient.Global.onSuccess called", {
				data,
				variables,
				context,
				mutation,
			});
			console.debug(
				"Invalidating all queries after mutation success and forcing a refetch of all active queries",
			);
			queryClient.invalidateQueries({
				refetchType: "all",
			});
		},
		onSettled(data, variables, context, mutation) {
			if (shouldSkipGlobalInvalidation(mutation)) return;
			console.debug("queryClient.Global.onSettled called", {
				data,
				variables,
				context,
				mutation,
			});
			console.debug(
				"Invalidating all queries after mutation settles, but skipping a refetch in case not successful",
			);
			queryClient.invalidateQueries({
				refetchType: "none",
			});
		},
		onError(error, variables, context) {
			console.debug("queryClient.Global.onError called", {
				error,
				variables,
				context,
			});
			console.error(error);
			// Check if context is a ContextDefinition
			try {
				const resolvedContext = context as ContextDefinition;
				if (resolvedContext?.queryKey && resolvedContext.previousData) {
					queryClient.setQueryData(
						resolvedContext.queryKey,
						resolvedContext.previousData,
					);
				}
			} catch (e) {
				console.warn("Error resolving context:", e);
			}
		},
	}),
});
