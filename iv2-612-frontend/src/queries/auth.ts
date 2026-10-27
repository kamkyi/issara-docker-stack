import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import flagsmith from "flagsmith";
import { api } from "$src/api/axios";

interface User {
	id: number;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	is_active: boolean;
	groups: string[];
	organization: number;
	partner: number | null;
	supplier: number;
}

interface OtpResponse {
	user: User;
	token?: string;
}

// Password change interface
interface PasswordChangeData {
	userId: number | string;
	oldPassword: string;
	newPassword: string;
	confirmPassword: string;
}

// OTP Verification Mutation (v5-style)
export const useVerifyOtp = () => {
	const queryClient = useQueryClient();
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;

	const verifyOtpMutationFn = async (code: string): Promise<OtpResponse> => {
		const code_token = localStorage.getItem("auth_token");
		if (!code_token) throw new Error("No code token found");

		const { data } = await api.post<OtpResponse>(
			`/two_factor_auth/auth/?client_version=${clientVersion}`,
			{ code_token, code },
		);
		return data;
	};

	return useMutation({
		mutationFn: verifyOtpMutationFn,
		onSuccess: (data) => {
			if (data.user) {
				queryClient.setQueryData(["auth", "user"], data.user);
			}
			if (data.token) {
				localStorage.setItem("auth_token", data.token);
				localStorage.setItem("auth_user", JSON.stringify(data.user));
				flagsmith.identify(data.user.username, {
					id: data.user.id,
					email: data.user.email,
					first_name: data.user.first_name,
					last_name: data.user.last_name,
					is_active: data.user.is_active,
					organization: data.user.organization,
					partner: data.user.partner,
					supplier: data.user.supplier,
					groups: data.user.groups.join(","),
				});
			}
		},
	});
};

// Password change mutation hook
export const useChangePassword = () => {
	return useMutation({
		mutationFn: async (data: PasswordChangeData) => {
			const { userId, oldPassword, newPassword, confirmPassword } = data;

			const response = await api.put(
				`/api-auth-user/change_password/${userId}/`,
				{
					old_password: oldPassword,
					password: newPassword,
					password2: confirmPassword,
				},
			);

			return response.data;
		},
	});
};

// Password reset request mutation hook
export const useRequestPasswordReset = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	return useMutation({
		mutationFn: async (email: string) => {
			const response = await axios.post(
				`${baseUrl}/api-auth-user/password_reset/?client_version=${clientVersion}`,
				{ email },
				{
					headers: {
						"Content-Type": "application/json;charset=UTF-8",
						Accept: "application/json, text/plain, */*",
					},
				},
			);
			return response.data;
		},
	});
};

// Password reset confirmation mutation hook
export const useResetPassword = () => {
	const clientVersion = import.meta.env.VITE_CLIENT_VERSION;
	const baseUrl = import.meta.env.VITE_API_BASE_URL;

	return useMutation({
		mutationFn: async ({
			password,
			token,
		}: {
			password: string;
			token: string;
		}) => {
			const response = await axios.post(
				`${baseUrl}/api-auth-user/password_reset/confirm/?client_version=${clientVersion}`,
				{ password, token },
				{
					headers: {
						"Content-Type": "application/json;charset=UTF-8",
						Accept: "application/json, text/plain, */*",
					},
				},
			);
			return response.data;
		},
	});
};

export const useLogout = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			// Clear localStorage
			localStorage.removeItem("auth_token");
			localStorage.removeItem("auth_user");

			// Clear React Query cache
			queryClient.removeQueries({ queryKey: ["auth"] });

			return true;
		},
	});
};

// Helper function to decode JWT token
const decodeJWT = (token: string) => {
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join(""),
		);
		return JSON.parse(jsonPayload);
	} catch (error) {
		console.error("Error decoding JWT:", error);
		return null;
	}
};

// Helper function to check if token is expired
const isTokenExpired = (token: string): boolean => {
	const decoded = decodeJWT(token);
	if (!decoded || !decoded.exp) {
		return true; // If we can't decode or no expiration, consider it expired
	}

	// JWT exp is in seconds, Date.now() is in milliseconds
	const currentTime = Date.now() / 1000;
	return decoded.exp < currentTime;
};

export const authStatus = () => {
	// Use only localStorage-based auth
	const token = localStorage.getItem("auth_token");
	const authStorage = localStorage.getItem("auth-storage")
		? JSON.parse(localStorage.getItem("auth-storage") as string)
		: null;
	const role = authStorage?.state?.role || null;

	// Check if token exists and is not expired
	const isAuthenticated = !!token && !isTokenExpired(token);

	// If token is expired, clear it
	if (token && isTokenExpired(token)) {
		localStorage.removeItem("auth_token");
		localStorage.removeItem("auth_user");
		localStorage.removeItem("auth-storage");
	}

	return {
		isAuthenticated,
		role: role || null,
		tokenExpired: token ? isTokenExpired(token) : false,
	};
};
