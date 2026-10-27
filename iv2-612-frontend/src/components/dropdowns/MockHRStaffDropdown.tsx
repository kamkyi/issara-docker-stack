import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "$src/api/axios";
import workerFeedbackMockData from "$src/assets/mock/worker-feedback.json";
import {
	isWorkerFeedbackMockEnabled,
	type WorkerFeedbackRecord,
} from "$src/services/workerFeedbackService";
import type { AuthUser } from "$src/types";
import { parseStoredJson } from "$src/utils/auth-utils";

interface MockHRStaffDropdownProps {
	onSelect: (user: HrDropdownUser | null) => void;
	source?: "supplier-hr" | "company-staff";
	defaultValue?: string;
	defaultUserId?: number;
	defaultUser?: HrDropdownUser;
	placeholder?: string;
	className?: string;
}

export interface HrDropdownUser {
	id: number;
	username: string;
	first_name: string;
	last_name: string;
	full_name: string;
	email: string;
}

interface HrDropdownResponse {
	count?: number;
	next?: string | null;
	previous?: string | null;
	results?: HrDropdownUser[];
}

const MOCK_WORKER_FEEDBACK_RECORDS =
	workerFeedbackMockData as WorkerFeedbackRecord[];

const toHrDropdownUser = (
	user?: {
		id: number;
		username?: string;
		email?: string;
		first_name?: string;
		last_name?: string;
		full_name?: string;
	} | null,
) => {
	if (!user || typeof user.id !== "number" || !Number.isFinite(user.id)) {
		return null;
	}

	return {
		id: user.id,
		username: user.username || user.email || user.full_name || "",
		first_name: user.first_name || "",
		last_name: user.last_name || "",
		full_name:
			user.full_name ||
			[user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
			user.username ||
			user.email ||
			"",
		email: user.email || "",
	} satisfies HrDropdownUser;
};

const dedupeUsers = (users: Array<HrDropdownUser | null>) => {
	const seenIds = new Set<number>();

	return users.filter((user): user is HrDropdownUser => {
		if (!user || seenIds.has(user.id)) {
			return false;
		}

		seenIds.add(user.id);
		return true;
	});
};

const getMockUsers = (source: "supplier-hr" | "company-staff") => {
	if (source === "company-staff") {
		return dedupeUsers(
			MOCK_WORKER_FEEDBACK_RECORDS.flatMap((record) =>
				(record.next_steps_for_company_staff || []).map((user) =>
					toHrDropdownUser(user),
				),
			),
		);
	}

	return dedupeUsers(
		MOCK_WORKER_FEEDBACK_RECORDS.map((record) =>
			toHrDropdownUser(record.hr_staff),
		),
	);
};

const buildSupplierApiBaseUrl = () => {
	const appApiUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, "");
	if (appApiUrl) {
		return appApiUrl;
	}

	const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
	if (!baseUrl) {
		throw new Error("API base URL is not defined");
	}

	return `${baseUrl}/api/v2`;
};

