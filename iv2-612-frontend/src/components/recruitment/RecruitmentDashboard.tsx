import { Container, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { CasesByCategory } from "../home/CasesByCategory";
import { FilterCard } from "../home/FilterCard";
import { OverallCards } from "../home/OverallCards";
import RisksLie from "../home/RisksLie";

interface ViolationData {
	rank: number;
	violation: string;
	category:
		| "serious"
		| "legal_unethical"
		| "minor_misc"
		| "illegal_unethical"
		| "minor_communication"
		| "deceptive";
	remediationScore: number;
	maxScore: number;
}

const violationsData: ViolationData[] = [
	{
		rank: 1,
		violation: "Treated poorly and/or threatened by RA or broker",
		category: "serious",
		remediationScore: 2.58,
		maxScore: 4,
	},
	{
		rank: 2,
		violation: "Fees charged by recruitment agency: legal but not ethical",
		category: "legal_unethical",
		remediationScore: 2.0,
		maxScore: 4,
	},
	{
		rank: 3,
		violation:
			"Contract was not clearly explained/understood prior to contract signing",
		category: "minor_misc",
		remediationScore: 2.94,
		maxScore: 4,
	},
	{
		rank: 4,
		violation: "Proper, legal documents not provided to worker",
		category: "serious",
		remediationScore: 2.68,
		maxScore: 4,
	},
	{
		rank: 5,
		violation: "Fees charged by recruitment agency: illegal and unethical",
		category: "illegal_unethical",
		remediationScore: 2.18,
		maxScore: 4,
	},
	{
		rank: 6,
		violation: "Inaccurate, misleading, or poor information about job",
		category: "minor_communication",
		remediationScore: 2.05,
		maxScore: 4,
	},
	{
		rank: 7,
		violation: "No contract provided",
		category: "serious",
		remediationScore: 2.46,
		maxScore: 4,
	},
	{
		rank: 8,
		violation: "Document retention",
		category: "serious",
		remediationScore: 2.19,
		maxScore: 4,
	},
	{
		rank: 9,
		violation:
			"Inaccurate, misleading, or poor information about job: serious, deceptive mis-information",
		category: "deceptive",
		remediationScore: 2.48,
		maxScore: 4,
	},
	{
		rank: 10,
		violation:
			"Workers placed in workplace and jobs different from what they were recruited for",
		category: "serious",
		remediationScore: 2.3,
		maxScore: 4,
	},
];

const getCategoryColor = (category: ViolationData["category"]) => {
	switch (category) {
		case "serious":
			return { bg: "bg-red-600", text: "text-red-600", label: "SERIOUS" };
		case "legal_unethical":
			return {
				bg: "bg-orange-500",
				text: "text-orange-500",
				label: "LEGAL BUT UNETHICAL",
			};
		case "minor_misc":
			return {
				bg: "bg-purple-500",
				text: "text-purple-500",
				label: "MINOR MISC",
			};
		case "illegal_unethical":
			return {
				bg: "bg-green-600",
				text: "text-green-600",
				label: "ILLEGAL & UNETHICAL",
			};
		case "minor_communication":
			return {
				bg: "bg-purple-400",
				text: "text-purple-400",
				label: "MINOR MISCOMMUNICATION",
			};
		case "deceptive":
			return {
				bg: "bg-purple-600",
				text: "text-purple-600",
				label: "DECEPTIVE MIS-INFORMATION",
			};
		default:
			return { bg: "bg-gray-500", text: "text-gray-500", label: "UNKNOWN" };
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
			// className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
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
								{violation.remediationScore.toFixed(2)}/4
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

export const WorkerViolationsSection = () => {
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
						Social Responsibility - Labor
					</Heading>
					<p className="text-lg text-gray-600 max-w-4xl mx-auto">
						A look at the top worker-reported labor issues reported across the
						CASCADE network over the past 5 years, and the quality of
						remediation by the involved suppliers - as validated by impacted
						workers.{" "}
					</p>
					<br />
					<p className="text-lg text-gray-600 max-w-4xl mx-auto">
						Book a demo to see how companies can drill down on worker reported
						labor issues - and quality of remediation by suppliers - by country,
						industry, and even down to the supplier site.
					</p>
				</motion.div>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
					{/* Main Violations List */}
					<div className="xl:col-span-2 space-y-4">
						<OverallCards closureData={{}} mainStat={{}} />
						<RisksLie />
						<CasesByCategory />
						<Text size="6" weight="bold">
							Top 10 Worker-Reported Labor Violations
						</Text>
						{violationsData.map((violation, index) => (
							<DumbbellChart
								index={index}
								key={violation.rank}
								violation={violation}
							/>
						))}
					</div>

					{/* Status Cards Sidebar */}
					<div className="xl:col-span-1">
						<FilterCard />
					</div>
				</div>
			</Container>
		</section>
	);
};

export default WorkerViolationsSection;
