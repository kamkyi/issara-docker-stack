import { api } from "$src/api/axios";
import { clearAllClientCache } from "$src/utils/clearCache";

const logoutFromBackend = async (
	accessToken?: string | null,
): Promise<boolean> => {
	try {
		if (!accessToken) {
			console.warn("No access token found for backend logout");
			return false;
		}

		await api.post(import.meta.env.VITE_APP_API_GATEWAY_URL + "/auth/logout", {
			accessToken,
		});

		return true;
	} catch (error) {
		console.error("Error calling /auth/logout:", error);
		return false;
	}
};

const logoutOthersFromBackend = async (
	accessToken?: string | null,
): Promise<boolean> => {
	try {
		if (!accessToken) {
			console.warn("No access token found for backend logout others");
			return false;
		}

		await api.post(
			import.meta.env.VITE_APP_API_GATEWAY_URL + "/auth/logout/others",
			{
				accessToken,
			},
		);

		return true;
	} catch (error) {
		console.error("Error calling /auth/logout/others:", error);
		return false;
	}
};

export const handleSignOutOtherDevices = async (): Promise<boolean> => {
	const accessToken = localStorage.getItem("auth_token");
	return logoutOthersFromBackend(accessToken);
};

export const handleForceSignOut = async ({
	signOut,
	session: _session,
}: {
	signOut: () => Promise<void>;
	session?: string | null;
}) => {
	const accessToken = localStorage.getItem("auth_token");

	try {
		// Notify backend to terminate authkit session for this access token.
		const backendLogoutSuccess = await logoutFromBackend(accessToken);
		if (backendLogoutSuccess) {
			console.log("Backend logout successful");
		}

		// Try WorkOS signOut (may fail if backend already revoked session).
		try {
			await signOut();
		} catch (signOutError) {
			console.warn(
				"WorkOS signOut failed (expected if session already revoked):",
				signOutError,
			);
		}
	} catch (error) {
		console.error("Error during force sign out:", error);
	} finally {
		// Clear all client-side cache and force reload.
		await clearAllClientCache({ reload: true });
	}
};
