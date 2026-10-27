import * as Icons from "@mui/icons-material";
import { Card } from "@radix-ui/themes";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CascadeButton from "$src/components/button/button";

export const MarketplaceSidebar = ({
	currentScore,
	projectedWeight,
	wvScore,
	ciScore,
	onBrowse,
	onViewPlan,
	itemCount,
}: {
	currentScore: number;
	projectedWeight: number;
	wvScore: number;
	ciScore: number;
	onBrowse: () => void;
	onViewPlan?: () => void;
	itemCount: number;
}) => {
	const { t } = useTranslation();
	const projectedScore = currentScore + projectedWeight;
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedbackStatus, setFeedbackStatus] = useState("");

	const handleSubmitRequest = async () => {
		if (isSubmitting) return;
		if (!name || !email || !description) {
			setFeedbackStatus(t("cascadeMarketplace.sidebar.feedback.validation"));
			return;
		}
		setIsSubmitting(true);
		setFeedbackStatus("");
		try {
			const base = (import.meta as any).env.VITE_APP_CASCADE_API_URL || "";
			const res = await fetch(`${base}/contact`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: name,
					email,
					subject: "CASCADE Marketplace Activity Request",
					message: description,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.message || "Failed to send");
			setFeedbackStatus(t("cascadeMarketplace.sidebar.feedback.success"));
			setName("");
			setEmail("");
			setDescription("");
		} catch (err) {
			console.error(err);
			setFeedbackStatus(t("cascadeMarketplace.sidebar.feedback.error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-6 border-none bg-[#f0f7ff] shadow-sm rounded-3xl">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-[#004A60] text-sm opacity-80 uppercase tracking-wider">
						{t("cascadeMarketplace.sidebar.currentScore")}
					</h3>
					<span className="text-4xl font-black text-[#004A60]">
						{currentScore}
					</span>
				</div>

				<div className="flex items-center gap-2 mb-2">
					<Icons.TrendingUp className="text-[#148696] text-sm" />
					<span className="font-bold text-[#004A60] text-sm tracking-tight">
						{t("cascadeMarketplace.sidebar.projectedScore")}
					</span>
				</div>

				<div className="flex items-baseline gap-2 mb-6">
					<span className="text-4xl font-black text-[#148696] tracking-tighter">
						{Math.round(projectedScore)}
					</span>
					<span className="text-sm font-bold text-[#148696] opacity-80">
						↗ +{Math.round(projectedWeight)}
					</span>
				</div>

				<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-6">
					<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
						{t("cascadeMarketplace.sidebar.breakdown")}
					</span>
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-gray-500">
								{t("cascadeMarketplace.sidebar.workerVoice")}
							</span>
							<span className="font-bold text-[#004A60]">{wvScore}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-gray-500">
								{t("cascadeMarketplace.sidebar.currentCi")}
							</span>
							<span className="font-bold text-[#004A60]">{ciScore}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-[#148696] font-bold">
								{t("cascadeMarketplace.sidebar.projectedCi")}
							</span>
							<span className="text-[#148696] font-black">
								{ciScore + Math.round(projectedWeight)}
							</span>
						</div>
					</div>
				</div>

				<p className="text-[11px] text-gray-400 mb-4 font-medium italic">
					{t("cascadeMarketplace.sidebar.itemsInPlan", { count: itemCount })}
				</p>

				<CascadeButton
					buttonText={t("cascadeMarketplace.sidebar.viewPlan")}
					className="rounded-xl font-black shadow-sm bg-gradient-to-r from-[#523bae] to-[#8c52ff]"
					fullWidth
					handleOnClick={onViewPlan || onBrowse}
					size="2"
				/>
			</Card>

			<Card className="p-6 border-none bg-blue-50/30 shadow-sm rounded-3xl">
				<h4 className="font-bold text-[#004A60] mb-4 text-sm uppercase tracking-widest opacity-60">
					{t("cascadeMarketplace.sidebar.howItWorks.title")}
				</h4>
				<ul className="space-y-4">
					{[
						t("cascadeMarketplace.sidebar.howItWorks.items.browse"),
						t("cascadeMarketplace.sidebar.howItWorks.items.project"),
						t("cascadeMarketplace.sidebar.howItWorks.items.complete"),
						t("cascadeMarketplace.sidebar.howItWorks.items.partnerships"),
					].map((text, i) => (
						<li
							className="flex gap-3 text-sm text-gray-600 leading-tight"
							key={i}
						>
							<span className="text-[#148696] font-bold">•</span>
							{text}
						</li>
					))}
				</ul>
			</Card>
			<Card className="p-6 border-none bg-blue-50/30 shadow-sm rounded-3xl space-y-4">
				<h4 className="font-bold text-[#004A60] mb-4 text-sm uppercase tracking-widest opacity-60">
					{t("cascadeMarketplace.sidebar.feedback.title")}
				</h4>
				<p className="text-sm text-gray-600">
					{t("cascadeMarketplace.sidebar.feedback.body")}
				</p>
				<input
					className="w-full p-2 border border-gray-300 rounded-md"
					onChange={(e) => setName(e.target.value)}
					placeholder={t("cascadeMarketplace.sidebar.feedback.name")}
					type="text"
					value={name}
				/>
				<input
					className="w-full p-2 border border-gray-300 rounded-md"
					onChange={(e) => setEmail(e.target.value)}
					placeholder={t("cascadeMarketplace.sidebar.feedback.email")}
					type="text"
					value={email}
				/>
				<textarea
					className="w-full p-2 border border-gray-300 rounded-md"
					onChange={(e) => setDescription(e.target.value)}
					placeholder={t("cascadeMarketplace.sidebar.feedback.description")}
					value={description}
				/>
				<CascadeButton
					buttonText={t("cascadeMarketplace.sidebar.feedback.submit")}
					className={`rounded-xl font-black ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
					fullWidth
					handleOnClick={handleSubmitRequest}
					iconLeft={<PaperPlaneIcon />}
					size="2"
				/>
				{feedbackStatus && (
					<p className="text-sm mt-2 text-gray-600">{feedbackStatus}</p>
				)}
			</Card>
		</div>
	);
};

import { PaperPlaneIcon } from "@radix-ui/react-icons";
import ReactECharts from "echarts-for-react";

export const ScoreGauge = ({ score }: { score: number }) => {
	const { t } = useTranslation();
	const getStatus = (val: number) => {
		if (val >= 80) return t("cascadeMarketplace.dashboard.score.excellent");
		if (val >= 60) return t("cascadeMarketplace.dashboard.score.good");
		if (val >= 40) return t("cascadeMarketplace.dashboard.score.fair");
		return t("cascadeMarketplace.dashboard.score.poor");
	};

	const getColor = (val: number) => {
		if (val >= 80) return "#3BAE8C"; // Soft Green
		if (val >= 60) return "#148696"; // Primary Teal
		if (val >= 40) return "#F2A65A"; // Soft Amber
		return "#E07A5F"; // Muted Coral
	};

	const option = {
		series: [
			{
				type: "gauge",
				startAngle: 180,
				endAngle: 0,
				center: ["50%", "75%"],
				radius: "120%",
				min: 0,
				max: 100,
				splitNumber: 5,
				axisLine: {
					lineStyle: {
						width: 12,
						color: [
							[0.4, "#E07A5F"],
							[0.6, "#F2A65A"],
							[0.8, "#148696"],
							[1, "#3BAE8C"],
						],
					},
				},
				pointer: {
					icon: "path://M12.8,0.7l12,20.1c0.7,1.1,0.2,2.6-1,3.3c-0.4,0.2-0.8,0.3-1.2,0.3H1c-1.3,0-2.4-1.1-2.4-2.4c0-0.4,0.1-0.8,0.3-1.2l12-20.1C11.6-0.5,13.1-0.5,13.8,0.7z",
					length: "12%",
					width: 20,
					offsetCenter: [0, "-60%"],
					itemStyle: {
						color: getColor(score),
					},
				},
				axisTick: { show: false },
				splitLine: { show: false },
				axisLabel: { show: false },
				detail: {
					show: false,
				},
				data: [{ value: score }],
			},
		],
	};

	return (
		<div className="relative flex flex-col items-center justify-center h-64 w-full">
			<ReactECharts
				option={option}
				opts={{ renderer: "svg" }}
				style={{ height: "100%", width: "100%" }}
			/>
			<div className="absolute top-[50%] flex flex-col items-center">
				<span className="text-6xl font-black text-[#004A60] leading-none">
					{score}
				</span>
				<div
					className="mt-2 px-6 py-1 rounded-full text-white font-black text-xl shadow-lg"
					style={{ backgroundColor: getColor(score) }}
				>
					{getStatus(score)}
				</div>
				<span className="mt-2 text-[10px] text-gray-400 uppercase font-black tracking-widest">
					{t("cascadeMarketplace.dashboard.score.performance", {
						status: getStatus(score),
					})}
				</span>
			</div>
		</div>
	);
};
