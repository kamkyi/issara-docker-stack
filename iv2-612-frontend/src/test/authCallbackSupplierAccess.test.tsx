import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import { AuthCallback } from "$src/routes/auth/callback";
import {
	getSupplierTrackQueryKey,
	getSupplierTrackStatus,
} from "$src/services/supplierTrackService";
import useAuthData from "$src/store/store.auth";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useNavigate: () => navigate,
}));

vi.mock("jwt-decode", () => ({
	jwtDecode: () => ({
		exp: Math.floor(Date.now() / 1000) + 3_600,
		sid: "session_test",
	}),
}));

vi.mock("$src/api/axios", () => ({
	api: { post: vi.fn() },
	setAuthToken: vi.fn(),
}));

vi.mock("$src/utils/debug", () => ({
	debugWorkOSCallback: vi.fn(),
}));

vi.mock("$src/services/supplierTrackService", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("$src/services/supplierTrackService")
	>()),
	getSupplierTrackStatus: vi.fn(),
}));

const callbackData = {
	token: "access-token",
	session: {
		accessToken: "access-token",
		refreshToken: "refresh-token",
	},
	user: {
		id: "user_supplier",
		email: "supplier@example.test",
	},
	authorization: { groups: ["Supplier"] },
};

const trackStatus = {
	supplier_id: 17792,
	supplier_name: "Supplier One",
	track_selection: null,
	license_agreed_at: null,
	agreement_signer_name: null,
	agreement_signer_title: null,
	agreement_signer_affiliation: null,
	agreement_version: "cascade-full-access-v1.0",
	agreement_sections: [],
	access_status: "NOT_SELECTED" as const,
	access_changed_at: null,
	needs_track_selection: true,
};

const renderCallback = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return {
		queryClient,
		...render(
			<QueryClientProvider client={queryClient}>
				<AuthCallback />
			</QueryClientProvider>,
		),
	};
};

describe("supplier authentication callback access resolution", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		window.history.replaceState({}, "", "/auth/callback?code=test-code");
		useAuthData.setState({ role: null, session: null });
		vi.clearAllMocks();
		vi.mocked(api.post)
			.mockResolvedValueOnce({ data: callbackData })
			.mockResolvedValueOnce({ data: { status: "success" } });
	});

	it("keeps an unassigned supplier off the dashboard with an actionable message", async () => {
		vi.mocked(getSupplierTrackStatus).mockRejectedValue({
			response: {
				status: 403,
				data: { message: "No supplier is associated with this account" },
			},
		});

		renderCallback();

		expect(
			await screen.findByRole("heading", {
				name: "Supplier assignment required",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Sign out" }),
		).toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalledWith({ to: "/company-dashboard" });
	});

	it("caches successful supplier status before navigating to track selection", async () => {
		vi.mocked(getSupplierTrackStatus).mockResolvedValue(trackStatus);

		const { queryClient } = renderCallback();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/track-selection" });
		});
		expect(getSupplierTrackStatus).toHaveBeenCalledOnce();
		expect(
			queryClient.getQueryData(getSupplierTrackQueryKey("user_supplier")),
		).toEqual(trackStatus);
	});

	it("resolves supplier access on an already-processed callback", async () => {
		sessionStorage.setItem("processed_test-code", "true");
		localStorage.setItem(
			"auth-storage",
			JSON.stringify({ state: { role: "org-supplier" } }),
		);
		localStorage.setItem("auth_user", JSON.stringify({ id: "user_supplier" }));
		vi.mocked(getSupplierTrackStatus).mockResolvedValue({
			...trackStatus,
			track_selection: "MARKETPLACE",
			needs_track_selection: false,
		});

		renderCallback();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/cascade-marketplace" });
		});
		expect(api.post).not.toHaveBeenCalled();
		expect(getSupplierTrackStatus).toHaveBeenCalledOnce();
	});

	it("retries transient failure during supplier resolution before succeeding", async () => {
		vi.mocked(getSupplierTrackStatus)
			.mockRejectedValueOnce(new Error("Network Error"))
			.mockResolvedValueOnce(trackStatus);

		renderCallback();

		await waitFor(
			() => {
				expect(navigate).toHaveBeenCalledWith({ to: "/track-selection" });
			},
			{ timeout: 3000 },
		);
		expect(getSupplierTrackStatus).toHaveBeenCalledTimes(2);
	});
});
