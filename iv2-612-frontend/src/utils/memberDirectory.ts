import { POLICY_CATEGORY_LABEL } from "$src/types/policies";

const S3_BASE_URL =
	import.meta.env.VITE_APP_ILM_S3_URL ??
	import.meta.env.VITE_APP_CASCADE_S3_URL ??
	"";
const ILM_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const MEDIA_PATH_PREFIXES = [
	"FlagIcon/",
	"partners/",
	"recruiters/",
	"suppliers/",
	"staff/",
	"Supplier Reports/",
	"other/",
	"Supplier Photo Attachments/",
	"Supplier Video Attachments/",
] as const;

export const MEMBER_TYPES = {
	supplier: "Supplier",
	recruitmentAgency: "Recruitment Agency",
	globalBuyer: "Global Buyer",
} as const;

export type MemberType = (typeof MEMBER_TYPES)[keyof typeof MEMBER_TYPES];

export interface PolicyEntry {
	id: string | number;
	label: string;
	text?: string;
	description?: string;
	tags?: string[];
	link?: string;
	fileUrl?: string;
	fileName?: string;
	sourceType?: "file" | "link" | "text";
}

const normalizePolicyIdentityValue = (value?: string | null): string =>
	(value ?? "").trim().toLowerCase();

const getUrlPathIdentity = (value?: string | null): string => {
	const normalized = normalizePolicyIdentityValue(value);
	if (!normalized) return "";
	try {
		const parsed = new URL(normalized, "http://localhost");
		return parsed.pathname.toLowerCase();
	} catch {
		return normalized.split("?")[0].split("#")[0];
	}
};

const getFileNameIdentity = (value?: string | null): string => {
	const normalized = normalizePolicyIdentityValue(value);
	if (!normalized) return "";
	return normalized.split("?")[0].split("#")[0].split("/").pop() ?? normalized;
};

interface PolicyEntryIdentities {
	strong: string[];
	fallback: string[];
}

const getPolicyEntryIdentities = (
	entry: PolicyEntry,
): PolicyEntryIdentities => {
	const strong = new Set<string>();
	const fallback = new Set<string>();

	if (entry.sourceType === "file") {
		const fullUrl = normalizePolicyIdentityValue(entry.fileUrl);
		if (fullUrl) strong.add(`file-url:${fullUrl}`);

		const urlPath = getUrlPathIdentity(entry.fileUrl);
		if (urlPath) strong.add(`file-path:${urlPath}`);

		const fileName =
			getFileNameIdentity(entry.fileName) || getFileNameIdentity(entry.fileUrl);
		if (fileName) fallback.add(`file-name:${fileName}`);
	}

	if (entry.sourceType === "link") {
		const link = normalizePolicyIdentityValue(entry.link);
		if (link) strong.add(`link:${link}`);
	}

	if (strong.size === 0 && fallback.size === 0) {
		fallback.add(
			[
				entry.sourceType ?? "",
				entry.label ?? "",
				entry.text ?? "",
				entry.fileName ?? "",
			]
				.join("|")
				.toLowerCase(),
		);
	}

	return {
		strong: [...strong],
		fallback: [...fallback],
	};
};

const hasPolicyEntryIdentityOverlap = (
	left: PolicyEntryIdentities,
	right: PolicyEntryIdentities,
) => {
	if (left.strong.some((identity) => right.strong.includes(identity))) {
		return true;
	}
	if (left.strong.length > 0 && right.strong.length > 0) {
		return false;
	}
	return left.fallback.some((identity) => right.fallback.includes(identity));
};

export const MEMBER_DIRECTORY_GLOBAL_PARTNER_IDS = [
	32, // ALDI Sud
	36, // Twinings
	10, // Nestle
	5, // Tesco
	12, // Sainsburys
	49, // Woolworths Group
	22, // Nike
	45, // Greencore
	42, // TAL Group
	19, // Sea-Farms - Seafresh Group
	43, // Ramatex Group
	50, // Salvation Army
	128, // BHP
] as const;

const MEMBER_DIRECTORY_GLOBAL_PARTNER_ID_SET = new Set<number>(
	MEMBER_DIRECTORY_GLOBAL_PARTNER_IDS,
);

