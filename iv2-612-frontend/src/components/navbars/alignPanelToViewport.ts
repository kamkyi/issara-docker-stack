/** Gap kept between a dropdown panel and the right edge of the viewport. */
const PANEL_VIEWPORT_MARGIN = 8;

/**
 * Ref callback that right-aligns a nav dropdown panel when left-aligning it
 * would push it past the viewport, which would otherwise put a horizontal
 * scrollbar on the page.
 *
 * It positions the node directly instead of through React state: Radix
 * composes this ref with its own, and that composed ref gets a new identity on
 * every render, so React re-runs the callback on every render -- driving it
 * from state is an infinite render loop. Resetting to left-aligned before
 * measuring is what makes those repeat runs idempotent.
 */
export function alignPanelToViewport(node: HTMLElement | null) {
	if (!node) return;
	node.style.left = "0";
	node.style.right = "auto";
	const { left, width } = node.getBoundingClientRect();
	if (
		left + width >
		document.documentElement.clientWidth - PANEL_VIEWPORT_MARGIN
	) {
		node.style.left = "auto";
		node.style.right = "0";
	}
}
