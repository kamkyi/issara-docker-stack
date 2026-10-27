import type React from "react";
import { authStatus } from "$src/queries/auth";
import type { AuthGuardProps } from "$src/types/components";
import UnauthorizedAccess from "./UnauthorizedAccess";

const AuthGuard: React.FC<AuthGuardProps> = ({
	children,
	allowedGroups = [],
	fallback,
	requireAuth = true,
}) => {
	const { isAuthenticated, role } = authStatus();

	// If authentication is not required, render children
	if (!requireAuth) {
		return <>{children}</>;
	}

	// Check if user is authenticated
	if (!isAuthenticated || !role) {
		return (
			fallback || (
				<UnauthorizedAccess
					message="Please sign in to access this content."
					showRequestForm={false}
				/>
			)
		);
	}

	// If no specific groups are required, just check authentication
	if (allowedGroups.length === 0) {
		return <>{children}</>;
	}

	return <>{children}</>;
};

export default AuthGuard;
