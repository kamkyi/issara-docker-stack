import { Container, Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
	// useClosureTime,
	useDetailedKpiUpdates,
	// useMainStats,
} from "$src/hooks/useSocialResponsibility";
// import { CasesByCategory } from "../home/CasesByCategory";
import type { FilterState } from "../home/FilterCard";

// import { OverallCards } from "../home/OverallCards";
// import RisksLie from "../home/RisksLie";

const RECRUITMENT_KPI_ID = 1;

interface ViolationData {
	rank: number;
	violation: string;
	category: string;
	remediationScore: number;
	maxScore: number;
	count: number;
}

const getCategoryColor = (category: ViolationData["category"]) => {
	switch (category) {
		case "poor":
			return { label: "Poor", bg: "bg-red-500" };
		case "fair":
			return { label: "Fair", bg: "bg-blue-500" };
		case "good":
			return { label: "Good", bg: "bg-teal-600" };
		case "excellent":
			return { label: "Excellent", bg: "bg-green-500" };
		default:
			return { label: "Unknown", bg: "bg-gray-500" };
	}
};

const getScoreColor = (score: number, maxScore: number) => {
	const percentage = (score / maxScore) * 100;
	if (percentage >= 75) return "text-yellow-500";
	if (percentage >= 50) return "text-orange-500";
	return "text-red-500";
};

