// Debug utility for WorkOS authentication
export const debugWorkOSCallback = () => {
	if (!import.meta.env.DEV) {
		return;
	}

	console.log("=== WorkOS Callback Debug ===");
	console.log("Current URL:", window.location.href);
	console.log("Search params:", window.location.search);
	console.log("Hash:", window.location.hash);

	const urlParams = new URLSearchParams(window.location.search);
	console.log("All URL params:");
	for (const [key, value] of urlParams.entries()) {
		console.log(`  ${key}: ${value}`);
	}

	console.log("Environment variables:");
	console.log("  Client ID:", import.meta.env.VITE_APP_AUTHKIT_CLIENT_ID);
	console.log("  Redirect URI:", import.meta.env.VITE_APP_AUTHKIT_REDIRECT_URI);
	console.log("  AuthKit URL:", import.meta.env.VITE_APP_AUTHKIT_URL);
	console.log("=== End Debug ===");
};
