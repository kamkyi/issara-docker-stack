import { createFileRoute, redirect } from "@tanstack/react-router";
import TrackSelection from "$src/components/routes/TrackSelection";
import { authStatus } from "$src/queries/auth";

export const Route = createFileRoute("/track-selection")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		if (!isAuthenticated) throw redirect({ to: "/" });
		if (role !== "org-supplier") throw redirect({ to: "/company-dashboard" });
	},
	component: TrackSelection,
});