const DumbbellChart = ({
	violation,
	index,
}: {
	violation: ViolationData;
	index: number;
}) => {
	const percentage =
		((violation.remediationScore - 1) / (violation.maxScore - 1)) * 100;
	const categoryInfo = getCategoryColor(violation.category);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			<div className="flex items-start gap-4">
				{/* Rank */}
				<div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-[#148696] to-[#0d5f6d] mt-2 rounded-full flex items-center justify-center">
					<span className="text-white font-bold text-lg">{violation.rank}</span>
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-2 items-center justify-between">
						<h3 className="text-sm font-semibold text-gray-800 leading-tight">
							{violation.violation}
						</h3>
						<span
							className={`px-2 text-xs font-medium ${categoryInfo.bg} text-white rounded`}
						>
							{categoryInfo.label}
						</span>
					</div>

					{/* Dumbbell Chart */}
					<div className="relative">
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs text-gray-500">Remediation Quality</span>
							<span
								className={`text-sm font-bold ${getScoreColor(violation.remediationScore, violation.maxScore)}`}
							>
								{violation.remediationScore.toFixed(2)}/{violation.maxScore}
							</span>
						</div>

						{/* Chart Track */}
						<div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
							{/* Gradient Fill */}
							<div
								className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 rounded-full transition-all duration-700"
								style={{ width: `${percentage}%` }}
							/>

							{/* Start Point (0) */}
							<div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm" />

							{/* End Point (Current Score) */}
							<div
								className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 ${getScoreColor(violation.remediationScore, violation.maxScore).replace("text-", "bg-")} rounded-full border-2 border-white shadow-md transition-all duration-700`}
								style={{ left: `${percentage}%` }}
							/>

							{/* Max Point (4) */}
							<div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gray-300 rounded-full border-2 border-white shadow-sm" />
						</div>

						{/* Scale Labels */}
						<div className="flex justify-between mt-1">
							<span className="text-xs text-gray-400">1</span>
							<span className="text-xs text-gray-400">4</span>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

export const RecruitmentViolationsSection = () => {
	const [filters] = useState<FilterState>({
		country: "All Countries",
		industry: "All Industries",
		year: "All Years",
	});
	// const { data: closureTimeData } = useClosureTime();
	// const { data: mainStat } = useMainStats() || {};
	const { data: detailedUpdatesResponse } = useDetailedKpiUpdates(filters);
	// const detailedForOverall = detailedUpdatesResponse?.data?.filter(
	// 	(u: any) => u.kpi_category_id === RECRUITMENT_KPI_ID,
	// );

	const violationsData = useMemo<ViolationData[]>(() => {
		const updates = detailedUpdatesResponse?.data ?? [];

		// Filter: Closed cases only + Recruitment Category ID (1)
		const closedRecruitmentUpdates = updates.filter(
			(item) =>
				item.status_id === 3 && item.kpi_category_id === RECRUITMENT_KPI_ID,
		);

		if (closedRecruitmentUpdates.length === 0) return [];

		const getScore = (quality: string | null) => {
			switch (quality) {
				case "Excellent":
					return 4;
				case "Good":
					return 3;
				case "Fair":
				case "Okay":
					return 2;
				case "Neutral":
				case "Poor":
					return 1;
				default:
					return 1;
			}
		};

		const agg = new Map<string, { totalScore: number; count: number }>();

		for (const u of closedRecruitmentUpdates) {
			const name = u.description || "N/A";
			const score = getScore(u.closed_quality);
			const entry = agg.get(name) || { totalScore: 0, count: 0 };
			entry.totalScore += score;
			entry.count += 1;
			agg.set(name, entry);
		}

		const list = Array.from(agg.entries()).map(([name, v]) => {
			const avgScore = v.totalScore / v.count;
			return {
				violation: name,
				remediationScore: avgScore,
				maxScore: 4,
				count: v.count,
				category:
					avgScore >= 3.5
						? "excellent"
						: avgScore >= 2.5
							? "good"
							: avgScore >= 1.5
								? "fair"
								: "poor",
			};
		});

		// Sort primarily by case count (descending), then by remediation score as tiebreaker
		return list
			.sort(
				(a, b) => b.count - a.count || b.remediationScore - a.remediationScore,
			)
			.slice(0, 10)
			.map((item, index) => ({
				...item,
				rank: index + 1,
			}));
	}, [detailedUpdatesResponse]);

	return (
		<section className="w-full py-8 md:py-16 bg-gradient-to-br from-gray-50 to-gray-100 min-h-[70vh] lg:min-h-[100vh]">
			<Container size="4">
				<motion.div
					className="text-center mb-12"
					initial={{ opacity: 0, y: 30 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					whileInView={{ opacity: 1, y: 0 }}
				>
					<Heading className="text-center animated-underline" mb="6" size="8">
						Social Responsibility - Recruitment
					</Heading>
					<p className="text-lg text-gray-600 max-w-4xl mx-auto">
						A look at the top worker-reported recruitment issues reported across
						the CASCADE network over the past 5 years, and the quality of
						remediation by the involved suppliers - as validated by impacted
						workers.
					</p>
					<br />
					<p className="text-lg text-gray-600 max-w-4xl mx-auto">
						Book a demo to see how companies can drill down on worker reported
						labor issues - and quality of remediation by suppliers - by country,
						industry, and even down to the supplier site
					</p>
				</motion.div>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
					{/* Main Violations List */}
					<div className="xl:col-span-3 space-y-4">
						{/* <OverallCards
							closureData={closureTimeData}
							detailed={detailedForOverall}
							mainStat={mainStat}
						/>
						<RisksLie
							categoryIds={[RECRUITMENT_KPI_ID]}
							filters={filters}
							groupBy="description"
							issueTitle="Recruitment-Related Issues by Category and Severity Level"
							rootLabel="Recruitment"
							severityMaxLabel="4 (Forced Labor Risk - Urgent)"
						/>
						<CasesByCategory
							allCategoriesLabel="Recruitment"
							defaultCategoryId={RECRUITMENT_KPI_ID.toString()}
							filters={filters}
							hideCategorySelector
							title="Recruitment Issues by KPI Category"
						/> */}
						<Heading align={"center"} my={"6"} size="6" weight="bold">
							Top 10 Recruitment-Related Violations
						</Heading>
						<p className="text-sm py-3 text-gray-500 text-left">
							From 2020 to present
						</p>
						{violationsData?.map((violation, index) => (
							<DumbbellChart
								index={index}
								key={violation.rank}
								violation={violation}
							/>
						))}
					</div>

					{/* Sidebar Filters */}
					{/* <div className="xl:col-span-1">
						<FilterCard onFilterChange={setFilters} />
					</div> */}
				</div>
			</Container>
		</section>
	);
};
