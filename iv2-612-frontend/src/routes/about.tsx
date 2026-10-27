import { createFileRoute } from "@tanstack/react-router";
import { About } from "$src/components/routes/About";

export const Route = createFileRoute("/about")({
	component: About,
});
