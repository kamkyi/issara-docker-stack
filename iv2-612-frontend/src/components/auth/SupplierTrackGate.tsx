import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useRef, useState } from "react";
import { showToast } from "$src/components/toast/toastUtil";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import { authStatus } from "$src/queries/auth";
import {
	getStoredWorkosUserId,
	getSupplierTrackQueryOptions,
	getSupplierTrackStatus,
	type SupplierAccessStatus,
	type SupplierTrackStatus,
	storeSupplierTrack,
} from "$src/services/supplierTrackService";
import useAuthData from "$src/store/store.auth";
import { SUPPLIER_AGREEMENT_INVALIDATED_EVENT } from "$src/utils/supplierAgreementEvents";
import { handleForceSignOut } from "$src/utils/workos-utils";

export const SUPPLIER_ACCESS_REFRESH_INTERVAL_MS = 15_000;
export const SUPPLIER_AGREEMENT_ROUTE = "/track-selection";
const EXEMPT_PATHS = ["/auth/callback", "/logout"];
const MARKETPLACE_ALLOWED_PATHS = ["/cascade-marketplace", "/account"];
const MARKETPLACE_ALLOWED_EXACT_PATHS = [
	SUPPLIER_AGREEMENT_ROUTE,
	...EXEMPT_PATHS,
];

const matchesPathPrefix = (pathname: string, path: string) =>
	pathname === path || pathname.startsWith(`${path}/`);

export const isMarketplaceBlockedPath = (pathname: string) =>
	!MARKETPLACE_ALLOWED_EXACT_PATHS.includes(pathname) &&
	!MARKETPLACE_ALLOWED_PATHS.some((path) => matchesPathPrefix(pathname, path));

export const getSupplierTrackRedirect = (
	status: Pick<
		SupplierTrackStatus,
		"needs_track_selection" | "track_selection"
	>,
	pathname: string,
) => {
	if (status.needs_track_selection && pathname !== SUPPLIER_AGREEMENT_ROUTE) {
		return SUPPLIER_AGREEMENT_ROUTE;
	}
	if (
		status.track_selection === "MARKETPLACE" &&
		isMarketplaceBlockedPath(pathname)
	) {
		return "/cascade-marketplace";
	}
	return null;
};

export const getSupplierAgreementChangeMessage = (
	accessStatus: SupplierAccessStatus,
	hadPriorAccess = false,
) => {
	switch (accessStatus) {
		case "RESET":
			return "Your agreement was reset by an administrator. Please select an agreement option to continue.";
		case "REVOKED":
			return "Your agreement was revoked. Please complete the agreement again.";
		case "DELETED":
			return "Your agreement is no longer active. Please select an agreement option to continue.";
		case "REACCEPT_REQUIRED":
			return "Your agreement was updated by an administrator. Please review and accept it again.";
		case "INACTIVE":
			return "Your agreement is no longer active. Please select an agreement option to continue.";
		case "NOT_SELECTED":
			return hadPriorAccess
				? "Your agreement is no longer active. Please select an agreement option to continue."
				: null;
		default:
			return null;
	}
};

export default function SupplierTrackGate({
	children,
}: {
	children: React.ReactNode;
}) {
	const location = useLocation();
	const navigate = useNavigate();
	const { signOut } = useAuth();
	const { session } = useAuthData();
	const { isAuthenticated, role } = authStatus();
	const [isRetryingAccessCheck, setIsRetryingAccessCheck] = useState(false);
	const previousStatusRef = useRef<SupplierTrackStatus | null>(null);
	const lastNotifiedEventRef = useRef<string | null>(null);
	const isSupplier = isAuthenticated && role === "org-supplier";
	const workosUserId = getStoredWorkosUserId();
	const isExempt = EXEMPT_PATHS.some((path) =>
		location.pathname.startsWith(path),
	);
	const isTrackRoute = location.pathname === SUPPLIER_AGREEMENT_ROUTE;

	const trackQuery = useQuery({
		...getSupplierTrackQueryOptions(workosUserId, getSupplierTrackStatus),
		enabled: isSupplier && !isExempt,
		refetchInterval: SUPPLIER_ACCESS_REFRESH_INTERVAL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: "always",
	});

	useEffect(() => {
		if (!isSupplier) return;
		const refetchStatus = () => {
			void trackQuery.refetch();
		};
		window.addEventListener(
			SUPPLIER_AGREEMENT_INVALIDATED_EVENT,
			refetchStatus,
		);
		return () => {
			window.removeEventListener(
				SUPPLIER_AGREEMENT_INVALIDATED_EVENT,
				refetchStatus,
			);
		};
	}, [isSupplier, trackQuery.refetch]);

	useEffect(() => {
		if (!isSupplier || isExempt || !trackQuery.data) return;
		const previousStatus = previousStatusRef.current;
		if (trackQuery.data.needs_track_selection) {
			storeSupplierTrack(null);
			const message = getSupplierAgreementChangeMessage(
				trackQuery.data.access_status,
				Boolean(previousStatus?.track_selection),
			);
			const eventKey = [
				trackQuery.data.supplier_id,
				trackQuery.data.access_status,
				trackQuery.data.access_changed_at ?? "unknown",
			].join(":");
			if (message && lastNotifiedEventRef.current !== eventKey) {
				lastNotifiedEventRef.current = eventKey;
				showToast.warning(message, {
					id: `supplier-agreement-${eventKey}`,
					duration: 8_000,
				});
			}
		}
		const redirect = getSupplierTrackRedirect(
			trackQuery.data,
			location.pathname,
		);
		if (redirect === SUPPLIER_AGREEMENT_ROUTE) {
			void navigate({ to: SUPPLIER_AGREEMENT_ROUTE });
		} else if (redirect === "/cascade-marketplace") {
			void navigate({ to: "/cascade-marketplace", replace: true });
		}
		previousStatusRef.current = trackQuery.data;
	}, [isExempt, isSupplier, location.pathname, navigate, trackQuery.data]);

	const handleAccessCheckRetry = async () => {
		if (isRetryingAccessCheck) return;
		setIsRetryingAccessCheck(true);
		await handleForceSignOut({ signOut, session });
		setIsRetryingAccessCheck(false);
	};

	if (
		isSupplier &&
		!isExempt &&
		!isTrackRoute &&
		(trackQuery.isLoading || trackQuery.data?.needs_track_selection)
	) {
		return (
			<div className="flex min-h-screen w-full self-stretch items-center justify-center bg-[var(--color-bg)]">
				<LoadingSpinner
					subtitle="Checking your supplier access"
					title="Loading CASCADE..."
				/>
			</div>
		);
	}

	if (isSupplier && !isExempt && !isTrackRoute && trackQuery.isError) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
				<section className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
					<h1>Access check unavailable</h1>
					<p className="mt-4 text-[var(--color-body)]">
						CASCADE could not confirm your supplier access. Please retry before
						continuing.
					</p>
					<button
						aria-busy={isRetryingAccessCheck}
						className="cascade-btn cascade-btn--alt1 mt-6 rounded-full px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
						disabled={isRetryingAccessCheck}
						onClick={() => void handleAccessCheckRetry()}
						type="button"
					>
						{isRetryingAccessCheck ? "Resetting access..." : "Retry"}
					</button>
				</section>
			</main>
		);
	}

	return children;
}
