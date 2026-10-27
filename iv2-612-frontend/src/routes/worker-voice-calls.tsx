import { Container } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WorkerVoiceForm } from "$src/components/routes/WorkerVoiceCalls";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { requireCsoAuth } from "$src/utils/auth";
// Same page chrome as the supplier Worker Feedback form: one Radix Container,
// centred title, and the shared stepper/button styling from that stylesheet.
import "./worker-feedback.css";

interface WorkerVoiceSearch {
	editId?: number;
}

export const Route = createFileRoute("/worker-voice-calls")({
	validateSearch: (search: Record<string, unknown>): WorkerVoiceSearch => {
		const raw = search.editId;
		const parsed = typeof raw === "number" ? raw : Number(raw);
		return { editId: Number.isFinite(parsed) ? parsed : undefined };
	},
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireCsoAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { t } = useTranslation();
	const { editId } = Route.useSearch();

	return (
		<GuestLayout>
			<Container className="worker-feedback-container">
				<h1 className="heading-display mb-1.5 uppercase text-center">
					{t(
						editId ? "workerVoicePage.edit.title" : "workerVoicePage.add.title",
					)}
				</h1>
				<div className="w-full">
					<WorkerVoiceForm editId={editId} />
				</div>
			</Container>
		</GuestLayout>
	);
}
