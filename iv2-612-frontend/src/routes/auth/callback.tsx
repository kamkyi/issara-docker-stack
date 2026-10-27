import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import {
	getStoredWorkosUserId,
	getSupplierPostLoginRoute,
	getSupplierTrackQueryOptions,
	getSupplierTrackStatus,
	isSupplierAssignmentRequiredError,
} from "$src/services/supplierTrackService";
import useAuthData from "$src/store/store.auth";
import { useViewModeStore, type ViewMode } from "$src/store/viewModeStore";
import {
	resolveCallbackAppRole,
	selectTokenAppRole,
} from "$src/utils/authCallbackRole";
import { api, setAuthToken } from "../../api/axios";
import type { CallbackData } from "../../types/auth";
import { debugWorkOSCallback } from "../../utils/debug";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
});

const getString = (value: unknown): string | undefined => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeId = (value: unknown): number | string | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const asString = getString(value);
	if (!asString) return undefined;
	if (/^\d+$/.test(asString)) return Number(asString);
	return asString;
};

const isWorkOSUserId = (value: unknown): value is string =>
	typeof value === "string" && value.startsWith("user_");

const normalizeGroups = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string");
	}
	const asString = getString(value);
	return asString ? [asString] : [];
};

const isTokenExpired = (token: string): boolean => {
	try {
		const { exp } = jwtDecode<{ exp?: number }>(token);
		if (exp === undefined) return false;
		return Date.now() / 1000 >= exp;
	} catch {
		return true;
	}
};

const getPostLoginRoute = (
	role: string,
): "/company-dashboard" | "/internal-dashboard" | "/organization-profile" => {
	if (role === "org-issara-management" || role === "org-issara-staff") {
		return "/internal-dashboard";
	}
	if (role === "org-cso") {
		return "/organization-profile";
	}
	return "/company-dashboard";
};

const getStoredRole = (): string => {
	try {
		const authStorage = localStorage.getItem("auth-storage");
		return authStorage ? JSON.parse(authStorage).state?.role || "" : "";
	} catch {
		return "";
	}
};

const roleToView = (role: string): ViewMode => {
	if (role === "org-test-user") return "supplier-view";
	if (role === "org-supplier") return "supplier-view";
	if (role === "org-global-partner") return "buyer-view";
	if (role === "org-issara-management" || role === "org-issara-staff")
		return "ilm-view";
	if (role === "org-recruiter" || role === "org-recruitment-agency")
		return "ra-view";
	return "";
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error: unknown): number | undefined =>
	(error as { response?: { status?: number } })?.response?.status;

// A request is worth repeating only when it never reached a verdict: no response
// at all (network drop), a server-side failure, a timeout, or a rate limit.
const isTransientError = (error: unknown): boolean => {
	const status = getErrorStatus(error);
	return (
		status === undefined || status >= 500 || status === 408 || status === 429
	);
};

// Build the profile blob used for display, using WorkOS field names.
const buildAuthUser = (
	workosUserId: string,
	responseUser: Record<string, unknown>,
	callbackData: CallbackData,
	roleSlug: string,
) => ({
	// WorkOS user fields
	id: workosUserId,
	email: getString(responseUser.email) || "",
	firstName:
		getString(responseUser.firstName) ||
		getString(responseUser.first_name) ||
		"",
	lastName:
		getString(responseUser.lastName) || getString(responseUser.last_name) || "",
	avatarUrl:
		getString(responseUser.avatarUrl) ||
		getString(responseUser.profile_picture_url) ||
		null,
	emailVerified:
		typeof responseUser.emailVerified === "boolean"
			? responseUser.emailVerified
			: typeof responseUser.email_verified === "boolean"
				? responseUser.email_verified
				: false,
	// Organization and authorization fields
	organization:
		normalizeId(responseUser.organization) ??
		normalizeId(callbackData.authorization?.organizationId) ??
		null,
	partner:
		normalizeId(responseUser.partner) ??
		normalizeId(callbackData.authorization?.partnerId) ??
		null,
	supplier:
		normalizeId(responseUser.supplier) ??
		normalizeId(callbackData.authorization?.supplierId) ??
		null,
	// Connected platforms links data
	links: {
		ilm: {
			isActive: callbackData.links?.ilm?.isActive || false,
			userId: callbackData.links?.ilm?.userId || null,
		},
		gd: {
			isActive: callbackData.links?.gd?.isActive || false,
			userId: callbackData.links?.gd?.userId || null,
		},
	},
	// Additional fields for compatibility
	full_name:
		`${getString(responseUser.firstName) || getString(responseUser.first_name) || ""} ${getString(responseUser.lastName) || getString(responseUser.last_name) || ""}`.trim() ||
		getString(responseUser.email) ||
		"",
	username:
		getString(responseUser.username) || getString(responseUser.email) || "",
	auth_source: "workos",
	authentication_method: getString(responseUser.provider) || "WorkOSAuthKit",
	is_active: true,
	groups: roleSlug ? [roleSlug] : [],
});

