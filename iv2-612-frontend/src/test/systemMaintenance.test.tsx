import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MaintenanceGate from "$src/components/maintenance/MaintenanceGate";
import {
	MaintenanceNoticePopup,
	TopMaintenanceBanner,
} from "$src/components/maintenance/MaintenanceNoticePopup";
import MaintenanceScreen from "$src/components/maintenance/MaintenanceScreen";
import {
	formatLocalTimestamp,
	formatUtcTimestamp,
	type SystemMaintenanceStatus,
} from "$src/services/systemMaintenanceService";

// Mock router
vi.mock("@tanstack/react-router", () => ({
	useLocation: () => ({ pathname: "/company-profile" }),
	useNavigate: () => vi.fn(),
}));

// Mock auth query
const mockAuthStatus = vi.fn();
vi.mock("$src/queries/auth", () => ({
	authStatus: () => mockAuthStatus(),
}));

// Mock maintenance query
const mockUseSystemMaintenance = vi.fn();
vi.mock("$src/queries/useSystemMaintenance", () => ({
	useSystemMaintenance: () => mockUseSystemMaintenance(),
}));

describe("System Maintenance formatting helpers", () => {
	it("formats UTC and Local timestamps properly", () => {
		const iso = "2026-08-20T06:00:00.000Z";
		const utcStr = formatUtcTimestamp(iso);
		expect(utcStr).toContain("Aug 20, 2026");
		expect(utcStr).toContain("UTC");

		const localStr = formatLocalTimestamp(iso);
		expect(localStr).toContain("2026");
	});

	it("returns empty string for null or invalid dates", () => {
		expect(formatUtcTimestamp(null)).toBe("");
		expect(formatLocalTimestamp("invalid-date")).toBe("");
	});
});

describe("MaintenanceScreen", () => {
	it("renders the scheduled maintenance title and dynamic message", () => {
		const mockStatus: SystemMaintenanceStatus = {
			is_maintenance_active: true,
			is_scheduled_notice_active: false,
			mode: "FULL_LOCKDOWN",
			title: "System Upgrade in Progress",
			message:
				"CASCADE is going through a scheduled maintenance to serve you better. We will be back online by 10:00 AM ICT.",
			raw_message: null,
			start_time: "2026-08-20T02:00:00.000Z",
			end_time: "2026-08-20T06:00:00.000Z",
			display_start_time: "Aug 20, 2026 02:00 UTC",
			display_end_time: "Aug 20, 2026 06:00 UTC",
			show_advance_notice: true,
			advance_notice_hours: 24,
			allow_admin_bypass: true,
			server_time: "2026-08-20T03:00:00.000Z",
		};

		const handleRefresh = vi.fn();

		render(<MaintenanceScreen onRefresh={handleRefresh} status={mockStatus} />);

		expect(screen.getByText("System Upgrade in Progress")).toBeInTheDocument();
		expect(
			screen.getByText(
				"CASCADE is going through a scheduled maintenance to serve you better. We will be back online by 10:00 AM ICT.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /check again/i }),
		).toBeInTheDocument();
	});

	it("triggers refresh callback on button click", async () => {
		const user = userEvent.setup();
		const handleRefresh = vi.fn();

		render(
			<MaintenanceScreen
				onRefresh={handleRefresh}
				status={{
					is_maintenance_active: true,
					is_scheduled_notice_active: false,
					mode: "FULL_LOCKDOWN",
					title: "Under Maintenance",
					message: "We will be back soon.",
					raw_message: null,
					start_time: null,
					end_time: null,
					display_start_time: null,
					display_end_time: null,
					show_advance_notice: false,
					advance_notice_hours: 24,
					allow_admin_bypass: true,
					server_time: new Date().toISOString(),
				}}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /check again/i }));
		expect(handleRefresh).toHaveBeenCalledOnce();
	});
});

