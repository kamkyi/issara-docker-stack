import * as Icons from "@mui/icons-material";
import { Paper, Popover } from "@mui/material";
import {
	ExitIcon,
	GearIcon,
	InfoCircledIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { Avatar, Button } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useFlags } from "flagsmith/react";
import type { IFlagsmithFeature } from "flagsmith/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TermsAcceptModal } from "$components/modals/TermsAcceptModal";
import { useTermsGate } from "$src/hooks/useTermsGate";
import {
	isMockNotificationFeatureEnabled,
	MOCK_NOTIFICATIONS_FLAG,
	useNotificationStore,
} from "$src/store/notificationStore";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore } from "$src/store/viewModeStore";
import type { AuthUser, MergedMainUser } from "$src/types";
import { handleSignIn } from "$src/utils/auth";
import { getNotificationParams, parseStoredJson } from "$src/utils/auth-utils";
import { handleForceSignOut } from "$src/utils/workos-utils";
import logoImage from "../../assets/img/logo.png";
import NavbarLanguageSelector from "../i18n/NavbarLanguageSelector";
import { ThemeSwitcher } from "../themeSwitch/ThemeSwitcher";
import styles from "./AccountNavbar.module.css";
import { NotificationPanel } from "./NotificationPanel";

interface AuthState {
	isAuthenticated: boolean;
	user: {
		firstName?: string;
		lastName?: string;
		email?: string;
		avatarUrl?: string | null;
	} | null;
}

