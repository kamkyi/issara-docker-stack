import { motion } from "framer-motion";

interface StatCardProps {
	value: string | number;
	label: string;
	subLabel?: string;
	delay?: number;
}

const StatCard = ({ value, label, subLabel, delay = 0 }: StatCardProps) => {
	return (
		<motion.div
			className="bg-white border-2 border-[#148696] rounded-md p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-[#0d5f6d]"
			initial={{ opacity: 0, y: 20 }}
			transition={{ duration: 0.5, delay }}
			viewport={{ once: true }}
			whileInView={{ opacity: 1, y: 0 }}
		>
			<div className="text-center">
				<div className="text-3xl md:text-4xl font-bold text-[#148696] mb-2">
					{value}
				</div>
				<div className="text-sm md:text-base font-semibold text-gray-800">
					{label}
				</div>
				{subLabel && (
					<div className="text-xs text-gray-600 mt-1">{subLabel}</div>
				)}
			</div>
		</motion.div>
	);
};

export const OverallCards = ({ closureData, mainStat, detailed }: any) => {
	const closureTime = closureData?.data || {};
	const main = mainStat?.data || {};
	const monthly = Array.isArray(closureTime?.monthly)
		? closureTime.monthly
		: [];
	const detailedList = Array.isArray(detailed?.data)
		? detailed.data
		: Array.isArray(detailed)
			? detailed
			: [];

	const totalClosed =
		monthly.reduce((acc, curr) => acc + (Number(curr.closed_cases) || 0), 0) ??
		0;
	const caseCount = Number(main?.case_count) || 0;

	// Use affected_workers from detailed updates when available
	const affectedTotal = detailedList.reduce(
		(acc: number, u: any) => acc + (Number(u.affected_workers) || 0),
		0,
	);
	const affectedClosed = detailedList.reduce(
		(acc: number, u: any) =>
			acc + ((u.status_id === 3 ? Number(u.affected_workers) : 0) || 0),
		0,
	);

	const closureRate =
		affectedTotal > 0
			? (affectedClosed / affectedTotal) * 100
			: totalClosed > 0 && caseCount > 0
				? (totalClosed / caseCount) * 100
				: 0;

	// Determine average closure time:
	// Priority:
	// 1) If `detailed` data provided, compute simple mean of `days_to_close` from that filtered set
	// 2) Else prefer numeric `average_closure_time` from the API
	// 3) Otherwise compute a weighted average from monthly.avg_closure_time
	const detailedDays = detailedList
		.map((u: any) =>
			u && u.days_to_close != null ? Number(u.days_to_close) : NaN,
		)
		.filter((v: number) => Number.isFinite(v));

	let averageClosureTime = NaN;
	if (detailedDays.length > 0) {
		averageClosureTime =
			detailedDays.reduce((a: number, b: number) => a + b, 0) /
			detailedDays.length;
	} else {
		const apiAvg = closureTime?.average_closure_time;
		averageClosureTime = Number.isFinite(Number(apiAvg)) ? Number(apiAvg) : NaN;

		if (!Number.isFinite(averageClosureTime) && monthly.length > 0) {
			const weightedTotal = monthly.reduce(
				(acc, m) =>
					acc +
					(Number(m.avg_closure_time) || 0) * (Number(m.closed_cases) || 0),
				0,
			);
			const closedSum = monthly.reduce(
				(acc, m) => acc + (Number(m.closed_cases) || 0),
				0,
			);
			if (closedSum > 0) {
				averageClosureTime = weightedTotal / closedSum;
			} else {
				const simpleSum = monthly.reduce(
					(acc, m) => acc + (Number(m.avg_closure_time) || 0),
					0,
				);
				averageClosureTime = simpleSum / monthly.length;
			}
		}
	}

	const avgDisplay = Number.isFinite(averageClosureTime)
		? averageClosureTime.toFixed(1)
		: "—";

	const totalWorkersDisplay =
		affectedTotal > 0
			? affectedTotal.toLocaleString()
			: main?.worker_count?.toLocaleString() || "8200";

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<StatCard
				delay={0.1}
				label="Average Time to Case Closure"
				subLabel="(in days)"
				value={avgDisplay}
			/>
			<StatCard
				delay={0.2}
				label="Case Closure Rate"
				value={`${closureRate.toFixed(2)}%`}
			/>
			<StatCard delay={0.3} label="Total Workers" value={totalWorkersDisplay} />
		</div>
	);
};

export default OverallCards;
