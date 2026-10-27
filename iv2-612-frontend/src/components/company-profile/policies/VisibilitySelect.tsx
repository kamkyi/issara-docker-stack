import { EyeOpenIcon, LockClosedIcon, PersonIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import type { PolicyAudience } from "$src/types/policies";

const AUDIENCE_META: Record<
	PolicyAudience,
	{
		labelKey: string;
		descriptionKey: string;
		Icon: React.ComponentType<{ className?: string }>;
	}
> = {
	customers: {
		labelKey: "companyProfilePage.policies.visibilityCustomers",
		descriptionKey: "companyProfilePage.policies.visibilityCustomersDesc",
		Icon: PersonIcon,
	},
	members: {
		labelKey: "companyProfilePage.policies.visibilityMembers",
		descriptionKey: "companyProfilePage.policies.visibilityMembersDesc",
		Icon: PersonIcon,
	},
	private: {
		labelKey: "companyProfilePage.policies.visibilityPrivate",
		descriptionKey: "companyProfilePage.policies.visibilityPrivateDesc",
		Icon: LockClosedIcon,
	},
};

const AUDIENCE_ORDER: PolicyAudience[] = ["customers", "members", "private"];

interface VisibilitySelectProps {
	value: PolicyAudience;
	onChange: (next: PolicyAudience) => void;
}

export const VisibilitySelect: React.FC<VisibilitySelectProps> = ({
	value,
	onChange,
}) => {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = AUDIENCE_META[value] ?? AUDIENCE_META.members;

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node))
				setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
				onClick={() => setOpen((s) => !s)}
				type="button"
			>
				<EyeOpenIcon className="w-4 h-4 text-gray-400" />
				{t("companyProfilePage.policies.visibleTo")}{" "}
				<b className="text-gray-900">{t(current.labelKey)}</b>
			</button>
			{open && (
				<div className="absolute bottom-full left-0 mb-2 min-w-[230px] bg-white border border-gray-100 rounded-xl shadow-lg p-1 z-10">
					{AUDIENCE_ORDER.map((key) => {
						const meta = AUDIENCE_META[key];
						const Icon = meta.Icon;
						const label = t(meta.labelKey);
						const desc = t(meta.descriptionKey);
						return (
							<button
								className={`flex items-start gap-3 w-full text-left px-3 py-2 rounded-lg ${
									value === key ? "bg-[#e4f4f3]" : "hover:bg-gray-50"
								}`}
								key={key}
								onClick={() => {
									onChange(key);
									setOpen(false);
								}}
								type="button"
							>
								<Icon className="w-4 h-4 mt-0.5 text-[#148696]" />
								<span>
									<span className="block text-sm font-semibold text-gray-900">
										{label}
									</span>
									<span className="block text-xs text-gray-500">{desc}</span>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
