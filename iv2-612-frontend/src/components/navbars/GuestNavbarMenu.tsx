import { Diversity1, RecordVoiceOver } from "@mui/icons-material";
import {
	BarChartIcon,
	CalendarIcon,
	ChatBubbleIcon,
	CheckCircledIcon,
	ComponentInstanceIcon,
	DashboardIcon,
	EnvelopeClosedIcon,
	HomeIcon,
	LayersIcon,
	Link2Icon,
	PersonIcon,
	PieChartIcon,
	RocketIcon,
} from "@radix-ui/react-icons";
import type { ComponentType } from "react";

type MenuIcon = ComponentType<{
	className?: string;
}>;

const SocialResponsibilityOverviewIcon: MenuIcon = ({ className }) => (
	<Diversity1 className={className} style={{ fontSize: 18 }} />
);

const WorkerVoiceIcon: MenuIcon = ({ className }) => (
	<RecordVoiceOver className={className} style={{ fontSize: 18 }} />
);

export interface GuestNavbarSubMenuItem {
	id: string;
	label: string;
	icon: MenuIcon;
	url: string;
	flags: string[];
	disabled?: boolean;
	restrictRole?: RoleSlug[];
	// When true, the item is visible only to Issara Staff / Issara Management
	// / test users in their real role context. Impersonation view modes
	// (supplier-view, buyer-view, ra-view, tester-view) hide it.
	staffOnly?: boolean;
}

export interface GuestNavbarMenuItem {
	id: string;
	label: string;
	icon: MenuIcon;
	flags: string[];
	url?: string;
	subMenu?: GuestNavbarSubMenuItem[];
	restrictRole?: RoleSlug[];
	staffOnly?: boolean;
}

export type RoleSlug =
	| "org-global-partner"
	| "org-recruiter"
	| "org-recruitment-agency"
	| "org-supplier"
	| "org-issara-management"
	| "org-issara-staff"
	| "org-cso"
	| "org-test-user";

const MarketplaceIcon = ({ className }: { className?: string }) => {
	return (
		<img
			alt="marketplace-icon"
			className={className}
			src="https://staging.app.golden-dreams.org/static/media/icon-marketplace.png"
			width={22}
		/>
	);
};

