import {
	CaretDownIcon,
	Cross1Icon,
	HamburgerMenuIcon,
} from "@radix-ui/react-icons";

import { useNavigate, useRouter } from "@tanstack/react-router";
import { useFlags } from "flagsmith/react";
import type { IFlagsmithFeature } from "flagsmith/types";
import { NavigationMenu } from "radix-ui";
import type React from "react";

import "./GuestNavbar.module.css";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	GuestNavbarMenu,
	type RoleSlug,
} from "$components/navbars/GuestNavbarMenu";
import {
	getStoredSupplierTrack,
	SUPPLIER_TRACK_CHANGED_EVENT,
	type SupplierTrack,
} from "$src/services/supplierTrackService";
import useAuthData from "$src/store/store.auth";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import { useViewMode } from "../button/testerFloatingButton";
import { alignPanelToViewport } from "./alignPanelToViewport";
import { isMenuVisibleForSupplierTrack } from "./supplierTrackMenu";

/**
 * Desktop dropdown panel for a nav item that has a submenu.
 *
 * Radix leaves this panel at its trigger's left edge. For a trigger in the
 * right half of the bar that pushed the panel past the viewport, which is what
 * put a horizontal scrollbar on the page whenever the menu opened. So measure
 * the panel and right-align it when it would not otherwise fit.
 */
function NavDropdownPanel({
	background,
	children,
	drawer,
}: {
	background: string;
	children: React.ReactNode;
	drawer: boolean;
}) {
	if (drawer) {
		return (
			<NavigationMenu.Content
				className="mt-2 rounded-xl border border-white/20 p-2 shadow-sm"
				style={{ background }}
			>
				{children}
			</NavigationMenu.Content>
		);
	}

	return (
		<NavigationMenu.Content
			className="absolute top-full z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-black/5 p-2 shadow-lg backdrop-blur-md"
			ref={alignPanelToViewport}
			style={{ background }}
		>
			{children}
		</NavigationMenu.Content>
	);
}

const GUEST_NAV_LABEL_KEYS: Record<string, string> = {
	"latest-in-ilm": "navbar.guest.menu.latestInIlm",
	company: "navbar.guest.menu.overview",
	"company-profile": "navigation.companyProfile",
	"company-dashboard": "navigation.companyDashboard",
	"hrdd-overview": "navigation.hrddOverview",
	"lksg-overview": "navigation.lksgOverview",
	"company-supply-chain": "navbar.guest.menu.supplyChainMapping",
	employee: "navbar.guest.menu.companyGrievanceMechanism",
	"worker-reported-issues": "navbar.guest.menu.workerReportedIssues",
	"our-workplace": "navigation.ourWorkplace",
	"worker-feedback": "navbar.guest.menu.addWorkerFeedback",
	"view-worker-feedback": "navigation.viewWorkerFeedback",
	"message-board": "navigation.messageBoard",
	"workforce-polls": "navigation.workforcePolls",
	marketplace: "navbar.guest.menu.marketplace",
	"responsible-procurement": "navigation.responsibleProcurement",
	social: "navbar.guest.menu.socialResponsibility",
	"social-responsibility-overview":
		"navbar.guest.menu.socialResponsibilityOverview",
	labor: "navbar.guest.menu.labor",
	recruitment: "navbar.guest.menu.recruitment",
	wages: "navbar.guest.menu.wages",
	"social-responsibility-workplan": "navigation.socialResponsibilityWorkplan",
	"continuous-improvement": "navbar.guest.menu.continuousImprovement",
	"ilm-management": "navbar.guest.menu.ilmManagement",
	"internal-dashboard": "navbar.guest.menu.internalDashboard",
	"metrics-entry": "navbar.guest.menu.metricsEntry",
	"user-logins": "navbar.guest.menu.userLogins",
	"marketplace-management": "navbar.guest.menu.marketplaceManagement",
	"product-roadmap": "navbar.guest.menu.productRoadmap",
	"cascade-marketplace": "navbar.guest.menu.cascadeMarketplace",
	supply: "navigation.supplyChainDesigner",
	suppliers: "navbar.guest.menu.ethicalSupplyChainDesigner",
	"recruitment-agencies": "navigation.recruitmentAgencies",
	"member-directory": "navigation.memberDirectory",
	"cso-suppliers": "navigation.suppliers",
	"worker-voice": "navbar.guest.menu.workerVoice",
	"worker-voice-add": "navbar.guest.menu.addWorkerVoice",
	"worker-voice-view": "navbar.guest.menu.viewWorkerVoice",
	"worker-voice-cases": "navbar.guest.menu.caseManagement",
};

