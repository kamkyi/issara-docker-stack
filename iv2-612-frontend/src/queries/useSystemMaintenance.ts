import { useQuery } from "@tanstack/react-query";
import {
	fetchSystemMaintenanceStatus,
	type SystemMaintenanceStatus,
} from "$src/services/systemMaintenanceService";

export const SYSTEM_MAINTENANCE_QUERY_KEY = ["system-maintenance"] as const;

export const useSystemMaintenance = (enabled = true) => {
	return useQuery<SystemMaintenanceStatus>({
		queryKey: SYSTEM_MAINTENANCE_QUERY_KEY,
		queryFn: fetchSystemMaintenanceStatus,
		enabled,
		refetchInterval: 30_000,
		refetchOnWindowFocus: true,
		staleTime: 10_000,
	});
};
