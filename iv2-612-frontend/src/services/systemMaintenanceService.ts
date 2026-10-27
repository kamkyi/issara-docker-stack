import { api } from "$src/api/axios";

const CASCADE_API_URL = (
	import.meta.env.VITE_APP_CASCADE_API_URL ?? ""
).replace(/\/$/, "");

export interface SystemMaintenanceStatus {
	is_maintenance_active: boolean;
	is_scheduled_notice_active: boolean;
	mode: string;
	title: string;
	message: string;
	raw_message: string | null;
	start_time: string | null;
	end_time: string | null;
	display_start_time: string | null;
	display_end_time: string | null;
	show_advance_notice: boolean;
	advance_notice_hours: number;
	allow_admin_bypass: boolean;
	server_time: string;
}

export interface SystemMaintenanceApiResponse {
	status: string;
	data: SystemMaintenanceStatus;
}

export const formatLocalTimestamp = (
	isoDateString: string | null,
	locale = "en-US",
): string => {
	if (!isoDateString) return "";
	try {
		const date = new Date(isoDateString);
		if (Number.isNaN(date.getTime())) return "";

		return new Intl.DateTimeFormat(locale, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			timeZoneName: "short",
		}).format(date);
	} catch {
		return "";
	}
};

export const formatUtcTimestamp = (isoDateString: string | null): string => {
	if (!isoDateString) return "";
	try {
		const date = new Date(isoDateString);
		if (Number.isNaN(date.getTime())) return "";

		return (
			new Intl.DateTimeFormat("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "numeric",
				minute: "2-digit",
				timeZone: "UTC",
			}).format(date) + " UTC"
		);
	} catch {
		return "";
	}
};

export const fetchSystemMaintenanceStatus =
	async (): Promise<SystemMaintenanceStatus> => {
		try {
			const res = await api.get<SystemMaintenanceApiResponse>(
				`${CASCADE_API_URL}/system-maintenance`,
				{
					// Skip auth token error popups for public status checks
					headers: {
						"X-Skip-Maintenance-Check": "true",
					},
				},
			);
			return (
				res.data?.data ?? {
					is_maintenance_active: false,
					is_scheduled_notice_active: false,
					mode: "FULL_LOCKDOWN",
					title: "Under Maintenance",
					message: "CASCADE is operating normally.",
					raw_message: null,
					start_time: null,
					end_time: null,
					display_start_time: null,
					display_end_time: null,
					show_advance_notice: false,
					advance_notice_hours: 24,
					allow_admin_bypass: true,
					server_time: new Date().toISOString(),
				}
			);
		} catch (error) {
			// If cascade API is unreachable during network downtime or 503
			console.warn("Failed to query system maintenance status", error);
			return {
				is_maintenance_active: false,
				is_scheduled_notice_active: false,
				mode: "FULL_LOCKDOWN",
				title: "Under Maintenance",
				message: "CASCADE is operating normally.",
				raw_message: null,
				start_time: null,
				end_time: null,
				display_start_time: null,
				display_end_time: null,
				show_advance_notice: false,
				advance_notice_hours: 24,
				allow_admin_bypass: true,
				server_time: new Date().toISOString(),
			};
		}
	};
