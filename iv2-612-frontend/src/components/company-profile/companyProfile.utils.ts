import type { CompanyProfileTab } from "$src/components/company-profile/CompanyProfileTabs";
import type { StrategicPartnerPolicyCompliance } from "$src/hooks/useStrategicPartner";

export const POLICY_CONFIG = {
	humanRights: {
		fallbackId: 1,
		keywords: ["human rights", "human_rights", "human-rights"],
	},
	recruitment: {
		fallbackId: 2,
		keywords: ["responsible recruitment", "recruitment"],
	},
	procurement: {
		fallbackId: 3,
		keywords: ["responsible procurement", "procurement"],
	},
} as const;

export const NATIONALITY_BREAKDOWN_FIELDS = [
	{ key: "total_num_workers", label: "totalWorkers" },
	{ key: "total_num_men_workers", label: "totalMaleWorkers" },
	{ key: "total_num_women_workers", label: "totalFemaleWorkers" },
	{ key: "total_num_thai_workers", label: "thai" },
	{ key: "total_num_cambodian_workers", label: "cambodian" },
	{ key: "total_num_myanmar_workers", label: "myanmar" },
	{ key: "total_num_lao_workers", label: "lao" },
	{ key: "total_num_vietnamese_workers", label: "vietnamese" },
	{ key: "total_num_nepalese_workers", label: "nepalese" },
	{ key: "total_num_bangladeshi_workers", label: "bangladeshi" },
	{ key: "total_num_indonesian_workers", label: "indonesian" },
	{ key: "total_num_malaysian_workers", label: "malaysian" },
	{ key: "total_num_indian_workers", label: "indian" },
	{ key: "total_num_pakistani_workers", label: "pakistani" },
	{ key: "total_num_sri_lankan_workers", label: "sriLankan" },
] as const;

export type NationalityBreakdownFieldKey =
	(typeof NATIONALITY_BREAKDOWN_FIELDS)[number]["key"];
export type NationalityBreakdownValues = Record<
	NationalityBreakdownFieldKey,
	string
>;
export type NationalityTotalFieldKey = Exclude<
	NationalityBreakdownFieldKey,
	"total_num_workers" | "total_num_men_workers" | "total_num_women_workers"
>;
export type NationalityGenderBreakdownValues = Record<string, string>;

export const COMPANY_PROFILE_ACTIVE_TAB_KEY = "company-profile-active-tab";
export const COMPANY_PROFILE_TABS: readonly CompanyProfileTab[] = [
	"profile",
	"user-management",
	// Temporarily hidden. Leave the QR panel and data wiring in place so
	// supplier Company QR can be restored by re-enabling this value with the
	// matching tab item.
	// "company-qr",
];

export const S3_BASE_URL = import.meta.env.VITE_APP_ILM_S3_URL ?? "";
export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const getNationalityGenderKeys = (
	totalFieldKey: NationalityTotalFieldKey,
) => {
	const nationalityKey = totalFieldKey
		.replace(/^total_num_/, "")
		.replace(/_workers$/, "");

	return {
		menKey: `total_num_${nationalityKey}_men_workers`,
		womenKey: `total_num_${nationalityKey}_women_workers`,
	};
};

export const createEmptyNationalityBreakdownValues =
	(): NationalityBreakdownValues =>
		NATIONALITY_BREAKDOWN_FIELDS.reduce((acc, field) => {
			acc[field.key] = "";
			return acc;
		}, {} as NationalityBreakdownValues);

export const createEmptyNationalityGenderBreakdownValues =
	(): NationalityGenderBreakdownValues =>
		NATIONALITY_BREAKDOWN_FIELDS.slice(3).reduce((acc, field) => {
			const { menKey, womenKey } = getNationalityGenderKeys(
				field.key as NationalityTotalFieldKey,
			);
			acc[menKey] = "";
			acc[womenKey] = "";
			return acc;
		}, {} as NationalityGenderBreakdownValues);

export const getStringValue = (value: unknown) => {
	if (value === null || value === undefined) return "";
	if (typeof value === "number")
		return Number.isFinite(value) ? String(value) : "";
	if (typeof value === "string") return value;
	return "";
};

