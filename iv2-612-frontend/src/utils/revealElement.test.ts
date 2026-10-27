import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getStickyHeaderOffset,
	prefersReducedMotion,
	revealElement,
	scheduleReveal,
} from "./revealElement";

type Rect = { top: number; bottom: number; height?: number };

const stubRect = (element: HTMLElement, { top, bottom }: Rect) => {
	element.getBoundingClientRect = () =>
		({ top, bottom, height: bottom - top }) as DOMRect;
};

const makeScroller = (rect: Rect) => {
	const container = document.createElement("div");
	container.style.overflowY = "auto";
	// happy-dom has no layout, so scrollHeight/clientHeight must be forced for
	// the "is this actually scrollable" check.
	Object.defineProperty(container, "scrollHeight", { value: 2000 });
	Object.defineProperty(container, "clientHeight", { value: 400 });
	stubRect(container, rect);
	container.scrollBy = vi.fn();
	document.body.append(container);
	return container;
};

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("revealElement", () => {
	it("does not scroll when the element is already fully visible", () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);

		const element = document.createElement("div");
		document.body.append(element);
		stubRect(element, { top: 200, bottom: 400 });

		revealElement(element, { offsetTop: 96 });

		expect(scrollBy).not.toHaveBeenCalled();
	});

	it("scrolls the page up when the element sits under the sticky header", () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);

		const element = document.createElement("div");
		document.body.append(element);
		stubRect(element, { top: 40, bottom: 240 });

		revealElement(element, { offsetTop: 96 });

		// 40 - 96: just enough to clear the header, no more.
		expect(scrollBy).toHaveBeenCalledWith({ top: -56, behavior: "smooth" });
	});

	it("scrolls a nested overflow container before the page", () => {
		vi.stubGlobal("scrollBy", vi.fn());
		vi.stubGlobal("innerHeight", 800);

		const container = makeScroller({ top: 100, bottom: 500 });
		const element = document.createElement("div");
		container.append(element);
		// Clipped below the panel's visible area.
		stubRect(element, { top: 600, bottom: 700 });

		revealElement(element, { offsetTop: 96 });

		expect(container.scrollBy).toHaveBeenCalledWith({
			top: 200,
			behavior: "smooth",
		});
	});

	it("aligns to the top for content taller than the viewport", () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);

		const element = document.createElement("div");
		document.body.append(element);
		stubRect(element, { top: 300, bottom: 2000 });

		revealElement(element, { offsetTop: 96 });

		expect(scrollBy).toHaveBeenCalledWith({ top: 204, behavior: "smooth" });
	});

	it("jumps instantly when the user prefers reduced motion", () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);
		vi.stubGlobal(
			"matchMedia",
			vi
				.fn()
				.mockReturnValue({ matches: true }) as unknown as typeof matchMedia,
		);

		expect(prefersReducedMotion()).toBe(true);

		const element = document.createElement("div");
		document.body.append(element);
		stubRect(element, { top: 40, bottom: 240 });

		revealElement(element, { offsetTop: 96 });

		expect(scrollBy).toHaveBeenCalledWith({ top: -56, behavior: "auto" });
	});

	it("tolerates a missing element", () => {
		expect(() => revealElement(null)).not.toThrow();
	});
});

describe("getStickyHeaderOffset", () => {
	it("measures the tagged sticky header", () => {
		const header = document.createElement("div");
		header.setAttribute("data-sticky-header", "");
		stubRect(header, { top: 0, bottom: 64 });
		document.body.append(header);

		expect(getStickyHeaderOffset()).toBe(72);
	});

	it("falls back when no sticky header is rendered", () => {
		expect(getStickyHeaderOffset()).toBe(96);
	});
});

describe("scheduleReveal", () => {
	it("waits for the panel transition before scrolling", async () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);

		const panel = document.createElement("div");
		const element = document.createElement("div");
		panel.append(element);
		document.body.append(panel);
		stubRect(element, { top: 40, bottom: 240 });

		scheduleReveal(element, { offsetTop: 96, transitionTarget: panel });
		expect(scrollBy).not.toHaveBeenCalled();

		panel.dispatchEvent(new Event("transitionend"));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(scrollBy).toHaveBeenCalledOnce();
	});

	it("cancels a pending reveal when the section closes again", async () => {
		const scrollBy = vi.fn();
		vi.stubGlobal("scrollBy", scrollBy);
		vi.stubGlobal("innerHeight", 800);

		const panel = document.createElement("div");
		const element = document.createElement("div");
		panel.append(element);
		document.body.append(panel);
		stubRect(element, { top: 40, bottom: 240 });

		const cancel = scheduleReveal(element, {
			offsetTop: 96,
			transitionTarget: panel,
		});
		cancel();
		panel.dispatchEvent(new Event("transitionend"));
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(scrollBy).not.toHaveBeenCalled();
	});
});
