import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import { useLksgRiskSettings } from "$src/queries/useLksgRiskSettings";
import { useLksgRiskStore } from "$src/store/lksgRiskStore";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";

export function LksgRiskManagementSection() {
	const { t } = useTranslation();
	const ids = getUserIdentifiers();
	useLksgRiskSettings(ids.partnerId);

	const {
		workerVoiceMechanism,
		remediationSupport,
		humanRightsOfficerConfirmed,
		humanRightsOfficerName,
		seniorManagementReportingConfirmed,
		seniorManagementReportingDate,
	} = useLksgRiskStore();

	const notSpecified = t("lksgOverview.riskManagement.notSpecified", {
		defaultValue: "Not specified",
	});

	const appointed = t("lksgOverview.riskManagement.appointed", {
		defaultValue: "Appointed",
	});

	// Mirrors rows 1-2: state first, then the supporting detail if there is one.
	const officerStatus = humanRightsOfficerConfirmed
		? humanRightsOfficerName
			? `${appointed} - ${humanRightsOfficerName}`
			: appointed
		: notSpecified;

	const formattedReportingDate = seniorManagementReportingDate
		? new Date(`${seniorManagementReportingDate}T00:00:00`).toLocaleDateString(
				undefined,
				{ year: "numeric", month: "long", day: "numeric" },
			)
		: null;

	const reportingInPlace = t("lksgOverview.riskManagement.reportingInPlace", {
		defaultValue: "Reporting in place",
	});

	const reportingStatus = seniorManagementReportingConfirmed
		? formattedReportingDate
			? `${reportingInPlace} - ${t("lksgOverview.riskManagement.lastReported", {
					defaultValue: "last reported",
				})} ${formattedReportingDate}`
			: reportingInPlace
		: notSpecified;

	const rows = [
		{
			requirement: t("lksgOverview.riskManagement.req1", {
				defaultValue: "Measures to identify human rights risks",
			}),
			status: `CASCADE Worker Voice Mechanisms - ${workerVoiceMechanism ?? notSpecified}`,
		},
		{
			requirement: t("lksgOverview.riskManagement.req2", {
				defaultValue: "Measures to end or minimize human rights risks",
			}),
			status: `CASCADE Remediation Support - ${remediationSupport ?? notSpecified}`,
		},
		{
			requirement: t("lksgOverview.riskManagement.req3", {
				defaultValue: "Human rights officer",
			}),
			status: officerStatus,
		},
		{
			requirement: t("lksgOverview.riskManagement.req4", {
				defaultValue: "Reporting to senior management",
			}),
			status: reportingStatus,
		},
	];

	return (
		<div className="container mx-auto px-4 pb-6">
			<div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
					<h3 className="heading-display text-xl text-[#004A60]">
						{t("lksgOverview.riskManagement.boxTitle", {
							defaultValue: "Risk Management System",
						})}
					</h3>

					<div className="flex justify-end no-print">
						<CascadeButton
							buttonText={t("common.exportAsPdf", {
								defaultValue: "Export as PDF",
							})}
							handleOnClick={() => window.print()}
							intent="alt1"
							size="2"
						/>
					</div>
				</div>

				<div className="overflow-x-auto rounded-xl border border-gray-200">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-[#004A60] text-white">
								<th className="px-6 py-3.5 text-sm font-bold tracking-wide border-r border-[#00516A] w-1/3">
									{t("lksgOverview.riskManagement.colRequirements", {
										defaultValue: "Requirements",
									})}
								</th>
								<th className="px-6 py-3.5 text-sm font-bold tracking-wide w-2/3">
									{t("lksgOverview.riskManagement.colStatus", {
										defaultValue: "Status",
									})}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 bg-white">
							{rows.map((row, idx) => (
								<tr className="hover:bg-gray-50/50 transition-colors" key={idx}>
									<td className="px-6 py-4 text-sm font-medium text-[#333333] border-r border-gray-100">
										{row.requirement}
									</td>
									<td className="px-6 py-4 text-sm text-[#56666C]">
										<span className="inline-flex items-center rounded-lg bg-[#A6DFDD]/20 px-3.5 py-1.5 text-sm font-semibold text-[#004A60] border border-[#A6DFDD]">
											{row.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
