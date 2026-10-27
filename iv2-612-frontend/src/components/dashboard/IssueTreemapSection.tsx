import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IssueTreemapChart } from "$src/components/charts/IssueTreemapChart";
import {
	useWorkplaceStats,
	type WorkplaceStatsParams,
} from "$src/queries/useWorkplaceStats";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import ourWorkplaceData from "../../assets/mock/our-workplace.json";

const IssueTreemapSection = ({
	startTime,
	endTime,
	filters,
	emptyMessage,
	className,
}: {
	startTime?: string;
	endTime?: string;
	emptyMessage?: string;
	// When provided (e.g. from the Social Responsibility Overview page), these
	// drive the workplace-stats query so the treemap honours the page's
	// supplier/country/industry/date filters. Passing the same params object the
	// page already uses lets React Query dedupe the request.
	filters?: WorkplaceStatsParams;
	className?: string;
}) => {
	const { t } = useTranslation();
	const useMock = useMockData();
	const ids = getUserIdentifiers();
	const { data: prodDashboard } = useWorkplaceStats(
		filters ?? {
			supplierId: ids.supplierId || undefined,
			partnerId: ids.partnerId || undefined,
			startTime,
			endTime,
		},
	);

	// dashboardData is intentionally not used here; components below derive
	// their inputs directly from `prodDashboard` or the mock `ourWorkplaceData`.

	// Determine base groupings from prod or mock (cloned)
	const baseGroupings = useMock
		? (ourWorkplaceData as any).kpi_groupings_by_category
		: (prodDashboard as any)?.kpi_groupings_by_category || {};
	const groupings: Record<string, any[]> = {};
	for (const k of Object.keys(baseGroupings || {})) {
		groupings[k] = Array.isArray(baseGroupings[k]) ? [...baseGroupings[k]] : [];
	}

	// If the server returned a date-filtered treemap summary, prefer it for rendering
	// so the chart reflects the selected date range. Build minimal groupings from
	// the treemap values (one grouping per category) instead of using the
	// unfiltered `kpi_groupings_by_category` snapshot.
	const treemapSummary = (prodDashboard as any)?.issues_by_category_treemap;
	const hasDetailed = Object.keys(baseGroupings || {}).length > 0;
	// Only prefer the treemap summary when there are no detailed groupings from prod
	if (
		!useMock &&
		!hasDetailed &&
		Array.isArray(treemapSummary) &&
		treemapSummary.length > 0
	) {
		const built: Record<string, any[]> = {};
		for (const t of treemapSummary) {
			const key = t.name;
			if (key === "Labor") {
				// put Labor total under the first labor grouping so it appears in the chart
				built["Labor - Working conditions"] = [
					{ grouping: "Closed Issues", closed_cases: Number(t.value || 0) },
				];
				built["Labor - Employer-employee relations"] = [];
				built["Labor - Living and eating conditions"] = [];
			} else {
				built[key] = [
					{ grouping: "Closed Issues", closed_cases: Number(t.value || 0) },
				];
			}
		}
		// override groupings with the treemap-built groupings
		for (const k of Object.keys(groupings)) delete groupings[k];
		for (const k of Object.keys(built)) groupings[k] = built[k];
	}

	const laborNames = [
		"Labor - Working conditions",
		"Labor - Employer-employee relations",
		"Labor - Living and eating conditions",
	];

	const laborTotalClosed = laborNames.reduce(
		(sum, cat) =>
			sum +
			(groupings[cat] || []).reduce(
				(s: number, i: any) => s + Number(i.closed_cases || 0),
				0,
			),
		0,
	);
	const wagesTotalClosed = (groupings.Wages || []).reduce(
		(s: number, i: any) => s + Number(i.closed_cases || 0),
		0,
	);
	const recruitmentTotalClosed = (groupings.Recruitment || []).reduce(
		(s: number, i: any) => s + Number(i.closed_cases || 0),
		0,
	);

	const totalClosed =
		laborTotalClosed + wagesTotalClosed + recruitmentTotalClosed;

	const [selectedIssue, setSelectedIssue] = useState<{
		name: string;
		count: number;
	}>({
		name: "Closed Issues",
		count: 0,
	});

	// Keep the default "Closed Issues" total in sync with loaded data
	const displayCount =
		selectedIssue.name === "Closed Issues" ? totalClosed : selectedIssue.count;

	const translateIssueName = (name: string) => {
		const issueMap: Record<string, string> = {
			"Closed Issues": t("companyDashboard.issueTreemap.closedIssues"),
			"Labor - Working conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborWorkingConditions",
			),
			"Labor - Employer-employee relations": t(
				"companyDashboard.issueTreemap.categoryNames.laborEmployerEmployeeRelations",
			),
			"Labor - Living and eating conditions": t(
				"companyDashboard.issueTreemap.categoryNames.laborLivingAndEatingConditions",
			),
			Labor: t("companyDashboard.issueTreemap.categoryNames.labor"),
			Wages: t("companyDashboard.issueTreemap.categoryNames.wages"),
			Recruitment: t("companyDashboard.issueTreemap.categoryNames.recruitment"),
		};

		return issueMap[name] || name;
	};

	return (
		<div
			className={`container mx-auto px-4 mb-4 print-section-break${className ? ` ${className}` : ""}`}
		>
			<div className="mb-6">
				<div className="py-3 text-left">
					<h2 className="heading-display mb-6">
						{t("companyDashboard.issueTreemap.title")}
					</h2>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
					<h3 className="heading-display text-left px-6 pt-6 ">
						{t("companyDashboard.issueTreemap.chartTitle")}
					</h3>
					<div className="grow flex items-center justify-center relative min-h-[350px]">
						{totalClosed > 0 ? (
							<IssueTreemapChart
								kpiGroupingsByCategory={groupings}
								onSelect={(name, count) => setSelectedIssue({ name, count })}
							/>
						) : (
							<p className="px-6 text-sm text-gray-500 text-center">
								{emptyMessage ??
									t("socialResponsibility.emptyStates.noData", {
										defaultValue: "No data found.",
									})}
							</p>
						)}
					</div>
					<div className="px-6 py-5 border-t border-gray-100 flex gap-4 mt-auto">
						<div className="w-[3px] bg-[#148696] rounded-full" />
						<div>
							<p className="text-[13px] text-gray-700 font-medium mb-1">
								{t("companyDashboard.issueTreemap.issueLabel")}:{" "}
								{translateIssueName(selectedIssue.name)}
							</p>
							<p className="text-[13px] font-bold text-gray-900">
								{t("companyDashboard.issueTreemap.totalCases")}: {displayCount}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default IssueTreemapSection;
