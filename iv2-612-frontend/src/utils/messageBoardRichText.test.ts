import { describe, expect, it } from "vitest";
import {
	messageHtmlToPlainText,
	plainTextToMessageHtml,
	sanitizeMessageHtml,
} from "./messageBoardRichText";

describe("messageBoardRichText", () => {
	it("wraps plain text in safe paragraphs", () => {
		expect(plainTextToMessageHtml("Hello\nteam\n\nNext <step>")).toBe(
			"<p>Hello<br>team</p><p>Next &lt;step&gt;</p>",
		);
	});

	it("keeps supported formatting and removes unsafe attributes", () => {
		const html = sanitizeMessageHtml(
			'<p onclick="bad()"><strong>Hello</strong> <a href="https://example.com" onclick="bad()">link</a></p>',
		);

		expect(html).toContain("<strong>Hello</strong>");
		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('rel="noopener noreferrer"');
		expect(html).not.toContain("onclick");
	});

	it("drops scripts and unsafe links", () => {
		const html = sanitizeMessageHtml(
			'<p>Safe<script>alert("bad")</script><a href="javascript:alert(1)">bad</a></p>',
		);

		expect(html).toBe("<p>Safebad</p>");
		expect(html).not.toContain("script");
		expect(html).not.toContain("javascript:");
	});

	it("normalizes legacy font tags from browser editing commands", () => {
		const html = sanitizeMessageHtml(
			'<font color="#148696" size="4">Styled</font>',
		);

		expect(html).toBe(
			'<span style="color: #148696; font-size: 18px;">Styled</span>',
		);
	});

	it("extracts plain text for validation", () => {
		expect(messageHtmlToPlainText("<p><br></p>")).toBe("");
		expect(messageHtmlToPlainText("<p>Hello <strong>team</strong></p>")).toBe(
			"Hello team",
		);
	});
});
