import { createLazyFileRoute } from "@tanstack/react-router";
import { Logout } from "$components/routes/Logout";

export const Route = createLazyFileRoute("/logout")({
	component: Logout,
});
