import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "$src/api/axios";

/**
 * The CSO organization profile, backed by ILM Django at
 * `/cascade/organizations/me/`.
 *
 * The endpoint takes no id — it resolves the organization from the caller's
 * user→organization link — so there is nothing to scope on this side.
 *
 * Note this talks to Django directly rather than through cascade-api: the
 * profile is not among the endpoints cascade-api proxies.
 */

const ILM_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
	/\/+$/,
	"",
);

const PROFILE_URL = `${ILM_BASE_URL}/cascade/organizations/me/`;
const OPTIONS_URL = `${ILM_BASE_URL}/cascade/organizations/profile-options/`;
const IMAGES_URL = `${PROFILE_URL}images/`;
const LOGO_URL = `${PROFILE_URL}logo/`;

export const resolveOrganizationAssetUrl = (value: string) => {
	if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value))
		return value;
	if (!ILM_BASE_URL) return value;
	return `${ILM_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export interface OrganizationProfile {
	id: number;
	name: string;
	logo: string | null;
	description: string | null;
	website: string | null;
	/** A key from the options endpoint, e.g. "international_ngo". */
	organization_type: string | null;
	/** ILM country ids — the same ids `/cascade/countries` serves. */
	countries_of_registration: number[];
	countries_of_operation: number[];
	/** Language codes rather than ids, e.g. "en", "th". */
	languages_supported: string[];
	core_focus_areas: string[];
	stakeholder_groups: string[];
	/** Canonical NACE Rev. 2.1 Tier 1 section notation, e.g. "A", "C". */
	nace_codes: string[];
	created_at: string | null;
	updated_at: string | null;
}

export type OrganizationProfileUpdate = Partial<
	Omit<OrganizationProfile, "id" | "logo" | "created_at" | "updated_at">
>;

export interface ProfileOption {
	value: string;
	label: string;
}

export interface OrganizationProfileOptions {
	organization_types: ProfileOption[];
	core_focus_areas: ProfileOption[];
	stakeholder_groups: ProfileOption[];
	languages: ProfileOption[];
}

export interface OrganizationImage {
	id: number;
	image: string;
	created_at: string;
}

export interface OrganizationImageUploadRequest {
	file: File;
	onProgress?: (percentage: number) => void;
}

export const unwrapOrganizationImages = (
	payload: OrganizationImage[] | { results: OrganizationImage[] },
) => (Array.isArray(payload) ? payload : payload.results);

export const ORGANIZATION_PROFILE_QUERY_KEY = ["organization-profile"];
export const ORGANIZATION_IMAGES_QUERY_KEY = ["organization-profile-images"];

export const useOrganizationProfile = () =>
	useQuery<OrganizationProfile>({
		queryKey: ORGANIZATION_PROFILE_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<OrganizationProfile>(PROFILE_URL);
			return {
				...response.data,
				logo: response.data.logo
					? resolveOrganizationAssetUrl(response.data.logo)
					: null,
			};
		},
		// A CSO user with no organization link gets a 404 that retrying cannot fix.
		retry: false,
	});

/**
 * The vocabularies the form offers. Fixed reference data for the session, so it
 * is fetched once — the labels the UI shows come from i18n, keyed on `value`.
 */
export const useOrganizationProfileOptions = () =>
	useQuery<OrganizationProfileOptions>({
		queryKey: ["organization-profile-options"],
		queryFn: async () => {
			const response = await api.get<OrganizationProfileOptions>(OPTIONS_URL);
			return response.data;
		},
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	});

export const useUpdateOrganizationProfile = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: OrganizationProfileUpdate) => {
			const response = await api.patch<OrganizationProfile>(
				PROFILE_URL,
				payload,
			);
			return response.data;
		},
		onSuccess: (profile) => {
			queryClient.setQueryData(ORGANIZATION_PROFILE_QUERY_KEY, profile);
		},
	});
};

export const useUploadOrganizationLogo = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (file: File) => {
			const form = new FormData();
			form.append("logo", file);
			const response = await api.post<{ logo: string }>(LOGO_URL, form);
			return resolveOrganizationAssetUrl(response.data.logo);
		},
		onSuccess: (logo) => {
			queryClient.setQueryData<OrganizationProfile>(
				ORGANIZATION_PROFILE_QUERY_KEY,
				(current) => (current ? { ...current, logo } : current),
			);
		},
	});
};

export const useOrganizationImages = () =>
	useQuery<OrganizationImage[]>({
		queryKey: ORGANIZATION_IMAGES_QUERY_KEY,
		queryFn: async () => {
			const response = await api.get<
				OrganizationImage[] | { results: OrganizationImage[] }
			>(IMAGES_URL);
			const images = unwrapOrganizationImages(response.data);
			return images.map((image) => ({
				...image,
				image: resolveOrganizationAssetUrl(image.image),
			}));
		},
		retry: false,
	});

export const useUploadOrganizationImage = () => {
	return useMutation({
		mutationFn: async ({
			file,
			onProgress,
		}: OrganizationImageUploadRequest) => {
			const form = new FormData();
			form.append("image", file);
			const response = await api.post<OrganizationImage>(IMAGES_URL, form, {
				onUploadProgress: (event) => {
					const total = event.total ?? file.size;
					if (total > 0) {
						// Keep 100% for the point where the server has accepted the image.
						onProgress?.(
							Math.min(95, Math.round((event.loaded / total) * 100)),
						);
					}
				},
			});
			onProgress?.(100);
			return {
				...response.data,
				image: resolveOrganizationAssetUrl(response.data.image),
			};
		},
	});
};

export const useDeleteOrganizationImage = () =>
	useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`${IMAGES_URL}${id}/`);
		},
	});

/** Fields that count toward the profile strength meter, in no particular order. */
const STRENGTH_FIELDS: (keyof OrganizationProfile)[] = [
	"name",
	"description",
	"website",
	"organization_type",
	"countries_of_registration",
	"countries_of_operation",
	"languages_supported",
	"core_focus_areas",
	"stakeholder_groups",
	"nace_codes",
];

const isFilled = (value: OrganizationProfile[keyof OrganizationProfile]) => {
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "string") return value.trim().length > 0;
	return value !== null && value !== undefined;
};

/** Share of profile fields filled in, 0–100. */
export const getProfileStrength = (
	profile: OrganizationProfile | undefined,
): number => {
	if (!profile) return 0;
	const filled = STRENGTH_FIELDS.filter((field) =>
		isFilled(profile[field]),
	).length;
	return Math.round((filled / STRENGTH_FIELDS.length) * 100);
};
