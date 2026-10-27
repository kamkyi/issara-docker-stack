import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StepperForm } from "$src/components/workerFeedback/stepperForm";
import { GuestLayout } from "$src/layouts/GuestLayout";
import "./worker-feedback.css";
import { Container } from "@radix-ui/themes";
import { authStatus } from "$src/queries/auth";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";

interface WorkerFeedbackSearch {
	editId?: number;
}

export const Route = createFileRoute("/worker-feedback")({
	validateSearch: (search: Record<string, unknown>): WorkerFeedbackSearch => ({
		editId:
			typeof search.editId === "string"
				? Number.isFinite(Number(search.editId))
					? Number(search.editId)
					: undefined
				: typeof search.editId === "number"
					? search.editId
					: undefined,
	}),
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { editId } = Route.useSearch();
	const { t } = useTranslation();

	return (
		<GuestLayout>
			<Container className="worker-feedback-container">
				<h1 className="heading-display mb-1.5 uppercase text-center">
					{editId
						? t("workerFeedbackForm.pageTitle.edit")
						: t("workerFeedbackForm.pageTitle.create")}
				</h1>
				<div className="w-full">
					<StepperForm editId={editId} />
				</div>
			</Container>
		</GuestLayout>
	);
}
