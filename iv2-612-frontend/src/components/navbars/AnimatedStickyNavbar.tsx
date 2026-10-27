import { LoginOutlined } from "@mui/icons-material";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TermsAcceptModal } from "$components/modals/TermsAcceptModal";
import wagesImage from "$src/assets/img/banner-image/for-wages.png";
import landingPageImage from "$src/assets/img/banner-image/talking-to-cambodian-fishers.jpg";
import recruitmentImage from "$src/assets/img/banner-image/workers-and-RA.jpg";
import issaraGroupPhoto from "$src/assets/img/issara_group_photo.jpg";
import Logo from "$src/assets/img/logo.png";
import logoWhite from "$src/assets/img/logo-white.png";
import ourWorkspaceLandingPage from "$src/assets/img/our_workspace_landing_page.jpg";
import { useTermsGate } from "$src/hooks/useTermsGate";
import { authStatus } from "$src/queries/auth";
import useAuthData from "$src/store/store.auth";
import type { AuthUser, MergedMainUser } from "$src/types";
import { handleSignIn } from "$src/utils/auth";
import { parseStoredJson } from "$src/utils/auth-utils";
import CascadeButton from "../button/button";
import styles from "./AnimatedStickyNavbar.module.css";

type MenuItem = {
	key: string;
	title: string;
	subtitle?: string;
	description: string;
	image?: string;
	subMenu?: MenuItem[];
	disabled?: boolean;
};

type NavbarAuthState = {
	isAuthenticated: boolean;
	user: {
		firstName?: string;
		lastName?: string;
		email?: string;
		avatarUrl?: string | null;
	} | null;
};

const readNavbarAuthState = (): NavbarAuthState => {
	if (typeof window === "undefined") {
		return {
			isAuthenticated: false,
			user: null,
		};
	}

	const { isAuthenticated } = authStatus();
	const parsedUser = parseStoredJson<AuthUser>("auth_user");
	const parsedMergedUser = parseStoredJson<MergedMainUser>("merged_main_user");

	if (!isAuthenticated || !parsedUser) {
		return {
			isAuthenticated: false,
			user: null,
		};
	}

	const firstName =
		parsedUser.firstName || parsedMergedUser?.user?.firstName || "User";
	const lastName =
		parsedUser.lastName || parsedMergedUser?.user?.lastName || "";
	const email = parsedUser.email || parsedMergedUser?.user?.email || "";
	const avatarUrl = parsedUser.avatarUrl || parsedMergedUser?.user?.avatarUrl;

	return {
		isAuthenticated: true,
		user: {
			firstName,
			lastName,
			email,
			avatarUrl: avatarUrl || null,
		},
	};
};

const LEFT_MENU: MenuItem[] = [
	{
		key: "about",
		title: "About CASCADE",
		description: "Who we are and our mission.",
		image: issaraGroupPhoto,
		subMenu: [
			// {
			// 	key: "about",
			// 	title: "About",
			// 	description: "Who we are and our mission.",
			// 	image: issaraGroupPhoto,
			// },
			// {
			// 	key: "wage_indicator",
			// 	title: "WageIndicator",
			// 	description:
			// 		"A global labor market research that collects and shares accurate wage data, cost of living information and labor rights insights across more than 10,000 different industries.",
			// 	image: landingPageImage,
			// },
			// {
			// 	key: "social_responsibility",
			// 	title: "Sustainable Fisheries Partnership (SFP)",
			// 	description:
			// 		"SFP supports ethical recruitment and fair treatment of migrant workers by creating partnerships between governments, employers, and NGOs.",
			// 	image: landingPageImage,
			// },
		],
	},
	{
		key: "social_responsibility",
		title: "Social Responsibility",
		description: "Services and activities we run.",
		image: landingPageImage,
		disabled: false,
		subMenu: [
			{
				key: "recruitment",
				title: "Recruitment",
				subtitle: "Labor Recruitment",
				description:
					"Ongoing monitoring and remediation of recruitment-related forced labor risk down to the first mile, including debt bondage, deceptive recruitment practices, illegal fees, and contract substitution.",
				image: recruitmentImage,
			},
			{
				key: "wages",
				title: "Wages",
				subtitle: "Wages",
				description:
					"Ongoing monitoring and remediation of wages, payment systems, and bonus and incentive structures across supply chains.",
				image: wagesImage,
			},
			{
				key: "labor",
				title: "Labor",
				subtitle: "Labor Conditions",
				description:
					"Ongoing monitoring and remediation of working conditions across supply chains, including forced labor risks as well as detecting and resolving less serious issues before they escalate.",
				image: landingPageImage,
			},
		],
	},
];

