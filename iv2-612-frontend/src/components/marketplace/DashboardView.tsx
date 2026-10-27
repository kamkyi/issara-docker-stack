import * as Icons from "@mui/icons-material";
import { Card, Flex } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";
import { ensureArray } from "$src/utils/ensureArray";
import { ScoreGauge } from "./CommonComponents";

interface DashboardViewProps {
	wvScore: number;
	ciScore: number;
	finalScore: number;
	onBrowse: () => void;
	mock?: boolean;
	isSupplierContext?: boolean;
}

export const DashboardView = ({
	wvScore,
	ciScore,
	finalScore,
	onBrowse,
	mock = false,
	isSupplierContext = false,
}: DashboardViewProps) => {
	const { t } = useTranslation();
	const loopSteps = [
		{
			icon: <Icons.Group style={{ color: "#1aaec3" }} />,
			label: isSupplierContext
				? t("cascadeMarketplace.dashboard.loop.identifyPriorities", {
						defaultValue: "Identify Priorities",
					})
				: t("cascadeMarketplace.dashboard.loop.identifyRisk"),
			sub: t("cascadeMarketplace.dashboard.loop.workerVoice"),
		},
		{
			icon: <Icons.Search style={{ color: "#1aaec3" }} />,
			label: t("cascadeMarketplace.dashboard.loop.selectSolution"),
			sub: t("cascadeMarketplace.tabs.catalog"),
		},
		{
			icon: <Icons.TaskAlt style={{ color: "#1aaec3" }} />,
			label: t("cascadeMarketplace.dashboard.loop.implementVerify"),
			sub: t("cascadeMarketplace.dashboard.loop.cascadeIndex"),
		},
		{
			icon: <Icons.TrendingUp style={{ color: "#1aaec3" }} />,
			label: t("cascadeMarketplace.dashboard.loop.marketAdvantage"),
			sub: t("cascadeMarketplace.dashboard.loop.ongoingAssurances"),
		},
	];
	const recentActivities = mock
		? [
				{
					title:
						"Ethical Grievance Mechanisms self-diagnostic, for suppliers and recruitment agencies",
					tags: ["Grievance Mechanisms", "Learning", "Policies & Systems"],
					status: "Completed",
					date: "04-22-2026",
					inProgress: false,
				},
				{
					title: "Wages in Context Analysis",
					tags: ["Living Wages", "Tech & Data", "Policies & Systems"],
					status: "Completed",
					date: "05-05-2026",
					inProgress: false,
				},
				{
					title: "Capacity Building: Heat Safety Training",
					tags: ["Climate Resilience", "Learning"],
					status: "Completed",
					date: "05-30-2026",
					inProgress: false,
				},
				{
					title: "9 Critical Components of Effective Worker Engagement",
					tags: ["Grievance Mechanisms", "Learning"],
					status: "In Progress",
					date: "",
					inProgress: true,
				},
				{
					title: "Worker Satisfaction Survey: Independent Third-Party",
					tags: ["Grievance Mechanisms", "Worker Engagement"],
					status: "In Progress",
					date: "",
					inProgress: true,
				},
			]
		: [];

	const getTagClass = (tag: string) => {
		switch (tag) {
			case "Grievance Mechanisms":
				return "bg-[#148696] text-[#ffffff]";
			case "Learning":
				return "bg-[#F8D8D3] text-[#D67E70]";
			case "Policies & Systems":
				return "bg-[#E9D8FA] text-[#8B5CB0]";
			case "Living Wages":
				return "bg-[#6C3FAE] text-[#ffffff]";
			case "Tech & Data":
				return "bg-[#F4DA75]/30 text-[#8E6D00]";
			case "Climate Resilience":
				return "bg-[#8ED6DF]/30 text-[#1D8FA2]";
			case "Worker Engagement":
				return "bg-[#6ED6EA]/30 text-[#1698B4]";
			default:
				return "bg-gray-100 text-gray-500";
		}
	};
	return (
		<div className="space-y-4">
			{/* Feedback Loop Banner */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="relative rounded-[32px] p-8 text-white overflow-hidden bg-gradient-to-br from-[#ffffff] to-[#f5f5f5] border border-[#c4c7cc]"
				initial={{ opacity: 0, y: 20 }}
			>
				<Icons.Loop className="absolute right-[-20px] top-[-20px] text-white/10 text-[240px] rotate-12" />
				<h2 className="text-xl font-bold mb-4">
					{t("cascadeMarketplace.dashboard.loop.title")}
				</h2>

				<div className="flex justify-between items-center max-w-4xl mx-auto relative z-10">
					{loopSteps.map((step, i) => (
						<div className="flex items-center flex-1" key={i}>
							<div className="flex flex-col items-center">
								<div className="w-14 h-14 bg-[#1aaec3]/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 rounded-full">
									{step.icon}
								</div>
								<span className="font-bold">{step.label}</span>
								<span className="text-sm opacity-60 font-light">
									{step.sub}
								</span>
							</div>
							{i < 3 && (
								<div className="flex-1 flex justify-center opacity-30">
									<Icons.ArrowForward />
								</div>
							)}
						</div>
					))}
				</div>
			</motion.div>

			{/* CASCADE Index + Recent Activity */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card className="p-8 shadow-sm rounded-3xl">
					<h4 className="font-heading text-xl font-black text-[#004A60] mb-6">
						{t("cascadeMarketplace.dashboard.score.yourIndex")}
					</h4>
					<div className="flex flex-col items-center">
						<ScoreGauge score={finalScore} />
					</div>

					<div className="mt-4 border-t border-[#b6b6b6] pt-6 space-y-6">
						<div className="space-y-2">
							<div className="flex justify-between items-center text-sm">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-[#148696]" />
									<span className="text-gray-700 font-medium">
										{t("cascadeMarketplace.dashboard.loop.workerVoice")}
									</span>
								</div>
								<span className="font-semibold text-[#004A60]">
									{wvScore}{" "}
									<span className="text-gray-500 font-normal">
										{t("cascadeMarketplace.dashboard.score.workerVoiceWeight")}
									</span>
								</span>
							</div>
							<div className="h-2 w-full bg-[#e8e4dc] rounded-full overflow-hidden">
								<motion.div
									animate={{ width: `${wvScore}%` }}
									className="h-full bg-[#148696] rounded-full"
									initial={{ width: 0 }}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex justify-between items-center text-sm">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-[#F1C94A]" />
									<span className="text-gray-700 font-medium">
										{t(
											"cascadeMarketplace.dashboard.score.continuousImprovement",
										)}
									</span>
								</div>
								<span className="font-semibold text-[#004A60]">
									{ciScore}{" "}
									<span className="text-gray-500 font-normal">
										{t(
											"cascadeMarketplace.dashboard.score.continuousImprovementWeight",
										)}
									</span>
								</span>
							</div>
							<div className="h-2 w-full rounded-full overflow-hidden bg-[#e8e4dc]">
								<motion.div
									animate={{ width: `${ciScore}%` }}
									className="h-full bg-[#F1C94A] rounded-full"
									initial={{ width: 0 }}
								/>
							</div>
						</div>
					</div>
				</Card>

				<Card className="p-8 bg-[#f6f6f6] shadow-sm rounded-3xl">
					<h4 className="font-heading text-xl font-black text-[#004A60] mb-6">
						{t("cascadeMarketplace.dashboard.activity.title")}
					</h4>
					<div className="space-y-0 divide-y divide-[#cfcfcf]">
						{recentActivities.length > 0 ? (
							recentActivities.map((activity) => (
								<div className="py-4 first:pt-0 last:pb-0" key={activity.title}>
									<div className="flex items-start justify-between gap-4">
										<div className="flex gap-3">
											<span
												className={`mt-2 w-2 h-2 min-w-2 rounded-full ${
													activity.inProgress ? "bg-[#F1C94A]" : "bg-[#148696]"
												}`}
											/>
											<div>
												<p className="font-semibold text-sm text-[#222222]">
													{activity.title}
												</p>
												<div className="mt-3 flex flex-wrap gap-2">
													{ensureArray(activity.tags).map((tag) => (
														<span
															className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${getTagClass(tag)}`}
															key={`${activity.title}-${tag}`}
														>
															{tag}
														</span>
													))}
												</div>
											</div>
										</div>
										<div className="text-right min-w-[80px]">
											<p
												className={`font-bold ${
													activity.inProgress
														? "text-[#F1C94A]"
														: "text-[#004A60]"
												}`}
											>
												<span className="text-xs">{activity.status}</span>
											</p>
											{activity.date ? (
												<div className="mt-1 text-xs font-semibold text-[#148696]">
													{activity.date}
												</div>
											) : null}
										</div>
									</div>
								</div>
							))
						) : (
							<p className="text-sm text-gray-400">
								{t("cascadeMarketplace.dashboard.activity.empty")}
							</p>
						)}
					</div>
				</Card>
			</div>

			{/* CTA Section */}
			<Card className="p-8 border-none bg-blue-50/30 rounded-3xl flex items-center justify-between">
				<div className="flex gap-6 items-center">
					<div className="w-16 h-16 bg-[#c4c7cc]/20 rounded-2xl flex items-center justify-center">
						<Icons.TrendingUp className="text-[#523bae] text-3xl" />
					</div>
					<div>
						<h4 className="text-xl font-bold text-[#004A60] mb-2">
							{t("cascadeMarketplace.dashboard.cta.title")}
						</h4>
						<p className="text-gray-500 text-sm max-w-2xl">
							{t("cascadeMarketplace.dashboard.cta.body")}
						</p>
					</div>
				</div>
				<Flex align="center" className="h-[50px]" justify="end">
					<CascadeButton
						buttonText={t("cascadeMarketplace.dashboard.cta.button")}
						className="rounded-xl px-8 bg-[#004A60]"
						handleOnClick={onBrowse}
						iconRight={<Icons.ArrowForward className="ml-2" />}
						size="3"
					/>
				</Flex>
			</Card>

			{/* Recent Activity now shown beside CASCADE Index */}
		</div>
	);
};
