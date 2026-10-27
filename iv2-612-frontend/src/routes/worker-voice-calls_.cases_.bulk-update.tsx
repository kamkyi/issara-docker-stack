import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import CsoBulkUpdatePage, {
	parseIds,
} from "$src/components/routes/CsoCaseManagement/CsoBulkUpdatePage";
import PageContainer from "$src/components/ui/PageContainer";
import PageHeader from "$src/components/ui/PageHeader";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useCaseManagementContext } from "$src/queries/csoCaseManagement";
import { requireCsoAuth } from "$src/utils/auth";

interface BulkUpdateSearch {
	ids: string;
	org?: number;
}

export const Route = createFileRoute("/worker-voice-calls_/cases_/bulk-update")(
	{
		beforeLoad: () => {
			const { isAuthenticated, role } = authStatus();
			requireCsoAuth({ isAuthenticated, role });
		},
		// The queue passes its selection through the URL, like legacy
		// `/admin/supplier-kpi-bulk-update?ids=`, so the page survives a reload.
		//
		// `org` is omitted entirely when absent rather than set to `undefined`:
		// the router serialises search to the URL and re-validates what comes
		// back, and a key that exists in the object but vanishes from the URL
		// never compares equal, so every navigation triggers another one. That
		// loop crashes the tab rather than throwing.
		validateSearch: (search: Record<string, unknown>): BulkUpdateSearch => {
			const org = search.org ? Number(search.org) : undefined;
			return {
				ids: typeof search.ids === "string" ? search.ids : "",
				...(org ? { org } : {}),
			};
		},
		component: RouteComponent,
	},
);

function RouteComponent() {
	const { t } = useTranslation();
	const { ids, org } = Route.useSearch();
	const navigate = useNavigate();
	const context = useCaseManagementContext(org ?? null);

	return (
		<GuestLayout>
			<PageContainer>
				<PageHeader
					subtitle={t("workerVoicePage.cases.bulkUpdate.subtitle")}
					title={t("workerVoicePage.cases.bulkUpdate.title")}
				/>
				<CsoBulkUpdatePage
					ids={parseIds(ids)}
					onIdsChange={(next) =>
						void navigate({
							to: "/worker-voice-calls/cases/bulk-update",
							replace: true,
							// Same reason as `validateSearch`: never send an `org` key
							// holding `undefined`.
							search: { ids: next.join(","), ...(org ? { org } : {}) },
						})
					}
					selectedOrganizationId={org ?? null}
					statuses={context.data?.statuses ?? []}
				/>
			</PageContainer>
		</GuestLayout>
	);
}
