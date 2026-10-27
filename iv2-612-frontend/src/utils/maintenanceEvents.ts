export const MAINTENANCE_TRIGGERED_EVENT = "cascade:maintenance_triggered";

export const isMaintenance503Error = (status?: number, data?: any): boolean => {
	if (status !== 503) return false;
	if (!data) return true;
	if (data.error === "MAINTENANCE_MODE" || data.status === "maintenance")
		return true;
	return true;
};
