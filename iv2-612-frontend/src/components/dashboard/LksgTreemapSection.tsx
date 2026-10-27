import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IssueTreemapChart } from "$src/components/charts/IssueTreemapChart";
import { useKPIs } from "$src/queries/kpis";
import {
	useLksgTreemap,
	useWorkplaceStats,
	type WorkplaceStatsParams,
} from "$src/queries/useWorkplaceStats";
import { useMockData } from "$src/utils/config";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import ourWorkplaceData from "../../assets/mock/our-workplace.json";

/**
 * Maps sub-categories to their top-level kpi_meta_category_name ("Labor", "Wages", "Recruitment").
 */
const META_CATEGORY_MAP: Record<string, string> = {
	"Labor - Working conditions": "Labor",
	"Labor - Employer-employee relations": "Labor",
	"Labor - Living and eating conditions": "Labor",
	Labor: "Labor",
	Wages: "Wages",
	Recruitment: "Recruitment",
};

/**
 * Direct canonical mapping from standard KPI Grouping titles to official LkSG Indicator names from database.
 */
const GROUPING_TO_LKSG_MAP: Record<string, string[]> = {
	// Recruitment
	"Debt bondage, excessive/illegal fees": ["Forced labor"],
	"Unprofessional, deceptive or misleading recruitment practices": [
		"Other serious omission of care",
	],
	"Threats, poor treatment, document retention or no proper documents": [
		"Slavery and workplace oppression",
	],
	"Contract substitution or false contracts": [
		"Slavery and workplace oppression",
	],
	"Illegal recruitment fees": ["Forced labor"],

	// Labor - Working conditions
	"Unsafe or hazardous working conditions (OSH issues)": [
		"Occupational safety and health (OSH)",
	],
	"Excessive overtime": ["Forced labor"],
	"Forced work/overwork": ["Forced labor"],
	"Substandard or unsafe living/eating conditions": [
		"Occupational safety and health (OSH)",
	],

	// Labor - Employer-employee relations
	"Verbal abuse and/or other poor treatment by line supervisor/management (not illegal)":
		["Employment discrimination"],
	"Harassment / discrimination by gender, nationality, ethnicity": [
		"Employment discrimination",
	],
	"Weak company policies and/or poor communication of policies": [
		"Disregard for freedom of association",
	],

	// Labor - Living and eating conditions
	"Inadequate canteen furniture": ["Occupational safety and health (OSH)"],
	"Substandard dorms / living conditions": [
		"Occupational safety and health (OSH)",
	],

	// Wages
	"Wage underpayment or minimum wage violations": [
		"Withholding a minimum wage",
	],
	"Unlawful deductions from wages": ["Withholding a minimum wage"],
	"Illegal deductions from wages": ["Withholding a minimum wage"],
	"Delayed wages": ["Withholding a minimum wage"],
	"Unpaid or underpaid overtime": ["Withholding a minimum wage"],
	"Wage and/or benefits theft": ["Withholding a minimum wage"],
	"Wage theft": ["Withholding a minimum wage"],

	// Summary fallbacks
	"Closed Issues": ["Occupational safety and health (OSH)"],
	"Open Issues": ["Occupational safety and health (OSH)"],
};

const toMetaCategory = (subCategory: string): string =>
	META_CATEGORY_MAP[subCategory] ?? subCategory;

/**
 * LkSG-specific treemap section with Open/Closed case toggle.
 * Uses dedicated backend endpoint /cascade/lksg_treemap when available, with full mock fallback.
 */
