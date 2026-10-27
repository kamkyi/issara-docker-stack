import { useTranslation } from "react-i18next";

interface KpiValues {
	activeEscalations: number;
	totalResolved: number;
	resolvedPct: number;
	workerVoiceCoverage: number;
	supplierStrengthening: number;
}

interface KpiCardsProps {
	kpiValues: KpiValues;
	/** Distinct supplier names behind the escalations count, shown on hover. */
	escalatedSupplierNames?: string[];
	/**
	 * Sub-text under the escalations figure. Defaults to the partner/buyer
	 * wording ("Suppliers with Escalated Cases"). Supplier-facing surfaces pass
	 * the single-supplier variant, where a distinct-supplier count is always 0
	 * or 1 and the figure counts open escalated cases instead.
	 */
	escalationsDescription?: string;
}

const KpiCards = ({
	kpiValues,
	escalatedSupplierNames = [],
	escalationsDescription,
}: KpiCardsProps) => {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
			<div className="relative group font-sans bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
				<div className="flex items-start gap-3 mb-6">
					<svg
						className="w-6 h-6 text-[#148696] shrink-0 mt-1"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
					</svg>
					<h4 className="!font-sans text-[15px] font-black text-gray-900 leading-tight">
						{t("companyDashboard.kpis.workerVoiceCoverage.titleLine1")}
						<br />
						{t("companyDashboard.kpis.workerVoiceCoverage.titleLine2")}
					</h4>
				</div>
				<div className="mt-auto border-t border-gray-100 pt-6 text-center">
					<div className="font-sans text-5xl font-black text-[#148696] mb-4">
						{kpiValues.workerVoiceCoverage.toLocaleString()}
					</div>
					<p className="text-xs text-gray-500 max-w-[200px] mx-auto">
						{t("companyDashboard.kpis.workerVoiceCoverage.description")}
					</p>
				</div>
			</div>

			<div className="relative group font-sans bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
				<div className="flex items-start gap-3 mb-6">
					<svg
						className="w-6 h-6 text-[#148696] shrink-0 mt-1"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
					</svg>
					<h4 className="!font-sans text-[15px] font-black text-gray-900 leading-tight">
						{t("companyDashboard.kpis.resolvedWithoutEscalation.titleLine1")}
						<br />
						{t("companyDashboard.kpis.resolvedWithoutEscalation.titleLine2")}
					</h4>
				</div>
				<div className="mt-auto border-t border-gray-100 pt-6 text-center">
					<div className="font-sans text-5xl font-black text-[#148696] mb-4 flex items-baseline justify-center gap-2">
						{kpiValues.totalResolved.toLocaleString()}{" "}
						<span className="text-2xl font-bold text-green-500">
							({kpiValues.resolvedPct}%)
						</span>
					</div>
					<p className="text-xs text-gray-500 max-w-[200px] mx-auto">
						{t("companyDashboard.kpis.resolvedWithoutEscalation.description")}
					</p>
				</div>
			</div>

			<div className="relative group font-sans bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
				<div className="flex items-start gap-3 mb-6">
					<svg
						className="w-6 h-6 text-[#148696] shrink-0 mt-1"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M16.48 10.41c-.39.39-1.04.39-1.43 0l-4.47-4.46-7.05 7.04-.66-.63c-1.17-1.17-1.17-3.07 0-4.24l4.24-4.24c1.17-1.17 3.07-1.17 4.24 0L16.48 9c.39.39.39 1.02 0 1.41m.7-2.12c.78.78.78 2.05 0 2.83-1.27 1.27-2.61.22-2.83 0l-3.76-3.76-5.57 5.57c-.39.39-.39 1.02 0 1.41s1.02.39 1.42 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41s1.02.39 1.42 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l4.62-4.62.71.71-4.62 4.62c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l8.32-8.34c1.17-1.17 1.17-3.07 0-4.24l-4.24-4.24c-1.15-1.15-3.01-1.17-4.18-.06z" />
					</svg>
					<h4 className="!font-sans text-[15px] font-black text-gray-900 leading-tight">
						{t("companyDashboard.kpis.engagementActivities.titleLine1")}
						<br />
						{t("companyDashboard.kpis.engagementActivities.titleLine2")}
					</h4>
				</div>
				<div className="mt-auto border-t border-gray-100 pt-6 text-center">
					<div className="font-sans text-5xl font-black text-[#148696] mb-4">
						{kpiValues.supplierStrengthening}
					</div>
					<p className="text-xs text-gray-500 max-w-40 mx-auto">
						{t("companyDashboard.kpis.engagementActivities.description")}
					</p>
				</div>
			</div>

			<div className="relative group font-sans bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
				<div className="flex items-start gap-3 mb-6">
					<svg
						className="w-6 h-6 text-[#148696] shrink-0 mt-1"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							clipRule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							fillRule="evenodd"
						/>
					</svg>
					<h4 className="!font-sans text-[15px] font-black text-gray-900 leading-tight">
						{t("companyDashboard.kpis.activeEscalations.titleLine1")}
						<br />
						{t("companyDashboard.kpis.activeEscalations.titleLine2")}
					</h4>
				</div>
				<div className="mt-auto border-t border-gray-100 pt-6 text-center object-bottom">
					<div className="group/esc relative mb-4 inline-block">
						<div className="font-sans text-5xl font-black text-[#148696]">
							{kpiValues.activeEscalations.toLocaleString()}
						</div>
						{escalatedSupplierNames.length > 0 && (
							<div className="pointer-events-none absolute top-full left-1/2 z-50 mt-3 hidden w-64 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-xl group-hover/esc:block">
								<div className="mb-2 font-sans text-[13px] font-black text-[#148696]">
									{t("companyDashboard.kpis.activeEscalations.tooltipTitle", {
										defaultValue: "Suppliers with Escalated Cases",
									})}
								</div>
								<ul className="max-h-48 space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
									{escalatedSupplierNames.map((name) => (
										<li
											className="flex items-start gap-2 text-xs text-gray-700"
											key={name}
										>
											<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#148696]" />
											<span className="leading-snug">{name}</span>
										</li>
									))}
								</ul>
								{/* pointer arrow */}
								<span className="absolute left-1/2 bottom-full h-3 w-3 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-gray-100 bg-white" />
							</div>
						)}
					</div>
					<p className="text-xs text-gray-500 max-w-40 mx-auto">
						{escalationsDescription ??
							t("companyDashboard.kpis.activeEscalations.description")}
					</p>
				</div>
			</div>
		</div>
	);
};

export default KpiCards;
