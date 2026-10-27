import axios from "axios";
import { decryptPayload } from "../utils/decryptResponse";
import {
	isSupplierAgreementAccessError,
	SUPPLIER_AGREEMENT_INVALIDATED_EVENT,
} from "../utils/supplierAgreementEvents";

export const api = axios.create();

// Add request interceptor to dynamically add auth token
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("auth_token");
		const hasAuthorizationHeader =
			Boolean(config.headers?.Authorization) ||
			Boolean((config.headers as any)?.authorization);
		if (token && !hasAuthorizationHeader) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		// Hint the ILM Django user id so the legacy backend can resolve the
		// WorkOS sub → Django user mapping without depending on a fully
		// provisioned WorkOSUser row. The backend only trusts this header
		// when the JWT's role claim is an Issara internal role.
		try {
			const rawAuthUser = localStorage.getItem("auth_user");
			if (rawAuthUser) {
				const parsed = JSON.parse(rawAuthUser) as {
					links?: { ilm?: { userId?: number | string | null } };
				};
				const ilmUserId = parsed?.links?.ilm?.userId;
				if (
					ilmUserId != null &&
					!Number.isNaN(Number(ilmUserId)) &&
					!config.headers["X-ILM-User-Id"]
				) {
					config.headers["X-ILM-User-Id"] = String(ilmUserId);
				}
			}
		} catch {
			// best-effort; ignore parse failures
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// Transparently decrypt AES-256-GCM encoded responses from the backend
api.interceptors.response.use(async (response) => {
	if (response.data && typeof response.data.d === "string") {
		try {
			response.data = await decryptPayload(response.data.d);
		} catch {
			// Leave response unchanged if decryption fails (e.g. during local dev
			// before the env var is configured)
		}
	}
	return response;
});

export function setAuthToken(token?: string) {
	if (token) {
		api.defaults.headers.common.Authorization = `Bearer ${token}`;
	} else {
		delete api.defaults.headers.common.Authorization;
	}
}

// Function to handle logout and redirect
export function handleTokenExpiration() {
	// Clear token and user from localStorage
	localStorage.removeItem("auth_token");
	localStorage.removeItem("auth_user");

	// Clear authorization header
	setAuthToken(undefined);

	// Clear React Query cache for auth if available
	try {
		import("@tanstack/react-query")
			.then((module: any) => {
				const queryClient = module?.queryClient;
				if (queryClient) {
					queryClient.removeQueries({ queryKey: ["auth"] });
				}
			})
			.catch(() => {
				// Ignore if not available
			});
	} catch (_e) {
		// Ignore if not available
	}

	// Redirect to root route (login entry). Load the router lazily so modules that
	// only need the API client do not pull the full route tree into tests.
	void import("../router").then(({ router }) => {
		router.navigate({ to: "/" });
	});
}

/**
 * Endpoints that run *during* sign-in, before the session has settled, and whose
 * 401 must not be read as "this session is over".
 *
 * The supplier access check fires in /auth/callback immediately after the
 * handshake, on a token that was only just minted. A transient 401 there
 * (clock skew, a WorkOS hiccup) used to trip handleTokenExpiration, which wipes
 * auth_token/auth_user and navigates to "/" -- destroying the session mid-login
 * and making the failure look random. Let the error reach the caller instead:
 * callback.tsx and SupplierTrackGate.tsx already retry and show a real error.
 */
const SESSION_CRITICAL_PATHS = ["/suppliers/track-selection"];

const isSessionCriticalCheck = (requestUrl: string) =>
	SESSION_CRITICAL_PATHS.some((path) => requestUrl.includes(path));

// Add response interceptor to handle token expiration
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (
			isSupplierAgreementAccessError(
				error.response?.status,
				error.response?.data,
			) &&
			typeof window !== "undefined"
		) {
			window.dispatchEvent(
				new CustomEvent(SUPPLIER_AGREEMENT_INVALIDATED_EVENT),
			);
		}

		if (error.response?.status === 503 && typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("cascade:maintenance_triggered", {
					detail: error.response?.data,
				}),
			);
		}

		// Only treat 401 as token expiration when it comes from our own internal APIs
		// (cascade API or auth gateway). External/legacy APIs (e.g. staging CMS) may
		// return 401 for their own reasons and should NOT sign the user out.
		if (error.response?.status === 401) {
			const requestUrl: string = error.config?.url || "";
			const cascadeBase = import.meta.env.VITE_APP_CASCADE_API_URL || "";
			const gatewayBase = import.meta.env.VITE_APP_API_GATEWAY_URL || "";
			const isInternalApi =
				(cascadeBase && requestUrl.startsWith(cascadeBase)) ||
				(gatewayBase && requestUrl.startsWith(gatewayBase));

			if (isInternalApi && !isSessionCriticalCheck(requestUrl)) {
				handleTokenExpiration();
			}
		}

		return Promise.reject(error);
	},
);
