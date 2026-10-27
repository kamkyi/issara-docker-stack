import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireCsoOrSupplierAuth } from "$src/utils/auth";

export const Route = createFileRoute("/cso-suppliers")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoOrSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

// CSO UI v1 — placeholder. The suppliers listing is not wired up yet.
function RouteComponent() {
	const { t } = useTranslation();

	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader title={t("suppliersDirectoryPage.title")} />
			</PageContainer>
		</GuestLayout>
	);
}
