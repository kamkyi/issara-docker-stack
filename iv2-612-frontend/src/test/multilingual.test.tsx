import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "$src/api/axios";
import { useActiveLanguage } from "$src/hooks/useActiveLanguage";
import i18n from "$src/i18n";
import { useInteractionReasons } from "$src/queries/interactionReasons";

// The lookup queries go through the shared `api` instance so requests carry
// the interceptors' auth headers, so that is what has to be mocked here.
vi.mock("$src/api/axios", () => ({ api: { get: vi.fn() } }));
const mockedApi = vi.mocked(api, true);

const wrapper = ({ children }: { children: ReactNode }) => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return (
		<QueryClientProvider client={client}>
			<I18nextProvider i18n={i18n}>{children}</I18nextProvider>
		</QueryClientProvider>
	);
};

describe("multilingual end-to-end", () => {
	beforeEach(() => {
		localStorage.setItem("auth_token", "test-token");
		mockedApi.get.mockResolvedValue({ data: [] });
	});

	afterEach(async () => {
		vi.clearAllMocks();
		localStorage.removeItem("auth_token");
		await act(async () => {
			await i18n.changeLanguage("en");
		});
	});

	it("glossary keys exist in every locale", () => {
		const keys = [
			"glossary.remediation",
			"glossary.grievance",
			"glossary.workerVoice",
			"glossary.supplier",
			"glossary.buyer",
			"glossary.recruitmentAgency",
			"glossary.supplyChain",
			"glossary.workerFeedback",
			"glossary.responsibleProcurement",
		];
		for (const lng of ["en", "ja", "km", "my", "ne", "th", "vi"]) {
			for (const key of keys) {
				const value = i18n.getFixedT(lng)(key);
				expect(value, `${lng}:${key}`).not.toBe(key);
				expect(value, `${lng}:${key}`).toBeTruthy();
			}
		}
	});

	it("responsibleProcurement.pageTitle renders different text in en vs th", () => {
		const en = i18n.getFixedT("en")("responsibleProcurement.pageTitle");
		const th = i18n.getFixedT("th")("responsibleProcurement.pageTitle");
		expect(en).toBe("CASCADING RESPONSIBLE PROCUREMENT");
		expect(th).not.toBe(en);
		expect(th).toBeTruthy();
	});

	it("useActiveLanguage tracks i18next.changeLanguage", async () => {
		const { result } = renderHook(() => useActiveLanguage(), { wrapper });
		expect(result.current).toBe("en");

		await act(async () => {
			await i18n.changeLanguage("th");
		});

		await waitFor(() => expect(result.current).toBe("th"));
	});

	it("unsupported language codes fall back to en", async () => {
		const { result } = renderHook(() => useActiveLanguage(), { wrapper });

		await act(async () => {
			await i18n.changeLanguage("fr");
		});

		await waitFor(() => expect(result.current).toBe("en"));
	});

	it("useInteractionReasons refetches with the new lang param", async () => {
		const { rerender } = renderHook(() => useInteractionReasons(), { wrapper });

		await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
		const firstUrl = mockedApi.get.mock.calls[0]?.[0];
		expect(firstUrl).toMatch(/lang=en/);

		await act(async () => {
			await i18n.changeLanguage("th");
		});
		rerender();

		await waitFor(() => {
			const urls = mockedApi.get.mock.calls.map((call) => String(call[0]));
			expect(urls.some((u) => u.includes("lang=th"))).toBe(true);
		});
	});
});
