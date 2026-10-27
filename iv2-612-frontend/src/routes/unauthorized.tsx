import { createFileRoute } from "@tanstack/react-router";
import UnauthorizedAccess from "$src/components/auth/UnauthorizedAccess";

export const Route = createFileRoute("/unauthorized")({
	component: UnauthorizedPage,
});

function UnauthorizedPage() {
	return <UnauthorizedAccess />;
}