export const MEMBER_DIRECTORY_GLOBAL_PARTNER_NAMES = [
	"ALDI Sud",
	"Twinings",
	"Nestle",
	"Tesco",
	"Sainsburys",
	"Woolworths Group",
	"Nike",
	"Greencore",
	"TAL Group",
	"Sea-Farms - Seafresh Group",
	"Seafresh Group",
	"Ramatex Group",
	"Salvation Army",
	"BHP",
] as const;

const MEMBER_DIRECTORY_GLOBAL_PARTNER_NAME_SET = new Set<string>(
	MEMBER_DIRECTORY_GLOBAL_PARTNER_NAMES.map((name) =>
		name.toLowerCase().trim(),
	),
);

export const isMemberDirectoryGlobalPartner = (partner: unknown) => {
	if (!partner) return false;
	if (
		typeof partner === "number" ||
		(typeof partner === "string" && !Number.isNaN(Number(partner)))
	) {
		const numericId = Number(partner);
		return (
			Number.isFinite(numericId) &&
			MEMBER_DIRECTORY_GLOBAL_PARTNER_ID_SET.has(numericId)
		);
	}
	const partnerObj = partner as Record<string, unknown>;
	const id = Number(partnerObj?.id);
	if (Number.isFinite(id) && MEMBER_DIRECTORY_GLOBAL_PARTNER_ID_SET.has(id)) {
		return true;
	}
	const name = String(partnerObj?.name || "")
		.toLowerCase()
		.trim();
	const nameEn = String(partnerObj?.name_en || "")
		.toLowerCase()
		.trim();

	if (name === "salvation army" || nameEn === "salvation army") {
		return id === 49;
	}

	return (
		MEMBER_DIRECTORY_GLOBAL_PARTNER_NAME_SET.has(name) ||
		MEMBER_DIRECTORY_GLOBAL_PARTNER_NAME_SET.has(nameEn)
	);
};

export const isGlobalBuyer = (type?: string | null) =>
	type === MEMBER_TYPES.globalBuyer || type === "Global Buyer";

export const normalizeMemberDirectoryRole = (role: string | null) => {
	if (role === "Supplier" || role === "supplier") return "org-supplier";
	if (role === "Global Partner" || role === "global_partner")
		return "org-global-partner";
	if (role === "CSO" || role === "cso") return "org-cso";
	if (
		role === "tester" ||
		role === "Tester" ||
		role === "Test User" ||
		role === "org-tester"
	)
		return "org-test-user";
	return role;
};

export const canViewGlobalBuyersForRole = (
	role: string | null,
	viewMode?: string | null,
) => {
	const normalizedRole = normalizeMemberDirectoryRole(role);
	if (
		normalizedRole === "org-supplier" ||
		normalizedRole === "org-recruitment-agency" ||
		normalizedRole === "org-recruiter"
	) {
		return true;
	}
	if (viewMode !== "supplier-view" && viewMode !== "ra-view") return false;

	return (
		normalizedRole === "org-test-user" ||
		normalizedRole === "org-issara-management" ||
		normalizedRole === "org-issara-staff"
	);
};

export const canViewGlobalBuyerDetailsForRole = (
	role: string | null,
	viewMode?: string | null,
) => {
	const normalizedRole = normalizeMemberDirectoryRole(role);
	if (normalizedRole === "org-global-partner") return true;
	return canViewGlobalBuyersForRole(normalizedRole, viewMode);
};

export const resolveAssetUrl = (imagePath?: string | null) => {
	const trimmed = imagePath?.trim();
	if (!trimmed) return "";
	if (/^(https?:)?\/\//i.test(trimmed) || /^(data|blob):/i.test(trimmed)) {
		return trimmed;
	}

	const normalizedApiBase = ILM_API_BASE_URL.replace(/\/$/, "");

	if (trimmed.startsWith("/static/") || trimmed.startsWith("/media/")) {
		return normalizedApiBase ? `${normalizedApiBase}${trimmed}` : trimmed;
	}

	if (trimmed.startsWith("static/") || trimmed.startsWith("media/")) {
		return normalizedApiBase
			? `${normalizedApiBase}/${trimmed}`
			: `/${trimmed}`;
	}

	const normalizedBase = S3_BASE_URL.replace(/\/$/, "");
	const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

	if (MEDIA_PATH_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
		if (S3_BASE_URL) return `${normalizedBase}${normalizedPath}`;
		return normalizedApiBase
			? `${normalizedApiBase}/media/${trimmed}`
			: `/media/${trimmed}`;
	}

	if (!S3_BASE_URL) return trimmed;

	return `${normalizedBase}${normalizedPath}`;
};

const getTextFromValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value).trim();
	}
	if (typeof value !== "object") return "";

	const record = value as Record<string, unknown>;
	return getFirstText(
		record.name,
		record.name_en,
		record.title,
		record.label,
		record.country_name,
		record.state_name,
		record.city_name,
	);
};

const getFirstText = (...values: unknown[]) => {
	for (const value of values) {
		const text = getTextFromValue(value);
		if (text && text !== ".") return text;
	}
	return "";
};

const getLocationTextFromValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") {
		const text = value.trim();
		return text && Number.isNaN(Number(text)) ? text : "";
	}
	if (typeof value === "number" || typeof value === "boolean") return "";
	if (typeof value !== "object") return "";

	const record = value as Record<string, unknown>;
	return getFirstLocationText(
		record.name,
		record.name_en,
		record.title,
		record.label,
		record.country_name,
		record.state_name,
		record.city_name,
	);
};

const getFirstLocationText = (...values: unknown[]) => {
	for (const value of values) {
		const text = getLocationTextFromValue(value);
		if (text && text !== ".") return text;
	}
	return "";
};

const joinLocationParts = (...values: string[]) => {
	const seen = new Set<string>();
	return values
		.map((value) => value.trim())
		.filter(Boolean)
		.filter((value) => {
			const normalized = value.toLowerCase();
			if (seen.has(normalized)) return false;
			seen.add(normalized);
			return true;
		})
		.join(", ");
};

const getAssetPathFromValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value.trim();
	if (typeof value !== "object") return "";

	const record = value as Record<string, unknown>;
	const directPath = getFirstText(
		record.url,
		record.file_path,
		record.filePath,
		record.image,
		record.logo,
		record.path,
		record.src,
		record.original_url,
		record.download_url,
	);
	if (directPath) return directPath;

	const nestedFilePath = getAssetPathFromValue(record.file_path);
	if (nestedFilePath) return nestedFilePath;

	return getAssetPathFromValue(record.file);
};

export const getCompanyDescription = (company: any) =>
	getFirstText(
		company?.background,
		company?.description,
		company?.description_en,
		company?.company_description,
		company?.profile_description,
		company?.about,
		company?.overview,
		company?.summary,
		company?.translations?.[0]?.description,
		company?.short_description,
	);

export const getCompanyLogo = (company: any) =>
	resolveAssetUrl(
		getFirstText(
			getAssetPathFromValue(company?.logo),
			getAssetPathFromValue(company?.image),
			getAssetPathFromValue(company?.image_url),
			getAssetPathFromValue(company?.icon),
			getAssetPathFromValue(company?.imageicon),
		),
	);

export const getCompanyLocation = (
	company: any,
	resolvers?: {
		countryName?: string;
		stateName?: string;
		cityName?: string;
	},
) => {
	const address = company?.addresses?.[0] ?? company?.address ?? {};
	const city = getFirstLocationText(
		resolvers?.cityName,
		address.city_name,
		address.city,
		address.city_id,
		company?.city_name,
		company?.city,
		company?.city_id,
	);
	const state = getFirstLocationText(
		resolvers?.stateName,
		address.state_name,
		address.state,
		address.state_id,
		company?.state_name,
		company?.state,
		company?.state_id,
	);
	const country = getFirstLocationText(
		resolvers?.countryName,
		address.country_name,
		address.country,
		address.country_id,
		company?.country_name,
		company?.country,
		company?.country_id,
	);
	const street = getFirstLocationText(address.street, company?.address);

	const compact = joinLocationParts(city, country);
	if (compact) return compact;

	return joinLocationParts(street, state, country);
};

// ─── Directory listing helpers ─────────────────────────────────────────────────
// Shared by /member-directory and /cso-suppliers so both resolve
// locations, filters and counts the same way.

export const MEMBER_DIRECTORY_DEFAULT_ORDERING = "-popularity";

const areAllFilterOptionsSelected = (
	selectedIds: (string | number)[],
	optionIds: (string | number)[],
) => {
	if (selectedIds.length === 0 || optionIds.length === 0) return false;

	const selected = new Set(selectedIds.map(String));
	return optionIds.every((optionId) => selected.has(String(optionId)));
};

/**
 * Returns the ids to send to the API, or `undefined` when the selection is
 * empty or covers every option — both mean "no filter" to the backend.
 */
