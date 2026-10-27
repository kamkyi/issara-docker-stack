// Type shim for the build-time locale script (plain .mjs, no declarations of its own),
// so tests can import its pure helpers with real types instead of `any`.
declare module "*/translate-locales.mjs" {
	export function maskPlaceholders(text: string): {
		masked: string;
		restore: (translated: string) => string;
	};
	export function digitsToInt(run: string): number;
}
