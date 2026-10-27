import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { getStoredRole } from "$src/utils/storedRole";

const hasFeature = vi.fn(() => false);

vi.mock("flagsmith", () => ({
	default: {
		hasFeature: (...args: unknown[]) =>
			(hasFeature as unknown as (...a: unknown[]) => boolean)(...args),
	},
}));

beforeEach(() => {
	localStorage.clear();
	// Mock data is driven entirely by the Flagsmith `use_mock_data` flag. Pin it
	// off so these cases exercise the role-based path; the flag behaviour is
	// covered explicitly below.
	hasFeature.mockReturnValue(false);
});

afterEach(() => {
	vi.clearAllMocks();
});

const setAuthStorageRole = (role: string) =>
	localStorage.setItem("auth-storage", JSON.stringify({ state: { role } }));

describe("getStoredRole", () => {
	it("prefers the auth_user role slug", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-supplier" }),
		);
		setAuthStorageRole("org-issara-management");

		expect(getStoredRole()).toBe("org-supplier");
	});

	it("normalizes the CSO group to org-cso and treats it as external", async () => {
		localStorage.setItem("auth_user", JSON.stringify({ groups: ["CSO"] }));

		expect(getStoredRole()).toBe("org-cso");
		// CSOs are real partners, not internal Issara accounts: they must see live
		// data, never the mock fixtures org-test-user is pinned to.
		const { isInternalRole } = await import("$src/utils/storedRole");
		expect(isInternalRole("org-cso")).toBe(false);
	});

	it("normalizes WorkOS group names to role slugs", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ groups: ["Issara Management"] }),
		);

		expect(getStoredRole()).toBe("org-issara-management");

		localStorage.setItem("auth_user", JSON.stringify({ groups: ["Tester"] }));

		expect(getStoredRole()).toBe("org-test-user");
	});

	it("falls back to the persisted auth-storage role", () => {
		localStorage.setItem("auth_user", JSON.stringify({ email: "a@b.c" }));
		setAuthStorageRole("org-issara-staff");

		expect(getStoredRole()).toBe("org-issara-staff");
	});

	it("returns null when no source carries a role", () => {
		expect(getStoredRole()).toBeNull();
	});
});

describe("internal users always get mock data", () => {
	it("recognises a management user whose auth_user carries the group name", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ groups: ["Issara Management"] }),
		);

		expect(useMockData()).toBe(true);
		expect(getUserIdentifiers().isTestUser).toBe(true);
	});

	it("recognises a staff user whose auth_user was never written", () => {
		setAuthStorageRole("org-issara-staff");

		expect(useMockData()).toBe(true);
		expect(getUserIdentifiers().isTestUser).toBe(true);
	});

	it("forces mock for every role when the Flagsmith flag is on", () => {
		// Each Flagsmith environment (development / staging / production) owns its
		// own `use_mock_data` value.
		hasFeature.mockReturnValue(true);
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-supplier", supplier: 1113 }),
		);

		expect(useMockData()).toBe(true);
	});

	it("leaves a supplier on live data", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-supplier", supplier: 1113 }),
		);
		setAuthStorageRole("org-supplier");

		expect(useMockData()).toBe(false);
		expect(getUserIdentifiers()).toMatchObject({
			isSupplier: true,
			isTestUser: false,
			supplierId: 1113,
		});
	});
});