const MockHRStaffDropdown: React.FC<MockHRStaffDropdownProps> = ({
	onSelect,
	source = "supplier-hr",
	defaultValue,
	defaultUserId,
	defaultUser,
	placeholder = "Select HR staff",
	className = "",
}) => {
	const [selected, setSelected] = useState<string>(
		typeof defaultUserId === "number" ? String(defaultUserId) : "",
	);
	const userData = parseStoredJson<AuthUser>("auth_user");
	const userId = Number(userData?.id);
	const shouldUseMockData = isWorkerFeedbackMockEnabled();

	const { data: hrUsers = [] } = useQuery({
		queryKey: ["supplierHrDropdown", source],
		queryFn: async (): Promise<HrDropdownUser[]> => {
			const response = await api.get<HrDropdownResponse>(
				`${buildSupplierApiBaseUrl()}/supplier/hr-dropdown/`,
			);

			return response.data?.results || [];
		},
		enabled: !shouldUseMockData,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});

	const options = useMemo(() => {
		if (shouldUseMockData) {
			return getMockUsers(source);
		}

		const validApiUsers = hrUsers.filter(
			(user) => typeof user.id === "number" && Number.isFinite(user.id),
		);

		if (validApiUsers.length > 0) {
			return validApiUsers;
		}

		if (userData?.email && Number.isFinite(userId) && userId > 0) {
			return [
				{
					id: userId,
					username: userData.email,
					first_name: "",
					last_name: "",
					full_name: "",
					email: userData.email,
				},
			];
		}
		return [];
	}, [hrUsers, shouldUseMockData, source, userData?.email, userId]);

	const fallbackOption = useMemo(
		() =>
			defaultUser &&
			typeof defaultUser.id === "number" &&
			Number.isFinite(defaultUser.id)
				? {
						id: defaultUser.id,
						username:
							defaultUser.username ||
							defaultUser.email ||
							defaultUser.full_name ||
							`user-${defaultUser.id}`,
						first_name: defaultUser.first_name || "",
						last_name: defaultUser.last_name || "",
						full_name:
							defaultUser.full_name ||
							[defaultUser.first_name, defaultUser.last_name]
								.filter(Boolean)
								.join(" ")
								.trim() ||
							defaultUser.username ||
							defaultUser.email ||
							"",
						email: defaultUser.email || "",
					}
				: undefined,
		[
			defaultUser?.id,
			defaultUser?.username,
			defaultUser?.email,
			defaultUser?.first_name,
			defaultUser?.last_name,
			defaultUser?.full_name,
		],
	);

	const mergedOptions = useMemo(
		() =>
			fallbackOption
				? options.some((staff) => staff.id === fallbackOption.id)
					? options
					: [fallbackOption, ...options]
				: options,
		[fallbackOption, options],
	);

	useEffect(() => {
		if (typeof defaultUserId === "number") {
			setSelected(String(defaultUserId));
			return;
		}

		if (typeof defaultUser?.id === "number") {
			setSelected(String(defaultUser.id));
		}
	}, [defaultUserId, defaultUser?.id]);

	useEffect(() => {
		if (
			!defaultValue ||
			typeof defaultUserId === "number" ||
			typeof defaultUser?.id === "number"
		) {
			return;
		}

		const matchedUser = mergedOptions.find((staff) => {
			return [staff.username, staff.email, staff.full_name].includes(
				defaultValue,
			);
		});

		if (matchedUser) {
			setSelected(String(matchedUser.id));
		}
	}, [defaultValue, defaultUserId, defaultUser?.id, mergedOptions]);

	return (
		<select
			className={`mock-hrstaff-dropdown ${className}`}
			onChange={(e) => {
				const value = e.target.value;
				setSelected(value);
				if (!value) {
					onSelect(null);
					return;
				}

				const selectedUser =
					mergedOptions.find((staff) => String(staff.id) === value) || null;

				if (!selectedUser) {
					console.warn(
						"[MockHRStaffDropdown] no match for selected value",
						value,
						"options:",
						mergedOptions,
					);
				}

				onSelect(selectedUser);
			}}
			style={{
				borderRadius: "0.375rem",
				border: "1px solid #d1d5db",
				padding: "0.5rem",
				width: "100%",
				background: "var(--dropdown-bg, white)",
				color: "inherit",
			}}
			value={selected}
		>
			<option value="">{placeholder}</option>
			{mergedOptions.map((staff) => {
				const value = String(staff.id);
				const label = staff.full_name || staff.username || staff.email;

				return (
					<option key={`${staff.id}-${value}`} value={value}>
						{label}
					</option>
				);
			})}
		</select>
	);
};

// Add some minimal CSS for dark mode support
if (typeof document !== "undefined") {
	const styleId = "mock-hrstaff-dropdown-style";
	if (!document.getElementById(styleId)) {
		const style = document.createElement("style");
		style.id = styleId;
		style.innerHTML = `
      .mock-hrstaff-dropdown {
        border-radius: 0.375rem;
        border: 1px solid #d1d5db;
        padding: 0.5rem;
        width: 100%;
        background: white;
        color: #333;
      }
      .dark .mock-hrstaff-dropdown {
        background: none !important;
        color: white;
        border-color: #374151;
      }
      .mock-hrstaff-dropdown:focus {
        outline: 2px solid #2563eb;
        border-color: #2563eb;
      }
    `;
		document.head.appendChild(style);
	}
}

export default MockHRStaffDropdown;