export const getAppliedFilterIds = (
	selectedIds: (string | number)[],
	optionIds: (string | number)[],
) => {
	if (selectedIds.length === 0) return undefined;
	return areAllFilterOptionsSelected(selectedIds, optionIds)
		? undefined
		: selectedIds;
};

export const getDirectoryCount = (data?: {
	pages?: Array<{ count?: number; results?: unknown[] }>;
}) => {
	const firstPage = data?.pages?.[0];
	if (typeof firstPage?.count === "number") return firstPage.count;

	return data?.pages?.reduce(
		(total, page) => total + (page.results?.length ?? 0),
		0,
	);
};

const getLookupKey = (value: unknown) => {
	if (value === null || value === undefined || value === "") return "";
	return String(value);
};

const getFirstLookupValue = (
	record: Record<string, unknown>,
	fields: string[],
) => {
	for (const field of fields) {
		const value = record[field];
		if (value !== null && value !== undefined && value !== "") return value;
	}
	return null;
};

export const buildLocationNameMap = (
	items: unknown[],
	idFields: string[],
	nameFields = ["name", "name_en", "label"],
) => {
	const map = new Map<string, string>();

	for (const item of items) {
		if (!item || typeof item !== "object") continue;

		const record = item as Record<string, unknown>;
		const name = getFirstLookupValue(record, nameFields);
		if (typeof name !== "string" || !name.trim()) continue;

		for (const field of idFields) {
			const key = getLookupKey(record[field]);
			if (key) map.set(key, name.trim());
		}
	}

	return map;
};

export const resolveLocationName = (
	value: unknown,
	lookup: Map<string, string>,
	nameFields = ["name", "name_en", "label", "country_name", "city_name"],
) => {
	if (value === null || value === undefined || value === "") return "";

	const key = getLookupKey(value);
	if (key && lookup.has(key)) return lookup.get(key) ?? "";

	if (typeof value === "string") {
		return Number.isNaN(Number(value)) ? value.trim() : "";
	}

	if (typeof value === "object") {
		const text = getFirstLookupValue(
			value as Record<string, unknown>,
			nameFields,
		);
		return typeof text === "string" ? text.trim() : "";
	}

	return "";
};

export interface DirectoryLocationMaps {
	cityNameById: Map<string, string>;
	countryNameById: Map<string, string>;
}

export const buildDirectoryLocationMaps = (
	citiesData: unknown[],
	countriesData: unknown[],
): DirectoryLocationMaps => ({
	cityNameById: buildLocationNameMap(citiesData, ["city", "id", "city_id"]),
	countryNameById: buildLocationNameMap(countriesData, [
		"country",
		"id",
		"country_id",
	]),
});

export const getResolvedMemberLocation = (
	company: any,
	locationMaps: DirectoryLocationMaps,
) => {
	const address = company?.addresses?.[0] ?? company?.address ?? {};
	const cityName = resolveLocationName(
		address.city_id ?? company?.city_id ?? company?.city,
		locationMaps.cityNameById,
		["name", "name_en", "label", "city_name"],
	);
	const countryName = resolveLocationName(
		address.country_id ?? company?.country_id ?? company?.country,
		locationMaps.countryNameById,
		["name", "name_en", "label", "country_name"],
	);

	return getCompanyLocation(company, { cityName, countryName });
};

export const mapStrategicPartnerToMember = (partner: any) => ({
	...partner,
	type: MEMBER_TYPES.globalBuyer,
	logo: getCompanyLogo(partner),
	name: partner?.name,
	country: partner?.country_name ?? partner?.country,
	description: getCompanyDescription(partner),
	rating_score: null,
	rating_count: null,
	eps: null,
});

const formatDocumentTypeLabel = (value: unknown) => {
	const text = getFirstText(value);
	if (!text) return "";

	return text
		.split("_")
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
};

// Workplan document types that must never be surfaced in the Member Directory.
const HIDDEN_MEMBER_DIRECTORY_DOCUMENT_TYPES = new Set([
	"supply_chain",
	"audit_reports",
]);

const isHiddenDocumentType = (value: unknown) => {
	const text = getFirstText(value);
	if (!text) return false;

	// Accepts both raw slugs ("audit_reports") and display labels ("Audit Reports").
	const slug = text.trim().toLowerCase().replace(/\s+/g, "_");
	return HIDDEN_MEMBER_DIRECTORY_DOCUMENT_TYPES.has(slug);
};