const LksgTreemapSection = ({
	startTime,
	endTime,
	filters,
	emptyMessage,
	className,
}: {
	startTime?: string;
	endTime?: string;
	emptyMessage?: string;
	filters?: WorkplaceStatsParams;
	className?: string;
}) => {
	const { t } = useTranslation();
	const useMock = useMockData();
	const ids = getUserIdentifiers();

	const queryFilters = filters ?? {
		supplierId: ids.supplierId || undefined,
		partnerId: ids.partnerId || undefined,
		startTime,
		endTime,
	};

	const { data: prodDashboard } = useWorkplaceStats(queryFilters);
	const { data: lksgTreemapData } = useLksgTreemap(queryFilters);
	const { data: kpiCatalogue } = useKPIs();

	const [caseFilter, setCaseFilter] = useState<"closed" | "open">("closed");

	// ── Base groupings: prefer dedicated LkSG backend API endpoint if returned ──
	const mockGroupings = (ourWorkplaceData as any).kpi_groupings_by_category;
	const apiLksgGroupings = lksgTreemapData?.kpi_groupings_by_category;
	const prodGroupings = (prodDashboard as any)?.kpi_groupings_by_category;

	const baseGroupings =
		apiLksgGroupings && Object.keys(apiLksgGroupings).length > 0
			? apiLksgGroupings
			: !useMock && prodGroupings && Object.keys(prodGroupings).length > 0
				? prodGroupings
				: mockGroupings;

	const groupings: Record<string, any[]> = {};
	for (const k of Object.keys(baseGroupings || {})) {
		groupings[k] = Array.isArray(baseGroupings[k]) ? [...baseGroupings[k]] : [];
	}

	// Guarantee Labor sub-categories exist from mock if missing in API response
	if (
		!groupings["Labor - Working conditions"] &&
		!groupings["Labor"] &&
		mockGroupings["Labor - Working conditions"]
	) {
		groupings["Labor - Working conditions"] =
			mockGroupings["Labor - Working conditions"];
	}
	if (
		!groupings["Labor - Employer-employee relations"] &&
		!groupings["Labor"] &&
		mockGroupings["Labor - Employer-employee relations"]
	) {
		groupings["Labor - Employer-employee relations"] =
			mockGroupings["Labor - Employer-employee relations"];
	}
	if (
		!groupings["Labor - Living and eating conditions"] &&
		!groupings["Labor"] &&
		mockGroupings["Labor - Living and eating conditions"]
	) {
		groupings["Labor - Living and eating conditions"] =
			mockGroupings["Labor - Living and eating conditions"];
	}
	if (!groupings["Recruitment"] && mockGroupings["Recruitment"]) {
		groupings["Recruitment"] = mockGroupings["Recruitment"];
	}
	if (!groupings["Wages"] && mockGroupings["Wages"]) {
		groupings["Wages"] = mockGroupings["Wages"];
	}

	// Build description -> LkSG names map from KPI catalogue if available
	const catalogueLksgMap = useMemo(() => {
		const map = new Map<string, string[]>();
		if (Array.isArray(kpiCatalogue)) {
			for (const kpi of kpiCatalogue) {
				if (kpi.lksg_indicators?.length && kpi.description) {
					map.set(
						kpi.description,
						kpi.lksg_indicators.map((i: any) => i.name),
					);
				}
			}
		}
		return map;
	}, [kpiCatalogue]);

	const countField = caseFilter === "closed" ? "closed_cases" : "open_cases";

	// Aggregate into kpi_meta_category_name -> lksg_name -> total cases
	const lksgGrouped = useMemo(() => {
		const result: Record<
			string,
			Record<string, { count: number; supplierBreakdown: any[] }>
		> = {
			Labor: {},
			Wages: {},
			Recruitment: {},
		};

		for (const [subCat, items] of Object.entries(groupings)) {
			const meta = toMetaCategory(subCat);
			if (!result[meta]) result[meta] = {};

			for (const item of items) {
				const cases = Number(item[countField] || 0);
				if (cases === 0) continue;

				// Resolve LkSG name(s) for this item
				let lksgNames: string[] | undefined;

				if (
					Array.isArray(item.lksg_indicators) &&
					item.lksg_indicators.length > 0
				) {
					lksgNames = item.lksg_indicators.map((i: any) => i.name);
				}

				if (!lksgNames && catalogueLksgMap.has(item.grouping)) {
					lksgNames = catalogueLksgMap.get(item.grouping);
				}

				if (!lksgNames && GROUPING_TO_LKSG_MAP[item.grouping]) {
					lksgNames = GROUPING_TO_LKSG_MAP[item.grouping];
				}

				if (!lksgNames && item.grouping) {
					lksgNames = [item.grouping];
				}

				if (!lksgNames || lksgNames.length === 0) {
					continue;
				}

				for (const name of lksgNames) {
					if (!name) continue;
					if (!result[meta][name]) {
						result[meta][name] = {
							count: 0,
							supplierBreakdown: [],
						};
					}
					result[meta][name].count += cases;
					if (Array.isArray(item.supplier_breakdown)) {
						result[meta][name].supplierBreakdown.push(
							...item.supplier_breakdown,
						);
					}
				}
			}
		}

		return result;
	}, [groupings, countField, catalogueLksgMap]);

	// Convert to shape expected by IssueTreemapChart
	const chartGroupings = useMemo(() => {
		const out: Record<
			string,
			Array<{
				grouping: string;
				closed_cases: number;
				supplier_breakdown?: any[];
			}>
		> = {};

		for (const [meta, indicators] of Object.entries(lksgGrouped)) {
			const items = Object.entries(indicators)
				.map(([name, data]) => ({
					grouping: name,
					closed_cases: data.count,
					supplier_breakdown: data.supplierBreakdown,
				}))
				.sort((a, b) => b.closed_cases - a.closed_cases);

			const nonZero = items.filter((it) => it.closed_cases > 0);
			if (nonZero.length > 0) {
				out[meta] = nonZero;
			} else if (items.length > 0) {
				out[meta] = [items[0]];
			}
		}
		return out;
	}, [lksgGrouped]);

	// Compute overall total for footer
	const totalCases = Object.values(lksgGrouped).reduce(
		(sum, indicators) =>
			sum + Object.values(indicators).reduce((s, data) => s + data.count, 0),
		0,
	);

	const [selectedIssue, setSelectedIssue] = useState<{
		name: string;
		count: number;
	}>({
		name: "Cases",
		count: 0,
	});

	// Distinct case count from the API. The tiles cannot be summed to get this:
	// a case mapped to several LkSG indicators appears under each one, so
	// `totalCases` (the sum) is always >= the real number of cases. Both are
	// shown, under different labels, rather than picking one and being wrong.
	const distinctTotal =
		caseFilter === "open"
			? (lksgTreemapData as any)?.total_open_cases
			: (lksgTreemapData as any)?.total_closed_cases;
	// Mock/legacy payloads carry no totals; fall back to the summed value so the
	// footer degrades to its previous behaviour instead of rendering 0.
	const hasDistinctTotal = typeof distinctTotal === "number";
	const displayCount =
		selectedIssue.name === "Cases"
			? hasDistinctTotal
				? distinctTotal
				: totalCases
			: selectedIssue.count;
	// Only worth showing alongside the case count when they actually differ.
	const showTagBreakdown =
		selectedIssue.name === "Cases" &&
		hasDistinctTotal &&
		totalCases !== distinctTotal;

	const translateIssueName = (name: string) => {
		const issueMap: Record<string, string> = {
			Cases:
				caseFilter === "closed"
					? t("companyDashboard.issueTreemap.closedIssues", {
							defaultValue: "Closed Issues",
						})
					: t("lksgOverview.treemap.openIssues", {
							defaultValue: "Open Issues",
						}),
			"Closed Issues": t("companyDashboard.issueTreemap.closedIssues", {
				defaultValue: "Closed Issues",
			}),
			"Open Issues": t("lksgOverview.treemap.openIssues", {
				defaultValue: "Open Issues",
			}),
			Labor: t("companyDashboard.issueTreemap.categoryNames.labor", {
				defaultValue: "Labor",
			}),
			Wages: t("companyDashboard.issueTreemap.categoryNames.wages", {
				defaultValue: "Wages",
			}),
			Recruitment: t(
				"companyDashboard.issueTreemap.categoryNames.recruitment",
				{
					defaultValue: "Recruitment",
				},
			),
		};

		return issueMap[name] || name;
	};

	return (
		<div
			className={`container mx-auto px-4 mb-4 print-section-break${className ? ` ${className}` : ""}`}
		>
			<div className="mb-6">
				<div className="py-3 text-left flex items-center justify-between flex-wrap gap-4">
					<h2 className="heading-display mb-0">
						{t("lksgOverview.treemap.title", {
							defaultValue: "Worker-Reported Issues by Category",
						})}
					</h2>
					<div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
						<button
							className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
								caseFilter === "closed"
									? "bg-white shadow-sm text-[#004A60]"
									: "text-[#56666C] hover:text-[#004A60]"
							}`}
							onClick={() => {
								setCaseFilter("closed");
								setSelectedIssue({
									name: "Cases",
									count: 0,
								});
							}}
							type="button"
						>
							{t("lksgOverview.treemap.closed", {
								defaultValue: "Closed",
							})}
						</button>
						<button
							className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
								caseFilter === "open"
									? "bg-white shadow-sm text-[#004A60]"
									: "text-[#56666C] hover:text-[#004A60]"
							}`}
							onClick={() => {
								setCaseFilter("open");
								setSelectedIssue({
									name: "Cases",
									count: 0,
								});
							}}
							type="button"
						>
							{t("lksgOverview.treemap.open", {
								defaultValue: "Open",
							})}
						</button>
					</div>
				</div>
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
					<h3 className="heading-display text-left px-6 pt-6 ">
						{caseFilter === "closed"
							? t("companyDashboard.issueTreemap.chartTitle")
							: t("lksgOverview.treemap.openChartTitle", {
									defaultValue: "Open Issues by Category",
								})}
					</h3>
					<div className="grow flex items-center justify-center relative min-h-[350px]">
						{totalCases > 0 ? (
							<IssueTreemapChart
								kpiGroupingsByCategory={chartGroupings}
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
							{showTagBreakdown && (
								<p className="text-[13px] text-gray-600 mt-0.5">
									{t("lksgOverview.treemap.indicatorTags", {
										defaultValue: "Indicator classifications",
									})}
									: {totalCases}{" "}
									<span className="text-gray-500">
										(
										{t("lksgOverview.treemap.indicatorTagsHint", {
											defaultValue:
												"a case counts once per LkSG indicator it maps to",
										})}
										)
									</span>
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LksgTreemapSection;