describe("MaintenanceNoticePopup and TopMaintenanceBanner", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it("renders top maintenance banner when scheduled notice is active", () => {
		const mockStatus: SystemMaintenanceStatus = {
			is_maintenance_active: false,
			is_scheduled_notice_active: true,
			mode: "FULL_LOCKDOWN",
			title: "Under Maintenance",
			message: "Upcoming scheduled maintenance",
			raw_message: null,
			start_time: "2026-08-20T02:00:00.000Z",
			end_time: "2026-08-20T06:00:00.000Z",
			display_start_time: "Aug 20, 2026 02:00 UTC",
			display_end_time: "Aug 20, 2026 06:00 UTC",
			show_advance_notice: true,
			advance_notice_hours: 24,
			allow_admin_bypass: true,
			server_time: "2026-08-19T03:00:00.000Z",
		};

		render(<TopMaintenanceBanner status={mockStatus} />);

		expect(screen.getByText("Maintenance Notice:")).toBeInTheDocument();
	});

	it("renders scheduled maintenance pop-up modal and allows dismissal", async () => {
		const user = userEvent.setup();
		const mockStatus: SystemMaintenanceStatus = {
			is_maintenance_active: false,
			is_scheduled_notice_active: true,
			mode: "FULL_LOCKDOWN",
			title: "Under Maintenance",
			message:
				"CASCADE will undergo scheduled maintenance during the window listed below.",
			raw_message: null,
			start_time: "2026-08-20T02:00:00.000Z",
			end_time: "2026-08-20T06:00:00.000Z",
			display_start_time: "Aug 20, 2026 02:00 UTC",
			display_end_time: "Aug 20, 2026 06:00 UTC",
			show_advance_notice: true,
			advance_notice_hours: 24,
			allow_admin_bypass: true,
			server_time: "2026-08-19T03:00:00.000Z",
		};

		render(<MaintenanceNoticePopup status={mockStatus} />);

		expect(
			screen.getByText("Scheduled Maintenance Notice"),
		).toBeInTheDocument();

		const dismissBtn = screen.getByRole("button", {
			name: /got it, thank you/i,
		});
		await user.click(dismissBtn);

		expect(
			screen.queryByText("Scheduled Maintenance Notice"),
		).not.toBeInTheDocument();
	});
});

describe("MaintenanceGate", () => {
	it("blocks normal route and displays MaintenanceScreen when maintenance is active", () => {
		mockAuthStatus.mockReturnValue({
			isAuthenticated: true,
			role: "org-supplier",
		});

		mockUseSystemMaintenance.mockReturnValue({
			data: {
				is_maintenance_active: true,
				is_scheduled_notice_active: false,
				mode: "FULL_LOCKDOWN",
				title: "Under Scheduled Maintenance",
				message:
					"CASCADE is going through a scheduled maintenance to serve you better.",
				allow_admin_bypass: true,
			},
			refetch: vi.fn(),
			isFetching: false,
		});

		render(
			<MaintenanceGate>
				<div>Protected App Content</div>
			</MaintenanceGate>,
		);

		expect(screen.getByText("Under Scheduled Maintenance")).toBeInTheDocument();
		expect(screen.queryByText("Protected App Content")).not.toBeInTheDocument();
	});

	it("allows admin bypass when user is org-issara-management and bypass is enabled", () => {
		mockAuthStatus.mockReturnValue({
			isAuthenticated: true,
			role: "org-issara-management",
		});

		mockUseSystemMaintenance.mockReturnValue({
			data: {
				is_maintenance_active: true,
				is_scheduled_notice_active: false,
				mode: "FULL_LOCKDOWN",
				title: "Under Scheduled Maintenance",
				message: "Maintenance in progress",
				allow_admin_bypass: true,
			},
			refetch: vi.fn(),
			isFetching: false,
		});

		render(
			<MaintenanceGate>
				<div>Protected App Content</div>
			</MaintenanceGate>,
		);

		expect(screen.getByText("Protected App Content")).toBeInTheDocument();
		expect(
			screen.queryByText("Under Scheduled Maintenance"),
		).not.toBeInTheDocument();
	});

	it("renders normal app content when maintenance is not active", () => {
		mockAuthStatus.mockReturnValue({
			isAuthenticated: true,
			role: "org-supplier",
		});

		mockUseSystemMaintenance.mockReturnValue({
			data: {
				is_maintenance_active: false,
				is_scheduled_notice_active: false,
				mode: "FULL_LOCKDOWN",
				allow_admin_bypass: true,
			},
			refetch: vi.fn(),
			isFetching: false,
		});

		render(
			<MaintenanceGate>
				<div>Protected App Content</div>
			</MaintenanceGate>,
		);

		expect(screen.getByText("Protected App Content")).toBeInTheDocument();
	});
});
