import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { authStatus } from "$src/queries/auth";
import { useSystemMaintenance } from "$src/queries/useSystemMaintenance";
import { MAINTENANCE_TRIGGERED_EVENT } from "$src/utils/maintenanceEvents";
import {
	MaintenanceNoticePopup,
	TopMaintenanceBanner,
} from "./MaintenanceNoticePopup";
import MaintenanceScreen from "./MaintenanceScreen";

interface MaintenanceGateProps {
	children: React.ReactNode;
}

const ADMIN_BYPASS_ROLES = ["org-issara-management", "org-issara-staff"];
const ALWAYS_ALLOWED_PATHS = ["/logout", "/auth/callback"];

export default function MaintenanceGate({ children }: MaintenanceGateProps) {
	const location = useLocation();
	const { isAuthenticated, role } = authStatus();
	const { data: status, refetch, isFetching } = useSystemMaintenance();

	// Listen for 503 maintenance triggers from Axios interceptor
	useEffect(() => {
		const handleTrigger = () => {
			void refetch();
		};
		window.addEventListener(MAINTENANCE_TRIGGERED_EVENT, handleTrigger);
		return () => {
			window.removeEventListener(MAINTENANCE_TRIGGERED_EVENT, handleTrigger);
		};
	}, [refetch]);

	const isAlwaysAllowed = ALWAYS_ALLOWED_PATHS.some((path) =>
		location.pathname.startsWith(path),
	);

	if (isAlwaysAllowed) {
		return <>{children}</>;
	}

	const isAdmin =
		isAuthenticated && Boolean(role && ADMIN_BYPASS_ROLES.includes(role));
	const canBypass = Boolean(status?.allow_admin_bypass && isAdmin);

	// 1. Active lockdown maintenance mode
	if (status?.is_maintenance_active && !canBypass) {
		return (
			<MaintenanceScreen
				isChecking={isFetching}
				onRefresh={() => refetch()}
				status={status}
			/>
		);
	}

	// 2. Advance scheduled maintenance notice
	if (status?.is_scheduled_notice_active) {
		return (
			<>
				<TopMaintenanceBanner status={status} />
				<MaintenanceNoticePopup status={status} />
				{children}
			</>
		);
	}

	// 3. Normal operation
	return <>{children}</>;
}
