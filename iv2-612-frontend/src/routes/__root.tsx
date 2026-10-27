import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import SupplierTrackGate from "$src/components/auth/SupplierTrackGate";
import MaintenanceGate from "$src/components/maintenance/MaintenanceGate";

export interface RootRouteContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RootRouteContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<ThemeProvider attribute="class">
			<HeadContent />
			{process.env.NODE_ENV === "development" && (
				<>
					<TanStackRouterDevtools position="bottom-left" />
					<ReactQueryDevtools initialIsOpen={false} />
				</>
			)}
			<MaintenanceGate>
				<SupplierTrackGate>
					<Outlet />
				</SupplierTrackGate>
			</MaintenanceGate>
		</ThemeProvider>
	);
}
