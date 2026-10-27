export default {
	contextSeparator: "_",
	createOldCatalogs: false,
	defaultNamespace: "translation",
	defaultValue: "",
	indentation: 2,
	input: [
		"src/**/*.{ts,tsx}",
		"!src/**/*.test.{ts,tsx}",
		"!src/assets/**",
		"!src/i18n/**",
		"!src/routeTree.gen.ts",
		"!src/vite-env.d.ts",
	],
	keepRemoved: true,
	keySeparator: ".",
	lexers: {
		ts: [
			{
				lexer: "JavascriptLexer",
				functions: ["t"],
				namespaceFunctions: ["useTranslation", "withTranslation"],
			},
		],
		tsx: [
			{
				lexer: "JsxLexer",
				attr: "i18nKey",
				componentFunctions: ["Trans"],
				functions: ["t"],
				namespaceFunctions: ["useTranslation", "withTranslation"],
			},
		],
	},
	locales: ["en", "ja", "km", "my", "ne", "th"],
	namespaceSeparator: ":",
	output: "src/i18n/locales/$LOCALE.json",
	pluralSeparator: "_",
	sort: false,
	verbose: false,
};
