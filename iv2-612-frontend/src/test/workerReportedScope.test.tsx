import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import { useWorkerReportedScope } from "$src/hooks/useWorkerReportedScope";

vi.mock("$src/api/axios", () => ({
	api: {
		get: vi.fn(),
	},
}));

const mockApiGet = vi.mocked(api.get);

const wrapper = ({ children }: { children: ReactNode }) => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("useWorkerReportedScope", () => {
	it("scopes a supplier to its own id", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-supplier", supplier: 1113 }),
		);

		const { result } = renderHook(() => useWorkerReportedScope(), { wrapper });

		expect(result.current).toEqual({ status: "scoped", supplierIds: [1113] });
		expect(mockApiGet).not.toHaveBeenCalled();
	});

	it("refuses to guess a supplier when the account carries no linkable id", () => {
		// Only a Golden Dreams link — previously this leaked through as
		// suppliers=<gd userId>, and the mock placeholder 17792 leaked through as
		// a real staging supplier.
		localStorage.setItem(
			"auth_user",
			JSON.stringify({
				role_slug: "org-supplier",
				links: { gd: { userId: 555 } },
			}),
		);

		const { result } = renderHook(() => useWorkerReportedScope(), { wrapper });

		expect(result.current).toEqual({ status: "unresolved", role: "supplier" });
	});

	it("scopes a global partner to every supplier in its portfolio", async () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-global-partner", partner: 28 }),
		);
		mockApiGet.mockResolvedValue({
			data: [
				{ id: 4, suppliers: [{ id: 178 }, { id: 227 }] },
				{ id: 5, suppliers: [{ id: 227 }, { id: 17792 }] },
			],
		} as never);

		const { result } = renderHook(() => useWorkerReportedScope(), { wrapper });

		await waitFor(() =>
			expect(result.current).toEqual({
				status: "scoped",
				supplierIds: [178, 227, 17792],
			}),
		);
		expect(mockApiGet).toHaveBeenCalledWith(
			expect.stringContaining("partnerId=28"),
		);
	});

	it("reports an empty portfolio rather than falling back to every supplier", async () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-global-partner", partner: 28 }),
		);
		mockApiGet.mockResolvedValue({ data: [] } as never);

		const { result } = renderHook(() => useWorkerReportedScope(), { wrapper });

		await waitFor(() =>
			expect(result.current).toEqual({ status: "emptyPortfolio" }),
		);
	});

	it("leaves internal roles unscoped so they see every supplier", () => {
		localStorage.setItem(
			"auth_user",
			JSON.stringify({ role_slug: "org-issara-staff" }),
		);

		const { result } = renderHook(() => useWorkerReportedScope(), { wrapper });

		expect(result.current).toEqual({ status: "all" });
	});
});