export function AccountNavbar() {
	const { signOut } = useAuth();
	const { session, role } = useAuthData(); // Ensure token is fresh
	const { viewMode } = useViewModeStore();
	const navigate = useNavigate();
	const { t } = useTranslation();

	const [user, setUser] = useState<AuthUser | null>(null);
	const [mergedMainUser, setMergedMainUser] = useState<MergedMainUser | null>(
		null,
	);
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
	});
	const [openUserMenu, setOpenUserMenu] = useState(false);
	const [openNotifications, setOpenNotifications] = useState(false);
	const { unreadCount, fetchNotifications } = useNotificationStore();
	const notificationFlags = useFlags([MOCK_NOTIFICATIONS_FLAG]) as Record<
		string,
		IFlagsmithFeature | undefined
	>;
	const useMockNotificationsEnabled = isMockNotificationFeatureEnabled(
		notificationFlags[MOCK_NOTIFICATIONS_FLAG],
	);

	const handleProfileClick = () => {
		setOpenUserMenu(!openUserMenu);
	};

	// Check localStorage on mount and listen for storage changes
	useEffect(() => {
		const checkAuthUser = () => {
			const parsedUser = parseStoredJson<AuthUser>("auth_user");
			const parsedMergedUser =
				parseStoredJson<MergedMainUser>("merged_main_user");
			setUser(parsedUser);
			setMergedMainUser(parsedMergedUser);
		};

		// Check on mount
		checkAuthUser();

		// Listen for storage changes (from other tabs/windows or after redirect)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "auth_user" || e.key === "merged_main_user") {
				checkAuthUser();
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	// Poll notifications when authenticated
	useEffect(() => {
		if (!authState.isAuthenticated) return;
		const params = getNotificationParams();
		fetchNotifications(params);
		const interval = window.setInterval(
			() => fetchNotifications(params),
			60000,
		);
		return () => window.clearInterval(interval);
	}, [
		authState.isAuthenticated,
		fetchNotifications,
		mergedMainUser,
		user,
		useMockNotificationsEnabled,
	]);

	// Update auth state when user changes
	useEffect(() => {
		if (user) {
			const firstName =
				user.firstName ||
				mergedMainUser?.user?.firstName ||
				t("navbar.account.userFallback");
			const lastName = user.lastName || mergedMainUser?.user?.lastName || "";
			const email = user.email || mergedMainUser?.user?.email || "";
			const avatarUrl =
				user.avatarUrl || mergedMainUser?.user?.avatarUrl || null;
			setAuthState({
				isAuthenticated: true,
				user: {
					firstName,
					lastName,
					email,
					avatarUrl,
				},
			});
		} else {
			setAuthState({
				isAuthenticated: false,
				user: null,
			});
		}
	}, [user, mergedMainUser]);

	const termsGate = useTermsGate({
		isAuthenticated: authState.isAuthenticated,
		signOut,
		session,
	});

	const userName =
		`${authState.user?.firstName || ""} ${authState.user?.lastName || ""}`.trim() ||
		authState.user?.email ||
		t("navbar.account.userFallback");
	const userAvatarUrl = authState.user?.avatarUrl || undefined;
	const userInitial = userName.charAt(0).toUpperCase();
	const showLanguageSelector =
		role === "org-supplier" || viewMode === "supplier-view";

	return (
		<div className={`${styles.navbar} responsive-navbar`}>
			<div className={styles.navbarContent}>
				<div className={styles.logoContainer}>
					<img alt="ILM Logo" className={styles.logoImg} src={logoImage} />
					<h1
						className={styles.logo}
						onClick={() => navigate({ to: "/" })}
						style={{ color: "#fff", fontWeight: 800 }}
					>
						ILM Cascade 1.0
					</h1>
				</div>
				<div className={styles.navItems}>
					{showLanguageSelector && <NavbarLanguageSelector />}
					<ThemeSwitcher />
					<Button
						className="cursor-pointer flex items-center gap-2 font-extrabold text-white"
						onClick={() => navigate({ to: "/about" })}
						style={{
							background: "none",
						}}
						variant="soft"
					>
						<InfoCircledIcon
							height="16"
							style={{ marginRight: "6px", color: "#fff", fontWeight: 900 }}
							width="16"
						/>
						<span style={{ color: "#fff", fontWeight: 900 }}>
							{t("navbar.account.aboutIlmCascade")}
						</span>
					</Button>
					{authState.isAuthenticated ? (
						<div className="flex items-center gap-2">
							<button
								aria-label={t("navbar.account.notifications")}
								className="relative cursor-pointer flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
								onClick={() => setOpenNotifications(true)}
								type="button"
							>
								<Icons.NotificationsOutlined
									style={{ color: "#fff", fontSize: 22 }}
								/>
								{unreadCount > 0 && (
									<span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
										{unreadCount > 99 ? "99+" : unreadCount}
									</span>
								)}
							</button>
							<Button
								className="flex items-center gap-2 cursor-pointer font-extrabold text-white"
								onClick={handleProfileClick}
								style={{
									background: "none",
								}}
								variant="soft"
							>
								<Avatar
									className="bg-[#1AAEC3] text-white"
									fallback={userInitial}
									radius="full"
									size="2"
									src={userAvatarUrl}
								/>
								<span style={{ color: "#fff", fontWeight: 900 }}>
									{userName}
								</span>
							</Button>

							<Popover
								anchorPosition={{ top: 50, left: window.innerWidth - 10 }}
								anchorReference="anchorPosition"
								onClose={() => setOpenUserMenu(false)}
								open={openUserMenu}
								transformOrigin={{
									vertical: "top",
									horizontal: "right",
								}}
							>
								<Paper className="p-2" elevation={3}>
									<div
										className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
										onClick={() => {
											navigate({ to: "/account" });
											setOpenUserMenu(false);
										}}
									>
										<GearIcon className="mr-2 w-4 h-4" />
										<span>{t("navbar.account.profileSettings")}</span>
									</div>

									<hr className="opacity-10" />

									<div
										className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center text-red-600"
										onClick={() => {
											handleForceSignOut({ signOut, session });
											setOpenUserMenu(false);
										}}
									>
										<ExitIcon className="mr-2 w-4 h-4" />
										<span>{t("navbar.account.signOut")}</span>
									</div>
								</Paper>
							</Popover>
						</div>
					) : (
						<Button
							className="cursor-pointer flex items-center gap-2 font-extrabold text-white"
							onClick={handleSignIn}
							variant="ghost"
						>
							<PersonIcon
								height="16"
								style={{ marginRight: "6px", color: "#fff", fontWeight: 900 }}
								width="16"
							/>
							<span style={{ color: "#fff", fontWeight: 900 }}>
								{t("common.login")}
							</span>
						</Button>
					)}
				</div>
			</div>
			<NotificationPanel
				onClose={() => setOpenNotifications(false)}
				open={openNotifications}
			/>
			<TermsAcceptModal
				error={termsGate.error}
				isSubmitting={termsGate.isSubmitting}
				onAccept={termsGate.onAccept}
				onDecline={termsGate.onDecline}
				open={termsGate.open}
			/>
		</div>
	);
}