const isHiddenWorkplanDocument = (document: any) => {
	if (isHiddenDocumentType(document?.document_type)) return true;
	if (isHiddenDocumentType(document?.document_type_display)) return true;

	return (
		Array.isArray(document?.document_types) &&
		document.document_types.some(isHiddenDocumentType)
	);
};

const getValidHttpUrl = (value: unknown) => {
	const text = getFirstText(value);
	if (!text) return null;

	const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
	try {
		const url = new URL(candidate);
		if (!["http:", "https:"].includes(url.protocol)) return null;
		if (!url.hostname.includes(".")) return null;
		return url;
	} catch {
		return null;
	}
};

const getShortUrlLabel = (url: URL) =>
	[url.hostname, url.pathname === "/" ? "" : url.pathname]
		.join("")
		.replace(/\/$/, "");

const getWorkplanDocumentIdentity = (document: any) => {
	const fileUrl = resolveAssetUrl(document?.file_path);
	const urlPath = getUrlPathIdentity(fileUrl);
	if (document?.id) return `id:${document.id}`;
	if (urlPath) return `path:${urlPath}`;

	const fileName =
		getFileNameIdentity(document?.name) || getFileNameIdentity(fileUrl);
	if (fileName) return `name:${fileName}`;

	return [
		document?.document_type ?? "",
		document?.document_name ?? "",
		document?.name ?? "",
	]
		.join("|")
		.toLowerCase();
};

const mergeWorkplanDocument = (current: any, next: any) => ({
	...current,
	document_type: current?.document_type || next?.document_type,
	document_types: [
		...new Set(
			[
				...(Array.isArray(current?.document_types)
					? current.document_types
					: []),
				current?.document_type,
				next?.document_type,
			].filter(Boolean),
		),
	],
	document_type_display:
		current?.document_type_display || next?.document_type_display,
	document_name: current?.document_name || next?.document_name,
	name: current?.name || next?.name,
	description: getFirstText(current?.description, next?.description),
	file_path: current?.file_path || next?.file_path,
});

const getUniqueWorkplanDocuments = (...groups: unknown[][]) => {
	const byIdentity = new Map<string, any>();
	const documents: any[] = [];

	for (const group of groups) {
		if (!Array.isArray(group)) continue;

		for (const document of group) {
			const identity = getWorkplanDocumentIdentity(document);
			if (!identity) continue;

			const existing = byIdentity.get(identity);
			if (existing) {
				byIdentity.set(identity, mergeWorkplanDocument(existing, document));
				continue;
			}

			byIdentity.set(identity, document);
			documents.push(document);
		}
	}

	return documents.map(
		(document) =>
			byIdentity.get(getWorkplanDocumentIdentity(document)) ?? document,
	);
};

export const getPolicyEntries = (company: any): PolicyEntry[] => {
	const policyFiles = Array.isArray(company?.policy_files)
		? company.policy_files
		: [];
	const complianceFiles = Array.isArray(company?.compliance_files)
		? company.compliance_files
		: [];
	const workplanFiles = Array.isArray(company?.workplan_files)
		? company.workplan_files
		: [];
	const documents = getUniqueWorkplanDocuments(
		policyFiles,
		complianceFiles,
		workplanFiles,
	)
		.filter((document) => !isHiddenWorkplanDocument(document))
		// Private documents are owner-only; the API already drops them for other
		// viewers, this is a second line of defence for the directory.
		.filter((document: any) => document?.audience !== "private");

	if (documents.length === 0) return [];

	return documents
		.map((document: any) => {
			const documentTypes = Array.isArray(document?.document_types)
				? document.document_types
				: [document?.document_type].filter(Boolean);
			const linkUrl = getValidHttpUrl(
				document?.link_url ?? document?.url ?? document?.document_name,
			);
			const label = getFirstText(
				linkUrl ? getShortUrlLabel(linkUrl) : document?.document_name,
				document?.document_type_display,
				formatDocumentTypeLabel(document?.document_type),
				document?.name,
			);
			const text = getFirstText(document?.description);
			const fileUrl = resolveAssetUrl(document?.file_path);
			const fileName = getFirstText(document?.name);
			const actionUrl = linkUrl ? fileUrl || linkUrl.toString() : "";

			const sourceType: PolicyEntry["sourceType"] = fileUrl
				? "file"
				: linkUrl
					? "link"
					: "text";
			const documentTypeTags = documentTypes
				.map(formatDocumentTypeLabel)
				.filter(Boolean);

			return {
				id: `workplan-${document?.id ?? document?.document_type ?? label}`,
				label,
				text,
				tags: text
					? [
							...new Set([
								...text
									.split(",")
									.map((tag) => tag.trim())
									.filter(Boolean),
								...documentTypeTags,
							]),
						]
					: documentTypeTags,
				link: actionUrl,
				fileUrl,
				fileName,
				sourceType,
			};
		})
		.filter((policy) => policy.fileUrl || policy.link || policy.text);
};

