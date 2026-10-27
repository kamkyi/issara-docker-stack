import { api } from "$src/api/axios";

type CompanyProfileImageKind = "strategic-partner" | "recruiter" | "supplier";

const IMAGE_ENDPOINTS: Record<CompanyProfileImageKind, string> = {
	"strategic-partner": "/cascade/strategic-partners",
	recruiter: "/cascade/recruiters",
	supplier: "/cascade/suppliers",
};

function getAppApiUrl() {
	return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
}

function getAuthHeaders() {
	const token = localStorage.getItem("auth_token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadCompanyProfileImage({
	file,
	id,
	kind,
}: {
	file: File;
	id: number;
	kind: CompanyProfileImageKind;
}) {
	const formData = new FormData();
	formData.append("image", file);

	const response = await api.post(
		`${getAppApiUrl()}${IMAGE_ENDPOINTS[kind]}/${id}/image/`,
		formData,
		{
			headers: getAuthHeaders(),
		},
	);

	return response.data as unknown;
}

/** Refresh this far before the URL actually dies, to cover clock skew + latency. */
const SIGNED_URL_REFRESH_MARGIN_MS = 60 * 1000;
const SIGNED_URL_MIN_REFRESH_MS = 30 * 1000;

/**
 * Milliseconds until a signed S3 URL should be re-fetched, or null if the URL
 * carries no expiry (legacy `/static/media/...` paths and external logos).
 * Handles both the v2 `Expires` epoch and the v4 `X-Amz-Date`/`X-Amz-Expires`
 * pair, since which one you get depends on the storage backend's signature
 * version.
 */
export function getSignedUrlRefreshDelayMs(
	url: string | null | undefined,
	now = Date.now(),
) {
	if (!url) return null;

	let expiresAtMs: number | null = null;
	try {
		const params = new URL(url).searchParams;

		const v2Expires = params.get("Expires");
		if (v2Expires && /^\d+$/.test(v2Expires)) {
			expiresAtMs = Number(v2Expires) * 1000;
		}

		const amzDate = params.get("X-Amz-Date");
		const amzExpires = params.get("X-Amz-Expires");
		if (expiresAtMs === null && amzDate && amzExpires) {
			// X-Amz-Date is basic-format ISO 8601: 20260728T101530Z
			const iso = amzDate.replace(
				/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
				"$1-$2-$3T$4:$5:$6Z",
			);
			const signedAtMs = Date.parse(iso);
			if (!Number.isNaN(signedAtMs)) {
				expiresAtMs = signedAtMs + Number(amzExpires) * 1000;
			}
		}
	} catch {
		return null;
	}

	if (expiresAtMs === null || Number.isNaN(expiresAtMs)) return null;

	return Math.max(
		SIGNED_URL_MIN_REFRESH_MS,
		expiresAtMs - now - SIGNED_URL_REFRESH_MARGIN_MS,
	);
}

/**
 * The value to persist in the `image` column, which must never receive a signed
 * S3 URL: those expire in 15 minutes and the column truncates them at 1024
 * chars, leaving a permanently broken link. The uploaded file is already
 * tracked via `imageicon`, so null is the correct value in that case.
 */
export function toPersistableImageValue(url: string) {
	const trimmed = url.trim();
	if (!trimmed) return null;
	if (/[?&](AWSAccessKeyId|X-Amz-Signature)=/i.test(trimmed)) return null;

	return trimmed;
}

/**
 * Reads the current logo from Django, which signs it fresh on every request
 * (PrivateStorage, 15 min expiry). The cascade-api `image` column can only ever
 * hold a stale/truncated copy of such a URL, so it is not a usable source.
 */
export async function fetchCompanyProfileImageUrl({
	id,
	kind,
}: {
	id: number;
	kind: CompanyProfileImageKind;
}) {
	const response = await api.get(
		`${getAppApiUrl()}${IMAGE_ENDPOINTS[kind]}/${id}/image/`,
		{ headers: getAuthHeaders() },
	);

	// Read `logo` only. The same response also carries the raw `image` column,
	// which is the stale value we are deliberately bypassing. `logo` already
	// falls back to `image` server-side when there is no uploaded file.
	const record = response.data as Record<string, unknown> | null;
	const logo = record?.logo;

	return typeof logo === "string" && logo.trim() ? logo.trim() : null;
}

export function extractCompanyProfileImageUrl(response: unknown) {
	if (!response || typeof response !== "object") {
		return null;
	}

	const record = response as Record<string, unknown>;
	const nestedData = record.data;
	if (nestedData && typeof nestedData === "object") {
		const nestedRecord = nestedData as Record<string, unknown>;
		const nestedImage = nestedRecord.image ?? nestedRecord.logo;
		if (typeof nestedImage === "string" && nestedImage.trim()) {
			return nestedImage.trim();
		}
	}

	const image = record.image ?? record.logo;
	if (typeof image === "string" && image.trim()) {
		return image.trim();
	}

	return null;
}
