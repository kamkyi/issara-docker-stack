import { createFileRoute, redirect } from "@tanstack/react-router";
import { I18nEditor } from "$src/components/dev/I18nEditor";
import { authStatus } from "$src/queries/auth";
import { isILMManagement } from "$src/utils/account";

export const Route = createFileRoute("/dev-translations")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		if (!isAuthenticated || !isILMManagement(role)) {
			throw redirect({ to: "/unauthorized" });
		}
	},
	component: I18nEditor,
});
