import { ChatBubbleIcon, FileTextIcon, Link2Icon } from "@radix-ui/react-icons";
import type React from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import { FieldLabel } from "./FieldLabel";
import { inputCls, textareaCls } from "./styles";

type PolicyInputMode = "text" | "link" | "file";

const MAX_CHARS = 1000;

export interface PolicyFieldProps {
	label: string;
	textValue: string;
	linkValue: string;
	draftTextValue: string;
	draftLinkValue: string;
	editing: boolean;
	onTextChange: (v: string) => void;
	onLinkChange: (v: string) => void;
	mode: PolicyInputMode;
	onModeChange: (m: PolicyInputMode) => void;
}

export const PolicyField: React.FC<PolicyFieldProps> = ({
	label,
	textValue,
	linkValue,
	draftTextValue,
	draftLinkValue,
	editing,
	onTextChange,
	onLinkChange,
	mode,
	onModeChange,
}) => {
	const { t } = useTranslation();
	// tabBtn renders the mode-switch pill button
	const tabBtn = (m: PolicyInputMode, Icon: React.ReactNode, text: string) => (
		<button
			className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${
				mode === m
					? "bg-[#004A60] text-white border-[#004A60]"
					: "bg-white text-gray-600 border-gray-200 hover:border-[#148696]"
			}`}
			onClick={() => onModeChange(m)}
			type="button"
		>
			{Icon}
			{text}
		</button>
	);

	const charCount = editing
		? mode === "link"
			? draftLinkValue.length
			: draftTextValue.length
		: mode === "link"
			? linkValue.length
			: textValue.length;

	return (
		<div className="mb-6">
			<div className="flex items-center justify-between mb-2">
				<FieldLabel isPublic label={label} />
				<span className="text-sm text-[#148696] font-medium opacity-60">
					{t("companyProfilePage.policyField.audience")}
				</span>
			</div>

			{editing && (
				<div className="flex items-center gap-2 mb-3">
					{tabBtn(
						"text",
						<ChatBubbleIcon className="w-3 h-3" />,
						t("companyProfilePage.policyField.text"),
					)}
					{tabBtn(
						"link",
						<Link2Icon className="w-3 h-3" />,
						t("companyProfilePage.policyField.link"),
					)}
					{tabBtn(
						"file",
						<FileTextIcon className="w-3 h-3" />,
						t("companyProfilePage.policyField.file"),
					)}
				</div>
			)}

			{editing ? (
				<>
					{mode === "text" && (
						<textarea
							className={textareaCls}
							maxLength={MAX_CHARS}
							onChange={(e) => onTextChange(e.target.value)}
							rows={4}
							value={draftTextValue}
						/>
					)}
					{mode === "link" && (
						<input
							className={inputCls}
							onChange={(e) => onLinkChange(e.target.value)}
							placeholder={t("companyProfilePage.policyField.linkPlaceholder")}
							type="url"
							value={draftLinkValue}
						/>
					)}
					{mode === "file" && (
						<div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
							<FileTextIcon className="mx-auto w-6 h-6 mb-2 text-gray-400" />
							<p>{t("companyProfilePage.policyField.fileHint")}</p>
							<input
								accept=".pdf,.doc,.docx"
								className="hidden"
								id={`file-${label}`}
								type="file"
							/>
							<label
								className="mt-2 inline-block cursor-pointer text-[#148696] font-semibold hover:underline"
								htmlFor={`file-${label}`}
							>
								{t("companyProfilePage.policyField.chooseFile")}
							</label>
						</div>
					)}

					{mode === "text" && (
						<p className="text-sm text-gray-400 mt-1">
							{t("companyProfilePage.policyField.characters", {
								count: charCount,
								max: MAX_CHARS,
							})}
						</p>
					)}
				</>
			) : (
				<>
					<div className="bg-gray-50 rounded-lg px-3 py-3 text-sm text-gray-800 leading-relaxed border border-gray-100">
						{mode === "link"
							? linkValue || (
									<span className="text-gray-400 italic">
										{t("companyProfilePage.policyField.notProvided")}
									</span>
								)
							: textValue || (
									<span className="text-gray-400 italic">
										{t("companyProfilePage.policyField.notProvided")}
									</span>
								)}
					</div>
					<p className="text-sm text-gray-400 mt-1">
						{t("companyProfilePage.policyField.characters", {
							count: charCount,
							max: MAX_CHARS,
						})}
					</p>
				</>
			)}
		</div>
	);
};
