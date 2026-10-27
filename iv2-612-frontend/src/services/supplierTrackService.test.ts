import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import {
	getStoredSupplierTrack,
	getStoredWorkosUserId,
	getSupplierPostLoginRoute,
	getSupplierTrackQueryKey,
	getSupplierTrackStatus,
	isSupplierAssignmentRequiredError,
	selectFullTrack,
	selectMarketplaceTrack,
	storeSupplierTrack,
} from "$src/services/supplierTrackService";

vi.mock("$src/api/axios", () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

const status = {
	supplier_id: 17792,
	supplier_name: "Test Supplier",
	track_selection: null,
	license_agreed_at: null,
	agreement_signer_name: null,
	agreement_signer_title: null,
	agreement_signer_affiliation: null,
	agreement_version: "cascade-full-access-v1.0",
	agreement_sections: [],
	access_status: "NOT_SELECTED",
	access_changed_at: null,
	needs_track_selection: true,
} as const;

describe("supplier track service", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		vi.stubEnv(
			"VITE_APP_CASCADE_API_URL",
			"https://cascade.example.test/api/v1/",
		);
	});

	it("loads status from the isolated supplier endpoint", async () => {
		storeSupplierTrack("FULL");
		vi.mocked(api.get).mockResolvedValue({
			data: { status: "success", data: status },
		});

		await expect(getSupplierTrackStatus()).resolves.toEqual(status);
		expect(api.get).toHaveBeenCalledWith(
			"https://cascade.example.test/api/v1/suppliers/track-selection",
		);
		expect(getStoredSupplierTrack()).toBeNull();
	});

	it("isolates cached access status by WorkOS user", () => {
		expect(getSupplierTrackQueryKey("user_one")).toEqual([
			"supplier-track-selection",
			"user_one",
		]);
		expect(getSupplierTrackQueryKey("user_two")).not.toEqual(
			getSupplierTrackQueryKey("user_one"),
		);
	});

	it("reads the current WorkOS user id from authenticated user storage", () => {
		localStorage.setItem("auth_user", JSON.stringify({ id: "user_supplier" }));
		expect(getStoredWorkosUserId()).toBe("user_supplier");
	});

	it("routes supplier status without another access lookup", () => {
		expect(getSupplierPostLoginRoute(status)).toBe("/track-selection");
		expect(
			getSupplierPostLoginRoute({
				needs_track_selection: false,
				track_selection: "MARKETPLACE",
			}),
		).toBe("/cascade-marketplace");
		expect(
			getSupplierPostLoginRoute({
				needs_track_selection: false,
				track_selection: "FULL",
			}),
		).toBe("/company-dashboard");
	});

	it("recognizes a missing supplier assignment without treating all 403s alike", () => {
		expect(
			isSupplierAssignmentRequiredError({
				response: {
					status: 403,
					data: { message: "No supplier is associated with this account" },
				},
			}),
		).toBe(true);
		expect(
			isSupplierAssignmentRequiredError({
				response: { status: 403, data: { message: "Forbidden" } },
			}),
		).toBe(false);
	});

	it("submits Marketplace without a client-controlled supplier id", async () => {
		const selected = {
			...status,
			track_selection: "MARKETPLACE" as const,
			needs_track_selection: false,
		};
		vi.mocked(api.post).mockResolvedValue({
			data: {
				status: "success",
				data: { data: selected, changed: true, email_sent: null },
			},
		});

		await selectMarketplaceTrack();
		expect(api.post).toHaveBeenCalledWith(
			"https://cascade.example.test/api/v1/suppliers/track-selection",
			{ track: "MARKETPLACE" },
		);
		expect(getStoredSupplierTrack()).toBe("MARKETPLACE");
	});

	it("submits the current agreement version for Full Access", async () => {
		const selected = {
			...status,
			track_selection: "FULL" as const,
			needs_track_selection: false,
		};
		vi.mocked(api.post).mockResolvedValue({
			data: {
				status: "success",
				data: { data: selected, changed: true, email_sent: true },
			},
		});

		await selectFullTrack({
			signerName: "Test Signer",
			signerTitle: "Compliance Manager",
			signerAffiliation: "Test Supplier",
			agreementVersion: "cascade-full-access-v1.0",
		});
		expect(api.post).toHaveBeenCalledWith(
			"https://cascade.example.test/api/v1/suppliers/track-selection",
			{
				track: "FULL",
				accepted: true,
				signer_name: "Test Signer",
				signer_title: "Compliance Manager",
				signer_affiliation: "Test Supplier",
				agreement_version: "cascade-full-access-v1.0",
			},
		);
		expect(getStoredSupplierTrack()).toBe("FULL");
	});
});