const RIGHT_MENU: MenuItem[] = [
	{
		key: "environmental-impact",
		title: "Environmental Impact",
		description: "Why our work makes an impact.",
		image: ourWorkspaceLandingPage,
		disabled: true,
		subMenu: [
			// {
			// 	key: "environmental-impact",
			// 	title: "Environmental Impact",
			// 	description: "Why our work makes an impact.",
			// 	image: ourWorkspaceLandingPage,
			// },
		],
	},
	{
		key: "interactive-map",
		title: "Interactive Map",
		description: "Get involved and support our cause.",
		image: logoWhite,
		disabled: true,
		subMenu: [
			// {
			// 	key: "interactive-map",
			// 	title: "Interactive Map",
			// 	description: "Get involved and support our cause.",
			// 	image: logoWhite,
			// },
		],
	},
	// {
	// 	key: "cascade-marketplace",
	// 	title: "Marketplace",
	// 	description: "Discover ethical partners and opportunities.",
	// 	image: landingPageImage,
	// },
];

export function AnimatedStickyNavbar() {
	const [visible, setVisible] = useState(true);
	const [scrolled, setScrolled] = useState(false);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const [selectedSubKey, setSelectedSubKey] = useState<string | null>(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState<string | null>(
		null,
	);
	const [comingSoonKey, setComingSoonKey] = useState<string | null>(null);
	const [authState, setAuthState] =
		useState<NavbarAuthState>(readNavbarAuthState);
	const { signOut } = useAuth();
	const { session } = useAuthData();
	const termsGate = useTermsGate({
		isAuthenticated: authState.isAuthenticated,
		signOut,
		session,
	});
	const lastY = useRef(0);
	const location = useLocation();
	const navigate = useNavigate();

	// Function to check if a menu item is active based on current route
	function isMenuItemActive(menuItem: MenuItem): boolean {
		const currentPath = location.pathname;

		// Check if current path matches any submenu items
		if (menuItem.subMenu) {
			return menuItem.subMenu.some((subItem) => {
				switch (subItem.key) {
					case "about":
						return currentPath === "/about";
					// case "wage_indicator":
					case "wages":
						return currentPath.includes("/wages");
					case "recruitment":
						return currentPath.includes("/recruitment");
					case "labor":
						return currentPath.includes("/labor");
					case "interactive-map":
						return currentPath.includes("/interactive-map");
					case "environmental-impact":
						return currentPath.includes("/environmental-impact");
					default:
						return currentPath === `/${subItem.key}`;
				}
			});
		}

		// Direct menu item check
		return currentPath === `/${menuItem.key}`;
	}

	useEffect(() => {
		function onScroll() {
			const y = window.scrollY || window.pageYOffset;
			setScrolled(y > 20);
			if (y > lastY.current && y > 100) {
				// scrolling down
				setVisible(false);
			} else {
				// scrolling up
				setVisible(true);
			}
			lastY.current = y;
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		const syncAuthState = () => {
			setAuthState(readNavbarAuthState());
		};

		syncAuthState();

		const handleStorageChange = (e: StorageEvent) => {
			if (
				e.key === "auth_token" ||
				e.key === "auth_user" ||
				e.key === "auth-storage" ||
				e.key === "merged_main_user"
			) {
				syncAuthState();
			}
		};

		window.addEventListener("focus", syncAuthState);
		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("focus", syncAuthState);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	useEffect(() => {
		setAuthState(readNavbarAuthState());
	}, [location.pathname]);

	const allTopMenus = [...LEFT_MENU, ...RIGHT_MENU];
	// the current top-level menu object corresponding to hoverKey
	const currentTop = allTopMenus.find((t) => t.key === hoverKey) ?? null;
	// submenu items to show in the left list of the popup
	const subMenuItems = currentTop
		? (currentTop.subMenu ?? [
				{
					key: currentTop.key,
					title: currentTop.title,
					subtitle: (currentTop as MenuItem).subtitle,
					description: currentTop.description,
					image: currentTop.image,
				},
			])
		: null;

	// the active submenu item to display on the right side
	const activeItem =
		subMenuItems?.find((s) => s.key === selectedSubKey) ??
		subMenuItems?.[0] ??
		null;

	useEffect(() => {
		// when hoverKey changes, default selectedSubKey to the first submenu item
		if (currentTop) {
			const first = currentTop.subMenu?.[0] ?? currentTop;
			setSelectedSubKey(first?.key ?? null);
		} else {
			setSelectedSubKey(null);
		}
	}, [hoverKey]);

	function handleSubmenuClick(item: MenuItem) {
		// Close menu state
		setHoverKey(null);
		setMobileMenuOpen(false);
		setMobileSubmenuOpen(null);

		// Map submenu keys to named sections on the About page (data-section values)
		const mapping: Record<string, string | null> = {
			about: null,
			wage_indicator: "wages",
			// wage: "wages",
			wages: "/social-responsibility/wages",
			social_responsibility: "sfp",
			sfp: "sfp",
			labor: "/social-responsibility/labor",
			recruitment: "/social-responsibility/recruitment",
		};

		const section = mapping[item.key] ?? null;
		if (section) {
			if (section.startsWith("/")) {
				// It's a direct route
				navigate({ to: section as "/" });
			} else {
				// Use a query param so the About page can scroll to the element with data-section
				navigate({ to: "/about", search: { scroll: section } as never });
			}
		} else if (item.key === "about") {
			navigate({ to: "/about" });
		} else {
			// default: try route path matching key
			navigate({ to: `/${item.key}` as "/" });
		}
	}

	function handleAccountClick() {
		setMobileMenuOpen(false);
		navigate({ to: "/account" });
	}

	const userName =
		authState.user?.firstName?.trim() || authState.user?.email || "User";
	const userInitial = userName.charAt(0).toUpperCase();
	const userAvatarUrl = authState.user?.avatarUrl || undefined;
	const authTextColor = scrolled || hoverKey ? "rgba(0, 0, 0, 0.85)" : "white";
	const authBorderColor =
		scrolled || hoverKey
			? "rgba(15, 23, 42, 0.12)"
			: "rgba(255, 255, 255, 0.3)";
	const authBackgroundColor =
		scrolled || hoverKey
			? "rgba(255, 255, 255, 0.78)"
			: "rgba(255, 255, 255, 0.12)";

	return (
		<>
			<div
				className={`${styles.container} ${visible ? styles.visible : styles.hidden}`}
				style={{
					backgroundColor:
						scrolled || hoverKey ? "rgba(255,255,255,0.85)" : "transparent",
				}}
			>
				<nav aria-label="Main navigation" className={styles.bar}>
					{/* Mobile hamburger button */}
					<button
						aria-expanded={mobileMenuOpen}
						aria-label="Toggle menu"
						className={styles.hamburger}
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						type="button"
					>
						<span
							className={mobileMenuOpen ? styles.hamburgerActive : ""}
						></span>
						<span
							className={mobileMenuOpen ? styles.hamburgerActive : ""}
						></span>
						<span
							className={mobileMenuOpen ? styles.hamburgerActive : ""}
						></span>
					</button>

					<div
						className={styles.desktopMenu}
						style={{
							zIndex: 70,
							margin: 0,
							padding: 0,
							display: "flex",
							alignItems: "center",
						}}
					>
						<ul
							className={styles.menu}
							style={{
								margin: 0,
								padding: 0,
								display: "flex",
								color: scrolled || hoverKey ? "rgba(0, 0, 0, 0.85)" : "white",
							}}
						>
							{LEFT_MENU.map((item) => {
								const isActive = isMenuItemActive(item);
								const hasSubmenu = item.subMenu && item.subMenu.length > 0;
								return (
									<li className={styles.menuItem} key={item.key}>
										{hasSubmenu ? (
											<button
												aria-disabled={item.disabled}
												aria-expanded={hoverKey === item.key}
												aria-haspopup="true"
												disabled={item.disabled}
												onFocus={() => {
													if (!item.disabled) {
														setHoverKey(item.key);
														const first = item.subMenu?.[0] ?? item;
														setSelectedSubKey(first?.key ?? null);
													}
												}}
												onMouseEnter={() => {
													if (!item.disabled) {
														setHoverKey(item.key);
														const first = item.subMenu?.[0] ?? item;
														setSelectedSubKey(first?.key ?? null);
													}
												}}
												style={{
													background: "transparent",
													border: 0,
													padding: 0,
													cursor: item.disabled ? "not-allowed" : "pointer",
													opacity: item.disabled ? 0.5 : 1,
													pointerEvents: item.disabled ? "none" : "auto",
												}}
												type="button"
											>
												<span
													className={
														item.disabled ? undefined : "animated-underline"
													}
													style={{
														color: isActive ? "#148696" : "inherit",
														fontWeight: isActive ? "600" : "normal",
														position: "relative",
													}}
												>
													{item.title}
													{isActive && (
														<span
															style={{
																position: "absolute",
																bottom: "4px",
																left: 0,
																right: 0,
																height: "2px",
																background:
																	"linear - gradient(90deg, #148696, #0d5f6d)",
																transition: "width 0.4s ease-in -out",
															}}
														/>
													)}
												</span>
											</button>
										) : (
											<button
												disabled={item.disabled}
												onClick={() => {
													if (!item.disabled)
														navigate({ to: `/${item.key}` as "/" });
												}}
												onMouseEnter={() => setHoverKey(null)}
												style={{
													background: "transparent",
													border: 0,
													padding: 0,
													cursor: item.disabled ? "not-allowed" : "pointer",
													opacity: item.disabled ? 0.5 : 1,
													pointerEvents: item.disabled ? "none" : "auto",
												}}
												type="button"
											>
												<span
													className={
														item.disabled ? undefined : "animated-underline"
													}
													style={{
														color: isActive ? "#148696" : "inherit",
														fontWeight: isActive ? "600" : "normal",
														position: "relative",
													}}
												>
													{item.title}
													{isActive && (
														<span
															style={{
																position: "absolute",
																bottom: "4px",
																left: 0,
																right: 0,
																height: "2px",
																background:
																	"linear-gradient(90deg, #148696, #0d5f6d)",
																transition: "width 0.4s ease-in-out",
															}}
														/>
													)}
												</span>
											</button>
										)}
									</li>
								);
							})}
						</ul>

						<div className={styles.logoWrap}>
							<div aria-hidden className={styles.logo}>
								{/* Centered Logo */}
								<button
									aria-label="Go to homepage"
									onClick={() => navigate({ to: "/" })}
									style={{
										background: "transparent",
										border: 0,
										cursor: "pointer",
										padding: 0,
									}}
									type="button"
								>
									<img alt="ILM Logo" src={Logo} width={60} />
								</button>
							</div>
						</div>

						<ul
							className={styles.menu}
							style={{
								margin: 0,
								padding: 0,
								display: "flex",
								color: scrolled || hoverKey ? "rgba(0, 0, 0, 0.85)" : "white",
							}}
						>
							{RIGHT_MENU.map((item) => {
								const isActive = isMenuItemActive(item);
								const hasSubmenu = item.subMenu && item.subMenu.length > 0;
								return (
									<li
										className={styles.menuItem}
										key={item.key}
										onMouseEnter={() => {
											if (item.disabled) setComingSoonKey(item.key);
										}}
										onMouseLeave={() => {
											if (item.disabled) setComingSoonKey(null);
										}}
										style={{ position: "relative" }}
									>
										{item.disabled && comingSoonKey === item.key && (
											<div
												style={{
													position: "absolute",
													top: "calc(100% + 8px)",
													left: "50%",
													transform: "translateX(-50%)",
													backgroundColor: "rgba(15, 23, 42, 0.85)",
													color: "#fff",
													fontSize: "12px",
													fontWeight: 500,
													padding: "5px 10px",
													borderRadius: "6px",
													whiteSpace: "nowrap",
													pointerEvents: "none",
													zIndex: 9999,
													boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
												}}
											>
												Coming soon!
											</div>
										)}
										{hasSubmenu ? (
											<button
												aria-disabled={item.disabled}
												aria-expanded={hoverKey === item.key}
												aria-haspopup="true"
												disabled={item.disabled}
												onFocus={() => {
													if (!item.disabled) {
														setHoverKey(item.key);
														const first = item.subMenu?.[0] ?? item;
														setSelectedSubKey(first?.key ?? null);
													}
												}}
												onMouseEnter={() => {
													if (!item.disabled) {
														setHoverKey(item.key);
														const first = item.subMenu?.[0] ?? item;
														setSelectedSubKey(first?.key ?? null);
													}
												}}
												style={{
													background: "transparent",
													border: 0,
													padding: 0,
													cursor: item.disabled ? "not-allowed" : "pointer",
													opacity: item.disabled ? 0.5 : 1,
												}}
												type="button"
											>
												<span
													className={
														item.disabled ? undefined : "animated-underline"
													}
													style={{
														color: isActive ? "#148696" : "inherit",
														fontWeight: isActive ? "600" : "normal",
														position: "relative",
													}}
												>
													{item.title}
													{isActive && (
														<span
															style={{
																position: "absolute",
																bottom: "4px",
																left: 0,
																right: 0,
																height: "2px",
																background:
																	"linear - gradient(90deg, #148696, #0d5f6d)",
																transition: "width 0.4s ease-in -out",
															}}
														/>
													)}
												</span>
											</button>
										) : item.key === "contact" ? (
											<button
												className={styles.contactMenuLink}
												onClick={() => {
													setHoverKey(null);
													navigate({ to: "/book-a-demo" });
												}}
												onMouseEnter={() => setHoverKey(null)}
												style={{
													background: "transparent",
													border: 0,
													padding: 0,
													cursor: "pointer",
													color:
														scrolled || hoverKey
															? "#148696"
															: "rgba(255,255,255,0.92)",
												}}
												type="button"
											>
												{item.title}
											</button>
										) : (
											<button
												aria-disabled={item.disabled}
												disabled={item.disabled}
												onClick={() => {
													if (!item.disabled) {
														setHoverKey(null);
														navigate({ to: `/${item.key}` as "/" });
													}
												}}
												onMouseEnter={() => setHoverKey(null)}
												style={{
													background: "transparent",
													border: 0,
													padding: 0,
													cursor: item.disabled ? "not-allowed" : "pointer",
													opacity: item.disabled ? 0.5 : 1,
													pointerEvents: item.disabled ? "none" : "auto",
												}}
												type="button"
											>
												<span
													className={
														item.disabled ? undefined : "animated-underline"
													}
													style={{
														color: isActive ? "#148696" : "inherit",
														fontWeight: isActive ? "600" : "normal",
														position: "relative",
													}}
												>
													{item.title}
													{isActive && (
														<span
															style={{
																position: "absolute",
																bottom: "4px",
																left: 0,
																right: 0,
																height: "2px",
																background:
																	"linear-gradient(90deg, #148696, #0d5f6d)",
																transition: "width 0.4s ease-in-out",
															}}
														/>
													)}
												</span>
											</button>
										)}
									</li>
								);
							})}
						</ul>
					</div>

					{/* Mobile Logo */}
					<div className={styles.mobileLogo}>
						<button
							aria-label="Go to homepage"
							onClick={() => navigate({ to: "/" })}
							style={{
								background: "transparent",
								border: 0,
								cursor: "pointer",
								padding: 0,
							}}
							type="button"
						>
							<img alt="ILM Logo" src={Logo} width={40} />
						</button>
					</div>

					{/* Large popup drawer - Desktop */}
					<div className={styles.signInWrapper}>
						<button
							onClick={() => navigate({ to: "/book-a-demo" })}
							style={{
								display: "inline-flex",
								alignItems: "center",
								padding: "0 16px",
								height: "40px",
								borderRadius: "8px",
								border: `1px solid ${authBorderColor}`,
								backgroundColor: authBackgroundColor,
								color: authTextColor,
								fontWeight: 500,
								fontSize: "14px",
								cursor: "pointer",
								whiteSpace: "nowrap",
								transition: "all 0.2s",
							}}
							type="button"
						>
							Book a Demo
						</button>
						{authState.isAuthenticated ? (
							<button
								className={styles.authButton}
								onClick={handleAccountClick}
								style={{
									color: authTextColor,
									borderColor: authBorderColor,
									backgroundColor: authBackgroundColor,
								}}
								type="button"
							>
								<span aria-hidden="true" className={styles.authAvatar}>
									{userAvatarUrl ? (
										<img
											alt=""
											className={styles.authAvatarImage}
											src={userAvatarUrl}
										/>
									) : (
										userInitial
									)}
								</span>
								<span className={styles.authLabel}>{userName}</span>
							</button>
						) : (
							<CascadeButton
								buttonText="Sign In"
								handleOnClick={() => {
									void handleSignIn();
								}}
								size="3"
								variant={scrolled || hoverKey ? "outline" : "solid"}
							/>
						)}
					</div>
				</nav>

				{/* Mobile Menu */}
				<AnimatePresence>
					{mobileMenuOpen && (
						<motion.div
							animate={{ opacity: 1, height: "auto" }}
							className={styles.mobileMenuContainer}
							exit={{ opacity: 0, height: 0 }}
							initial={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
						>
							<div className={styles.mobileMenuContent}>
								{[...LEFT_MENU, ...RIGHT_MENU].map((item) => (
									<div className={styles.mobileMenuItem} key={item.key}>
										{item.subMenu && item.subMenu.length > 0 ? (
											<>
												<button
													aria-disabled={item.disabled}
													className={styles.mobileMenuButton}
													disabled={item.disabled}
													onClick={() => {
														if (item.disabled) {
															return;
														}
														if (mobileSubmenuOpen === item.key) {
															setMobileSubmenuOpen(null);
														} else {
															setMobileSubmenuOpen(item.key);
														}
													}}
													style={{
														opacity: item.disabled ? 0.5 : 1,
														cursor: item.disabled ? "not-allowed" : "pointer",
													}}
													type="button"
												>
													{item.title}
													<span
														className={
															mobileSubmenuOpen === item.key
																? styles.chevronUp
																: styles.chevronDown
														}
													>
														▼
													</span>
												</button>
												<AnimatePresence>
													{mobileSubmenuOpen === item.key && (
														<motion.div
															animate={{ opacity: 1, height: "auto" }}
															className={styles.mobileSubmenu}
															exit={{ opacity: 0, height: 0 }}
															initial={{ opacity: 0, height: 0 }}
															transition={{ duration: 0.2 }}
														>
															{(item.subMenu ?? [item]).map((subItem) => (
																<button
																	className={styles.mobileSubmenuButton}
																	disabled={item.disabled || subItem.disabled}
																	key={subItem.key}
																	onClick={() => handleSubmenuClick(subItem)}
																	style={{
																		opacity:
																			item.disabled || subItem.disabled
																				? 0.5
																				: 1,
																		cursor:
																			item.disabled || subItem.disabled
																				? "not-allowed"
																				: "pointer",
																	}}
																	type="button"
																>
																	<div className={styles.mobileSubmenuTitle}>
																		{subItem.title}
																	</div>
																	<div className={styles.mobileSubmenuDesc}>
																		{subItem.description}
																	</div>
																</button>
															))}
														</motion.div>
													)}
												</AnimatePresence>
											</>
										) : (
											<button
												aria-disabled={item.disabled}
												className={styles.mobileMenuButton}
												disabled={item.disabled}
												onClick={() => {
													if (item.disabled) return;
													setMobileMenuOpen(false);
													navigate({
														to: (item.key === "contact"
															? "/book-a-demo"
															: `/${item.key}`) as "/",
													});
												}}
												style={{
													display: "block",
													opacity: item.disabled ? 0.5 : 1,
													cursor: item.disabled ? "not-allowed" : "pointer",
													pointerEvents: item.disabled ? "none" : "auto",
												}}
												type="button"
											>
												{item.title}
											</button>
										)}
									</div>
								))}
								<div className={styles.mobileSignIn}>
									<button
										className={styles.mobileBookDemoButton}
										onClick={() => {
											setMobileMenuOpen(false);
											navigate({ to: "/book-a-demo" });
										}}
										type="button"
									>
										Book a Demo
									</button>
									{authState.isAuthenticated ? (
										<button
											className={styles.mobileAuthButton}
											onClick={handleAccountClick}
											type="button"
										>
											<span aria-hidden="true" className={styles.authAvatar}>
												{userAvatarUrl ? (
													<img
														alt=""
														className={styles.authAvatarImage}
														src={userAvatarUrl}
													/>
												) : (
													userInitial
												)}
											</span>
											<span className={styles.authLabel}>{userName}</span>
										</button>
									) : (
										<CascadeButton
											buttonText="Sign In"
											color="#148696"
											handleOnClick={() => {
												setMobileMenuOpen(false);
												void handleSignIn();
											}}
											iconLeft={<LoginOutlined />}
											size="4"
											variant="solid"
										/>
									)}
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
				<AnimatePresence mode="wait">
					{hoverKey &&
						activeItem &&
						currentTop?.subMenu &&
						currentTop.subMenu.length > 0 && (
							<motion.div
								animate={{
									y: "0%",
									x: "0%",
									opacity: 1,
								}}
								className={`${styles.popup} ${styles.popupVisible}`}
								exit={{ opacity: 0, y: "-5%" }}
								initial={{ y: "-5%", opacity: 0, x: "0%" }}
								key={hoverKey}
								onMouseEnter={() => setHoverKey(currentTop?.key ?? null)}
								onMouseLeave={() => setHoverKey(null)}
								transition={{
									duration: 0.25,
									ease: "easeInOut",
								}}
							>
								<div className={styles.popupInner}>
									{/* Left menu list (submenu of the hovered top-level item) */}
									<motion.ul
										animate="visible"
										className={styles.popupMenuList}
										initial="hidden"
										variants={{
											visible: {
												transition: {
													staggerChildren: 0.08,
													delayChildren: 0.2,
												},
											},
											// hidden: {},
										}}
									>
										{subMenuItems?.map((item) => (
											<motion.li
												className={styles.popupMenuItem}
												key={item.key}
												variants={{
													hidden: { opacity: 0, x: -20 },
													visible: {
														opacity: 1,
														x: 0,
														transition: {
															duration: 0.3,
															ease: "easeOut",
														},
													},
												}}
											>
												<button
													className={`${styles.popupMenuButton} ${
														item.key === selectedSubKey ? styles.active : ""
													}`}
													onClick={() => handleSubmenuClick(item)}
													onFocus={() => setSelectedSubKey(item.key)}
													onMouseEnter={() => setSelectedSubKey(item.key)}
													type="button"
												>
													{item.title}
												</button>
											</motion.li>
										))}
									</motion.ul>

									{/* Right content area */}
									<motion.div
										animate={{ opacity: 1, x: 0 }}
										className={styles.popupContent}
										initial={{ opacity: 0, x: 20 }}
										transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
									>
										{activeItem.image && (
											<motion.img
												alt={activeItem.title}
												animate={{ scale: 1, opacity: 1 }}
												className={styles.popupImage}
												initial={{ scale: 0.95, opacity: 0 }}
												src={activeItem.image}
												transition={{ duration: 0.4, delay: 0.35 }}
											/>
										)}
										<motion.div
											animate={{ opacity: 1, y: 0 }}
											className={styles.popupText}
											initial={{ opacity: 0, y: 10 }}
											transition={{ duration: 0.3, delay: 0.4 }}
										>
											<strong className="cursor-pointer animated-underline">
												{activeItem.subtitle ?? activeItem.title}
											</strong>
											<div>{activeItem.description}</div>
										</motion.div>
									</motion.div>
								</div>
							</motion.div>
						)}
				</AnimatePresence>
			</div>
			<TermsAcceptModal
				error={termsGate.error}
				isSubmitting={termsGate.isSubmitting}
				onAccept={termsGate.onAccept}
				onDecline={termsGate.onDecline}
				open={termsGate.open}
			/>
		</>
	);
}

export default AnimatedStickyNavbar;
