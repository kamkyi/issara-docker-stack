import { HomeIcon } from "@radix-ui/react-icons";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { authStatus } from "$src/queries/auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { getHomeRoute } from "$src/utils/homeRoute";

const BREADCRUMB_LABEL_KEYS: Record<string, string> = {
	"company-profile": "navigation.companyProfile",
	"company-dashboard": "navigation.companyDashboard",
	"hrdd-overview": "navigation.hrddOverview",
	"lksg-overview": "navigation.lksgOverview",
	"social-responsibility-workplan": "navigation.socialResponsibilityWorkplan",
	"our-workplace": "navigation.ourWorkplace",
	"view-worker-feedback": "navigation.viewWorkerFeedback",
	"message-board": "navigation.messageBoard",
	"workforce-polls": "navigation.workforcePolls",
	"responsible-procurement": "navigation.responsibleProcurement",
	"member-directory": "navigation.memberDirectory",
	"recruitment-agencies": "navigation.recruitmentAgencies",
	suppliers: "navigation.suppliers",
	detail: "common.details",
	"cascade-marketplace": "navigation.cascadeMarketplace",
};

const formatSegmentLabel = (segment: string) => {
	let label = segment.replace(/-/g, " ");
	label = label.replace(/\b\w/g, (char) => char.toUpperCase());
	return label;
};

export function Breadcrumbs() {
	const { state } = useRouter();
	const { theme } = useTheme();
	const { t } = useTranslation();
	const { isAuthenticated, role } = authStatus();
	const viewMode = useViewModeStore((state) => state.viewMode);

	// The /company-dashboard route serves the supplier's Company Dashboard or the
	// strategic partner's HRDD Overview depending on role/view mode. Mirror the
	// route's showSupplier logic so the breadcrumb label matches the page (and the
	// nav item).
	const getSegmentLabelKey = (segment: string) => {
		if (segment === "company-dashboard") {
			const { isSupplier, isGlobalPartner } = getUserIdentifiers();
			const showSupplier = isGlobalPartner
				? viewMode === "supplier-view"
				: isSupplier || viewMode === "supplier-view";
			return showSupplier
				? "navigation.companyDashboard"
				: "navigation.hrddOverview";
		}
		return BREADCRUMB_LABEL_KEYS[segment];
	};

	// Home follows the active view mode: internal users who switch to the
	// supplier / buyer / RA view must not be sent to /internal-dashboard, which
	// is guarded on the ILM view and would bounce them to /unauthorized.
	const homeHref = isAuthenticated ? getHomeRoute(role, viewMode) : "/";

	const pathname = state.location.pathname; // e.g. "/member-directory/detail"
	const segments = pathname.split("/").filter(Boolean); // ["member-directory", "detail"]

	// Build breadcrumb data: [{name, href}]
	const crumbs = segments.map((seg, index) => {
		const href = "/" + segments.slice(0, index + 1).join("/");
		const labelKey = getSegmentLabelKey(seg);
		const fallbackLabel =
			labelKey === "navigation.hrddOverview"
				? "HRDD Overview"
				: formatSegmentLabel(seg);
		const label = labelKey
			? t(labelKey, { defaultValue: fallbackLabel })
			: fallbackLabel;
		return { label, href };
	});

	return (
		<nav className="flex items-center text-sm z-10 backdrop-blur-md rounded-sm">
			<div
				className="flex rounded-xl p-3 gap-2"
				style={{
					color: theme === "dark" ? "#e4e4e4" : "#004A60",
					background: theme === "dark" ? "rgba(20, 134, 150,0.8)" : "#FFFFFF",
				}}
			>
				{/* Home */}
				{crumbs.length === 0 ? (
					<span className="flex items-center gap-2 font-medium text-[#56666C]">
						<HomeIcon className="text-[#004A60]" />
						{t("common.home", { defaultValue: "Home" })}
					</span>
				) : (
					<a
						className="flex items-center gap-2 text-[#004A60] hover:text-[#004A60] hover:underline transition-colors duration-200"
						href={homeHref}
					>
						<HomeIcon className="text-[#004A60]" />
						{t("common.home", { defaultValue: "Home" })}
					</a>
				)}

				{crumbs.map((crumb, index) => {
					const isLast = index === crumbs.length - 1;
					return (
						<span className="flex items-center gap-2" key={crumb.href}>
							<span className="text-gray-400">{">"}</span>
							{isLast ? (
								<span className="font-medium text-[#56666C]">
									{crumb.label}
								</span>
							) : (
								<a
									className="text-[#004A60] hover:text-[#004A60] hover:underline transition-colors duration-200"
									href={crumb.href}
								>
									{crumb.label}
								</a>
							)}
						</span>
					);
				})}
			</div>
		</nav>
	);
}
