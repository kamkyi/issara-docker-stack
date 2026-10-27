// Stub for @mui/icons-material used in the Vitest test environment.
// Prevents Vite from opening 2 500+ individual ESM icon files (EMFILE).
// Returns a no-op React component for every named icon import.
import { forwardRef } from "react";

const IconStub = forwardRef<SVGSVGElement>(() => {
	return null as unknown as React.ReactElement;
});
IconStub.displayName = "MuiIconStub";

// ES module default and named export proxy
export default new Proxy(
	{},
	{
		get(_target, prop) {
			if (prop === "__esModule") return true;
			if (prop === "default") return IconStub;
			return IconStub;
		},
	},
);

// Named exports proxy — satisfies `import { SomeIcon } from "@mui/icons-material"`
export const SomeIcon = IconStub;