export const toNumberOrZero = (value: string | null | undefined) => {
	const parsedValue = Number(value ?? "");
	return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const buildNumericPayload = (
	values: Record<string, string>,
): Record<string, number | null> =>
	Object.entries(values).reduce(
		(acc, [key, value]) => {
			const trimmedValue = value.trim();
			if (trimmedValue === "") {
				acc[key] = null;
				return acc;
			}

			const numericValue = Number(trimmedValue);
			acc[key] = Number.isFinite(numericValue) ? numericValue : null;
			return acc;
		},
		{} as Record<string, number | null>,
	);

export const buildNationalityBreakdownPayload = (
	values: NationalityBreakdownValues,
	genderValues: NationalityGenderBreakdownValues,
) => ({
	...buildNumericPayload(values),
	...buildNumericPayload(genderValues),
});

export const isCompanyProfileTab = (
	value: string | null,
): value is CompanyProfileTab =>
	COMPANY_PROFILE_TABS.includes(value as CompanyProfileTab);

export const getStoredCompanyProfileTab = (): CompanyProfileTab => {
	if (typeof window === "undefined") return "profile";

	try {
		const storedTab = window.localStorage.getItem(
			COMPANY_PROFILE_ACTIVE_TAB_KEY,
		);
		return isCompanyProfileTab(storedTab) ? storedTab : "profile";
	} catch {
		return "profile";
	}
};

export const resolveAvatarImageUrl = (
	imagePath?: string | null,
	isSupplier?: boolean,
) => {
	const trimmed = imagePath?.trim();
	if (!trimmed) return "";
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	if (/^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) {
		return trimmed;
	}

	if (isSupplier) {
		const cascadeApiUrl =
			import.meta.env.VITE_APP_CASCADE_API_URL.replace("/api/v1", "") ?? "";
		const normalizedBase = cascadeApiUrl.replace(/\/$/, "");
		const fileName = trimmed.split("/").pop() || trimmed;
		return `${normalizedBase}/public/images/uploads/suppliers/${fileName}`;
	}

	if (!S3_BASE_URL) return trimmed;
	const normalizedBase = S3_BASE_URL.replace(/\/$/, "");
	const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

	return `${normalizedBase}${normalizedPath}`;
};

export const getArrayPayload = <T>(data: unknown): T[] => {
	if (Array.isArray(data)) {
		return data as T[];
	}

	if (data && typeof data === "object") {
		const record = data as Record<string, unknown>;
		for (const key of ["data", "items", "results", "countries", "industries"]) {
			const value = record[key];
			if (Array.isArray(value)) {
				return value as T[];
			}
		}
	}

	return [];
};

export const getUniqueNumericIds = (ids: Array<number | null | undefined>) =>
	Array.from(
		new Set(
			ids.filter(
				(id): id is number => typeof id === "number" && !Number.isNaN(id),
			),
		),
	);

export const getFirstStringValue = (
	...values: Array<string | number | null | undefined>
) => {
	for (const value of values) {
		if (value === null || value === undefined) continue;
		const normalized = String(value).trim();
		if (normalized) return normalized;
	}
	return null;
};

export const normalizeGroups = (
	value: string[] | string | null | undefined,
): string[] => {
	if (Array.isArray(value)) {
		return value.filter((group): group is string => typeof group === "string");
	}
	if (typeof value === "string" && value.trim()) {
		return [value];
	}
	return [];
};

export const getPolicySearchText = (
	compliance: StrategicPartnerPolicyCompliance,
) =>
	[
		compliance.policy_compliance?.name,
		compliance.policy_compliance?.code,
		compliance.policy_compliance?.slug,
		compliance.policy_compliance?.title,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

export const findPolicyCompliance = (
	compliances: StrategicPartnerPolicyCompliance[] | undefined,
	keywords: readonly string[],
	fallbackId: number,
) => {
	const list = compliances ?? [];
	return (
		list.find((compliance) =>
			keywords.some((keyword) =>
				getPolicySearchText(compliance).includes(keyword),
			),
		) ??
		list.find((compliance) => compliance.policy_compliance_id === fallbackId)
	);
};
