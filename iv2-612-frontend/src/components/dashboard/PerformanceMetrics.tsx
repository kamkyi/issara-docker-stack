import { useTranslation } from "react-i18next";

type PerfMetrics = {
	remediation_paid_usd?: number;
	forced_labor_resolved?: number;
	early_warning_identifications?: number;
	prevented_escalations?: number;
	// optional future fields
	worker_engagement_calls?: number;
	suppliers_representatives_trained?: number;
	suppliers_representatives_trained_list?: Array<{
		id: number;
		name: string;
		last_fieldwork_date?: string | null;
	}>;
	recruitment_agencies_representatives_trained?: number;
};

const PerformanceMetrics = ({
	// remediation_paid_usd,
	forced_labor_resolved,
	prevented_escalations,
	worker_engagement_calls,
	suppliers_representatives_trained,
	suppliers_representatives_trained_list,
}: PerfMetrics) => {
	const { t } = useTranslation();
	const fmtNumber = (n: number | undefined) =>
		n == null ? "-" : new Intl.NumberFormat().format(n);
	// const fmtCurrency = (n: number | undefined) => {
	// 	if (n == null) return "-";
	// 	if (Math.abs(n) >= 1000) return `$ ${Math.round(n / 1000)}k`;
	// 	return `$ ${new Intl.NumberFormat().format(n)}`;
	// };

	const forced = forced_labor_resolved ?? 46;
	const prevented = prevented_escalations ?? 131;
	// const remediationDisplay = remediation_paid_usd ?? 390000;
	const engagementCalls = worker_engagement_calls ?? 818;
	const suppliersTrained = suppliers_representatives_trained ?? 27;
	const supplierList = suppliers_representatives_trained_list || [];

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
			<div className="bg-[#E5E7EB] px-6 py-4">
				<h3 className="heading-display">
					{t("companyDashboard.performance.title")}
				</h3>
			</div>
			<div className="p-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
					<div>
						<h4 className="text-[17px] font-bold text-[#148696] mb-4 border-b border-gray-200 pb-2">
							{t("companyDashboard.performance.sections.riskManagement")}
						</h4>
						<div className="space-y-6">
							<div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										{t(
											"companyDashboard.performance.metrics.forcedLaborRisksResolved.label",
										)}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										{t(
											"companyDashboard.performance.metrics.forcedLaborRisksResolved.description",
										)}
									</span>
								</div>
								<span className="text-2xl font-black text-[#5BC236] shrink-0">
									{fmtNumber(forced)}
								</span>
							</div>

							<div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										{t(
											"companyDashboard.performance.metrics.preventedEscalations.labelLine1",
										)}{" "}
										<br />{" "}
										{t(
											"companyDashboard.performance.metrics.preventedEscalations.labelLine2",
										)}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										{t(
											"companyDashboard.performance.metrics.preventedEscalations.description",
										)}
									</span>
								</div>
								<span className="text-2xl font-black text-[#5BC236] shrink-0">
									{fmtNumber(prevented)}
								</span>
							</div>

							{/* <div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										Remediation Amount{" "}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										Workers received financial remediation from suppliers as
										part of remediation and improvements.
									</span>
								</div>
								<span className="text-2xl font-black text-[#5BC236] shrink-0">
									{fmtCurrency(remediationDisplay)}
								</span>
							</div> */}
						</div>
					</div>

					<div>
						<h4 className="text-[17px] font-bold text-[#148696] mb-4 border-b border-gray-200 pb-2">
							{t("companyDashboard.performance.sections.workerEngagement")}
						</h4>
						<div className="space-y-6">
							<div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										{t(
											"companyDashboard.performance.metrics.workerEngagementCalls.label",
										)}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										{t(
											"companyDashboard.performance.metrics.workerEngagementCalls.description",
										)}
									</span>
								</div>
								<span className="text-2xl font-black text-[#5BC236] shrink-0">
									{fmtNumber(engagementCalls)}
								</span>
							</div>
						</div>
					</div>

					<div>
						<h4 className="text-[17px] font-bold text-[#148696] mb-4 border-b border-gray-200 pb-2">
							{t("companyDashboard.performance.sections.capacityBuilding")}
						</h4>
						<div className="space-y-6">
							<div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										{t(
											"companyDashboard.performance.metrics.supplierCapacityBuilding.label",
										)}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										{t(
											"companyDashboard.performance.metrics.supplierCapacityBuilding.description",
										)}
									</span>
								</div>
								<div className="relative group">
									<span className="text-2xl font-black text-[#5BC236] shrink-0 cursor-default">
										{fmtNumber(suppliersTrained)}
									</span>

									<div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 mt-2 w-64 z-10">
										<div className="pointer-events-auto bg-white border border-gray-100 shadow-sm rounded-lg p-3 text-sm">
											<div className="font-semibold text-gray-800 mb-2">
												{t("companyDashboard.performance.trainedSuppliers")}
											</div>
											{supplierList.length === 0 ? (
												<div className="text-gray-500">
													{t("companyDashboard.performance.noSuppliers")}
												</div>
											) : (
												<ul className="space-y-2 max-h-40 overflow-auto">
													{supplierList.map((s) => (
														<li className="text-gray-700" key={s.id}>
															{s.name}
															{s.last_fieldwork_date ? (
																<div className="text-xs text-gray-400">
																	{t(
																		"companyDashboard.performance.lastFieldworkDate",
																	)}
																	: {s.last_fieldwork_date}
																</div>
															) : null}
														</li>
													))}
												</ul>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-between items-start gap-4">
								<div className="flex flex-col gap-1">
									<span className="text-[13px] font-bold text-gray-800 leading-tight">
										{t(
											"companyDashboard.performance.metrics.recruitmentAgencyCapacityBuilding.label",
										)}
									</span>
									<span className="text-[11px] text-gray-500 leading-snug max-w-[180px]">
										{t(
											"companyDashboard.performance.metrics.recruitmentAgencyCapacityBuilding.description",
										)}
									</span>
								</div>
								<span className="text-xs font-semibold text-gray-400 shrink-0 text-center leading-tight">
									{t("companyDashboard.performance.comingSoon")}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PerformanceMetrics;
