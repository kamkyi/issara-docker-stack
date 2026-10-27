import { Button } from "@radix-ui/themes";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { GuestLayout } from "$src/layouts/GuestLayout";
import useAuthData from "$src/store/store.auth";
import landingPageImage from "../assets/img/banner-image/gd-two-workers.jpg";
import styles from "./company-dashboard.module.css";
import "react-datepicker/dist/react-datepicker.css";

import YellowInfoBox from "$src/components/ui/YellowInfoBox";

import { authStatus } from "$src/queries/auth";
import { requireSupplierAuth } from "$src/utils/auth";
import companyDashboardData from "../assets/mock/company-dashboard.json";

export const Route = createFileRoute("/continuous-improvement")({
	beforeLoad: () => {
		const { isAuthenticated, role } = authStatus();
		requireSupplierAuth({ isAuthenticated, role });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const scrollRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	// const { theme } = useTheme();
	// const { startDate, endDate } = useCompanyDashboardStore();
	// const [benchmarkFromDate, setBenchmarkFromDate] = useState<Date | null>(
	// 	new Date(),
	// );
	// const [benchmarkToDate, setBenchmarkToDate] = useState<Date | null>(
	// 	new Date(),
	// );

	// Extract data from the updated mock data structure
	// const { viewMode } = useViewModeStore();
	const { role } = useAuthData();
	// const isBuyerView = viewMode === "buyer-view";
	// const defaultTabValue = "ethical-performance";
	// const firstTabTitle =
	// 	viewMode === "buyer-view" ? "Oceans Score" : "Cascade Index";
	// const secondTabTitle =
	// 	viewMode === "buyer-view"
	// 		? "Community Feedback"
	// 		: "Golden Dreams: Scoring by Workers";
	// // Calculate Cascade Index (overall) as the average of the other 4 data points

	// const mainScoreChartData = companyDashboardData.mainScoreChartData.map(
	// 	(entry) => {
	// 		const keys = ["remediation", "continus_improvement", "timeliness"];
	// 		const values = keys.map((k) => Number(entry[k]) || 0);
	// 		const avg = values.reduce((a, b) => a + b, 0) / values.length;
	// 		return {
	// 			...entry,
	// 			overall: avg,
	// 		};
	// 	},
	// );
	// const radarChartData = companyDashboardData.radarchartdata;

	// const { data: gdEmployerData } =
	// 	useSupplierDetail(18136);
	// const { data: gdRecruitmentAgenciesData } = useRecruitmentAgenciesDetail(54);
	// const ratingData =
	// 	viewMode === "ra-view" ? gdRecruitmentAgenciesData : gdEmployerData;
	// const { data: gdRatingCriteries } = useRatingCriteries();
	// const scoringData = gdRatingCriteries;

	// Calculate Cascade Index (CI) as the average of the other four categories for each date
	const quarterlyScoreData = companyDashboardData.quarterlyScoreData || [];
	const categories = [
		"Remediation Quality",
		"Continuous Improvement",
		"Remediation Timeliness",
	];

	// Build a date-indexed map for each category
	const categoryScoreMap = {};
	categories.forEach((cat) => {
		const found = quarterlyScoreData.find((c) => c.category === cat);
		if (found) {
			found.scores.forEach(({ date, value }) => {
				if (!categoryScoreMap[date]) categoryScoreMap[date] = {};
				categoryScoreMap[date][cat] = value;
			});
		}
	});

	// For each date, calculate the average (preserve decimal precision)
	// const ciScores = Object.entries(categoryScoreMap).map(([date, values]) => {
	// 	const valObj = values as Record<string, number>;
	// 	const vals = categories
	// 		.map((cat) => valObj[cat])
	// 		.filter((v) => typeof v === "number");
	// 	const avg =
	// 		vals.length === categories.length
	// 			? vals.reduce((a, b) => a + b, 0) / categories.length
	// 			: null;
	// 	return { date, value: avg };
	// });

	// Helper to find closest score by date for a given array
	// function findClosestScoreByDate(scores, targetDate) {
	// 	if (!scores || !targetDate) return null;
	// 	const sorted = [...scores].sort(
	// 		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
	// 	);
	// 	let closest = sorted[0];
	// 	for (const s of sorted) {
	// 		if (new Date(s.date) <= targetDate) closest = s;
	// 		else break;
	// 	}
	// 	return closest;
	// }

	// Order: Cascade Index, Responsiveness, Remediation Quality, Continuous Improvement, Timeliness
	// const orderedCats = [
	// 	"Cascade Index",
	// 	"Remediation Quality",
	// 	"Continuous Improvement",
	// 	"Remediation Timeliness",
	// ];
	// const transformedQuarterlyScoreData = orderedCats.map((cat) => {
	// 	let scores: any;
	// 	if (cat === "Cascade Index") {
	// 		scores = ciScores;
	// 	} else {
	// 		const found = quarterlyScoreData.find((c) => c.category === cat);
	// 		scores = found ? found.scores : [];
	// 	}
	// 	const q1 = findClosestScoreByDate(scores, startDate) || { value: 0 };
	// 	const q2 = findClosestScoreByDate(scores, endDate) || { value: 0 };
	// 	return {
	// 		category: cat,
	// 		q1:
	// 			cat === "Cascade Index"
	// 				? q1.value != null
	// 					? Math.round(Number(q1.value) * 10) / 10
	// 					: 0
	// 				: q1.value != null
	// 					? Math.round(q1.value)
	// 					: 0,
	// 		q2:
	// 			cat === "Cascade Index"
	// 				? q2.value != null
	// 					? Math.round(Number(q2.value) * 10) / 10
	// 					: 0
	// 				: q2.value != null
	// 					? Math.round(q2.value)
	// 					: 0,
	// 		history: scores.filter(
	// 			(s) =>
	// 				new Date(s.date) >= (startDate || new Date(0)) &&
	// 				new Date(s.date) <= (endDate || new Date()),
	// 		),
	// 	};
	// });

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (scrollRef.current) {
			scrollRef.current.scrollBy({
				left: e.deltaY,
				behavior: "smooth",
			});
		}
	};

	useEffect(() => {
		const current = scrollRef.current;
		if (current) {
			current.addEventListener("wheel", handleWheel, { passive: false });
			return () => current.removeEventListener("wheel", handleWheel);
		}
	}, []);
	return (
		<GuestLayout>
			{false && role === "org-test-user" && (
				<YellowInfoBox
					expanded={
						<p className="mb-2">
							The stuff down below here was put as a placeholder so that fish
							heads were not just looking at a blank screen. What would be
							helpful to build that could leverage your NGO's data in a way that
							drives more of the action that you want to see by corporate
							partners, while also supporting and not cannibalizing the programs
							and partnerships you already have in place? Put your comments in
							the
							<strong>“Got feedback?”</strong> tab! As many as you want. We can
							also have some calls for ideation if that is convenient.
						</p>
					}
					summary={
						<span>
							The stuff down below here was put as a placeholder so that fish
							heads were not just looking at a blank screen.
						</span>
					}
				/>
			)}
			<div className="container mx-auto px-l py-xl">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
					{/* Left content */}
					<div className="md:col-span-3 order-2 md:order-1">
						<h1 className="heading-display mb-xl font-black uppercase tracking-[-0.022em]">
							Company Dashboard
						</h1>
						<h3 className="text-base font-bold mb-3 ">
							Your Sustainability Performance at a Glance
						</h3>
						<p className=" leading-relaxed text-base pe-4 mb-l">
							Track your company’s sustainability performance based on the
							suppliers in your supply chain, worker feedback and the
							recruitment agencies involved. Visualize your impact and benchmark
							against the industry.
						</p>
						<div className="flex flex-wrap gap-l mt-l">
							<div className="flex items-center space-x-2">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#2DCCE3] shadow">
									{/* User icon */}
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z" />
									</svg>
								</div>
								<div>
									<div className="text-[#2DCCE3] font-semibold text-base leading-tight">
										1,200
									</div>
									<div className="text-xs">Employees</div>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#2DCCE3] shadow">
									{/* Case icon */}
									<svg
										fill="currentColor"
										height="20px"
										viewBox="0 0 48 48"
										width="20px"
										xmlns="http://www.w3.org/2000/svg"
									>
										<g id={"SVGRepo_bgCarrier"} strokeWidth="0" />

										<g
											id={"SVGRepo_tracerCarrier"}
											strokeLinecap="round"
											strokeLinejoin="round"
										/>

										<g id={"SVGRepo_iconCarrier"}>
											{" "}
											<title>law-building-solid</title>{" "}
											<g data-name="Layer 2" id={"Layer_2"}>
												{" "}
												<g data-name="invisible box" id={"invisible_box"}>
													{" "}
													<rect fill="none" height="48" width="48" />{" "}
												</g>{" "}
												<g data-name="Q3 icons" id={"Q3_icons"}>
													{" "}
													<g>
														{" "}
														<rect height="4" width="38" x="5" y="36" />{" "}
														<path d="M44,42H4a2,2,0,0,0-2,2v2H46V44A2,2,0,0,0,44,42Z" />{" "}
														<rect height="16" width="4" x="10" y="18" />{" "}
														<rect height="16" width="4" x="22" y="18" />{" "}
														<rect height="16" width="4" x="34" y="18" />{" "}
														<path d="M44.9,11.4,24,2,3.1,11.4A2.1,2.1,0,0,0,2,13.2V14a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2v-.8A2.1,2.1,0,0,0,44.9,11.4Z" />{" "}
													</g>{" "}
												</g>{" "}
											</g>{" "}
										</g>
									</svg>
								</div>
								<div>
									<div className="text-[#2DCCE3] font-semibold text-base leading-tight">
										87
									</div>
									<div className="text-xs">Cases</div>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#2DCCE3] shadow">
									{/* Check icon */}
									<svg
										className="w-5 h-5"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<div>
									<div className="text-[#2DCCE3] font-semibold text-base leading-tight">
										92%
									</div>
									<div className="text-xs">Resolved</div>
								</div>
							</div>
						</div>
						<div className="mt-8">
							<Button
								className={`rounded-full px-8 py-2 text-base hover:scale-105 transition-transform shadow-md hover:shadow-lg focus:ring-2 focus:ring-[#2dd4bf] focus:outline-none ${styles.pointer}`}
								onClick={() =>
									navigate({ to: "/social-responsibility-workplan" })
								}
								size="3"
								style={{
									background: "#1AAEC3",
									color: "#fff",
									fontWeight: 600,
									border: "none",
									boxShadow: "0 2px 8px 0 rgba(20,184,166,0.10)",
								}}
							>
								Sustainability Workplanning
							</Button>
						</div>
					</div>
					{/* Right image */}
					<div className="md:col-span-2 order-1 md:order-2">
						<div
							className="relative w-full overflow-hidden rounded-md shadow-xl"
							style={{ paddingTop: "75%" }}
						>
							<div className="absolute inset-0 bg-[#004A60]/10 mix-blend-multiply z-10"></div>
							<img
								alt="A visual representation of Inclusive Labor Monitoring"
								className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
								src={landingPageImage}
							/>
							<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2DCCE3]/70 to-transparent h-1/4"></div>
						</div>
					</div>
				</div>
			</div>
			{/* <div className="container mx-auto px-l py-xl">
				<Tabs.Root defaultValue={defaultTabValue} key={defaultTabValue}>
					<Tabs.List color="green">
						<Tabs.Trigger
							disabled={isBuyerView}
							style={{
								color: theme === "dark" ? "white" : "#004A60",
							}}
							value="ethical-performance"
						>
							{firstTabTitle}
						</Tabs.Trigger>
						{!isBuyerView && (
							<Tabs.Trigger
								disabled={isBuyerView}
								style={{
									color: theme === "dark" ? "white" : "#004A60",
								}}
								value="golden-dreams"
							>
								{secondTabTitle}
							</Tabs.Trigger>
						)}
						<Tabs.Trigger
							disabled={isBuyerView}
							style={{
								color: theme === "dark" ? "white" : "#004A60",
							}}
							value="benchmarking"
						>
							Benchmarking
						</Tabs.Trigger>
						{!isBuyerView && (
							<Tabs.Trigger
								style={{
									color: theme === "dark" ? "white" : "#004A60",
								}}
								value="progress-impact"
							>
								Progress & Impact Indicators
							</Tabs.Trigger>
						)}
					</Tabs.List>

					<Box pb="2" pt="3" px="4">
						<Tabs.Content value="ethical-performance">
							<motion.div
								animate={{ x: 0, y: 0, opacity: 1 }}
								className="grid grid-cols-1 md:grid-cols-6 gap-8"
								initial={{ y: 50, opacity: 0 }}
								transition={{
									duration: 1,
								}}
							>
								<div className="col-span-1 md:col-span-6">
									<h3 className="text-xl font-bold mb-4">
										Quarterly Score Comparison
									</h3>
									<CarouselSlideCard slides={transformedQuarterlyScoreData} />
								</div>

								<div className="col-span-1 md:col-span-6">
									<hr className="opacity-10" />
								</div>

								<div className="col-span-1 md:col-span-6 flex flex-col">
									<div className="flex flex-row justify-between items-center flex-wrap mb-6">
										<div className="flex flex-col">
											<h3 className="text-lg font-bold mb-1">CI</h3>Trend
											<p className="text-xs text-gray-400">
												Cascade Index over time
											</p>
										</div>
									</div>
									<div className="flex items-center">
										<ScoreChart
											data={mainScoreChartData}
											dataKeys={[
												{
													key: "overall",
													label: "Sustainability Performance",
													stroke: statusColorPalette[0],
												},
												{
													key: "remediation",
													label: "Remediation Quality",
													stroke: statusColorPalette[2],
												},
												{
													key: "continus_improvement",
													label: "Continuous Improvement",
													stroke: statusColorPalette[3],
												},
												{
													key: "timeliness",
													label: "Remediation Timeliness",
													stroke: statusColorPalette[4],
												},
											]}
										/>
									</div>
								</div>
							</motion.div>
						</Tabs.Content>

						<Tabs.Content value="golden-dreams">
							{gdEmployerData ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
									{scoringData.map((item, index) => {
										const rating = ratingData?.scores_for_each_criteria?.find(
											(rc) => rc.rating_criteria_id === item.id,
										);
										return rating ? (
											<motion.div
												animate={{ x: 0, y: 0, opacity: 1 }}
												initial={{ x: (index + 1) * 100, y: 0, opacity: 0 }}
												key={item.name}
												transition={{
													duration: 1,
												}}
											>
												<div
													className="relative overflow-hidden flex flex-col items-start bg-white rounded-md p-6 shadow-sm hover:shadow-lg transition"
												>
													<img
														alt={item.image}
														className="absolute h-26 w-26 mb-2 opacity-30 -bottom-8 -right-2"
														src={item.image}
													/>
													<div
														className="font-medium text-md mb-2 truncate w-full text-gray-900"
														title={item.name}
													>
														{item.name}
													</div>
													<div className="flex items-center">
														<span
															className="text-xl font-bold mr-2"
															style={{ color: "#111" }}
														>
															{rating ? rating.score.toFixed(1) : "N/A"}
															<sup className="text-xs ml-0.5">
																{" "}
																({rating.count})
															</sup>
														</span>
														<RatingStars
															score={rating ? rating.score : 0}
														/>
													</div>
												</div>
											</motion.div>
										) : null;
									})}
								</div>
							) : isLoadingGDdata ? (
								<LoadingSpinner
									subtitle="Fetching Golden Dreams score by workers"
									title="Loading..."
								/>
							) : (
								<p className="text-center">No Golden Dreams data available.</p>
							)}
						</Tabs.Content>

						<Tabs.Content value="benchmarking">
							<div
								className="flex flex-wrap gap-4 mb-4 items-end justify-end"
								style={{
									color: theme === "dark" ? "#2DCCE3" : "#004A60",
								}}
							>
								<div className="flex flex-col">
									<label
										className="text-sm font-medium mb-1"
										htmlFor="benchmarkFromDate"
									>
										From
									</label>
									<DatePicker
										className="block w-36 rounded-md border-1 border-[#148696] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition"
										dateFormat="yyyy-MM-dd"
										id={"benchmarkFromDate"}
										onChange={(date) => setBenchmarkFromDate(date)}
										selected={benchmarkFromDate}
									/>
								</div>
								<div className="flex flex-col">
									<label
										className="text-sm font-medium mb-1"
										htmlFor="benchmarkToDate"
									>
										To
									</label>
									<DatePicker
										className="block w-36 rounded-md border-1 border-[#148696] px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 transition"
										dateFormat="yyyy-MM-dd"
										id={"benchmarkToDate"}
										onChange={(date) => setBenchmarkToDate(date)}
										selected={benchmarkToDate}
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
								<RadarChartComponent
									angle={18}
									axisKey="area"
									data={radarChartData}
									dataKeys={[
										{
											key: "company",
											label: "Company score",
										},
										{
											key: "benchmark",
											label: "Benchmark",
										},
									]}
									domain={[0, 150]}
									title="Similar companies benchmark"
								/>

								<RadarChartComponent
									angle={18}
									axisKey="area"
									data={radarChartData}
									dataKeys={[
										{
											key: "company",
											label: "Company score",
										},
										{
											key: "benchmark",
											label: "Benchmark",
										},
									]}
									domain={[0, 150]}
									title="Industry benchmark"
								/>

								<RadarChartComponent
									angle={18}
									axisKey="area"
									data={radarChartData}
									dataKeys={[
										{
											key: "company",
											label: "Company score",
										},
										{
											key: "benchmark",
											label: "Benchmark",
										},
									]}
									domain={[0, 150]}
									title="All businesses benchmark"
								/>
							</div>
						</Tabs.Content>

						<Tabs.Content value="progress-impact">
							<section className="w-full overflow-hidden mb-8">
								<div className="flex flex-col items-center p-4 bg-gray-50 rounded-md">
									<ProgressIndicatorDashboard />
								</div>
							</section>
						</Tabs.Content>
					</Box>
				</Tabs.Root>
			</div> */}
		</GuestLayout>
	);
}

export default RouteComponent;
