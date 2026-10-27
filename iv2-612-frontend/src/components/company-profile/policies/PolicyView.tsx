import {
	ChatBubbleIcon,
	DownloadIcon,
	ExternalLinkIcon,
	FileTextIcon,
	Link2Icon,
	LockClosedIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import {
	POLICY_CATEGORY_LABEL,
	type Policy,
	type PolicyAudience,
	type PolicyType,
} from "$src/types/policies";

interface PolicyViewProps {
	policy: Policy;
}

const TYPE_META: Record<
	PolicyType,
	{
		labelKey: string;
		Icon: React.ComponentType<{ className?: string }>;
		iconWrapCls: string;
	}
> = {
	file: {
		labelKey: "companyProfilePage.policies.type_file",
		Icon: FileTextIcon,
		iconWrapCls: "bg-[#e4f4f3] text-[#004A60]",
	},
	link: {
		labelKey: "companyProfilePage.policies.type_link",
		Icon: Link2Icon,
		iconWrapCls: "bg-purple-100 text-purple-700",
	},
	text: {
		labelKey: "companyProfilePage.policies.type_text",
		Icon: ChatBubbleIcon,
		iconWrapCls: "bg-amber-100 text-amber-900",
	},
};

const AUDIENCE_META: Record<
	PolicyAudience,
	{
		labelKey: string;
		Icon: React.ComponentType<{ className?: string }>;
	}
> = {
	customers: {
		labelKey: "companyProfilePage.policies.visibilityCustomers",
		Icon: PersonIcon,
	},
	members: {
		labelKey: "companyProfilePage.policies.visibilityMembers",
		Icon: PersonIcon,
	},
	private: {
		labelKey: "companyProfilePage.policies.visibilityPrivate",
		Icon: LockClosedIcon,
	},
};

export const PolicyView: React.FC<PolicyViewProps> = ({ policy }) => {
	const { t } = useTranslation();
	const type = TYPE_META[policy.type] ?? TYPE_META.text;
	const TypeIcon = type.Icon;
	const aud = AUDIENCE_META[policy.audience] ?? AUDIENCE_META.members;
	const AudIcon = aud.Icon;
	const categorySlugs = Array.isArray(policy.category_slugs)
		? policy.category_slugs
		: [];

	const sourceText =
		policy.type === "file"
			? (policy.file_name ?? "")
			: policy.type === "link"
				? (policy.link_url ?? "")
				: t("companyProfilePage.policies.textStatement");

	const actionHref =
		policy.type === "file"
			? (policy.file_url ?? undefined)
			: policy.type === "link"
				? (policy.link_url ?? undefined)
				: undefined;

	return (
		<div className="border border-gray-100 rounded-2xl p-4 bg-white grid grid-cols-[40px_1fr_auto] gap-4 items-start">
			<div
				className={`w-10 h-10 rounded-xl grid place-items-center ${type.iconWrapCls}`}
			>
				<TypeIcon className="w-5 h-5" />
			</div>

			<div className="min-w-0">
				<h4 className="font-bold text-[15.5px] text-gray-900 mb-1 truncate">
					{policy.title || t("companyProfilePage.policies.policy")}
				</h4>
				<div className="flex items-center gap-2.5 flex-wrap text-gray-500 text-xs mb-2.5">
					<span>{t(type.labelKey)}</span>
					<span className="w-[3px] h-[3px] rounded-full bg-gray-400" />
					<span className="break-all">{sourceText}</span>
				</div>
				<div className="flex flex-wrap gap-1.5">
					{categorySlugs.map((slug) => (
						<span
							className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-[11.5px] font-semibold py-1 px-2.5 rounded-full"
							key={slug}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-[#148696]" />
							{POLICY_CATEGORY_LABEL[slug] ?? slug}
						</span>
					))}
				</div>
			</div>

			<div className="flex flex-col items-end gap-2.5">
				<span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold py-1 px-2.5 rounded-full bg-gray-50 text-gray-500 whitespace-nowrap">
					<AudIcon className="w-3 h-3" />
					{t(aud.labelKey)}
				</span>
				{policy.type === "file" && actionHref && (
					<a
						className="inline-flex items-center gap-1.5 text-[#148696] font-semibold text-sm py-1.5 px-2.5 rounded-lg hover:bg-[#e4f4f3] transition-colors"
						download
						href={actionHref}
						rel="noopener noreferrer"
						target="_blank"
					>
						{t("common.download")}
						<DownloadIcon className="w-3.5 h-3.5" />
					</a>
				)}
				{policy.type === "link" && actionHref && (
					<a
						className="inline-flex items-center gap-1.5 text-[#148696] font-semibold text-sm py-1.5 px-2.5 rounded-lg hover:bg-[#e4f4f3] transition-colors"
						href={actionHref}
						rel="noopener noreferrer"
						target="_blank"
					>
						{t("common.open")}
						<ExternalLinkIcon className="w-3.5 h-3.5" />
					</a>
				)}
			</div>
		</div>
	);
};
