import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getCurrentViewMode,
	useViewModeStore,
	type ViewMode,
} from "$src/store/viewModeStore";

const setAuthRole = (role: string | null) => {
	if (role === null) {
		localStorage.removeItem("auth-storage");
	} else {
		localStorage.setItem(
			"auth-storage",
			JSON.stringify({ state: { role }, version: 0 }),
		);
	}
};

const resetStore = () => {
	localStorage.removeItem("view-mode-storage");
	useViewModeStore.setState({ viewMode: "" });
};

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	resetStore();
});

describe("getRoleDefaultViewMode (via resetToDefault)", () => {
	const cases: Array<[string, ViewMode]> = [
		["org-test-user", "supplier-view"],
		["org-supplier", "supplier-view"],
		["org-global-partner", "buyer-view"],
		["org-issara-management", "ilm-view"],
		["org-issara-staff", "ilm-view"],
		["org-recruiter", "ra-view"],
		["org-recruitment-agency", "ra-view"],
		["org-cso", "cso-view"],
		["org-unknown-role", ""],
	];

	it.each(cases)("maps role '%s' to view '%s'", (role, expectedView) => {
		setAuthRole(role);
		useViewModeStore.getState().resetToDefault();
		expect(useViewModeStore.getState().viewMode).toBe(expectedView);
	});
});

describe("setViewMode", () => {
	it("updates viewMode to the given value", () => {
		useViewModeStore.getState().setViewMode("buyer-view");
		expect(useViewModeStore.getState().viewMode).toBe("buyer-view");
	});

	it("can switch between any valid view modes", () => {
		const modes: ViewMode[] = [
			"buyer-view",
			"supplier-view",
			"ra-view",
			"tester-view",
			"ilm-view",
		];
		for (const mode of modes) {
			useViewModeStore.getState().setViewMode(mode);
			expect(useViewModeStore.getState().viewMode).toBe(mode);
		}
	});
});

describe("resetToDefault", () => {
	it("resets to role-based default when a role is stored", () => {
		setAuthRole("org-test-user");
		useViewModeStore.getState().setViewMode("buyer-view");
		expect(useViewModeStore.getState().viewMode).toBe("buyer-view");

		useViewModeStore.getState().resetToDefault();
		expect(useViewModeStore.getState().viewMode).toBe("supplier-view");
	});

	it("resets to empty string when no role is stored", () => {
		useViewModeStore.getState().setViewMode("supplier-view");
		useViewModeStore.getState().resetToDefault();
		expect(useViewModeStore.getState().viewMode).toBe("");
	});
});

describe("getCurrentViewMode", () => {
	it("returns the current view mode from the store", () => {
		useViewModeStore.getState().setViewMode("ra-view");
		expect(getCurrentViewMode()).toBe("ra-view");
	});
});

describe("persistence — switched view survives reload", () => {
	it("preserves a manually switched view mode (not reset to role default)", () => {
		// Simulate: user is a tester but switches to buyer-view
		setAuthRole("org-test-user");
		useViewModeStore.getState().setViewMode("buyer-view");

		// Simulate what persist middleware stores
		const stored = localStorage.getItem("view-mode-storage");
		expect(stored).not.toBeNull();

		// The store should still hold buyer-view (no onRehydrateStorage override)
		expect(useViewModeStore.getState().viewMode).toBe("buyer-view");
	});
});