const ROLE_ALIASES: Record<string, RoleSlug> = {
	recruiter: "org-recruiter",
	"org-recruitment-agency": "org-recruiter",
	Recruiter: "org-recruiter",
	Supplier: "org-supplier",
	supplier: "org-supplier",
	global_partner: "org-global-partner",
};

/** The only menu items a CSO sees, whether by view mode or by real role. */
const CSO_MENU_IDS: string[] = [
	"company",
	"organization-profile",
	"cso-suppliers",
	"worker-voice",
	"worker-voice-add",
	"worker-voice-view",
	"worker-voice-cases",
];

const SUPPLIER_MENU_ORDER = [
	"company",
	"cascade-marketplace",
	"social",
	"employee",
	"member-directory",
] as const;

const normalizeRole = (value: string | null | undefined) => {
	if (!value) return null;
	return ROLE_ALIASES[value] ?? (value as RoleSlug);
};

export function GuestNavbar() {
	const [showDrawerMenu, setShowDrawerMenu] = useState(false);
	const { t } = useTranslation();
	const { viewMode } = useViewMode();
	const navigate = useNavigate();
	const { role } = useAuthData();
	const [supplierTrack, setSupplierTrack] = useState<SupplierTrack | null>(
		() => (typeof window === "undefined" ? null : getStoredSupplierTrack()),
	);
	const getMenuLabel = (id: string, fallback: string) => {
		// The /company-dashboard route renders different pages by role/view mode:
		// suppliers get the Company Dashboard, strategic partners get the HRDD
		// Overview. Mirror the route's showSupplier logic so the shared nav item
		// is labelled to match whichever page actually renders.
		if (id === "company-dashboard") {
			const { isSupplier, isGlobalPartner } = getUserIdentifiers();
			const showSupplier = isGlobalPartner
				? viewMode === "supplier-view"
				: isSupplier || viewMode === "supplier-view";
			return showSupplier
				? t("navigation.companyDashboard", { defaultValue: fallback })
				: t("navigation.hrddOverview", { defaultValue: "HRDD Overview" });
		}
		const key = GUEST_NAV_LABEL_KEYS[id];
		return key ? t(key, { defaultValue: fallback }) : fallback;
	};

	const isRecruitmentAgencyRole =
		role === "org-recruitment-agency" ||
		normalizeRole(role) === "org-recruiter";

	// A real CSO login can land with an empty viewMode — the store seeds its
	// default from localStorage at module-eval time, before auth is written, and
	// only the tester's view switcher ever recomputes it. Key off the role too so
	// the whitelist below still applies. Mirrors breadcrumb.tsx.
	const isCsoRole = normalizeRole(role) === "org-cso";

	// Function to check if menu item should be visible based on view mode
	const isMenuVisible = (menuId: string) => {
		// RA view (and users whose real role is Recruitment Agency) only see:
		// Company Profile, HRDD Overview (company dashboard), CASCADE
		// Marketplace, and Member Directory.
		if (viewMode === "ra-view" || isRecruitmentAgencyRole) {
			return [
				"company",
				"company-profile",
				"company-dashboard",
				"cascade-marketplace",
				"member-directory",
			].includes(menuId);
		}
		if (isCsoRole && !viewMode) return CSO_MENU_IDS.includes(menuId);
		switch (viewMode) {
			case "buyer-view":
				// Hide Employee Relations and Responsible Procurement for Buyer
				// Also hide continuous improvement and workplan-related tabs for Buyer
				return ![
					"responsible-procurement",
					"employee",
					"supply",
					"continuous-improvement",
					"ilm-management",
					"social-responsibility-workplan",
					"organization-profile",
					"cso-suppliers",
					"worker-voice",
				].includes(menuId);
			case "supplier-view":
				return ![
					"suppliers",
					"responsible-procurement",
					"continuous-improvement",
					"supply",
					"oceans",
					"marketplace",
					"workforce-polls",
					"message-board",
					"our-workplace",
					"ilm-management",
					"labor",
					"recruitment",
					"wages",
					"organization-profile",
				].includes(menuId);
			case "cso-view":
				return CSO_MENU_IDS.includes(menuId);
			case "ilm-view":
				return [
					"ilm-management",
					"internal-dashboard",
					"metrics-entry",
					"message-board-mgmt",
					"user-logins",
					"access-requests",
					"marketplace-management",
					"product-roadmap",
				].includes(menuId);
			default:
				// Tester and Supplier can view all pages
				return true;
		}
	};

	const isMenuDisabled = (menuId: string) => {
		if (viewMode !== "buyer-view") return false;
		return ["continuous-improvement", "supply"].includes(menuId);
	};

	// collect all flags
	const allFlags = GuestNavbarMenu.flatMap((item) => item.flags).concat(
		GuestNavbarMenu.flatMap(
			(item) => item.subMenu?.flatMap((sub) => sub.flags) || [],
		),
	);
	const flags = useFlags(allFlags) as Record<
		string,
		IFlagsmithFeature | undefined
	>;

	const handleNavigate = (url: string) => {
		navigate({ to: url });
		setShowDrawerMenu(false);
	};
	const normalizedRole = normalizeRole(role);
	const effectiveNavRole: RoleSlug | null =
		viewMode === "supplier-view"
			? "org-supplier"
			: viewMode === "buyer-view"
				? "org-global-partner"
				: viewMode === "ra-view"
					? "org-recruiter"
					: viewMode === "cso-view"
						? "org-cso"
						: normalizedRole;

	const isRestrictedRole = (restrictRole?: RoleSlug[]) => {
		if (!restrictRole) return false;
		const isRestricted = restrictRole.some(
			(restrictedRole) => effectiveNavRole === restrictedRole,
		);
		const isImpersonatingRole =
			viewMode === "supplier-view" ||
			viewMode === "buyer-view" ||
			viewMode === "ra-view" ||
			viewMode === "cso-view";
		const isManager =
			normalizedRole === "org-issara-management" ||
			normalizedRole === "org-test-user";
		const isIssaraStaff =
			normalizedRole === "org-issara-staff" ||
			normalizedRole === "org-test-user";
		const canBypassRestrictions =
			!isImpersonatingRole && (isManager || isIssaraStaff);
		return isRestricted && !canBypassRestrictions;
	};

	// Hide staff-only items unless the user is genuinely Issara staff /
	// management AND is not impersonating a non-staff role.
	const isStaffOnlyHidden = (staffOnly?: boolean) => {
		if (!staffOnly) return false;
		const isStaffLike =
			normalizedRole === "org-issara-staff" ||
			normalizedRole === "org-issara-management";
		if (!isStaffLike) return true;
		return (
			viewMode === "supplier-view" ||
			viewMode === "buyer-view" ||
			viewMode === "ra-view" ||
			viewMode === "tester-view"
		);
	};

	const { theme } = useTheme();
	const { state } = useRouter();
	const isSupplierContext =
		normalizedRole === "org-supplier" || viewMode === "supplier-view";
	const orderedMenuItems = isSupplierContext
		? [...GuestNavbarMenu].sort((left, right) => {
				const leftIndex = SUPPLIER_MENU_ORDER.indexOf(left.id as never);
				const rightIndex = SUPPLIER_MENU_ORDER.indexOf(right.id as never);

				if (leftIndex === -1 && rightIndex === -1) {
					return 0;
				}

				if (leftIndex === -1) {
					return 1;
				}

				if (rightIndex === -1) {
					return -1;
				}

				return leftIndex - rightIndex;
			})
		: GuestNavbarMenu;
	const visibleMenuItems =
		isSupplierContext && supplierTrack === "MARKETPLACE"
			? orderedMenuItems.filter((item) =>
					isMenuVisibleForSupplierTrack(item.id, supplierTrack),
				)
			: orderedMenuItems;

	const pathname = state.location.pathname; // e.g. "/member-directory/detail"

	const mobileDrawerClass =
		"fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[rgba(0,81,106,0.92)] px-5 pb-8 pt-20 text-white backdrop-blur-xl sm:hidden";

	useEffect(() => {
		if (!showDrawerMenu) return;

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [showDrawerMenu]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const syncSupplierTrack = () => setSupplierTrack(getStoredSupplierTrack());
		syncSupplierTrack();
		window.addEventListener("storage", syncSupplierTrack);
		window.addEventListener(SUPPLIER_TRACK_CHANGED_EVENT, syncSupplierTrack);

		return () => {
			window.removeEventListener("storage", syncSupplierTrack);
			window.removeEventListener(
				SUPPLIER_TRACK_CHANGED_EVENT,
				syncSupplierTrack,
			);
		};
	}, []);

	return (
		<NavigationMenu.Root
			className="sticky text-sm top-0 z-50 p-4 md:p-1 rounded-sm flex justify-between items-center "
			// Measured by getStickyHeaderOffset so scroll-into-view never lands
			// revealed content underneath this bar. See $src/utils/revealElement.
			data-sticky-header=""
			style={{
				color: theme === "dark" ? "#e4e4e4" : "#00516A",
				background: theme === "dark" ? "rgba(20, 134, 150,0.8)" : "#FFFFFF",
			}}
		>
			<div className="flex items-center gap-4 flew">
				<HamburgerMenuIcon
					className={`flex sm:hidden cursor-pointer`}
					onClick={() => setShowDrawerMenu(true)}
				/>
				<div className="hidden sm:flex items-center gap-3">
					{role === "org-test-user" && viewMode && (
						<div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
							{viewMode === "buyer-view" && t("navbar.guest.views.buyer")}
							{viewMode === "supplier-view" && t("navbar.guest.views.supplier")}
							{viewMode === "ra-view" &&
								t("navbar.guest.views.recruitmentAgency")}
							{viewMode === "tester-view" && t("navbar.guest.views.tester")}
							{viewMode === "ilm-view" && t("navbar.guest.views.ilmManagement")}
							{viewMode === "cso-view" &&
								t("navbar.guest.views.cso", { defaultValue: "CSO View" })}
						</div>
					)}
				</div>
			</div>

			<NavigationMenu.List
				className={
					showDrawerMenu
						? mobileDrawerClass
						: "hidden sm:flex flex-wrap items-center justify-end gap-1"
				}
			>
				{showDrawerMenu && (
					<button
						className="fixed right-4 top-4 flex items-center gap-2 rounded-xl border border-white/25 bg-[rgba(20,134,150,0.25)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[rgba(20,134,150,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] sm:hidden"
						onClick={() => setShowDrawerMenu(false)}
						type="button"
					>
						{t("common.close")}
						<Cross1Icon />
					</button>
				)}

				{visibleMenuItems.map((item) => {
					const {
						id,
						label,
						// icon: Icon,
						url,
						flags: itemFlags,
						subMenu,
						restrictRole,
						staffOnly,
					} = item;
					const translatedLabel = getMenuLabel(id, label);
					const shouldRender =
						itemFlags.length === 0 ||
						itemFlags.some((flag) => flags[flag]?.enabled);

					if (!shouldRender) return null;
					if (isRestrictedRole(restrictRole)) return null;
					if (isStaffOnlyHidden(staffOnly)) return null;
					if (!isMenuVisible(id)) return null; // Add view mode check
					const isDisabled = isMenuDisabled(id);

					// Dropdown with submenu
					if (subMenu) {
						if (isDisabled) {
							return (
								<NavigationMenu.Item data-onboarding-target={id} key={id}>
									<NavigationMenu.Trigger
										className={
											showDrawerMenu
												? "flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-base text-white/50"
												: "flex items-center gap-1 p-2 text-nowrap min-w-[100px] rounded-xs justify-center cursor-not-allowed opacity-50"
										}
										disabled
									>
										{translatedLabel}
										<CaretDownIcon />
									</NavigationMenu.Trigger>
								</NavigationMenu.Item>
							);
						}

						const isActive = subMenu.some((sub) => pathname === sub.url);
						return (
							<NavigationMenu.Item
								className={showDrawerMenu ? undefined : "relative"}
								data-onboarding-target={id}
								key={id}
							>
								<NavigationMenu.Trigger
									className={
										showDrawerMenu
											? "flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-base transition-all duration-200 hover:bg-white/10 data-[state=open]:bg-[rgba(20,134,150,0.45)]"
											: `flex items-center gap-1 px-5 py-2.5 cursor-pointer text-nowrap min-w-[100px] rounded-xl justify-center transition-all duration-200 ${
													isActive
														? "bg-[#A6DFDD] text-[#004A60] font-bold"
														: "text-[#00516A] hover:bg-[#FFF8DE] hover:text-[#004A60] hover:font-bold"
												}`
									}
								>
									{/* <Icon /> */}
									{translatedLabel}
									<CaretDownIcon />
								</NavigationMenu.Trigger>

								<NavDropdownPanel
									background={
										showDrawerMenu
											? "rgba(20, 134, 150,0.25)"
											: theme === "dark"
												? "rgba(20, 134, 150,0.97)"
												: "rgba(255,255,255,0.97)"
									}
									drawer={showDrawerMenu}
								>
									<ul className="flex min-w-[200px] flex-col gap-1">
										{subMenu.map((sub, index: number) => {
											const {
												id: subId,
												label: subLabel,
												icon: SubIcon,
												url: subUrl,
												flags: subFlags,
												disabled,
												restrictRole,
												staffOnly: subStaffOnly,
											} = sub;
											const translatedSubLabel = getMenuLabel(subId, subLabel);
											// Show if disabled, or if flags are enabled, or if no flags are set
											const shouldRenderSub =
												disabled ||
												subFlags.length === 0 ||
												subFlags.some((flag) => flags[flag]?.enabled);
											if (!shouldRenderSub) return null;
											if (isRestrictedRole(restrictRole)) return null;
											if (isStaffOnlyHidden(subStaffOnly)) return null;
											if (!isMenuVisible(subId)) return null; // Add view mode check

											const isSubActive = pathname === subUrl;
											return disabled ? (
												<li key={subId}>
													{index > 0 && <hr className="opacity-10" />}
													<div className="flex items-center gap-2 p-2 text-gray-400 cursor-not-allowed">
														<SubIcon /> {translatedSubLabel}
													</div>
												</li>
											) : (
												<li key={subId}>
													{index > 0 && <hr className="opacity-10" />}
													<NavigationMenu.Link
														className={
															showDrawerMenu
																? "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
																: `flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
																		isSubActive
																			? "bg-[#A6DFDD] text-[#004A60] font-bold"
																			: "text-[#00516A] hover:bg-[#FFF8DE] hover:text-[#004A60] hover:font-bold"
																	}`
														}
														onClick={() => handleNavigate(subUrl as string)}
													>
														<SubIcon /> {translatedSubLabel}
													</NavigationMenu.Link>
												</li>
											);
										})}
									</ul>
								</NavDropdownPanel>
							</NavigationMenu.Item>
						);
					}

					// Simple link button
					if (url) {
						if (isDisabled) {
							return (
								<NavigationMenu.Item data-onboarding-target={id} key={id}>
									<span
										className={
											showDrawerMenu
												? "flex w-full items-center justify-start rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white/50"
												: "flex items-center gap-2 p-2 text-nowrap justify-center rounded-xs cursor-not-allowed opacity-50"
										}
									>
										{translatedLabel}
									</span>
								</NavigationMenu.Item>
							);
						}
						translatedLabel;
						const isActive = pathname === url;
						return (
							<NavigationMenu.Item data-onboarding-target={id} key={id}>
								<NavigationMenu.Link
									className={
										showDrawerMenu
											? "flex w-full items-center justify-start rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-base transition-all duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
											: `flex items-center gap-2 px-5 py-2.5 cursor-pointer text-nowrap justify-center rounded-xl transition-all duration-200 ${
													isActive
														? "bg-[#A6DFDD] text-[#004A60] font-bold"
														: "text-[#00516A] hover:bg-[#FFF8DE] hover:text-[#004A60] hover:font-bold"
												}`
									}
									onClick={() => handleNavigate(url)}
								>
									{/* <Icon />  */}
									{translatedLabel}
								</NavigationMenu.Link>
							</NavigationMenu.Item>
						);
					}

					return null;
				})}
			</NavigationMenu.List>
		</NavigationMenu.Root>
	);
}
