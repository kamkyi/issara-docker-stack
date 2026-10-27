import { useNavigate } from "@tanstack/react-router";
import * as motion from "motion/react-client";
import { useTheme } from "next-themes";
import type React from "react";
import { useEffect } from "react";
import { Breadcrumbs } from "$src/components/breadcrumps/breadcrumb";
import CascadeFloatingButton, {
	useViewMode,
} from "$src/components/button/testerFloatingButton";
import { Footer } from "$src/components/footer/Footer";
import { AccountNavbar } from "$src/components/navbars/AccountNavbar";
import { GuestNavbar } from "$src/components/navbars/GuestNabar";
import { OnboardingOverlay } from "$src/components/onboarding/OnboardingOverlay";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import { useOnboardingGate } from "$src/hooks/useOnboardingGate";
import { authStatus } from "$src/queries/auth";
import { useSupplierFullDetail } from "$src/queries/useSupplierFullDetail";
import useAuthData from "$src/store/store.auth";
import useMemberdirectory from "$src/store/store.memberdirectory";
import { getActiveSupplierId, parseStoredJson } from "$src/utils/auth-utils";
import { useMockData } from "$src/utils/config";
import styles from "./GuestLayout.module.css";

const MOCK_ONBOARDING_DATA = {
	companyName: "BeneBuyer",
	memberSince: "Jan 16, 2020",
	region: "Southeast Asia",
};

interface AuthUserLike {
	firstName?: string | null;
	email?: string | null;
}

interface GuestLayoutProps {
	children: React.ReactNode;
}

export function GuestLayout({ children }: GuestLayoutProps) {
	const { bannerImg, updateBannerImg } = useMemberdirectory();
	const navigate = useNavigate();
	const { theme } = useTheme();
	const { isAuthenticated, role: authRole } = authStatus();
	const storeRole = useAuthData((state) => state.role);
	const { viewMode } = useViewMode();
	const effectiveRole = storeRole ?? authRole;
	const isSupplierContext =
		effectiveRole === "org-supplier" || viewMode === "supplier-view";
	const pageBackground = theme === "dark" ? "#002a38" : "#fbf6ec";
	const onboarding = useOnboardingGate({
		enabled: isAuthenticated && isSupplierContext,
	});
	const authUser = parseStoredJson<AuthUserLike>("auth_user");
	const userFirstName =
		authUser?.firstName || authUser?.email?.split("@")[0] || "there";

	const supplierId = getActiveSupplierId();
	const numericSupplierId =
		typeof supplierId === "number"
			? supplierId
			: typeof supplierId === "string"
				? Number(supplierId)
				: 0;
	const { data: supplierDetail } = useSupplierFullDetail(
		onboarding.open &&
			Number.isFinite(numericSupplierId) &&
			numericSupplierId > 0
			? numericSupplierId
			: null,
	);
	const { data: cascadeCountriesData } = useCascadeCountries();
	const cascadeCountries: Array<{ id: number | string; name: string }> =
		(() => {
			const seed = cascadeCountriesData as unknown;
			if (Array.isArray(seed))
				return seed as Array<{ id: number | string; name: string }>;
			if (seed && typeof seed === "object") {
				const record = seed as Record<string, unknown>;
				for (const key of ["results", "data", "items", "countries"]) {
					const value = record[key];
					if (Array.isArray(value))
						return value as Array<{ id: number | string; name: string }>;
					if (value && typeof value === "object") {
						const nested = (value as Record<string, unknown>).results;
						if (Array.isArray(nested))
							return nested as Array<{ id: number | string; name: string }>;
					}
				}
			}
			return [];
		})();
	const shouldUseMock = useMockData();
	const realCompanyName = supplierDetail?.name || "—";
	const matchedCountry =
		supplierDetail?.country_id != null
			? cascadeCountries.find(
					(c) => String(c.id) === String(supplierDetail.country_id),
				)
			: undefined;
	const realRegion = matchedCountry?.name || "—";
	const realMemberSince = supplierDetail?.created
		? new Date(supplierDetail.created).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: "Today";
	const companyName = shouldUseMock
		? MOCK_ONBOARDING_DATA.companyName
		: realCompanyName;
	const region = shouldUseMock ? MOCK_ONBOARDING_DATA.region : realRegion;
	const memberSince = shouldUseMock
		? MOCK_ONBOARDING_DATA.memberSince
		: realMemberSince;

	useEffect(() => {
		if (window.location.pathname !== "/member-directory/detail") {
			updateBannerImg("");
		}
	}, []);

	const handleOnboardingComplete = () => {
		onboarding.onComplete();
		if (window.location.pathname !== "/company-profile") {
			navigate({ to: "/company-profile" });
		}
	};

	return (
		<div className={styles.fullLayout} style={{ background: pageBackground }}>
			<AccountNavbar />
			<div className="flex justify-between mx-6 items-center mt-4 z-50 flex-wrap gap-2">
				<Breadcrumbs />
				<GuestNavbar />
			</div>
			{bannerImg && (
				<div className="w-full h-[65vh] top-10 absolute z-0">
					<div
						className="absolute"
						style={{
							width: "100%",
							background:
								"linear-gradient(to bottom,#004A60 0%, rgba(255,255,255,0) 100%)",
							height: "65vh",
						}}
					/>
					<img
						alt="member-banner-img"
						className="w-full h-[65vh] object-cover"
						src={bannerImg}
					/>
				</div>
			)}
			<div className={`${styles.mainArea} px-2`}>
				<motion.div
					animate={{ x: 0, y: 0, opacity: 1 }}
					initial={{ y: 0, opacity: 0 }}
					transition={{
						duration: 1,
					}}
				>
					<main className={styles.content}>{children}</main>
				</motion.div>
			</div>
			<CascadeFloatingButton />
			<Footer />
			<OnboardingOverlay
				companyName={companyName}
				memberSince={memberSince}
				onComplete={handleOnboardingComplete}
				open={onboarding.open}
				region={region}
				userName={userFirstName}
			/>
		</div>
	);
}
