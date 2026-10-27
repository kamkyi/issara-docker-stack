export const POLICY_CATEGORY_SLUGS = [
	"human-rights",
	"forced-labor",
	"recruitment",
	"purchasing",
	"gender",
	"living-wage",
	"climate",
] as const;
export type PolicyCategorySlug = (typeof POLICY_CATEGORY_SLUGS)[number];

export interface PolicyCategoryDef {
	slug: PolicyCategorySlug;
	label: string;
}

export const POLICY_CATEGORIES: PolicyCategoryDef[] = [
	{ slug: "human-rights", label: "Human rights" },
	{ slug: "forced-labor", label: "Forced labor" },
	{ slug: "recruitment", label: "Ethical / responsible recruitment" },
	{ slug: "purchasing", label: "Responsible sourcing" },
	{ slug: "gender", label: "Gender" },
	{ slug: "living-wage", label: "Living wage" },
	{ slug: "climate", label: "Climate resilience" },
];

export const POLICY_CATEGORY_LABEL: Record<PolicyCategorySlug, string> =
	POLICY_CATEGORIES.reduce(
		(acc, c) => {
			acc[c.slug] = c.label;
			return acc;
		},
		{} as Record<PolicyCategorySlug, string>,
	);

export type PolicyType = "text" | "link" | "file";
export type PolicyAudience = "customers" | "members" | "private";

export type PolicyOwnerKind = "strategic-partner" | "supplier";

export interface PolicyOwner {
	kind: PolicyOwnerKind;
	id: number | null;
}

export interface Policy {
	id: number;
	title: string;
	type: PolicyType;
	text_value: string | null;
	link_url: string | null;
	audience: PolicyAudience;
	category_slugs: PolicyCategorySlug[];
	file_id: number | null;
	source_shared_file_id: number | null;
	is_source_hidden: boolean;
	file_url: string | null;
	file_name: string | null;
	created_at: string;
	updated_at: string;
}

export interface PolicyWritePayload {
	title: string;
	type: PolicyType;
	audience: PolicyAudience;
	category_slugs: PolicyCategorySlug[];
	text_value?: string | null;
	link_url?: string | null;
	file?: File | null;
	shared_file_id?: number | null;
	source_shared_file_id?: number | null;
	hide_source?: boolean;
}

export const POLICY_FILE_ACCEPT = ".pdf,.doc,.docx";
export const POLICY_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const POLICY_TEXT_MAX_LENGTH = 1000;
