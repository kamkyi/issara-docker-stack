import { describe, expect, it } from "vitest";
import { alignPanelToViewport } from "$src/components/navbars/alignPanelToViewport";
import { isMenuVisibleForSupplierTrack } from "$src/components/navbars/supplierTrackMenu";

describe("supplier track navbar visibility", () => {
	it("shows only the CASCADE Marketplace menu for Marketplace suppliers", () => {
		expect(
			isMenuVisibleForSupplierTrack("cascade-marketplace", "MARKETPLACE"),
		).toBe(true);
		expect(isMenuVisibleForSupplierTrack("company", "MARKETPLACE")).toBe(false);
		expect(isMenuVisibleForSupplierTrack("employee", "MARKETPLACE")).toBe(
			false,
		);
		expect(
			isMenuVisibleForSupplierTrack("member-directory", "MARKETPLACE"),
		).toBe(false);
	});

	it("does not hide supplier menus for Full Access or unresolved tracks", () => {
		expect(isMenuVisibleForSupplierTrack("company", "FULL")).toBe(true);
		expect(isMenuVisibleForSupplierTrack("employee", null)).toBe(true);
	});
});

describe("nav dropdown panel alignment", () => {
	// jsdom does no layout, so clientWidth is 0 unless we say otherwise.
	const setViewportWidth = (width: number) =>
		Object.defineProperty(document.documentElement, "clientWidth", {
			configurable: true,
			value: width,
		});

	const panel = (left: number, width: number) => {
		const node = document.createElement("div");
		node.getBoundingClientRect = () =>
			({ left, width, right: left + width }) as DOMRect;
		return node;
	};

	it("leaves a panel left-aligned when it fits", () => {
		setViewportWidth(1280);
		const node = panel(100, 200);
		alignPanelToViewport(node);
		expect(node.style.left).toBe("0px");
		expect(node.style.right).toBe("auto");
	});

	it("right-aligns a panel that would run past the viewport", () => {
		setViewportWidth(1000);
		const node = panel(900, 300);
		alignPanelToViewport(node);
		expect(node.style.left).toBe("auto");
		expect(node.style.right).toBe("0px");
	});

	it("is idempotent, because Radix re-runs the ref on every render", () => {
		// Driving this from state instead looped until React bailed out with
		// "Maximum update depth exceeded".
		setViewportWidth(1000);
		const node = panel(900, 300);
		alignPanelToViewport(node);
		alignPanelToViewport(node);
		alignPanelToViewport(node);
		expect(node.style.left).toBe("auto");
		expect(node.style.right).toBe("0px");
	});

	it("ignores the unmount call", () => {
		expect(() => alignPanelToViewport(null)).not.toThrow();
	});
});
