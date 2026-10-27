import {
	POLICY_CATEGORY_SLUGS,
	type Policy,
	type PolicyAudience,
	type PolicyCategorySlug,
	type PolicyOwner,
	type PolicyType,
} from "$src/types/policies";

const POLICY_TYPES = new Set<PolicyType>(["text", "link", "file"]);
const POLICY_AUDIENCES = new Set<PolicyAudience>([
	"customers",
	"members",
	"private",
]);
const POLICY_CATEGORY_SLUG_SET = new Set<PolicyCategorySlug>(
	POLICY_CATEGORY_SLUGS,
);

interface PolicyMockOptions {
	mockMode?: "auto" | "never";
}

export const shouldUsePolicyMock = (
	_owner: Pick<PolicyOwner, "kind">,
	autoMocked: boolean,
	options?: PolicyMockOptions,
): boolean => {
	if (options?.mockMode === "never") return false;
	return autoMocked;
};

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
	typeof value === "string" ? value : "";

const asNullableString = (value: unknown): string | null =>
	typeof value === "string" && value.trim() !== "" ? value : null;

const asNullableNumber = (value: unknown): number | null => {
	if (value == null || value === "") return null;
	const numberValue = Number(value);
	return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const normalizePolicyType = (value: unknown): PolicyType =>
	typeof value === "string" && POLICY_TYPES.has(value as PolicyType)
		? (value as PolicyType)
		: "text";

const normalizePolicyAudience = (value: unknown): PolicyAudience =>
	typeof value === "string" && POLICY_AUDIENCES.has(value as PolicyAudience)
		? (value as PolicyAudience)
		: "members";

const normalizeCategorySlugs = (value: unknown): PolicyCategorySlug[] => {
	const parsedValue =
		typeof value === "string"
			? (() => {
					try {
						return JSON.parse(value);
					} catch {
						return [];
					}
				})()
			: value;

	if (!Array.isArray(parsedValue)) return [];

	return parsedValue.filter(
		(slug): slug is PolicyCategorySlug =>
			typeof slug === "string" &&
			POLICY_CATEGORY_SLUG_SET.has(slug as PolicyCategorySlug),
	);
};

export const normalizePolicy = (value: unknown): Policy => {
	const record = asRecord(value);
	const id = Number(record.id);
	const type = normalizePolicyType(record.type);

	return {
		id: Number.isFinite(id) ? id : 0,
		title: asString(record.title),
		type,
		text_value: type === "text" ? asNullableString(record.text_value) : null,
		link_url: type === "link" ? asNullableString(record.link_url) : null,
		audience: normalizePolicyAudience(record.audience),
		category_slugs: normalizeCategorySlugs(record.category_slugs),
		file_id: type === "file" ? asNullableNumber(record.file_id) : null,
		source_shared_file_id: asNullableNumber(record.source_shared_file_id),
		is_source_hidden: record.is_source_hidden === true,
		file_url: type === "file" ? asNullableString(record.file_url) : null,
		file_name: type === "file" ? asNullableString(record.file_name) : null,
		created_at: asString(record.created_at),
		updated_at: asString(record.updated_at),
	};
};
