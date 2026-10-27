import { create } from "zustand";

// Centered, full-screen action feedback: a blocking loading spinner while a
// write is in flight, then an auto-dismissing success / error confirmation.
type ActionStatusKind = "loading" | "success" | "error";

interface ActionStatusState {
	kind: ActionStatusKind | null;
	message: string;
	_timer: ReturnType<typeof setTimeout> | null;
	/** Show a blocking spinner. Persists until success/error/hide is called. */
	loading: (message?: string) => void;
	/** Show a success check, auto-dismissing after a short delay. */
	success: (message: string) => void;
	/** Show an error, auto-dismissing after a slightly longer delay. */
	error: (message: string) => void;
	hide: () => void;
}

const clear = (t: ReturnType<typeof setTimeout> | null) => {
	if (t) clearTimeout(t);
};

export const useActionStatus = create<ActionStatusState>((set, get) => ({
	kind: null,
	message: "",
	_timer: null,
	loading: (message = "Working…") => {
		clear(get()._timer);
		set({ kind: "loading", message, _timer: null });
	},
	success: (message) => {
		clear(get()._timer);
		const timer = setTimeout(
			() => set({ kind: null, message: "", _timer: null }),
			1600,
		);
		set({ kind: "success", message, _timer: timer });
	},
	error: (message) => {
		clear(get()._timer);
		const timer = setTimeout(
			() => set({ kind: null, message: "", _timer: null }),
			2400,
		);
		set({ kind: "error", message, _timer: timer });
	},
	hide: () => {
		clear(get()._timer);
		set({ kind: null, message: "", _timer: null });
	},
}));
