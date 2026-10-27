import { useAuth } from "@workos-inc/authkit-react";
import { authStatus } from "$src/queries/auth";

const AuthDebug = () => {
	const workosAuth = useAuth();
	const customAuth = authStatus();

	return (
		<div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-md p-4 shadow-lg max-w-md z-50">
			<h3 className="font-bold text-sm mb-2">🔍 Auth Debug Info</h3>

			<div className="space-y-2 text-xs">
				<div className="border-b pb-2">
					<strong>WorkOS Auth:</strong>
					<div>Authenticated: {workosAuth.user ? "✅" : "❌"}</div>
					<div>User: {workosAuth.user ? "✅" : "❌"}</div>
					<div>User ID: {workosAuth.user?.id || "null"}</div>
					<div>Email: {workosAuth.user?.email || "null"}</div>
				</div>

				<div className="border-b pb-2">
					<strong>Custom Auth:</strong>
					<div>Authenticated: {customAuth.isAuthenticated ? "✅" : "❌"}</div>
					{/* <div>User: {customAuth.user ? "✅" : "❌"}</div>
					<div>User ID: {customAuth.user?.id || "null"}</div>
					<div>Email: {customAuth.user?.email || "null"}</div> */}
				</div>

				<div>
					<strong>LocalStorage:</strong>
					<div>Token: {localStorage.getItem("auth_token") ? "✅" : "❌"}</div>
					<div>User: {localStorage.getItem("auth_user") ? "✅" : "❌"}</div>
				</div>

				<div>
					<strong>Environment:</strong>
					<div>
						Client ID:{" "}
						{import.meta.env.VITE_APP_AUTHKIT_CLIENT_ID ? "✅" : "❌"}
					</div>
					<div>
						Redirect URI:{" "}
						{import.meta.env.VITE_APP_AUTHKIT_REDIRECT_URI ? "✅" : "❌"}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthDebug;
