import { useTranslation } from "react-i18next";

export interface WorkerIssueItem {
	issue: string;
	category: string;
	isForcedLabor?: boolean;
	count?: number;
	qualityScore?: number;
	speedDays?: number;
}

interface WorkerIssuesPanelProps {
	title: string;
	description?: string;
	items: WorkerIssueItem[];
	variant: "common" | "remediation";
	maxItems?: number;
	emptyMessage?: string;
}

const DISPLAY_MAX = 10;

// Sigmoid timeliness, same shape as the backend social-scores formula.
// Returns 0–10. 30d ≈ 9.5, 60d ≈ 8.2, 90d = 5.0, 120d ≈ 1.8, 150d ≈ 0.5.
const TIMELINESS_K = 0.05;
const TIMELINESS_X0 = 90;
const speedScoreFromDays = (days: number) =>
	10 / (1 + Math.exp(TIMELINESS_K * (days - TIMELINESS_X0)));

// Raw qualityScore (1–4) → user-facing label.
const qualityLabelKey = (raw: number): string => {
	if (raw >= 3.5) return "companyDashboard.topRisks.badges.excellent";
	if (raw >= 2.5) return "companyDashboard.topRisks.badges.good";
	if (raw >= 1.5) return "companyDashboard.topRisks.badges.fair";
	return "companyDashboard.topRisks.badges.poor";
};

// Badge/bar palette keyed off a 0–1 normalized "goodness" value so the same
// thresholds work for both 0–10 (unweighted) and 0–25 (weighted) displays.
const getScoreBadge = (norm: number, t: (key: string) => string) => {
	if (norm >= 0.75)
		return {
			label: t("companyDashboard.topRisks.badges.excellent"),
			color: "#148696",
		};
	if (norm >= 0.5)
		return {
			label: t("companyDashboard.topRisks.badges.good"),
			color: "#10B981",
		};
	if (norm >= 0.25)
		return {
			label: t("companyDashboard.topRisks.badges.fair"),
			color: "#F59E0B",
		};
	return {
		label: t("companyDashboard.topRisks.badges.poor"),
		color: "#EF4444",
	};
};

const getBarColor = (norm: number): string => {
	if (norm >= 0.75) return "#148696";
	if (norm >= 0.5) return "#10B981";
	if (norm >= 0.25) return "#F59E0B";
	return "#EF4444";
};

const WorkerIssuesPanel = ({
	title,
	description,
	items,
	variant,
	maxItems = 5,
	emptyMessage,
}: WorkerIssuesPanelProps) => {
	const { t } = useTranslation();
	const display = items.slice(0, maxItems);

	return (
		<div className="container mx-auto px-4 mb-10 print-section-break">
			<h2 className="heading-display mb-1">{title}</h2>
			{description && (
				<p className="text-[13px] font-medium text-gray-900 mb-6">
					{description}
				</p>
			)}

			<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
				<div className="flex justify-end mb-4">
					<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
						{variant === "common"
							? t("socialResponsibility.workerIssues.cases")
							: t("socialResponsibility.workerIssues.combinedScore")}
					</span>
				</div>

				{display.length === 0 && (
					<p className="text-sm text-gray-500 text-center py-6">
						{emptyMessage ?? t("socialResponsibility.workerIssues.noItems")}
					</p>
				)}

				<div className={variant === "common" ? "space-y-4" : "space-y-10"}>
					{display.map((item, idx) => {
						const numberColor = item.isForcedLabor ? "#F97316" : "#1F2937";

						if (variant === "common") {
							const count = Number(item.count || 0);
							return (
								<div className="flex gap-4" key={`${item.issue}-${idx}`}>
									<div
										className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 mt-0.5"
										style={{ backgroundColor: numberColor }}
									>
										{idx + 1}
									</div>
									<div className="flex-1 flex justify-between items-start">
										<div>
											<h4 className="font-bold text-gray-900 text-[15px]">
												{item.issue}
											</h4>
											<span className="text-xs text-gray-500 font-medium tracking-wide">
												{item.category}
											</span>
										</div>
										<div className="flex items-center gap-3">
											<span
												className="font-bold text-lg"
												style={{ color: numberColor }}
											>
												{count.toLocaleString()}
											</span>
										</div>
									</div>
								</div>
							);
						}

						const rawQuality = Number(item.qualityScore || 0);
						const qualityScaled = Math.max(0, Math.min(10, rawQuality * 2.5));
						const qualityLabel = t(qualityLabelKey(rawQuality));

						const hasSpeed =
							item.speedDays != null && Number(item.speedDays) > 0;
						const days = hasSpeed ? Math.max(0, Number(item.speedDays)) : 0;
						const speedScore = hasSpeed ? speedScoreFromDays(days) : 0;

						// Combined remediation score (0–10): half quality, half speed when
						// we have speed data, otherwise quality alone.
						const combined = hasSpeed
							? qualityScaled * 0.5 + speedScore * 0.5
							: qualityScaled;
						const displayScore = combined;
						const displayPct = Math.max(
							0,
							Math.min(100, (displayScore / DISPLAY_MAX) * 100),
						);
						const goodnessNorm = displayScore / DISPLAY_MAX;
						const badge = getScoreBadge(goodnessNorm, t);

						return (
							<div className="flex gap-4" key={`${item.issue}-${idx}`}>
								<div
									className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg shrink-0 mt-0.5"
									style={{ backgroundColor: numberColor }}
								>
									{idx + 1}
								</div>
								<div className="flex-1">
									<div className="flex justify-between items-start mb-2">
										<div>
											<h4 className="font-bold text-gray-900 text-[15px]">
												{item.issue}
											</h4>
											<span className="text-xs text-gray-500 font-medium tracking-wide">
												{item.category}
												{rawQuality > 0 && (
													<>
														{" · "}
														{t("socialResponsibility.workerIssues.quality")}
														{": "}
														{qualityLabel}
													</>
												)}
												{hasSpeed && (
													<>
														{" · "}
														{days} {t("socialResponsibility.workerIssues.days")}
													</>
												)}
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
												{displayScore.toFixed(2)}/{DISPLAY_MAX}
											</span>
										</div>
									</div>
									<div className="w-full bg-[#E5E7EB] rounded-full h-2.5 relative">
										<div
											className="h-2.5 rounded-full"
											style={{
												width: `${displayPct}%`,
												backgroundColor: getBarColor(goodnessNorm),
											}}
										/>
										<div className="absolute top-4 left-0 text-[10px] text-gray-400">
											0
										</div>
										<div className="absolute top-4 right-0 text-[10px] text-gray-400">
											{DISPLAY_MAX}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default WorkerIssuesPanel;
