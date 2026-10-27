import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentalImpact } from "$src/components/routes/EnvironmentalImpact";

export const Route = createFileRoute("/environmental-impact")({
	component: EnvironmentalImpact,
});
