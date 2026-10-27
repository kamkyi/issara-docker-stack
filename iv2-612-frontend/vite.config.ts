import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import mkcert from "vite-plugin-mkcert";
import tsconfigPaths from "vite-tsconfig-paths";
/// <reference types="vitest" />

const muteWarningsPlugin = (warningsToIgnore: string[][]): Plugin => {
  const mutedMessages = new Set();
  return {
    name: "mute-warnings",
    enforce: "pre",
    config: (userConfig) => ({
      build: {
        rollupOptions: {
          onwarn(warning, defaultHandler) {
            if (warning.code) {
              const muted = warningsToIgnore.find(
                ([code, message]) =>
                  code == warning.code && warning.message.includes(message),
              );

              if (muted) {
                mutedMessages.add(muted.join());
                return;
              }
            }

            if (userConfig.build?.rollupOptions?.onwarn) {
              userConfig.build.rollupOptions.onwarn(warning, defaultHandler);
            } else {
              defaultHandler(warning);
            }
          },
        },
      },
    }),
    closeBundle() {
      // const diff = warningsToIgnore.filter(x => !mutedMessages.has(x.join()))
      // if (diff.length > 0) {
      // 	this.warn(
      // 		'Some of your muted warnings never appeared during the build process:',
      // 	)
      // 	// diff.forEach(m => this.warn(`- ${m.join(': ')}`))
      // }
    },
  };
};

const warningsToIgnore = [
  ["SOURCEMAP_ERROR", "Can't resolve original location of error"],
  ["INVALID_ANNOTATION", "contains an annotation that Rollup cannot interpret"],
];

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/cascade/": {
        target: "https://cms.issarainstitute.org",
        changeOrigin: true,
        secure: false,
        credentials: "include",
        headers: {
          origin: "https://cascade.issarainstitute.org",
          referer: "https://cascade.issarainstitute.org/",
        },
        configure: (proxy, _options) => {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            proxyReq.setHeader("origin", "https://cascade.issarainstitute.org");
            proxyReq.setHeader(
              "referer",
              "https://cascade.issarainstitute.org/",
            );
          });
        },
      },
    },
  },
  build: {
    sourcemap: false,
  },
  define: {
    // By default, Vite doesn't include shims for NodeJS/
    // necessary for segment analytics lib to work
    global: {},
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    muteWarningsPlugin(warningsToIgnore),
    // mkcert(),
  ],
  optimizeDeps: {
    include: [
      "@mui/material",
      "@mui/material/Table",
      "@mui/material/TableBody",
      "@mui/material/TableCell",
      "@mui/material/TableContainer",
      "@mui/material/TableHead",
      "@mui/material/TableRow",
      "@mui/material/Paper",
      "@ramonak/react-progress-bar",
      "@mui/x-data-grid",
      "react-circular-progressbar",
      "motion/react-client",
      "@mui/icons-material",
      "@react-google-maps/api",
      `react-i18next`,
      `i18next-browser-languagedetector`,
    ],
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    // Pre-bundle @mui/icons-material as a single chunk so Vitest doesn't open
    // every individual ESM icon file (2 500+ files) during module resolution,
    // which hits the OS EMFILE (too many open files) limit.
    deps: {
      optimizer: {
        web: {
          include: ["@mui/icons-material"],
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/routeTree.gen.ts",
        "src/main.tsx",
      ],
    },
  },
});
