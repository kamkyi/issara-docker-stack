import { Theme } from "@radix-ui/themes";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createIDBPersister } from "$src/persisters/indexed-db";
import { queryClient } from "$src/queries/queryClient";
import { router } from "$src/router";
import "@radix-ui/themes/styles.css";
import { ThemeProvider } from "next-themes";
import "react-datepicker/dist/react-datepicker.css";
import "./styles/global.css";
import { RouterProvider } from "@tanstack/react-router";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import flagsmith from "flagsmith";
import { FlagsmithProvider } from "flagsmith/react";
import { initGA, trackPageview } from "$src/analytics/gtag";
import { setAuthToken } from "./api/axios";

import { ActionStatusOverlay } from "./components/feedback/ActionStatusOverlay";
// Import the ToastProvider component
import { ToastProvider } from "./components/toast/ToastProvider";
// Import the database to ensure it's initialized
import { db } from "./db/database";
// Import i18n configuration
import { i18nReady } from "./i18n";
import { syncService } from "./services/sync-service";

// Initialize the persister with our Dexie implementation
const persister = createIDBPersister();

// Auto-reload on chunk load errors (dynamic import failures due to new deployments)
if (typeof window !== "undefined") {
	const handleChunkError = (message: string) => {
		if (
			message.includes("Failed to fetch dynamically imported module") ||
			message.includes("error loading dynamically imported module")
		) {
			const now = Date.now();
			const lastReload = sessionStorage.getItem("last_chunk_reload");
			if (!lastReload || now - Number(lastReload) > 10000) {
				sessionStorage.setItem("last_chunk_reload", String(now));
				console.warn("Chunk load error detected. Reloading page...");
				window.location.reload();
			}
		}
	};

	window.addEventListener(
		"error",
		(event) => {
			if (event.message) handleChunkError(event.message);
		},
		true,
	);

	window.addEventListener("unhandledrejection", (event) => {
		const reason = event.reason;
		const message = reason?.message || String(reason);
		if (message) handleChunkError(message);
	});
}

// Check database connection
db.open()
	.then(() => console.log("Database initialized successfully"))
	.catch((err) => console.error("Failed to initialize database:", err));

// Try to sync data on startup, but don't block the app if it fails
setTimeout(() => {
	syncService
		.performFullSync()
		.catch((err) =>
			console.log("Initial sync failed (continuing in offline mode):", err),
		);
}, 2000);

const token = localStorage.getItem("auth_token");
setAuthToken(token || undefined);

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error('Root element with id "root" was not found');
}

// Conditionally load Atlassian Jira issue collector (provides the "Got feedback?" tab)
(() => {
	if (typeof window === "undefined") return;
	const path = window.location.pathname || "";
	const excludedPrefixes = [
		"/about",
		"/social-responsibility",
		"/interactive-map",
		"/environmental-impact",
	];
	// Exclude the home page only when path is exactly '/'
	const isHome = path === "/";
	// If the current path is NOT an excluded menu page and not the exact home page, load the collector
	if (!isHome && !excludedPrefixes.some((p) => path.startsWith(p))) {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.defer = true;
		script.src =
			"https://issaradevteam.atlassian.net/s/d41d8cd98f00b204e9800998ecf8427e-T/-yl7qth/b/9/c95134bc67d3a521bb3f4331beb9b804/_/download/batch/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector/com.atlassian.jira.collector.plugin.jira-issue-collector-plugin:issuecollector.js?locale=en-US&collectorId=d19c8608";
		document.head.appendChild(script);
	}
})();

// Google Analytics (production only). Fire a pageview on every route change.
const gaEnv = import.meta.env.VITE_APP_ENVIRONMENT;
if (gaEnv === "production") {
	initGA(gaEnv);
	router.subscribe("onResolved", ({ toLocation }) => {
		trackPageview(toLocation.href);
	});
}

// Wait for the initial translation bundle to load before rendering (avoids a
// flash of untranslated keys); `.finally` so a backend outage still renders
// the app instead of hanging forever.
i18nReady.finally(() => {
	createRoot(rootElement).render(
		<StrictMode>
			<AuthKitProvider clientId={import.meta.env.VITE_APP_AUTHKIT_CLIENT_ID}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					disableTransitionOnChange
					enableSystem={true}
				>
					<FlagsmithProvider
						flagsmith={flagsmith}
						options={{
							environmentID: import.meta.env.VITE_FLAGSMITH_ENVIRONMENT,
							cacheFlags: true,
						}}
					>
						<PersistQueryClientProvider
							client={queryClient}
							persistOptions={{ persister }}
						>
							<Theme radius="large">
								{/* Add ToastProvider wrapper around RouterProvider with bottom-right position */}
								<ToastProvider position="bottom-right">
									<RouterProvider
										context={{
											queryClient: queryClient,
										}}
										defaultPreload="intent"
										router={router}
									/>
									<ActionStatusOverlay />
								</ToastProvider>
							</Theme>
						</PersistQueryClientProvider>
					</FlagsmithProvider>
				</ThemeProvider>
			</AuthKitProvider>
		</StrictMode>,
	);
});
