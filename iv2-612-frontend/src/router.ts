import { createRouter } from "@tanstack/react-router";
import { queryClient } from "$src/queries/queryClient";
import { routeTree } from "$src/routeTree.gen";
import { Error404Page } from "./pages/Error404Page";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	context: {
		queryClient: queryClient,
	},
	defaultNotFoundComponent: Error404Page,
	// defaultErrorComponent: Error500Page,
	// defaultComponent: ComingSoon,
	// defaultPendingComponent: LoadingPage,

	// Since we're using React Query, we don't want loader calls to ever be stale
	// This will ensure that the loader is always called when the route is preloaded or visited
	defaultPreloadStaleTime: 0,
	scrollRestoration: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
