import { create } from "zustand";
import type { WorkerVoiceFormData } from "$src/components/routes/WorkerVoiceCalls/formModel";

interface WorkerVoiceDraftState {
	// In-memory only, deliberately without zustand's persist middleware. The
	// draft holds worker identity, contact details and risk levels, so it must
	// not be written to localStorage where it would outlive the session on a
	// shared machine. It survives navigating away and back, and is cleared on
	// reload or successful submit.
	draft: Partial<WorkerVoiceFormData> | null;
	setDraft: (draft: Partial<WorkerVoiceFormData>) => void;
	clearDraft: () => void;
}

export const useWorkerVoiceDraftStore = create<WorkerVoiceDraftState>(
	(set) => ({
		draft: null,
		setDraft: (draft) => set({ draft }),
		clearDraft: () => set({ draft: null }),
	}),
);