export function AuthCallback() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState("Processing...");
	const [error, setError] = useState<string | null>(null);
	const [errorTitle, setErrorTitle] = useState("Authentication Failed");
	// When set, "Try again" re-runs the failed step in place instead of reloading.
	const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
	const { setRole, setSession } = useAuthData.getState();

	useEffect(() => {
		const handleCallback = async () => {
			const resolveSupplierDestination = async (
				workosUserId?: string | null,
			) => {
				const maxAttempts = 3;
				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					try {
						const supplierTrack = await queryClient.fetchQuery({
							...getSupplierTrackQueryOptions(
								workosUserId,
								getSupplierTrackStatus,
							),
							// The loop below owns retrying, so the query must not retry too:
							// nesting the two would multiply into six requests per attempt.
							retry: false,
						});
						return getSupplierPostLoginRoute(supplierTrack);
					} catch (err) {
						// Only a network drop or a 5xx can fix itself. Every 4xx is a
						// decision the backend already made and will repeat.
						if (!isTransientError(err) || attempt === maxAttempts) {
							throw err;
						}
						await delay(attempt === 1 ? 600 : 1200);
					}
				}
				throw new Error("Unable to resolve supplier destination");
			};

			const showSupplierAccessError = (
				trackError: unknown,
				onRetry?: () => void,
			) => {
				if (onRetry) {
					setRetryAction(() => () => {
						setError(null);
						setRetryAction(null);
						onRetry();
					});
				}
				if (isSupplierAssignmentRequiredError(trackError)) {
					setErrorTitle("Supplier assignment required");
					setError(
						"Your account has the Supplier role but is not assigned to a supplier. Please contact an administrator.",
					);
					return;
				}
				setErrorTitle("Supplier access check unavailable");
				setError(
					"CASCADE could not confirm your supplier access. Please try again or contact support.",
				);
			};

			const runHandshake = async (
				workosUserId: string,
				finalRole: string,
			): Promise<boolean> => {
				const handshakeUrl = `${import.meta.env.VITE_APP_CASCADE_API_URL}/auth/handshake`;
				const maxAttempts = 3;

				for (let attempt = 1; attempt <= maxAttempts; attempt++) {
					setStatus(
						attempt === 1
							? "Completing authentication handshake..."
							: `Still working, retrying (${attempt}/${maxAttempts})...`,
					);
					try {
						await api.post(handshakeUrl, {
							user_id: workosUserId,
							role_slug: finalRole,
						});
						console.info(
							"Authentication handshake completed with role:",
							finalRole,
						);
						return true;
					} catch (err) {
						// Retry transient failures only: a network drop, or an upstream
						// 5xx/504 while the API is cold. A 4xx will not fix itself, and a
						// 401 has already been handled by the axios interceptor.
						if (!isTransientError(err) || attempt === maxAttempts) {
							console.error("Failed to complete handshake:", err);
							setErrorTitle("Could not complete sign-in");
							setError(
								"CASCADE could not finish setting up your session. Your sign-in itself was successful — please try again.",
							);
							return false;
						}
						await delay(attempt === 1 ? 1000 : 2000);
					}
				}
				return false;
			};

			// Runs the handshake and, only once it settles, routes the user onward. The
			// page stays on its loading state for the whole wait rather than redirecting
			// into a guard that has nothing to check yet.
			const completeSignIn = async (
				workosUserId: string,
				finalRole: string,
			): Promise<void> => {
				const handshakeSucceeded = await runHandshake(workosUserId, finalRole);
				if (!handshakeSucceeded) {
					setRetryAction(() => () => {
						setError(null);
						setRetryAction(null);
						void completeSignIn(workosUserId, finalRole);
					});
					return;
				}

				setStatus("Redirecting to dashboard...");

				// Resolve supplier setup through React Query so the root gate and track
				// page reuse this result instead of showing a second loading state.
				const destination:
					| "/company-dashboard"
					| "/cascade-marketplace"
					| "/company-profile"
					| "/internal-dashboard"
					| "/organization-profile"
					| "/track-selection" = getPostLoginRoute(finalRole);
				if (finalRole === "org-supplier") {
					const tryResolveSupplier = async () => {
						try {
							const dest = await resolveSupplierDestination(workosUserId);
							await navigate({ to: dest });
						} catch (trackError) {
							console.error(
								"Failed to resolve supplier track selection:",
								trackError,
							);
							showSupplierAccessError(trackError, () => {
								void tryResolveSupplier();
							});
						}
					};
					await tryResolveSupplier();
					return;
				}
				setTimeout(() => {
					navigate({ to: destination });
				}, 1000);
			};

			try {
				// Get the code from URL parameters
				const urlParams = new URLSearchParams(window.location.search);
				const code = urlParams.get("code");

				if (!code) {
					setStatus("No authorization code found. Redirecting...");
					setTimeout(() => {
						navigate({ to: "/" });
					}, 1000);
					return;
				}

				// Guard against duplicate processing
				const callbackKey = `processed_${code}`;
				const storedRole = getStoredRole();
				// Only short-circuit when a previous run actually finished and left a
				// role behind. React StrictMode's double effect marks the code as
				// processed before the first run has stored anything, and redirecting
				// with an empty role lands the user on /unauthorized.
				if (sessionStorage.getItem(callbackKey) && storedRole) {
					// Already processed, resolve supplier access before redirecting.
					if (storedRole === "org-supplier") {
						const tryResolveAlreadyProcessed = async () => {
							try {
								const dest = await resolveSupplierDestination(
									getStoredWorkosUserId(),
								);
								await navigate({ to: dest });
							} catch (trackError) {
								showSupplierAccessError(trackError, () => {
									void tryResolveAlreadyProcessed();
								});
							}
						};
						await tryResolveAlreadyProcessed();
						return;
					}
					const destination = getPostLoginRoute(storedRole);
					setTimeout(() => {
						navigate({ to: destination });
					}, 500);
					return;
				}
				sessionStorage.setItem(callbackKey, "true");

				// Debug the callback
				debugWorkOSCallback();

				setStatus("Extracting authorization code...");

				setStatus("Exchanging code for tokens...");

				const callbackBaseUrl =
					getString(import.meta.env.VITE_APP_API_GATEWAY_URL) ??
					"https://cascadeapi.issarainstitute.org";

				const callbackEndpoint = `${callbackBaseUrl.replace(
					/\/+$/,
					"",
				)}/auth/callback`;
				const { data } = await api.post(callbackEndpoint, { code });

				const callbackData = (data ?? {}) as CallbackData;

				// Store token from old or new callback shape
				const token = callbackData.token ?? callbackData.session?.accessToken;
				if (token) {
					// Reject expired tokens before storing them
					const tokenToCheck = callbackData.session?.accessToken ?? token;
					if (isTokenExpired(tokenToCheck)) {
						console.warn(
							"Received an expired token from auth server. Redirecting to login.",
						);
						setStatus("Session expired. Redirecting to login...");
						localStorage.removeItem("auth_token");
						localStorage.removeItem("refresh_token");
						localStorage.removeItem("auth_user");
						setAuthToken(undefined);
						setTimeout(() => {
							navigate({ to: "/" });
						}, 1500);
						return;
					}

					localStorage.setItem("auth_token", token);
					localStorage.setItem(
						"refresh_token",
						callbackData.session?.refreshToken ?? "",
					);
					setAuthToken(token);
					setStatus("Token stored successfully...");

					// Extract session ID from token if available
					try {
						const decoded = jwtDecode<{ role?: string; sid?: string }>(
							tokenToCheck,
						);
						setSession(decoded.sid || null);
					} catch (error) {
						console.error("Error decoding token:", error);
					}
				}

				// Determine role based on appRole, groups, or token
				const groups = normalizeGroups(callbackData.authorization?.groups);
				const tokenRole = selectTokenAppRole({
					role: callbackData.session?.role,
					roles: callbackData.session?.roles,
				});
				const finalRole = resolveCallbackAppRole({
					appRole: callbackData.authorization?.appRole,
					groups,
					tokenRole,
				});

				// Get user ID
				const responseUser = (callbackData.user ?? {}) as Record<
					string,
					unknown
				>;
				const responseUserId = responseUser.id;
				const workosUserId = isWorkOSUserId(responseUserId)
					? responseUserId
					: undefined;

				if (!workosUserId) {
					console.error("Unable to determine user ID from callback");
					setStatus("Error: Invalid user ID. Redirecting...");
					setTimeout(() => {
						navigate({ to: "/" });
					}, 2000);
					return;
				}

				// Persist the session identity from the callback response BEFORE the
				// handshake. The role is derived from the callback body, not from the
				// handshake, so a slow or failing handshake must never leave the
				// session role-less — every route guard reads this role and treats a
				// missing one as "not permitted".
				setRole(finalRole);
				try {
					// Set view mode based on role so UI reflects the user's role immediately
					useViewModeStore.getState().setViewMode(roleToView(finalRole));
				} catch (e) {
					console.error("Failed to set view mode:", e);
				}
				localStorage.setItem(
					"auth_user",
					JSON.stringify(
						buildAuthUser(workosUserId, responseUser, callbackData, finalRole),
					),
				);
				console.info("User profile stored for display");

				await completeSignIn(workosUserId, finalRole);
			} catch (error) {
				console.error("Error during auth callback:", error);

				setTimeout(() => {
					navigate({ to: "/" });
				}, 3000);
			}
		};

		handleCallback();
	}, []);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="text-center p-8 bg-white rounded-md shadow-md max-w-md w-full mx-4">
				<div className="mb-4">
					{error ? (
						<div className="w-12 h-12 mx-auto mb-4 text-red-500">
							<svg fill="currentColor" viewBox="0 0 20 20">
								<path
									clipRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									fillRule="evenodd"
								/>
							</svg>
						</div>
					) : (
						<div className="flex flex-col justify-center items-center">
							<LoadingSpinner subtitle={status} title={"Completing Login..."} />
						</div>
					)}
				</div>

				<h2 className="text-xl font-semibold mb-2">
					{error ? errorTitle : ""}
				</h2>

				<p className={`text-sm ${error ? "text-red-600" : "text-gray-600"}`}>
					{error || ""}
				</p>

				{error && (
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<button
							className="cascade-btn cascade-btn--primary rounded-full px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={() =>
								retryAction ? retryAction() : window.location.reload()
							}
							type="button"
						>
							Try again
						</button>
						<button
							className="cascade-btn cascade-btn--alt2 rounded-full px-5 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
							onClick={() => void navigate({ to: "/logout" })}
							type="button"
						>
							Sign out
						</button>
						<a
							className="w-full text-sm text-[#148696] underline hover:text-[#00516a]"
							href="mailto:cascade@issarainstitute.org"
						>
							Contact support
						</a>
					</div>
				)}
			</div>
		</div>
	);
}
