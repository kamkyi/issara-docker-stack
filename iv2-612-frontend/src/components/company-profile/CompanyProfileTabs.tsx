import { useTranslation } from "$src/hooks/useTranslation";

export type CompanyProfileTab = "profile" | "user-management" | "company-qr";

interface CompanyProfileTabsProps {
	activeTab: CompanyProfileTab;
	onChange: (tab: CompanyProfileTab) => void;
	showCompanyQr?: boolean;
}

const TAB_ITEMS: Array<{ labelKey: string; value: CompanyProfileTab }> = [
	{ labelKey: "profileDetails", value: "profile" },
	{ labelKey: "userManagement", value: "user-management" },
	// Temporarily hidden. Keep the tab value and backing QR panel intact so
	// supplier Company QR can be reopened without rebuilding it.
	// { labelKey: "companyQr", value: "company-qr" },
];

export default function CompanyProfileTabs({
	activeTab,
	onChange,
	showCompanyQr = true,
}: CompanyProfileTabsProps) {
	const { t } = useTranslation();
	const visibleTabs = showCompanyQr
		? TAB_ITEMS
		: TAB_ITEMS.filter((item) => item.value !== "company-qr");

	return (
		<div className="inline-flex flex-wrap items-center gap-1 rounded-md bg-white p-1 mb-5">
			{visibleTabs.map((item) => (
				<button
					className={`rounded-sm px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A6DFDD] text-[#004A60] ${
						activeTab === item.value ? "bg-[#A6DFDD]" : "hover:bg-[#FFF8DE]"
					}`}
					key={item.value}
					onClick={() => onChange(item.value)}
					type="button"
				>
					{t(`companyProfilePage.tabs.${item.labelKey}`)}
				</button>
			))}
		</div>
	);
}
