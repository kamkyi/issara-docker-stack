/**
 * The Worker Voice lookups must follow the *view* the officer is looking at,
 * not the Django groups on the token.
 *
 * An Issara Management account that picks "CSO" in the Tester Floating Button
 * gets the CSO Worker Voice UI while still holding a Management token, so
 * without an explicit `cso_only=true` the server hands back the Issara-worded
 * rows and the tester reviews a form no CSO will ever see. These tests pin both
 * the parameter and the cache key: React Query is persisted to IndexedDB for a
 * day with no buster, so a key shared between the two audiences would keep
 * serving the Management list after a switch into CSO view.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import { useClientTypes } from "./clientTypes";
import { useInteractionChannels } from "./interactionChannels";
import { useInteractionReasons } from "./interactionReasons";

vi.mock("$src/api/axios", () => ({
	api: { get: vi.fn() },
}));

vi.mock("$src/hooks/useActiveLanguage", () => ({
	useActiveLanguage: () => "en",
}));

const mockApiGet = vi.mocked(api.get);

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { wrapper, queryClient };
};

/**
 * The three hooks return differently shaped payloads, so the array is typed on
 * what these tests actually read -- whether the query resolved.
 */
interface LookupUnderTest {
	name: string;
	cso: () => { isSuccess: boolean };
	plain: () => { isSuccess: boolean };
	keyPrefix: string;
}

const lookups: LookupUnderTest[] = [
	{
		name: "useClientTypes",
		cso: () => useClientTypes("en", { csoOnly: true }),
		plain: () => useClientTypes("en"),
		keyPrefix: "clientTypes",
	},
	{
		name: "useInteractionReasons",
		cso: () => useInteractionReasons({ csoOnly: true }),
		plain: () => useInteractionReasons(),
		keyPrefix: "interactionReasons",
	},
	{
		name: "useInteractionChannels",
		cso: () => useInteractionChannels({ csoOnly: true }),
		plain: () => useInteractionChannels(),
		keyPrefix: "interactionChannels",
	},
];

describe("Worker Voice lookups follow the CSO view", () => {
	beforeEach(() => {
		localStorage.setItem("auth_token", "test-token");
		mockApiGet.mockReset();
		mockApiGet.mockResolvedValue({ data: [] });
	});

	for (const lookup of lookups) {
		describe(lookup.name, () => {
			it("asks for the CSO rows when the CSO view is on screen", async () => {
				const { wrapper } = createWrapper();
				const { result } = renderHook(lookup.cso, { wrapper });

				await waitFor(() => expect(result.current.isSuccess).toBe(true));

				expect(mockApiGet).toHaveBeenCalledWith(
					expect.stringContaining("cso_only=true"),
					expect.any(Object),
				);
			});

			it("leaves every other caller's request untouched", async () => {
				const { wrapper } = createWrapper();
				const { result } = renderHook(lookup.plain, { wrapper });

				await waitFor(() => expect(result.current.isSuccess).toBe(true));

				expect(mockApiGet).toHaveBeenCalledWith(
					expect.not.stringContaining("cso_only"),
					expect.any(Object),
				);
			});

			it("caches the two audiences under different keys", async () => {
				const { wrapper, queryClient } = createWrapper();

				const cso = renderHook(lookup.cso, { wrapper });
				await waitFor(() => expect(cso.result.current.isSuccess).toBe(true));

				const plain = renderHook(lookup.plain, { wrapper });
				await waitFor(() => expect(plain.result.current.isSuccess).toBe(true));

				const keys = queryClient
					.getQueryCache()
					.findAll({ queryKey: [lookup.keyPrefix] })
					.map((query) => query.queryKey);

				// Two entries, not one: switching the Tester Floating Button between
				// Management and CSO must not be answered out of the other view's
				// persisted cache.
				expect(keys).toHaveLength(2);
				expect(keys).toContainEqual([
					lookup.keyPrefix,
					"en",
					{ csoOnly: true },
				]);
				expect(keys).toContainEqual([
					lookup.keyPrefix,
					"en",
					{ csoOnly: false },
				]);
			});
		});
	}
});
