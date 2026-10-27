import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildWorkerVerificationQrTargetUrl,
	buildWorkerVerificationTargetToken,
	canShowWorkerVerificationQr,
	fetchWorkerVerificationRequests,
	fetchWorkerVerificationWorkerProfile,
	updateWorkerVerificationRequestStatus,
} from "$src/utils/workerVerification";

vi.mock("axios");

const mockedAxiosGet = vi.mocked(axios.get);
const mockedAxiosPatch = vi.mocked(axios.patch);

beforeEach(() => {
	vi.stubEnv("VITE_APP_CASCADE_API_URL", "https://cascade.example.test/api/v1");
	mockedAxiosGet.mockReset();
	mockedAxiosPatch.mockReset();
	localStorage.clear();
});

describe("canShowWorkerVerificationQr", () => {
	it("shows the QR section for supplier roles", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-supplier"],
			}),
		).toBe(true);
		expect(
			canShowWorkerVerificationQr({
				roles: ["Supplier"],
			}),
		).toBe(true);
	});

	it("hides the QR section for recruiter roles", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-recruiter"],
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-recruitment-agency"],
			}),
		).toBe(false);
	});

	it("hides the QR section for tester users by default", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
			}),
		).toBe(false);
	});

	it("hides the QR section for unrelated roles", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-global-partner"],
			}),
		).toBe(false);
	});

	it("does not let view mode grant QR access to tester users", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
				viewMode: "supplier-view",
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
				viewMode: "ra-view",
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
				viewMode: "tester-view",
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
				viewMode: "buyer-view",
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-test-user"],
				viewMode: "ilm-view",
			}),
		).toBe(false);
	});

	it("does not let view mode grant QR access to Issara management users", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-issara-management"],
				viewMode: "ra-view",
			}),
		).toBe(false);
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-issara-management"],
				viewMode: "ilm-view",
			}),
		).toBe(false);
	});

	it("does not let view mode grant QR access to users without the gear toggle", () => {
		expect(
			canShowWorkerVerificationQr({
				roles: ["org-global-partner"],
				viewMode: "supplier-view",
			}),
		).toBe(false);
	});
});

describe("buildWorkerVerificationQrTargetUrl", () => {
	it("builds a gd-lite app deep link when a prefix is configured", () => {
		expect(
			buildWorkerVerificationQrTargetUrl({
				appLinkPrefix: "gdlite://",
				origin: "https://cascade.example.test",
				targetToken: "abc123",
			}),
		).toBe("gdlite://worker-verification?source=worker-qr&targetToken=abc123");
	});

	it("builds an Expo Go deep link when the Expo prefix is configured", () => {
		expect(
			buildWorkerVerificationQrTargetUrl({
				appLinkPrefix: "exp://192.168.1.10:8081/--",
				origin: "https://cascade.example.test",
				targetToken: "abc123",
			}),
		).toBe(
			"exp://192.168.1.10:8081/--/worker-verification?source=worker-qr&targetToken=abc123",
		);
	});

	it("falls back to the Cascade company profile URL without an app prefix", () => {
		expect(
			buildWorkerVerificationQrTargetUrl({
				origin: "https://cascade.example.test",
				targetToken: "abc123",
			}),
		).toBe(
			"https://cascade.example.test/company-profile?source=worker-qr&targetToken=abc123",
		);
	});
});

describe("buildWorkerVerificationTargetToken", () => {
	it("encodes the supplier or recruiter target for backend lookup", () => {
		const token = buildWorkerVerificationTargetToken({
			id: 17792,
			name: "Supplier One",
			type: "supplier",
		});
		const decoded = JSON.parse(
			atob(token.replace(/-/g, "+").replace(/_/g, "/")),
		);

		expect(decoded).toEqual({
			id: "17792",
			name: "Supplier One",
			type: "supplier",
		});
	});
});

