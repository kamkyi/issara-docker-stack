import { createLazyFileRoute } from "@tanstack/react-router";
import WorkerVoice from "$components/routes/WorkerVoice";

export const Route = createLazyFileRoute("/worker-voice")({
	component: WorkerVoice,
});
