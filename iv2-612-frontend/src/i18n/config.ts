export const SUPPORTED_LANGUAGES = [
	"en",
	"ja",
	"km",
	"my",
	"ne",
	"th",
	"vi",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const isSupportedLanguage = (
	value: unknown,
): value is SupportedLanguage =>
	typeof value === "string" &&
	(SUPPORTED_LANGUAGES as readonly string[]).includes(value);

export const normalizeLanguage = (value: unknown): SupportedLanguage =>
	isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