describe("fetchWorkerVerificationWorkerProfile", () => {
	it("requests the worker profile using the request id and target token", async () => {
		mockedAxiosGet.mockResolvedValueOnce({
			data: {
				request: {
					id: 77,
					status: "REQUESTED",
					targetType: "supplier",
					targetId: "supplier-123",
					workerJobseekerId: 9,
					workerSnapshot: {
						full_name: "Worker One",
						email: "worker@example.test",
					},
					requestedAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-02T00:00:00Z",
				},
				worker: {
					id: 9,
					fullName: "Worker One",
					age: 31,
				},
			},
		});

		const result = await fetchWorkerVerificationWorkerProfile({
			requestId: "77",
			targetToken: "target-token",
		});

		expect(mockedAxiosGet).toHaveBeenCalledWith(
			expect.stringMatching(
				/\/worker-verification\/requests\/77\/worker-profile$/,
			),
			{
				params: {
					target_token: "target-token",
				},
			},
		);
		expect(result.request).toMatchObject({
			id: "77",
			status: "pending",
			workerId: "9",
			workerName: "Worker One",
		});
		expect(result.worker).toMatchObject({
			id: 9,
			fullName: "Worker One",
			age: 31,
		});
	});

	it("sends the Cascade auth token when one is available", async () => {
		localStorage.setItem("auth_token", "access-token");
		mockedAxiosGet.mockResolvedValueOnce({
			data: {
				request: {
					id: 77,
					status: "REQUESTED",
					workerJobseekerId: 9,
				},
				worker: {
					id: 9,
					fullName: "Worker One",
				},
			},
		});

		await fetchWorkerVerificationWorkerProfile({
			requestId: "77",
			targetToken: "target-token",
		});

		expect(mockedAxiosGet).toHaveBeenCalledWith(expect.any(String), {
			headers: {
				Authorization: "Bearer access-token",
			},
			params: {
				target_token: "target-token",
			},
		});
	});
});

describe("fetchWorkerVerificationRequests", () => {
	it("sends auth headers and maps snake_case request payloads", async () => {
		localStorage.setItem("auth_token", "access-token");
		mockedAxiosGet.mockResolvedValueOnce({
			data: {
				data: {
					requests: [
						{
							id: 81,
							requested_at: "2026-01-01T00:00:00Z",
							status: "REQUESTED",
							target_id: "17792",
							target_type: "supplier",
							updated_at: "2026-01-02T00:00:00Z",
							worker_jobseeker_id: 9,
							worker_snapshot: {
								email: "worker@example.test",
								full_name: "Worker One",
							},
						},
					],
				},
			},
		});

		const result = await fetchWorkerVerificationRequests("target-token");

		expect(mockedAxiosGet).toHaveBeenCalledWith(
			expect.stringContaining(
				"/worker-verification/targets/target-token/requests",
			),
			{
				headers: {
					Authorization: "Bearer access-token",
				},
			},
		);
		expect(result).toEqual([
			expect.objectContaining({
				id: "81",
				status: "pending",
				supplierKey: "supplier:17792",
				workerEmail: "worker@example.test",
				workerId: "9",
				workerName: "Worker One",
			}),
		]);
	});
});

describe("updateWorkerVerificationRequestStatus", () => {
	it("sends auth headers and unwraps nested response data", async () => {
		localStorage.setItem("auth_token", "access-token");
		mockedAxiosPatch.mockResolvedValueOnce({
			data: {
				data: {
					request: {
						id: 81,
						status: "VERIFIED",
						target_id: "17792",
						target_type: "supplier",
						worker_jobseeker_id: 9,
					},
				},
			},
		});

		const result = await updateWorkerVerificationRequestStatus({
			requestId: "81",
			status: "verified",
			targetToken: "target-token",
		});

		expect(mockedAxiosPatch).toHaveBeenCalledWith(
			expect.stringContaining("/worker-verification/requests/81/status"),
			{
				status: "VERIFIED",
				target_token: "target-token",
			},
			{
				headers: {
					Authorization: "Bearer access-token",
				},
			},
		);
		expect(result).toMatchObject({
			id: "81",
			status: "verified",
			supplierKey: "supplier:17792",
			workerId: "9",
		});
	});
});
