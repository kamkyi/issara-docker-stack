import {
	BarChartIcon,
	CheckCircledIcon,
	PersonIcon,
} from "@radix-ui/react-icons";
import { Box } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import ReactApexChart from "react-apexcharts";
import TimeToCaseClosureChart from "$components/charts/TimeToCaseClosureChart";
/* The import for the CSS module is above */
import {
	SupplierKPITimelineChart,
	TimelinessRemediationChart,
	WorkerVoiceOverview,
} from "$src/components/indicators";
import { useSupplyChains } from "$src/hooks/useSupplyChain";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { authStatus } from "$src/queries/auth";
import { useKpiTimelineData } from "$src/queries/useKpiTimelineData";
import { useWorkplaceStats } from "$src/queries/useWorkplaceStats";
import { requireRecruiterSupplierAuth } from "$src/utils/auth";
import getUserIdentifiers from "$src/utils/getUserIdentifiers";
import landingPageImage from "../assets/img/our_workspace_landing_page.jpg";
import { statusColorPalette } from "../assets/mock/common-data";
import styles from "./our-workplace.module.css";

// // Custom renderer for pie chart labels with arrows outside the segments
// const renderCustomizedLabel = ({
// 	cx,
// 	cy,
// 	midAngle,
// 	outerRadius,
// 	name,
// 	fill,
// }) => {
// 	const RADIAN = Math.PI / 180;
// 	// Position the label outside the pie
// 	const radius = outerRadius * 1.2;
// 	const x = cx + radius * Math.cos(-midAngle * RADIAN);
// 	const y = cy + radius * Math.sin(-midAngle * RADIAN);

// 	// Calculate a point on the pie edge for the arrow
// 	const mx = cx + outerRadius * 0.95 * Math.cos(-midAngle * RADIAN);
// 	const my = cy + outerRadius * 0.95 * Math.sin(-midAngle * RADIAN);

// 	// Always show label, even for small segments
// 	// Optionally, you can adjust font size for small segments:
// 	// const fontSize = percent < 0.03 ? 9 : 11

// 	const textAnchor = x > cx ? "start" : "end";

// 	return (
// 		<>
// 			{/* Draw the connecting line from pie to label */}
// 			<path
// 				d={`M ${mx},${my} L ${x},${y}`}
// 				fill="none"
// 				stroke={fill || "#666666"}
// 				strokeWidth={1}
// 			/>
// 			<circle cx={mx} cy={my} fill={fill || "#666666"} r={2} stroke="none" />

// 			{/* The text label - removed percentage */}
// 			<text
// 				className={styles.pieChartLabel}
// 				dominantBaseline="central"
// 				fill="currentColor"
// 				fontSize={11}
// 				fontWeight="500"
// 				textAnchor={textAnchor}
// 				x={x}
// 				y={y}
// 			>
// 				{name}
// 			</text>
// 		</>
// 	);
// };

// Inline badge component for Open vs Closed
const OpenClosedBadge = () => (
	<span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
		<span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
		Open
		<span className="mx-1 text-gray-400">/</span>
		<span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
		Closed
	</span>
);

