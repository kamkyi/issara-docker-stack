import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";
import useAuthData from "$src/store/store.auth";
import { handleForceSignOut } from "$src/utils/workos-utils";

export function Logout() {
	const { signOut } = useAuth();
	const { session } = useAuthData();

	useEffect(() => {
		const performLogout = async () => {
			await handleForceSignOut({ signOut, session });
		};
		performLogout();
	}, [signOut, session]);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center">
				<h1 className="text-2xl font-bold mb-4">Logging out...</h1>
				<p>Please wait while we log you out.</p>
			</div>
		</div>
	);
}
