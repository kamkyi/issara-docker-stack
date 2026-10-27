/**
 * Scrolling helpers for disclosure widgets (expandable table rows, accordion
 * steps) that reveal content the user has just asked to see.
 *
 * `Element.scrollIntoView` is not enough on the Worker-reported Violations
 * table: the expanded panel is its own `overflow-y: auto` box nested inside the
 * page scroller, and the page has a sticky navbar. `block: "start"` therefore
 * lands the target underneath the navbar, and firing it while the panel is
 * still animating open measures a height that no longer exists once the
 * transition finishes. These helpers walk the scrollable ancestors explicitly,
 * only move a container when the target is actually clipped by it, and wait for
 * the opening transition to settle before measuring.
 */

/** Fallback clearance for the sticky navbar when it cannot be measured. */
const FALLBACK_STICKY_OFFSET = 96;

export interface RevealOptions {
	/** Extra clearance at the top of the viewport, e.g. a sticky navbar. */
	offsetTop?: number;
	/** Extra clearance at the bottom of the viewport. */
	offsetBottom?: number;
	/** Overridden to "auto" when the user prefers reduced motion. */
	behavior?: ScrollBehavior;
}

export const prefersReducedMotion = (): boolean =>
	typeof window !== "undefined" &&
	typeof window.matchMedia === "function" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Height of the sticky page chrome the reveal must stay clear of. Measured from
 * the live navbar so the offset survives responsive padding changes, with a
 * constant fallback for tests and for pages that render without it.
 */
export const getStickyHeaderOffset = (): number => {
	if (typeof document === "undefined") return FALLBACK_STICKY_OFFSET;
	const header = document.querySelector("[data-sticky-header]");
	const height = header?.getBoundingClientRect().height ?? 0;
	return height > 0 ? Math.ceil(height) + 8 : FALLBACK_STICKY_OFFSET;
};

const isScrollableY = (element: Element): boolean => {
	if (typeof window.getComputedStyle !== "function") return false;
	const { overflowY } = window.getComputedStyle(element);
	return (
		(overflowY === "auto" ||
			overflowY === "scroll" ||
			overflowY === "overlay") &&
		element.scrollHeight > element.clientHeight + 1
	);
};

/** Scrollable ancestors of `element`, innermost first. */
const scrollableAncestors = (element: HTMLElement): HTMLElement[] => {
	const ancestors: HTMLElement[] = [];
	let node = element.parentElement;
	while (node && node !== document.body && node !== document.documentElement) {
		if (isScrollableY(node)) ancestors.push(node);
		node = node.parentElement;
	}
	return ancestors;
};

/**
 * The smallest scroll delta that brings `[top, bottom]` inside
 * `[viewTop, viewBottom]`. Returns 0 when it already fits, and never pushes the
 * top of the target out of view to chase its bottom edge (content taller than
 * the viewport aligns to the top).
 */
const clippedDelta = (
	top: number,
	bottom: number,
	viewTop: number,
	viewBottom: number,
): number => {
	if (top < viewTop) return top - viewTop;
	if (bottom > viewBottom) {
		return Math.max(0, Math.min(bottom - viewBottom, top - viewTop));
	}
	return 0;
};

/**
 * Bring `element` into view through every scrollable ancestor and then the
 * window. No-ops when it is already fully visible, so it never yanks the page
 * out from under someone who can already see what they clicked.
 */
export const revealElement = (
	element: HTMLElement | null | undefined,
	options: RevealOptions = {},
): void => {
	if (!element || typeof window === "undefined") return;

	const { offsetTop = 0, offsetBottom = 0 } = options;
	const behavior: ScrollBehavior = prefersReducedMotion()
		? "auto"
		: (options.behavior ?? "smooth");

	const containers = scrollableAncestors(element);

	// Innermost first: each scroll changes the element's viewport position, so
	// re-measure between containers rather than batching the deltas.
	for (const container of containers) {
		const target = element.getBoundingClientRect();
		const box = container.getBoundingClientRect();
		const delta = clippedDelta(target.top, target.bottom, box.top, box.bottom);
		if (delta !== 0 && typeof container.scrollBy === "function") {
			container.scrollBy({ top: delta, behavior });
		}
	}

	// Once the inner scrollers have done their part the element sits inside the
	// innermost container's visible region, so that container — not the element
	// itself — is what the page needs to bring on screen.
	const reference = containers[0] ?? element;
	const rect = reference.getBoundingClientRect();
	const delta = clippedDelta(
		rect.top,
		rect.bottom,
		offsetTop,
		window.innerHeight - offsetBottom,
	);
	if (delta !== 0 && typeof window.scrollBy === "function") {
		window.scrollBy({ top: delta, behavior });
	}
};

export interface ScheduleRevealOptions extends RevealOptions {
	/**
	 * Element whose `transitionend` marks the panel as fully open. Measuring
	 * before that point reveals a height the panel no longer has.
	 */
	transitionTarget?: HTMLElement | null;
	/** Safety net for interrupted or absent transitions. */
	timeout?: number;
}

/**
 * Reveal `element` once its opening transition has settled. Returns a cleanup
 * that cancels a pending reveal — call it from the effect that scheduled it so
 * a quick re-collapse never scrolls after the fact.
 */
export const scheduleReveal = (
	element: HTMLElement | null | undefined,
	{ transitionTarget, timeout = 400, ...options }: ScheduleRevealOptions = {},
): (() => void) => {
	if (!element || typeof window === "undefined") return () => {};

	let cancelled = false;
	let frame = 0;

	const detach = () => {
		window.clearTimeout(timer);
		transitionTarget?.removeEventListener("transitionend", onTransitionEnd);
	};

	const run = () => {
		if (cancelled) return;
		detach();
		// One frame after the transition so the final layout is committed.
		frame = window.requestAnimationFrame(() => {
			if (!cancelled) revealElement(element, options);
		});
	};

	function onTransitionEnd(event: TransitionEvent) {
		if (event.target === transitionTarget) run();
	}

	const timer = window.setTimeout(run, timeout);
	transitionTarget?.addEventListener("transitionend", onTransitionEnd);

	return () => {
		cancelled = true;
		window.cancelAnimationFrame(frame);
		detach();
	};
};
