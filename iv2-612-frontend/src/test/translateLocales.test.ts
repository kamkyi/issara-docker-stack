import { describe, expect, it } from "vitest";
import { maskPlaceholders } from "../../scripts/translate-locales.mjs";

/**
 * The locale-generation script shields i18next `{{var}}` placeholders behind a `@@PH<i>@@`
 * sentinel before sending strings to Google Translate, then restores them. Google sometimes
 * strips the `@@` guards or transliterates the index digit into the target script, so the
 * restore regex is deliberately lenient. These tests lock that contract down — a regression
 * here silently drops interpolation variables in languages nobody on the team reads.
 */
describe("maskPlaceholders", () => {
	it("round-trips a single placeholder when the sentinel is untouched", () => {
		const { masked, restore } = maskPlaceholders(
			"Minimum {{count}} characters",
		);
		expect(masked).not.toContain("{{count}}");
		expect(restore(masked)).toBe("Minimum {{count}} characters");
	});

	it("round-trips multiple placeholders and preserves their order", () => {
		const { masked, restore } = maskPlaceholders("{{first}} then {{second}}");
		expect(restore(masked)).toBe("{{first}} then {{second}}");
	});

	it("restores a placeholder adjacent to surrounding text", () => {
		const { masked, restore } = maskPlaceholders("Hello{{name}}!");
		expect(restore(masked)).toBe("Hello{{name}}!");
	});

	it("restores even when Google strips the @@ guards", () => {
		const { restore } = maskPlaceholders("Minimum {{count}} characters");
		// Simulate Google returning the anchor without the @@ sentinels. Without the guards
		// the lenient restore regex absorbs the spaces adjacent to the anchor — an accepted
		// degraded-mode tradeoff: the placeholder survives even if a surrounding space does not.
		expect(restore("อย่างน้อย PH0 ตัวอักษร")).toBe("อย่างน้อย{{count}}ตัวอักษร");
	});

	it("restores when Google transliterates the index digit into a non-Latin script", () => {
		const { restore } = maskPlaceholders("{{a}} and {{b}}");
		// Thai digit ๐ (U+0E50) for 0, ๑ (U+0E51) for 1 — the restore normalizes across scripts.
		// Guards stripped here too, so adjacent whitespace is absorbed; both vars are restored.
		expect(restore("PH๐ และ PH๑")).toBe("{{a}}และ{{b}}");
	});

	it("leaves text without placeholders unchanged", () => {
		const { masked, restore } = maskPlaceholders("No placeholders here");
		expect(masked).toBe("No placeholders here");
		expect(restore(masked)).toBe("No placeholders here");
	});
});