export const getPolicyApiEntries = (policies: unknown[]): PolicyEntry[] =>
	policies
		// Private documents are owner-only. The API already filters them out for
		// other viewers; this is a second line of defence for the directory.
		.filter((policy: any) => policy?.audience !== "private")
		.map((policy: any) => {
			const categories = Array.isArray(policy?.category_slugs)
				? policy.category_slugs
						.map((slug: unknown) =>
							typeof slug === "string" ? slug.trim() : "",
						)
						.map(
							(slug: string) =>
								POLICY_CATEGORY_LABEL[
									slug as keyof typeof POLICY_CATEGORY_LABEL
								] ?? slug,
						)
						.filter(Boolean)
				: [];
			const fileUrl = resolveAssetUrl(policy?.file_url);
			const link = getFirstText(policy?.link_url);
			const sourceType: PolicyEntry["sourceType"] =
				policy?.type === "file" && fileUrl
					? "file"
					: policy?.type === "link" && link
						? "link"
						: "text";

			return {
				id: `policy-${policy?.id ?? policy?.title}`,
				label: getFirstText(policy?.title) || "Policy",
				text: categories.join(", "),
				description:
					sourceType === "text" ? getFirstText(policy?.text_value) : undefined,
				tags: categories,
				link: sourceType === "link" ? link : undefined,
				fileUrl: sourceType === "file" ? fileUrl : undefined,
				fileName: getFirstText(policy?.file_name),
				sourceType,
			};
		})
		.filter((policy) => policy.label || policy.fileUrl || policy.link);

export const mergePolicyEntries = (entries: PolicyEntry[]): PolicyEntry[] => {
	const seen: PolicyEntryIdentities[] = [];
	const merged: PolicyEntry[] = [];

	for (const entry of entries) {
		const identities = getPolicyEntryIdentities(entry);
		const duplicateIndex = merged.findIndex((existing) =>
			hasPolicyEntryIdentityOverlap(
				identities,
				getPolicyEntryIdentities(existing),
			),
		);

		if (duplicateIndex >= 0) {
			const existing = merged[duplicateIndex];
			merged[duplicateIndex] = {
				...existing,
				tags: [...new Set([...(existing.tags ?? []), ...(entry.tags ?? [])])],
				text: existing.text || entry.text,
				description: existing.description || entry.description,
				fileUrl: existing.fileUrl || entry.fileUrl,
				fileName: existing.fileName || entry.fileName,
				link: existing.link || entry.link,
			};
			seen.push(identities);
			continue;
		}

		if (
			seen.some((existing) =>
				hasPolicyEntryIdentityOverlap(identities, existing),
			)
		) {
			continue;
		}

		merged.push(entry);
		seen.push(identities);
	}

	return merged;
};

/**
 * Return only those legacy entries (from the old SP detail API) that are not
 * already represented by a primary entry (from the Cascade policies API).
 *
 * Unlike mergePolicyEntries, primary entries are never deduplicated against
 * each other — two distinct policies may legitimately reference the same
 * underlying file (same URL / filename) and both must be shown.  Legacy
 * entries are dropped only when they identity-overlap with at least one
 * primary entry.
 */
export const filterLegacyEntries = (
	legacyEntries: PolicyEntry[],
	primaryEntries: PolicyEntry[],
): PolicyEntry[] => {
	if (primaryEntries.length === 0) return legacyEntries;
	const primaryIdentities = primaryEntries.map(getPolicyEntryIdentities);
	return legacyEntries.filter((entry) => {
		const entryId = getPolicyEntryIdentities(entry);
		return !primaryIdentities.some((pid) =>
			hasPolicyEntryIdentityOverlap(entryId, pid),
		);
	});
};
