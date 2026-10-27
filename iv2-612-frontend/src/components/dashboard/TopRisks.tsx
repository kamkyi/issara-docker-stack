import { useTranslation } from "react-i18next";

interface Risk {
	issue: string;
	category: string;
	score: number;
	isForcedLabor: boolean;
	kpiCategory?: string | null;
	groupings?: string[];
	caseCount?: number;
}

interface TopRisksProps {
	risks?: Risk[];
	emptyMessage?: string;
}

const getScoreBadge = (score: number, t: (key: string) => string) => {
	// score is expected on 0-10 scale
	if (score >= 7.5)
		return {
			label: t("companyDashboard.topRisks.badges.excellent"),
			color: "#148696",
		};
	if (score >= 5)
		return {
			label: t("companyDashboard.topRisks.badges.good"),
			color: "#10B981",
		};
	if (score >= 2.5)
		return {
			label: t("companyDashboard.topRisks.badges.fair"),
			color: "#F59E0B",
		};
	return {
		label: t("companyDashboard.topRisks.badges.poor"),
		color: "#EF4444",
	};
};

const getBarColor = (score: number): string => {
	if (score >= 7.5) return "#148696";
	if (score >= 5) return "#10B981";
	if (score >= 2.5) return "#F59E0B";
	return "#EF4444";
};

const TopRisks = ({ risks = [], emptyMessage }: TopRisksProps) => {
	const { t } = useTranslation();

	return (
		<div className="container mx-auto mb-10 print-section-break">
			<h2 className="heading-display mb-1">
				{t("companyDashboard.topRisks.title")}
			</h2>
			<p className="text-[13px] font-medium text-gray-900 mb-6">
				{t("companyDashboard.topRisks.description.beforeBlack")}{" "}
				<span className="font-bold">
					{t("companyDashboard.topRisks.description.blackNumbers")}
				</span>{" "}
				{t("companyDashboard.topRisks.description.beforeOrange")}{" "}
				<span className="font-bold">
					{t("companyDashboard.topRisks.description.orangeNumbers")}
				</span>
				. {t("companyDashboard.topRisks.description.scorePrefix")}{" "}
				<span className="whitespace-nowrap">1-10</span>{" "}
				{t("companyDashboard.topRisks.description.scoreSuffix")}
			</p>

			<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="flex justify-end mb-4">
					<div className="relative flex items-center gap-1">
						<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
							{t("companyDashboard.topRisks.quality")}
						</span>
					</div>
				</div>

				{risks.length === 0 ? (
					<div className="flex items-center justify-center py-16 text-sm text-gray-500 text-center">
						{emptyMessage ??
							t("socialResponsibility.emptyStates.noData", {
								defaultValue: "No data found.",
							})}
					</div>
				) : (
					<div className="space-y-10">
						{risks.map((risk, idx) => {
							// input risk.score is expected to be on 1-4 scale; scale to 1-10
							const baseScore = Number(risk.score || 0);
							const scoreScaled = Number((baseScore * 2.5).toFixed(2));
							const badge = getScoreBadge(
								scoreScaled,
								t as (key: string) => string,
							);
							const barPct = (scoreScaled / 10) * 100;
							const numberColor = risk.isForcedLabor ? "#F97316" : "#1F2937";
							return (
								<div className="flex gap-4" key={risk.issue}>
									<div
										className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 mt-0.5"
										style={{ backgroundColor: numberColor }}
									>
										{idx + 1}
									</div>
									<div className="flex-1">
										<div className="flex justify-between items-start mb-2">
											<div>
												<h4 className="text-gray-900 text-[15px]">
													{risk.kpiCategory ? (
														<>
															<span className="font-bold">
																{risk.kpiCategory}:
															</span>{" "}
															<span className="font-normal">{risk.issue}</span>
														</>
													) : (
														<span className="font-bold">{risk.issue}</span>
													)}
												</h4>
												<span className="text-xs text-gray-500 font-medium tracking-wide">
													{[
														risk.category,
														typeof risk.caseCount === "number"
															? `${risk.caseCount.toLocaleString()} ${
																	risk.caseCount === 1 ? "case" : "cases"
																}`
															: null,
													]
														.filter(Boolean)
														.join(" · ")}
												</span>
											</div>
											<div className="flex items-center gap-3">
												<span
													className="text-white text-xs font-bold px-3 py-1 rounded"
													style={{ backgroundColor: badge.color }}
												>
													{badge.label}
												</span>
												<span
													className="font-bold text-lg"
													style={{ color: numberColor }}
												>
													{scoreScaled.toFixed(2)}/10
												</span>
											</div>
										</div>
										<div className="w-full bg-[#E5E7EB] rounded-full h-2.5 relative">
											<div
												className="h-2.5 rounded-full"
												style={{
													width: `${barPct}%`,
													backgroundColor: getBarColor(scoreScaled),
												}}
											/>
											<div className="absolute top-4 left-0 text-[10px] text-gray-400">
												0
											</div>
											<div className="absolute top-4 right-0 text-[10px] text-gray-400">
												10
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

export default TopRisks;
