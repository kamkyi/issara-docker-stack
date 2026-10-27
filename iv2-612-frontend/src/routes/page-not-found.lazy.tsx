import { createLazyFileRoute } from "@tanstack/react-router";
import { Error404Page } from "$src/pages/Error404Page";

export const Route = createLazyFileRoute("/page-not-found")({
	component: Error404Page,
});
