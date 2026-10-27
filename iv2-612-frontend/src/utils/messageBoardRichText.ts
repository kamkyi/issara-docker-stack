const ALLOWED_TAGS = new Set([
	"A",
	"B",
	"BR",
	"DIV",
	"EM",
	"FONT",
	"I",
	"LI",
	"OL",
	"P",
	"SPAN",
	"STRONG",
	"U",
	"UL",
]);

const BLOCK_TAGS = new Set(["DIV", "P"]);
const DISCARDED_TAGS = new Set(["SCRIPT", "STYLE"]);

const FONT_SIZE_BY_LEGACY_VALUE: Record<string, string> = {
	"1": "12px",
	"2": "14px",
	"3": "16px",
	"4": "18px",
	"5": "22px",
	"6": "26px",
	"7": "32px",
};

const ALLOWED_FONT_SIZES = new Set([
	"12px",
	"14px",
	"16px",
	"18px",
	"22px",
	"26px",
	"32px",
]);

const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export const RICH_TEXT_EMPTY_HTML = "<p><br></p>";

const isBrowser = () =>
	typeof window !== "undefined" && typeof document !== "undefined";

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const looksLikeHtml = (value: string): boolean =>
	/<\/?[a-z][\s\S]*>/i.test(value);

export const plainTextToMessageHtml = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) return RICH_TEXT_EMPTY_HTML;
	return trimmed
		.split(/\n{2,}/)
		.map(
			(paragraph) =>
				`<p>${paragraph
					.split(/\n/)
					.map((line) => escapeHtml(line))
					.join("<br>")}</p>`,
		)
		.join("");
};

const unwrapNode = (node: Element) => {
	const parent = node.parentNode;
	if (!parent) return;
	while (node.firstChild) parent.insertBefore(node.firstChild, node);
	parent.removeChild(node);
};

const isAllowedUrl = (href: string): boolean => {
	const trimmed = href.trim();
	if (!trimmed) return false;
	try {
		const url = new URL(trimmed, window.location.origin);
		return LINK_PROTOCOLS.has(url.protocol);
	} catch {
		return false;
	}
};

const normalizeColor = (value: string): string | null => {
	const trimmed = value.trim();
	if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed)) return trimmed;
	const rgb = trimmed.match(
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i,
	);
	if (!rgb) return null;
	const [r, g, b] = rgb.slice(1, 4).map((part) => Number(part));
	if (
		[r, g, b].some((part) => !Number.isInteger(part) || part < 0 || part > 255)
	) {
		return null;
	}
	return `rgb(${r}, ${g}, ${b})`;
};

const normalizeFontSize = (value: string | null): string | null => {
	if (!value) return null;
	const size = FONT_SIZE_BY_LEGACY_VALUE[value] ?? value.trim();
	return ALLOWED_FONT_SIZES.has(size) ? size : null;
};

const sanitizeElement = (element: Element) => {
	for (const child of Array.from(element.children)) {
		sanitizeElement(child);
	}

	const tag = element.tagName;
	if (DISCARDED_TAGS.has(tag)) {
		element.remove();
		return;
	}
	if (!ALLOWED_TAGS.has(tag)) {
		unwrapNode(element);
		return;
	}

	const doc = element.ownerDocument;
	if (tag === "B") {
		const strong = doc.createElement("strong");
		strong.innerHTML = element.innerHTML;
		element.replaceWith(strong);
		return;
	}
	if (tag === "I") {
		const em = doc.createElement("em");
		em.innerHTML = element.innerHTML;
		element.replaceWith(em);
		return;
	}
	if (BLOCK_TAGS.has(tag)) {
		const paragraph = doc.createElement("p");
		paragraph.innerHTML = element.innerHTML || "<br>";
		element.replaceWith(paragraph);
		return;
	}

	const color =
		element instanceof HTMLElement ? normalizeColor(element.style.color) : null;
	const fontSize =
		element instanceof HTMLElement
			? normalizeFontSize(element.style.fontSize)
			: null;
	const legacyColor =
		tag === "FONT" ? normalizeColor(element.getAttribute("color") ?? "") : null;
	const legacySize =
		tag === "FONT" ? normalizeFontSize(element.getAttribute("size")) : null;

	const href = tag === "A" ? (element.getAttribute("href") ?? "") : "";

	for (const attr of Array.from(element.attributes)) {
		element.removeAttribute(attr.name);
	}

	if (tag === "A") {
		if (!isAllowedUrl(href)) {
			unwrapNode(element);
			return;
		}
		element.setAttribute("href", href.trim());
		element.setAttribute("target", "_blank");
		element.setAttribute("rel", "noopener noreferrer");
	}

	if (tag === "SPAN" || tag === "FONT") {
		const span = tag === "FONT" ? doc.createElement("span") : element;
		const resolvedColor = legacyColor ?? color;
		const resolvedSize = legacySize ?? fontSize;
		const styleParts: string[] = [];
		if (resolvedColor) styleParts.push(`color: ${resolvedColor};`);
		if (resolvedSize) {
			styleParts.push(`font-size: ${resolvedSize};`);
		}
		if (styleParts.length > 0) {
			span.setAttribute("style", styleParts.join(" "));
		}
		if (tag === "FONT") {
			span.innerHTML = element.innerHTML;
			element.replaceWith(span);
		}
	}
};

export const sanitizeMessageHtml = (value: string): string => {
	const html = looksLikeHtml(value) ? value : plainTextToMessageHtml(value);
	if (!isBrowser()) return html;

	const template = document.createElement("template");
	template.innerHTML = html;
	for (const child of Array.from(template.content.children)) {
		sanitizeElement(child);
	}
	const sanitized = template.innerHTML.trim();
	return sanitized || RICH_TEXT_EMPTY_HTML;
};

export const messageHtmlToPlainText = (value: string): string => {
	if (!value.trim()) return "";
	if (!isBrowser()) return looksLikeHtml(value) ? "" : value.trim();
	const template = document.createElement("template");
	template.innerHTML = sanitizeMessageHtml(value);
	return (template.content.textContent ?? "").replace(/\u00a0/g, " ").trim();
};

export const normalizeEditorHtml = (value: string): string =>
	sanitizeMessageHtml(value || RICH_TEXT_EMPTY_HTML);
