import axios from "axios";

const GD_API_V1_URL = (import.meta.env.VITE_APP_GD_API_V1_URL ?? "").replace(
	/\/$/,
	"",
);

// Extract base URL from the full API URL (e.g., https://staging.cms.golden-dreams.org)
const GD_BASE_URL = GD_API_V1_URL.replace(/\/api\/v1$/, "");

const getAuthHeaders = () => {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Normalize image URL - if it's a relative path, prepend the base URL
 */
const normalizeImageUrl = (imageUrl: string): string => {
	if (!imageUrl) return "";
	// If already a full URL (starts with http:// or https://), return as-is
	if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
		return imageUrl;
	}
	// If it's a relative path, prepend the base URL
	const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
	return `${GD_BASE_URL}${path}`;
};

export interface BusinessImage {
	id: number;
	image: string;
	employer_profile?: number;
	is_cover_photo?: boolean;
}

// ── Supplier: employer-cover-images ──────────────────────────────────────────

export const fetchEmployerCoverImages = async (
	employerProfileId: number,
): Promise<BusinessImage[]> => {
	const response = await axios.get<unknown>(
		`${GD_API_V1_URL}/employer-cover-images/`,
		{
			params: { gd_user_id: employerProfileId },
			headers: getAuthHeaders(),
		},
	);
	const data = response.data;
	const images = Array.isArray(data)
		? (data as BusinessImage[])
		: ((data as { results?: BusinessImage[] }).results ?? []);

	// Normalize image URLs
	return images.map((img) => ({
		...img,
		image: normalizeImageUrl(img.image),
	}));
};

export const uploadEmployerCoverImage = async (
	file: File,
	employerProfileId: number,
): Promise<BusinessImage> => {
	const fd = new FormData();
	fd.append("image", file);
	fd.append("employer_profile", String(employerProfileId));
	fd.append("is_cover_photo", "false");
	const response = await axios.post<BusinessImage>(
		`${GD_API_V1_URL}/employer-cover-images/`,
		fd,
		{ headers: { ...getAuthHeaders() } },
	);

	// Normalize image URL in response
	return {
		...response.data,
		image: normalizeImageUrl(response.data.image),
	};
};

export const deleteEmployerCoverImage = async (id: number): Promise<void> => {
	await axios.delete(`${GD_API_V1_URL}/employer-cover-images/${id}/`, {
		headers: getAuthHeaders(),
	});
};

// ── RA: bussiness-images (intentional API spelling) ───────────────────────────

export const fetchBusinessImages = async (
	gdUserId?: number | null,
): Promise<BusinessImage[]> => {
	const response = await axios.get<unknown>(
		`${GD_API_V1_URL}/bussiness-images/`,
		{
			params: gdUserId != null ? { gd_user_id: gdUserId } : undefined,
			headers: getAuthHeaders(),
		},
	);
	const data = response.data;
	const images = Array.isArray(data)
		? (data as BusinessImage[])
		: ((data as { results?: BusinessImage[] }).results ?? []);

	// Normalize image URLs
	return images.map((img) => ({
		...img,
		image: normalizeImageUrl(img.image),
	}));
};

export const uploadBusinessImage = async (
	file: File,
	gdUserId?: number | null,
): Promise<BusinessImage> => {
	const fd = new FormData();
	fd.append("image", file);
	if (gdUserId != null) {
		fd.append("recruitment_agency_profile", String(gdUserId));
	}
	const response = await axios.post<BusinessImage>(
		`${GD_API_V1_URL}/bussiness-images/`,
		fd,
		{ headers: { ...getAuthHeaders() } },
	);

	// Normalize image URL in response
	return {
		...response.data,
		image: normalizeImageUrl(response.data.image),
	};
};

export const deleteBusinessImage = async (id: number): Promise<void> => {
	await axios.delete(`${GD_API_V1_URL}/bussiness-images/${id}/`, {
		headers: getAuthHeaders(),
	});
};
