/**
 * `useCsoAudience` is the single place the Worker Voice queries learn which UI
 * is on screen. It reads the Tester Floating Button's view mode, which is the
 * only signal available: the button deliberately does not mint a CSO token, so
 * nothing on the request can otherwise distinguish "Management testing the CSO
 * form" from "Management using ILM".
 */
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useCsoAudience } from "$src/hooks/useCsoAudience";
import { useViewModeStore, type ViewMode } from "$src/store/viewModeStore";

describe("useCsoAudience", () => {
	beforeEach(() => {
		act(() => useViewModeStore.getState().setViewMode(""));
	});

	it("is on in CSO view", () => {
		act(() => useViewModeStore.getState().setViewMode("cso-view"));

		expect(renderHook(() => useCsoAudience()).result.current).toBe(true);
	});

	it.each<ViewMode>([
		"ilm-view",
		"supplier-view",
		"buyer-view",
		"ra-view",
		"tester-view",
		"",
	])("is off in %s", (mode) => {
		act(() => useViewModeStore.getState().setViewMode(mode));

		expect(renderHook(() => useCsoAudience()).result.current).toBe(false);
	});

	it("follows a switch out of CSO view without a reload", () => {
		act(() => useViewModeStore.getState().setViewMode("cso-view"));
		const { result, rerender } = renderHook(() => useCsoAudience());
		expect(result.current).toBe(true);

		act(() => useViewModeStore.getState().setViewMode("ilm-view"));
		rerender();

		// Management -> CSO -> Management restores the Management lookups; paired
		// with the csoOnly-aware query keys, nothing is served from the CSO
		// view's cache entry afterwards.
		expect(result.current).toBe(false);
	});
});
