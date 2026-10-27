import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import { useReferralActions } from "./referralActions";

vi.mock("$src/api/axios", () => ({
	api: { get: vi.fn() },
}));

const mockApiGet = vi.mocked(api.get);

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("useReferralActions", () => {
	beforeEach(() => {
		localStorage.setItem("auth_token", "test-token");
		mockApiGet.mockReset();
		mockApiGet.mockResolvedValue({ data: [] });
	});

	it("opts the Worker Voice lookup into CSO-only filtering", async () => {
		const { result } = renderHook(
			() => useReferralActions("en", { csoOnly: true }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockApiGet).toHaveBeenCalledWith(
			expect.stringContaining("cso_only=true"),
			expect.any(Object),
		);
	});

	it("leaves existing callers on the legacy API behavior", async () => {
		const { result } = renderHook(() => useReferralActions("en"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockApiGet).toHaveBeenCalledWith(
			expect.not.stringContaining("cso_only"),
			expect.any(Object),
		);
	});
});