export const GuestNavbarMenu: GuestNavbarMenuItem[] = [
	{
		id: "latest-in-ilm",
		label: "Latest in ILM",
		icon: RocketIcon,
		url: "/latest-in-ilm",
		flags: ["show_latest_in_ilm"],
	},
	{
		id: "company",
		label: "Overview",
		icon: BarChartIcon,
		flags: ["show_company_dashboard", "show_company_workplanning"],
		subMenu: [
			{
				id: "organization-profile",
				label: "Organization Profile",
				url: "/organization-profile",
				icon: PersonIcon,
				flags: [],
				restrictRole: [
					"org-global-partner",
					"org-issara-management",
					"org-issara-staff",
					"org-recruiter",
					"org-supplier",
				],
			},
			{
				id: "company-profile",
				label: "Company Profile",
				icon: PersonIcon,
				url: "/company-profile",
				flags: [],
				restrictRole: ["org-recruiter", "org-cso"],
			},
			{
				id: "company-dashboard",
				label: "Company Dashboard",
				icon: DashboardIcon,
				url: "/company-dashboard",
				flags: ["show_company_dashboard"],
			},
			{
				id: "hrdd-overview",
				label: "HRDD Overview",
				icon: DashboardIcon,
				url: "/hrdd-overview",
				flags: ["show_company_dashboard"],
				restrictRole: ["org-cso", "org-recruiter", "org-global-partner"],
			},
			{
				id: "lksg-overview",
				label: "LkSG Overview",
				icon: DashboardIcon,
				url: "/lksg-overview",
				flags: ["show_company_dashboard"],
			},
			{
				id: "company-supply-chain",
				label: "Supply Chain Mapping",
				icon: Link2Icon,
				url: "/company-supply-chain",
				flags: ["show_company_dashboard"],
				disabled: true,
			},
			{
				id: "cso-suppliers",
				label: "Suppliers",
				icon: ComponentInstanceIcon,
				url: "/cso-suppliers",
				flags: [],
				restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
			},
			{
				id: "message-board-overview",
				label: "Message Board",
				icon: EnvelopeClosedIcon,
				url: "/message-board",
				flags: [],
				restrictRole: ["org-supplier", "org-recruiter"],
			},
		],
	},
	{
		id: "worker-voice",
		label: "Worker Voice",
		icon: WorkerVoiceIcon,
		flags: [],
		restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
		subMenu: [
			{
				id: "worker-voice-add",
				label: "Add Worker Voice",
				icon: PersonIcon,
				url: "/worker-voice-calls",
				flags: [],
				restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
			},
			{
				id: "worker-voice-view",
				label: "View Worker Voice",
				icon: ChatBubbleIcon,
				url: "/worker-voice-calls/view",
				flags: [],
				restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
			},
			{
				id: "worker-voice-cases",
				label: "Case Management",
				icon: CheckCircledIcon,
				url: "/worker-voice-calls/cases",
				flags: [],
				restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
			},
		],
	},
	{
		id: "employee",
		label: "Company Grievance Mechanism",
		icon: PersonIcon,
		flags: [
			"show_our_workplace",
			"show_worker_feedback",
			"show_view_worker_feedback",
		],
		subMenu: [
			{
				id: "worker-reported-issues",
				label: "Worker Reported Issues",
				icon: WorkerVoiceIcon,
				url: "/worker-reported-issues",
				flags: ["show_worker_reported_issues"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "our-workplace",
				label: "Our Workplace",
				icon: HomeIcon,
				url: "/our-workplace",
				flags: ["show_our_workplace"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "worker-feedback",
				label: "Add Worker Feedback",
				icon: PersonIcon,
				url: "/worker-feedback",
				flags: ["show_worker_feedback"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "view-worker-feedback",
				label: "View Worker Feedback",
				icon: ChatBubbleIcon,
				url: "/view-worker-feedback",
				flags: ["show_view_worker_feedback"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "message-board",
				label: "Message Board",
				icon: EnvelopeClosedIcon,
				url: "/message-board",
				flags: ["show_message_board"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "workforce-polls",
				label: "Workforce Polls",
				icon: PieChartIcon,
				url: "/workforce-polls",
				flags: ["show_workforce_polls"],
				restrictRole: ["org-global-partner"],
			},
			{
				id: "marketplace",
				label: "Marketplace",
				icon: MarketplaceIcon,
				url: "/marketplace",
				flags: ["show_marketplace"],
				restrictRole: ["org-global-partner"],
			},
		],
		restrictRole: ["org-global-partner"],
	},
	{
		id: "responsible-procurement",
		label: "Responsible Procurement",
		icon: CheckCircledIcon,
		url: "/responsible-procurement",
		flags: ["show_better_buying"],
		restrictRole: ["org-global-partner"],
	},
	{
		id: "social",
		label: "Social Responsibility",
		icon: LayersIcon,
		flags: ["show_suppliers", "show_recruitment_agencies"],
		subMenu: [
			{
				id: "social-responsibility-overview",
				label: "Social Responsibility Overview",
				icon: SocialResponsibilityOverviewIcon,
				url: "/social-responsibility-overview",
				flags: ["show_our_workplace"],
				restrictRole: ["org-recruiter"],
			},
			{
				id: "worker-reported-issues",
				label: "Worker Reported Issues",
				icon: WorkerVoiceIcon,
				url: "/social-responsibility/worker-reported-issues",
				flags: ["show_worker_reported_issues"],
				restrictRole: ["org-supplier", "org-recruiter"],
			},
			{
				id: "social-responsibility-workplan",
				label: "Social Responsibility Workplan",
				icon: CalendarIcon,
				url: "/social-responsibility-workplan",
				flags: ["show_company_workplanning"],
				restrictRole: ["org-supplier"],
			},
		],
	},
	{
		id: "continuous-improvement",
		label: "Continuous Improvement",
		icon: PersonIcon,
		url: "/continuous-improvement",
		flags: ["show_member_directory"],
		restrictRole: ["org-supplier", "org-recruiter", "org-global-partner"],
	},
	{
		id: "ilm-management",
		label: "ILM Management",
		icon: DashboardIcon,
		flags: [],
		restrictRole: [
			"org-supplier",
			"org-recruiter",
			"org-global-partner",
			"org-cso",
			"org-test-user",
		],
		subMenu: [
			{
				id: "internal-dashboard",
				label: "Internal Dashboard",
				icon: DashboardIcon,
				url: "/internal-dashboard",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "metrics-entry",
				label: "Metrics Entry",
				icon: BarChartIcon,
				url: "/metrics-entry",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "message-board-mgmt",
				label: "Message Board",
				icon: EnvelopeClosedIcon,
				url: "/message-board",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "user-logins",
				label: "User Logins",
				icon: CheckCircledIcon,
				url: "/user-logins",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "access-requests",
				label: "Access Requests",
				icon: PersonIcon,
				url: "/access-requests",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "marketplace-management",
				label: "Marketplace Management",
				icon: MarketplaceIcon,
				url: "/marketplace-management",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
			{
				id: "product-roadmap",
				label: "Product Roadmap",
				icon: CalendarIcon,
				url: "/product-roadmap",
				flags: [],
				restrictRole: [
					"org-supplier",
					"org-recruiter",
					"org-global-partner",
					"org-cso",
					"org-test-user",
				],
			},
		],
	},
	{
		id: "cascade-marketplace",
		label: "CASCADE Marketplace",
		icon: PersonIcon,
		url: "/cascade-marketplace",
		flags: ["show_cascade_marketplace"],
		restrictRole: [],
	},
	{
		id: "supply",
		label: "Supply Chain Designer",
		icon: LayersIcon,
		flags: ["show_suppliers", "show_recruitment_agencies"],
		restrictRole: ["org-global-partner"],
		subMenu: [
			{
				id: "suppliers",
				label: "Ethical Supply Chain Designer",
				icon: ComponentInstanceIcon,
				url: "/suppliers",
				flags: ["show_suppliers"],
				restrictRole: ["org-recruiter"],
			},
			{
				id: "recruitment-agencies",
				label: "Recruitment Agencies",
				icon: Link2Icon,
				url: "/recruitment-agencies",
				flags: ["show_recruitment_agencies"],
				restrictRole: ["org-supplier"],
			},
		],
	},
	{
		id: "member-directory",
		label: "Member Directory",
		icon: PersonIcon,
		url: "/member-directory",
		flags: ["show_member_directory"],
		restrictRole: [],
	},
];
