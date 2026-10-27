export default {
  // Format and lint-fix all staged JS/TS/JSON/CSS files with Biome
  "**/*.{js,jsx,ts,tsx,json,css}": (filenames) => [
    `npx biome check --write ${filenames.join(" ")}`,
  ],
  // Run only tests related to staged source/test files
  "**/*.{ts,tsx}": () => "npx vitest run --passWithNoTests --reporter=verbose",
};
