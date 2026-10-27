import { Pencil1Icon } from "@radix-ui/react-icons";
import type React from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import CascadeButton from "../button/button";

export interface SectionCardProps {
	children: React.ReactNode;
	icon: React.ReactNode;
	title: string;
	editing: boolean;
	onSave: () => void;
	onCancel: () => void;
	actionDisabled?: boolean;
	saveButtonText?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
	children,
	icon,
	title,
	onSave,
	onCancel,
	editing,
	actionDisabled = false,
	saveButtonText,
}) => {
	const { t } = useTranslation();

	return (
		<div className="bg-white rounded-md border border-gray-100 shadow-sm p-6 mb-5">
			<div className="flex items-center justify-between mb-5">
				<h3 className="flex items-center gap-2 heading-display">
					{icon}
					{title}
				</h3>
				{editing ? (
					<div className="flex gap-2">
						<CascadeButton
							buttonText={
								saveButtonText ?? t("companyProfilePage.actions.save")
							}
							disabled={actionDisabled}
							handleOnClick={onSave}
							size="2"
						/>
						<button
							className="text-sm font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
							disabled={actionDisabled}
							onClick={onCancel}
							type="button"
						>
							{t("companyProfilePage.actions.cancel")}
						</button>
					</div>
				) : (
					<button
						aria-label={t("companyProfilePage.actions.editSectionAria", {
							title,
						})}
						className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#148696] border border-[#148696] rounded-lg px-3 py-1.5 hover:bg-[#e5f6f9] transition-colors"
						disabled={actionDisabled}
						onClick={onSave}
						type="button"
					>
						<Pencil1Icon className="w-3.5 h-3.5" />
						{t("companyProfilePage.actions.edit")}
					</button>
				)}
			</div>
			{children}
		</div>
	);
};
