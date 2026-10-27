import { createLazyFileRoute } from "@tanstack/react-router";
import { PrivacyPolicy } from "$src/components/routes/PrivacyPolicy";

export const Route = createLazyFileRoute("/privacy-policy")({
	component: PrivacyPolicy,
});
