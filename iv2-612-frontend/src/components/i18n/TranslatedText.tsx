import type { ElementType } from "react";
import { useTranslateText } from "$src/queries/useTranslateText";

interface TranslatedTextProps {
	/** The dynamic/server string to translate into the active language. */
	text: string | null | undefined;
	/** Element to render into (default: React fragment / plain text). */
	as?: ElementType;
	className?: string;
}

/**
 * Renders a dynamic/server string translated into the active i18next language.
 * Static UI copy should keep using the `t()` helper — this is only for free-form
 * content that never lived in the locale JSONs (worker feedback, case text, etc.).
 *
 * While the translation loads (or for English), the original text is shown, so there is
 * never a blank flash.
 */
const TranslatedText = ({ text, as, className }: TranslatedTextProps) => {
	const { text: translated } = useTranslateText(text);

	if (as) {
		const Tag = as;
		return <Tag className={className}>{translated}</Tag>;
	}
	return <>{translated}</>;
};

export default TranslatedText;