export const Route = createFileRoute("/our-workplace")({
	beforeLoad: async () => {
		const { isAuthenticated, role } = await authStatus();
		requireRecruiterSupplierAuth({
			isAuthenticated,
			role,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const scrollRef = useRef<HTMLDivElement>(null);

	const { supplierId, partnerId, isSupplier, isGlobalPartner, isTestUser } =
		getUserIdentifiers();

	// Fetch supply chains to get supplier IDs for global partners
	const { data: supplyChains = [] } = useSupplyChains();

	// Extract supplier IDs based on user type
	const supplierIds = useMemo(() => {
		if (isSupplier && supplierId) return [supplierId];

		if (isGlobalPartner && partnerId && supplyChains.length > 0) {
			const partnerSupplyChains = supplyChains.filter(
				(sc: any) =>
					sc.strategic_partner === partnerId ||
					sc.strategic_partner_id === partnerId ||
					sc.partner_id === partnerId,
			);
			let suppliers: any[] = [];
			partnerSupplyChains.forEach((sc: any) => {
				if (sc.suppliers && Array.isArray(sc.suppliers))
					suppliers = suppliers.concat(sc.suppliers);
			});
			const seen = new Set();
			return suppliers
				.filter((s: any) => {
					const id = s.id || s.supplier;
					if (!id || seen.has(id)) return false;
					seen.add(id);
					return true;
				})
				.map((s) => s.id || s.supplier);
		}

		if (isTestUser) return supplierId ? [supplierId] : [];
		return [];
	}, [
		isSupplier,
		isGlobalPartner,
		isTestUser,
		supplierId,
		partnerId,
		supplyChains,
	]);

	const queryParams =
		supplierIds.length > 0 ? { supplierId: supplierIds } : { supplierId: null };

	// Fetch live KPI/case data for TimelinessRemediationChart, filtered by supplier
	const { data: kpiTimelineData } = useKpiTimelineData(
		supplierIds.length > 0 ? { supplierId: supplierIds as any } : undefined,
	);

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
	const { data, isLoading, error } = useWorkplaceStats(queryParams);

	// Chart colors
	// const barChartColors = ["#148696", "#4ede8f"];

	const pieColors = [
		"#148696",
		"#4ede8f",
		"#FBBF24",
		"#6366F1",
		"#10B981",
		"#F472B6",
		"#F59E42",
		"#A78BFA",
		"#F87171",
		"#34D399",
		"#F9FAFB",
	];

	// Loading/Error states
	if (isLoading)
		return (
			<GuestLayout>
				<div className="p-8 text-center">Loading...</div>
			</GuestLayout>
		);
	if (error || !data)
		return (
			<GuestLayout>
				<div className="p-8 text-center text-red-500">
					Failed to load workplace stats.
				</div>
			</GuestLayout>
		);

	// Map API data to chart props
	const statsData = {
		totalWorkers: data.main_stats?.worker_count ?? 0,
		totalCases: data.main_stats?.case_count ?? 0,
		totalResponses: data.main_stats?.response_count ?? 0,
		avgClosureTime: data.time_to_case_closure?.average_closure_time ?? 0,
	};

	const demographicsData = {
		gender: data.demographics?.gender ?? [],
		nationality: data.demographics?.nationality ?? [],
		ethnicity: (data.demographics?.ethnicity ?? []).map((e) => ({
			...e,
			name: e.name || "Not Defined",
		})),
		colors: [
			statusColorPalette[2],
			statusColorPalette[1],
			statusColorPalette[4],
			statusColorPalette[7],
		],
	};

	// Transform cases_by_category for chart, filter out categories with both Open and Closed as 0
	const kpiCategoryData = (data.cases_by_category ?? [])
		.map((item) => ({
			category: item.category,
			Open: item.open_cases,
			Closed: item.closed_cases,
		}))
		.filter((item) => (item.Open ?? 0) > 0 || (item.Closed ?? 0) > 0);

	// Transform time_to_case_closure.monthly for pie chart (group by closure time ranges)
	const timeToClosureData = (() => {
		// Example buckets: <1d, 1-7d, 8-30d, 31-90d, >90d
		const buckets = [
			{ name: "<1 day", value: 0 },
			{ name: "1-7 days", value: 0 },
			{ name: "8-30 days", value: 0 },
			{ name: "31-90 days", value: 0 },
			{ name: ">90 days", value: 0 },
		];
		(data.time_to_case_closure?.monthly ?? []).forEach((item) => {
			const days = item.avg_closure_time;
			if (days < 1) buckets[0].value += item.closed_cases;
			else if (days <= 7) buckets[1].value += item.closed_cases;
			else if (days <= 30) buckets[2].value += item.closed_cases;
			else if (days <= 90) buckets[3].value += item.closed_cases;
			else buckets[4].value += item.closed_cases;
		});
		return buckets.filter((b) => b.value > 0);
	})();

	// Remediation quality for bar chart (new fields)
	const remediationQuality = data.remediation_quality ?? {};
	const barChartData = [
		{
			name: "Remediation Quality",
			Poor: remediationQuality.poor ?? 0,
			Fair: remediationQuality.fair ?? 0,
			Good: remediationQuality.good ?? 0,
			VeryGood: remediationQuality.very_good ?? 0,
			Excellent: remediationQuality.excellent ?? 0,
		},
	];

	// Supplier KPI Timeline filters
	const supplierTimelineFilters = {
		supplier: supplierIds.map(String),
		startTime: "2020-01-01T00:00:00Z",
		endTime: "2025-12-31T00:00:00Z",
	};

	// TimelinessRemediationChart data (not in API, so pass empty or adapt if available)
	const timeLinessData = kpiTimelineData ?? [];

	return (
		<GuestLayout>
			{/* Beautiful teal-based header with golden ratio design */}
			<div className="container mx-auto px-l py-xl">
				<div className="grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
					{/* Left content - takes up 3 parts of golden ratio (approx. 61.8%) */}
					<div className="md:col-span-3 order-2 md:order-1">
						<h1 className="heading-display mb-xl uppercase tracking-[-0.022em]">
							Our Workplace
						</h1>
						<h3 className="text-xl font-bold mb-4 ">
							Interactive, Inclusive Worker Voice & Grievance Management
						</h3>
						<p className=" leading-relaxed text-md max-w-lg">
							Access comprehensive workplace analytics, view worker
							demographics, track KPI timelines, and manage employee relations
							all in one place.
						</p>
						<div className="mt-8 flex space-x-4">
							<div className="flex items-center">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#A6DFDD]">
									<PersonIcon className="w-5 h-5" />
								</div>
								<p className="ml-2  text-sm">
									<span className="text-[#A6DFDD]">
										{statsData.totalWorkers.toLocaleString()}
									</span>
									<br />
									Workers
								</p>
							</div>
							<div className="flex items-center">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#A6DFDD]">
									<BarChartIcon className="w-5 h-5" />
								</div>
								<p className="ml-2 text-sm">
									<span className="text-[#A6DFDD]">
										{statsData.totalCases.toLocaleString()}
									</span>
									<br />
									Cases
								</p>
							</div>
							<div className="flex items-center">
								<div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#004A60] text-[#A6DFDD]">
									<CheckCircledIcon className="w-5 h-5" />
								</div>
								<p className="ml-2 text-sm">
									<span className="text-[#A6DFDD]">
										{statsData.totalResponses.toLocaleString()}
									</span>
									<br />
									Responses
								</p>
							</div>
						</div>
					</div>

					{/* Right image - takes up 2 parts of golden ratio (approx. 38.2%) */}
					<div className="md:col-span-2 order-1 md:order-2">
						<div
							className="relative w-full overflow-hidden rounded-md shadow-xl"
							style={{ paddingTop: "75%" }}
						>
							<div className="absolute inset-0 bg-teal-600/10 mix-blend-multiply z-10"></div>
							<img
								alt="A visual representation of Inclusive Labor Monitoring"
								className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
								src={landingPageImage}
							/>
							<div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-teal-900/70 to-transparent h-1/4"></div>
						</div>
					</div>
				</div>
			</div>

			<div className={`${styles.container} ${styles.containerPadding}`}>
				<div className="container">
					<h2 className="text-2xl font-semibold mb-4 pb-1 uppercase">
						Workplace Demographics
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 lg:grid-cols-3 md:gap-6 mb-8 sm:gap-4 lg:gap-8">
						{/* Gender Pie Chart (ApexCharts) */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4 className={styles.chartFooterText + " font-bold text-lg"}>
									By Gender
								</h4>
								<span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
									Demographics
								</span>
							</div>
							<div style={{ width: "100%", height: 280 }}>
								<ReactApexChart
									height={250}
									options={{
										chart: {
											type: "pie",
										},
										labels: demographicsData.gender.map((g) => g.name),
										colors: demographicsData.colors,
										legend: {
											show: true,
											position: "bottom",
										},
										tooltip: {
											y: {
												formatter: (value, { series }) => {
													const total = Array.isArray(series)
														? series.reduce((a, b) => a + b, 0)
														: 0;
													const percent = total ? (value / total) * 100 : 0;
													return `${value} (${percent.toFixed(1)}%)`;
												},
											},
										},
										dataLabels: {
											enabled: true,
											formatter: (val) =>
												typeof val === "number" ? `${val.toFixed(1)}%` : val,
										},
									}}
									series={demographicsData.gender.map((g) => g.value)}
									type="pie"
								/>
							</div>
							<div className={styles.chartFooter}>
								<span className={styles.chartFooterText}>
									Total workers: {statsData.totalWorkers.toLocaleString()}
								</span>
							</div>
						</div>

						{/* Nationality Pie Chart */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4
									className={styles.chartFooterText + " font-semibold text-lg"}
								>
									By Nationality
								</h4>
								<span className="bg-teal-50 text-teal-600 text-xs px-2 py-1 rounded-full font-medium">
									Demographics
								</span>
							</div>
							<div style={{ width: "100%", height: 280 }}>
								<ReactApexChart
									height={250}
									options={{
										chart: {
											type: "pie",
										},
										labels: demographicsData.nationality.map((n) => n.name),
										colors: demographicsData.colors,
										legend: {
											show: true,
											position: "bottom",
										},
										tooltip: {
											y: {
												formatter: (value, { series }) => {
													const total = Array.isArray(series)
														? series.reduce((a, b) => a + b, 0)
														: 0;
													const percent = total ? (value / total) * 100 : 0;
													return `${value} (${percent.toFixed(1)}%)`;
												},
											},
										},
										dataLabels: {
											enabled: true,
											formatter: (val) =>
												typeof val === "number" ? `${val.toFixed(1)}%` : val,
										},
									}}
									series={demographicsData.nationality.map((n) => n.value)}
									type="pie"
								/>
							</div>
							<div className={styles.chartFooter}>
								<span className={styles.chartFooterText}>
									{demographicsData.nationality.length} nationalit
									{demographicsData.nationality.length === 1 ? "y" : "ies"}{" "}
									represented
								</span>
							</div>
						</div>

						{/* Ethnicity Pie Chart */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4
									className={styles.chartFooterText + " font-semibold text-lg"}
								>
									By Ethnicity
								</h4>
								<span className="bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded-full font-medium">
									Demographics
								</span>
							</div>
							<div style={{ width: "100%", height: 280 }}>
								<ReactApexChart
									height={250}
									options={{
										chart: {
											type: "pie",
										},
										labels: demographicsData.ethnicity.map((e) => e.name),
										colors: statusColorPalette,
										legend: {
											show: true,
											position: "bottom",
										},
										tooltip: {
											y: {
												formatter: (value, { series }) => {
													const total = Array.isArray(series)
														? series.reduce((a, b) => a + b, 0)
														: 0;
													const percent = total ? (value / total) * 100 : 0;
													return `${value} (${percent.toFixed(1)}%)`;
												},
											},
										},
										dataLabels: {
											enabled: true,
											formatter: (val) =>
												typeof val === "number" ? `${val.toFixed(1)}%` : val,
										},
									}}
									series={demographicsData.ethnicity.map((e) => e.value)}
									type="pie"
								/>
							</div>
							<div className={styles.chartFooter}>
								<span className={styles.chartFooterText}>
									{demographicsData.ethnicity.length} ethnic group
									{demographicsData.ethnicity.length === 1 ? "" : "s"}{" "}
									identified
								</span>
							</div>
						</div>
					</div>

					<h2 className="text-2xl font-semibold mb-4 pb-1 uppercase">
						Worker Feedback Dashboard
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 md:gap-6 sm:gap-4">
						{/* First Chart - KPI Categories */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4
									className={styles.chartFooterText + " font-semibold text-lg"}
								>
									Cases by Category
								</h4>
								<OpenClosedBadge />
							</div>
							<div className="grow">
								<ReactApexChart
									height={400}
									options={{
										chart: {
											type: "bar",
											stacked: true,
											toolbar: { show: false },
										},
										plotOptions: {
											bar: {
												horizontal: false,
												borderRadius: 6,
												columnWidth: "70%",
												distributed: false,
											},
										},
										xaxis: {
											categories: kpiCategoryData.map((item) => item.category),
											labels: {
												style: {
													fontFamily: "DM Sans",
													colors: ["#718096"],
													fontSize: "11px",
												},
												rotate: -45,
												formatter: (value) => {
													const str = String(value);
													const maxLen = 18;
													return str.length > maxLen
														? str.slice(0, maxLen) + "…"
														: str;
												},
											},
										},
										yaxis: {
											labels: {
												style: {
													fontFamily: "DM Sans",
													colors: ["#718096"],
												},
											},
										},
										legend: {
											show: true,
											position: "bottom",
											fontFamily: "DM Sans",
										},
										colors: [statusColorPalette[5], statusColorPalette[0]],
										tooltip: {
											shared: true,
											intersect: false,
											custom: ({ dataPointIndex, w }) => {
												const open =
													w.globals.initialSeries[0].data[dataPointIndex];
												const closed =
													w.globals.initialSeries[1].data[dataPointIndex];
												const category = w.globals.labels[dataPointIndex];
												return (
													`<div style='padding:8px;'>` +
													`<div style='font-weight:600;'>${category}</div>` +
													`<div style='color:${statusColorPalette[0]};'>Open Cases: <b>${open}</b></div>` +
													`<div style='color:${statusColorPalette[1]};'>Closed Cases: <b>${closed}</b></div>` +
													`</div>`
												);
											},
										},
									}}
									series={[
										{
											name: "Open Cases",
											data: kpiCategoryData.map((item) => item.Open),
										},
										{
											name: "Closed Cases",
											data: kpiCategoryData.map((item) => item.Closed),
										},
									]}
									type="bar"
								/>
							</div>
							<div className={styles.chartFooter}>
								<span className={styles.chartFooterText}>
									Total cases:{" "}
									{kpiCategoryData
										.reduce((sum, item) => sum + item.Open + item.Closed, 0)
										.toLocaleString()}
								</span>
							</div>
						</div>
						{/* Spline Area Chart */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4
									className={styles.chartFooterText + " font-semibold text-lg"}
								>
									Time to Case Closure
								</h4>
								<span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-full font-medium">
									Case Timeline
								</span>
							</div>
							<div style={{ width: "100%", height: 300 }}>
								<TimeToCaseClosureChart
									avgClosureTime={statsData.avgClosureTime}
									color={pieColors[0]}
									data={timeToClosureData}
									gradientColor={pieColors[1]}
								/>
							</div>
						</div>
						{/* Third Bar Chart */}
						<div className={`${styles.chartCard} hover:shadow-lg`}>
							<div className="mb-3 flex justify-between items-center">
								<h4
									className={styles.chartFooterText + " font-semibold text-lg"}
								>
									Remediation Quality
								</h4>
								<span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded-full font-medium">
									By Severity
								</span>
							</div>
							<div style={{ width: "100%", height: 300 }}>
								<ReactApexChart
									height={280}
									options={{
										chart: {
											type: "bar",
											stacked: false,
											toolbar: { show: false },
										},
										plotOptions: {
											bar: {
												horizontal: false,
												borderRadius: 4,
												columnWidth: "60%",
												distributed: true,
											},
										},
										xaxis: {
											categories: [
												"Poor",
												"Fair",
												"Good",
												"Very Good",
												"Excellent",
											],
											labels: {
												style: {
													fontFamily: "DM Sans",
													colors: ["#718096"],
													fontSize: "12px",
												},
											},
											title: {
												text: "Remediation Quality",
												style: {
													fontFamily: "DM Sans",
													fontWeight: 500,
												},
											},
										},
										yaxis: {
											labels: {
												style: {
													fontFamily: "DM Sans",
													colors: ["#718096"],
												},
											},
											title: {
												text: "Responses",
												style: {
													fontFamily: "DM Sans",
													fontWeight: 500,
												},
											},
										},
										legend: {
											show: false,
										},
										colors: [
											statusColorPalette[3],
											statusColorPalette[4],
											statusColorPalette[2],
											statusColorPalette[1],
											statusColorPalette[0],
										],
										tooltip: {
											y: {
												formatter: (value, { seriesIndex, w }) => {
													const name = w.globals.labels[seriesIndex];
													return `${name}: ${value}`;
												},
											},
										},
									}}
									series={[
										{
											name: "Responses",
											data: [
												barChartData[0].Poor,
												barChartData[0].Fair,
												barChartData[0].Good,
												barChartData[0].VeryGood,
												barChartData[0].Excellent,
											],
										},
									]}
									type="bar"
								/>
							</div>
							<div className={styles.chartFooter}>
								<span className={styles.chartFooterText}>
									Based on {statsData.totalResponses.toLocaleString()} worker
									responses
								</span>
							</div>
						</div>
					</div>

					{/* Supplier KPI Timeline Chart */}
					<Box mt="8">
						<h2 className="heading-display mb-4 pb-1 uppercase">
							Timeline of Worker-Reported Issues
						</h2>
						<div className={styles.chartCard}>
							<SupplierKPITimelineChart
								compact={isSupplier}
								filters={supplierTimelineFilters}
								statusFilterMode={isSupplier ? "all-only" : "default"}
							/>
						</div>
					</Box>

					{/* Timeliness Remediation Chart */}
					<Box mt="8">
						<h2 className="text-2xl font-semibold mb-4 pb-1 uppercase">
							Timeliness & Quality of Remediation
						</h2>
						<div
							className={styles.chartCard}
							// style={{ zIndex: 0 }}
						>
							<TimelinessRemediationChart
								data={timeLinessData}
								onCategoryChange={(value) =>
									console.log("Category changed:", value)
								}
								onDateRangeChange={(value) =>
									console.log("Date range changed:", value)
								}
							/>
						</div>
					</Box>

					<Box mt="8">
						<h2 className="text-2xl font-semibold mb-4 pb-1 uppercase">
							Worker Voice Overview
						</h2>
						<div className="chartCard">
							<WorkerVoiceOverview
								filters={{ supplierId: supplierIds as number[] }}
								useSupplierTerminology={isSupplier}
							/>
						</div>
					</Box>
				</div>
			</div>
		</GuestLayout>
	);
}
