import {
	ChatBubbleIcon,
	CheckIcon,
	FileTextIcon,
	Link2Icon,
	TrashIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import {
	POLICY_CATEGORIES,
	POLICY_TEXT_MAX_LENGTH,
	type PolicyCategorySlug,
	type PolicyType,
} from "$src/types/policies";
import { inputCls, textareaCls } from "../styles";
import { PolicyDocumentDropzone } from "./PolicyDocumentDropzone";
import type { PolicyDraft } from "./types";
import { VisibilitySelect } from "./VisibilitySelect";

interface PolicyEditorProps {
	index: number;
	draft: PolicyDraft;
	categoriesRequired?: boolean;
	lockType?: boolean;
	onChange: (patch: Partial<PolicyDraft>) => void;
	onRemove: () => void;
}

const TYPE_META: {
	key: PolicyType;
	Icon: React.ComponentType<{ className?: string }>;
}[] = [
	{ key: "text", Icon: ChatBubbleIcon },
	{ key: "link", Icon: Link2Icon },
	{ key: "file", Icon: FileTextIcon },
];

export const PolicyEditor: React.FC<PolicyEditorProps> = ({
	index,
	draft,
	categoriesRequired = false,
	lockType = false,
	onChange,
	onRemove,
}) => {
	const { t } = useTranslation();
	const toggleCat = (slug: PolicyCategorySlug) => {
		const next = draft.category_slugs.includes(slug)
			? draft.category_slugs.filter((s) => s !== slug)
			: [...draft.category_slugs, slug];
		onChange({ category_slugs: next });
	};
	const noCats = draft.category_slugs.length === 0;

	return (
		<div className="border border-gray-100 rounded-xl bg-amber-50/20 overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 bg-amber-50/40 border-b border-gray-100">
				<span className="inline-flex items-center gap-2 text-sm font-bold text-gray-900">
					<span className="w-6 h-6 rounded-md bg-[#A6DFDD] text-[#004A60] grid place-items-center text-xs">
						{index}
					</span>
					Policy {index}
				</span>
				<button
					className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md"
					onClick={onRemove}
					type="button"
				>
					<TrashIcon className="w-4 h-4" />
					Remove
				</button>
			</div>

			<div className="px-4 py-4">
				<div className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
					{t("companyProfilePage.policies.howAdding")}
				</div>
				<div className="inline-flex gap-1 mb-4 flex-wrap">
					{TYPE_META.filter(({ key }) => !lockType || key === draft.type).map(
						({ key, Icon }) => (
							<button
								className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
									draft.type === key
										? "bg-[#004A60] text-white border-[#004A60]"
										: "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
								}`}
								disabled={lockType}
								key={key}
								onClick={() => onChange({ type: key })}
								type="button"
							>
								<Icon className="w-3.5 h-3.5" />
								{t(`companyProfilePage.policies.type_${key}`)}
							</button>
						),
					)}
				</div>

				<label className="block mb-4">
					<span className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
						{t("companyProfilePage.policies.policyName")}
					</span>
					<input
						className={inputCls}
						onChange={(e) => onChange({ title: e.target.value })}
						placeholder="e.g. Global Code of Conduct"
						type="text"
						value={draft.title}
					/>
				</label>

				{draft.type === "text" && (
					<label className="block mb-4">
						<span className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
							{t("companyProfilePage.policies.policyText")}
						</span>
						<textarea
							className={textareaCls}
							maxLength={POLICY_TEXT_MAX_LENGTH}
							onChange={(e) => onChange({ text_value: e.target.value })}
							placeholder="Paste or summarise the policy here…"
							rows={5}
							value={draft.text_value ?? ""}
						/>
						<div className="text-right text-xs text-gray-400 mt-1">
							{(draft.text_value ?? "").length} / {POLICY_TEXT_MAX_LENGTH}{" "}
							characters
						</div>
					</label>
				)}

				{draft.type === "link" && (
					<label className="block mb-4">
						<span className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
							Link to policy
						</span>
						<input
							className={inputCls}
							onChange={(e) => onChange({ link_url: e.target.value })}
							placeholder="https://…"
							type="url"
							value={draft.link_url ?? ""}
						/>
					</label>
				)}

				{draft.type === "file" && (
					<div className="mb-4">
						<div className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
							Policy document
						</div>
						<PolicyDocumentDropzone
							existingFileName={draft.existing_file_name ?? null}
							onFileChange={(file) => onChange({ file })}
							onRemoveExisting={() =>
								onChange({
									existing_file_name: null,
									file_id: null,
									file_url: null,
									shared_file_id: null,
								})
							}
							stagedFile={draft.file ?? null}
						/>
					</div>
				)}

				<div className="block text-xs font-bold tracking-wider uppercase text-gray-700 mb-2">
					{t("companyProfilePage.policies.whichCategories")}
				</div>
				<p className="text-xs text-gray-500 mb-2">
					{t("companyProfilePage.policies.tickAll")}
				</p>
				<div className="flex flex-wrap gap-2">
					{POLICY_CATEGORIES.map((c) => {
						const on = draft.category_slugs.includes(c.slug);
						return (
							<button
								className={`inline-flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
									on
										? "bg-[#e4f4f3] border-[#148696] text-[#004A60]"
										: "bg-white border-gray-200 text-gray-700 hover:border-[#A6DFDD] hover:bg-[#f4fafb]"
								}`}
								key={c.slug}
								onClick={() => toggleCat(c.slug)}
								type="button"
							>
								<span
									className={`w-4 h-4 rounded grid place-items-center ${
										on
											? "bg-[#148696] text-white"
											: "border border-gray-300 bg-white"
									}`}
								>
									{on && <CheckIcon className="w-3 h-3" />}
								</span>
								{c.label}
							</button>
						);
					})}
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-dashed border-gray-200">
					<VisibilitySelect
						onChange={(v) => onChange({ audience: v })}
						value={draft.audience}
					/>
					{noCats ? (
						<span
							className={`inline-flex items-center gap-1 text-xs font-semibold ${
								categoriesRequired ? "text-red-600" : "text-gray-500"
							}`}
						>
							{categoriesRequired
								? "At least one category must be selected"
								: "Categories optional"}
						</span>
					) : (
						<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
							<CheckIcon className="w-3.5 h-3.5" />
							Covers {draft.category_slugs.length}{" "}
							{draft.category_slugs.length === 1 ? "category" : "categories"}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
