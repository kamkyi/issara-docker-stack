import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewMode =
	| "buyer-view"
	| "supplier-view"
	| "ra-view"
	| "tester-view"
	| "ilm-view"
	| "cso-view"
	| "";

interface ViewModeState {
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	resetToDefault: () => void;
}

const getRoleDefaultViewMode = (role: string): ViewMode => {
	if (role === "org-test-user") return "supplier-view";
	if (role === "org-supplier") return "supplier-view";
	if (role === "org-global-partner") return "buyer-view";
	if (role === "org-issara-management" || role === "org-issara-staff")
		return "ilm-view";
	if (role === "org-recruiter" || role === "org-recruitment-agency")
		return "ra-view";
	if (role === "org-cso") return "cso-view";
	return "";
};

const getDefaultViewMode = (): ViewMode => {
	try {
		const authStorage = localStorage.getItem("auth-storage");
		const role = authStorage ? JSON.parse(authStorage).state?.role : null;
		if (!role) return "";
		return getRoleDefaultViewMode(role);
	} catch {
		return "";
	}
};

export const useViewModeStore = create<ViewModeState>()(
	persist(
		(set) => ({
			viewMode: getDefaultViewMode(),
			setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
			resetToDefault: () => set({ viewMode: getDefaultViewMode() }),
		}),
		{
			name: "view-mode-storage",
		},
	),
);

export const getCurrentViewMode = (): ViewMode =>
	useViewModeStore.getState().viewMode;
