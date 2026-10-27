import type {
	Policy,
	PolicyAudience,
	PolicyCategorySlug,
	PolicyType,
} from "$src/types/policies";

export type PolicyDraftSource = "policy" | "workplan";

export interface PolicyDraft {
	id: number | null; // null = new
	title: string;
	type: PolicyType;
	text_value: string | null;
	link_url: string | null;
	audience: PolicyAudience;
	category_slugs: PolicyCategorySlug[];
	file: File | null;
	file_id: number | null;
	file_url: string | null;
	shared_file_id: number | null;
	source_shared_file_id: number | null;
	existing_file_name: string | null;
	source: PolicyDraftSource;
	workplan_doc_id: number | null;
	document_type: string | null;
}

let _draftKeySeq = -1;
export const newDraftKey = (): number => {
	_draftKeySeq -= 1;
	return _draftKeySeq;
};

export const emptyDraft = (): PolicyDraft => ({
	id: newDraftKey(),
	title: "",
	type: "text",
	text_value: "",
	link_url: "",
	audience: "members",
	category_slugs: [],
	file: null,
	file_id: null,
	file_url: null,
	shared_file_id: null,
	source_shared_file_id: null,
	existing_file_name: null,
	source: "policy",
	workplan_doc_id: null,
	document_type: null,
});

export const policyToDraft = (p: Policy): PolicyDraft => ({
	id: p.id,
	title: p.title,
	type: p.type,
	text_value: p.text_value,
	link_url: p.link_url,
	audience: p.audience,
	category_slugs: [...p.category_slugs],
	file: null,
	file_id: p.file_id,
	file_url: p.file_url,
	shared_file_id: p.source_shared_file_id,
	source_shared_file_id: p.source_shared_file_id,
	existing_file_name: p.file_name,
	source: "policy",
	workplan_doc_id: null,
	document_type: null,
});
