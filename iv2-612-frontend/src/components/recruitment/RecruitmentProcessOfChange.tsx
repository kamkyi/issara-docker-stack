import { Container, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useDetailedKpiUpdates } from "$src/hooks/useSocialResponsibility";

const RECRUITMENT_KPI_ID = 1;

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.15 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6 },
	},
};

export const RecruitmentProcessOfChange = () => {
	const { data, isLoading, error } = useDetailedKpiUpdates();

	const processedData = useMemo(() => {
		const updates = data?.data ?? [];
		const closedUpdates = updates.filter(
			(item) =>
				item.status_id === 3 && item.kpi_category_id === RECRUITMENT_KPI_ID,
		);

		if (closedUpdates.length === 0) {
			return { distributionData: [] };
		}

		const distribution = {
			"<1 day": { count: 0, totalLevel: 0 },
			"1-7 days": { count: 0, totalLevel: 0 },
			"8-30 days": { count: 0, totalLevel: 0 },
			"31-90 days": { count: 0, totalLevel: 0 },
			">90 days": { count: 0, totalLevel: 0 },
		};

		for (const u of closedUpdates) {
			const days = Number.parseFloat(u.days_to_close) || 0;
			const level = Number.parseFloat(u.level) || 1;
			let bucket: keyof typeof distribution;
			if (days < 1) bucket = "<1 day";
			else if (days <= 7) bucket = "1-7 days";
			else if (days <= 30) bucket = "8-30 days";
			else if (days <= 90) bucket = "31-90 days";
			else bucket = ">90 days";
			distribution[bucket].count += 1;
			distribution[bucket].totalLevel += level;
		}

		return {
			distributionData: (
				Object.entries(distribution) as [
					keyof typeof distribution,
					{ count: number; totalLevel: number },
				][]
			).map(([name, { count, totalLevel }]) => ({
				name,
				value: count,
				avgSeverity: count > 0 ? totalLevel / count : 0,
			})),
		};
	}, [data]);

	if (isLoading) {
		return (
			<section className="w-full py-16 md:py-24 bg-white">
				<Container size="4">
					<Skeleton className="h-10 w-1/3 mb-8" />
					<Skeleton className="h-20 w-full mb-12" />
					<Skeleton className="h-[400px] w-full rounded-2xl" />
				</Container>
			</section>
		);
	}

	if (error || !data?.data) {
		return (
			<section className="w-full py-16 md:py-24 bg-white">
				<Container size="4">
					<Flex
						align="center"
						className="min-h-[400px]"
						direction="column"
						justify="center"
					>
						<Text color="red" size="5" weight="bold">
							Failed to load closure timeline data
						</Text>
						<Text color="gray" size="2">
							Please check your connection or try again later.
						</Text>
					</Flex>
				</Container>
			</section>
		);
	}

	const { distributionData } = processedData;

	const distributionOption = {
		textStyle: { fontFamily: "DM Sans" },
		tooltip: {
			trigger: "axis",
			backgroundColor: "rgba(255, 255, 255, 0.98)",
			textStyle: { color: "#374151" },
			borderColor: "#e5e7eb",
			borderWidth: 1,
			extraCssText:
				"box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;",
			formatter: (
				params: { seriesName: string; name: string; value: number }[],
			) => {
				const casesParam = params.find((p) => p.seriesName === "Closed Cases");
				const severityParam = params.find(
					(p) => p.seriesName === "Avg. Severity",
				);
				if (!casesParam || !severityParam) return "";
				return `
					<div style="padding: 4px;">
						<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${casesParam.name}</div>
						<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 4px;">
							<div style="display: flex; align-items: center; gap: 8px;">
								<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #148696;"></span>
								<span style="color: #666;">Closed Cases:</span>
							</div>
							<span style="font-weight: bold; color: #148696;">${casesParam.value}</span>
						</div>
						<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
							<div style="display: flex; align-items: center; gap: 8px;">
								<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #f59e0b;"></span>
								<span style="color: #666;">Avg. Severity:</span>
							</div>
							<span style="font-weight: bold; color: #f59e0b;">${severityParam.value.toFixed(2)} / 4</span>
						</div>
					</div>
				`;
			},
		},
		legend: {
			data: ["Closed Cases", "Avg. Severity"],
			bottom: 0,
			textStyle: { color: "#4b5563" },
		},
		grid: {
			left: "3%",
			right: "8%",
			bottom: "15%",
			top: "15%",
			containLabel: true,
		},
		xAxis: {
			type: "category",
			boundaryGap: false,
			data: distributionData.map((d) => d.name),
			axisLine: { lineStyle: { color: "#e5e7eb" } },
			axisLabel: { color: "#6b7280", margin: 15 },
			name: "Closure Time Range",
			nameLocation: "middle",
			nameGap: 40,
			nameTextStyle: { color: "#4b5563", fontWeight: 600 },
		},
		yAxis: [
			{
				type: "value",
				name: "Closed Cases",
				nameTextStyle: {
					color: "#148696",
					fontWeight: 600,
					padding: [0, 0, 10, 0],
				},
				axisLabel: { color: "#6b7280" },
				splitLine: { lineStyle: { type: "dashed", color: "#f3f4f6" } },
			},
			{
				type: "value",
				name: "Severity",
				min: 1,
				max: 4,
				interval: 1,
				nameTextStyle: {
					color: "#f59e0b",
					fontWeight: 600,
					padding: [0, 0, 10, 0],
				},
				axisLabel: { color: "#6b7280" },
				splitLine: { show: false },
			},
		],
		series: [
			{
				name: "Closed Cases",
				type: "line",
				smooth: true,
				data: distributionData.map((d) => d.value),
				symbol: "circle",
				symbolSize: 8,
				itemStyle: { color: "#148696" },
				lineStyle: { width: 4 },
				areaStyle: {
					color: {
						type: "linear",
						x: 0,
						y: 0,
						x2: 0,
						y2: 1,
						colorStops: [
							{ offset: 0, color: "rgba(20, 134, 150, 0.3)" },
							{ offset: 1, color: "rgba(20, 134, 150, 0.05)" },
						],
					},
				},
				label: {
					show: true,
					position: "top",
					distance: 10,
					backgroundColor: "#148696",
					color: "#fff",
					padding: [4, 8],
					borderRadius: 4,
					fontWeight: "bold",
					fontSize: 12,
					formatter: "{c}",
				},
			},
			{
				name: "Avg. Severity",
				type: "line",
				yAxisIndex: 1,
				smooth: true,
				data: distributionData.map((d) => d.avgSeverity),
				symbol: "diamond",
				symbolSize: 10,
				itemStyle: { color: "#f59e0b" },
				lineStyle: { width: 3, type: "dashed" },
				label: {
					show: true,
					position: "bottom",
					color: "#f59e0b",
					fontWeight: "bold",
					formatter: (params: { value: number }) => params.value.toFixed(1),
				},
			},
		],
	};

	return (
		<section className="w-full py-16 md:py-24 bg-white overflow-hidden">
			<Container size="4">
				<motion.div
					className="flex flex-col gap-16 lg:gap-20"
					initial="hidden"
					variants={containerVariants}
					viewport={{ once: true }}
					whileInView="visible"
				>
					{/* Global Section Header */}
					<motion.div className="text-center" variants={itemVariants}>
						<Heading
							className="text-4xl md:text-5xl lg:text-6xl font-bold"
							mb={"8"}
							size="9"
						>
							Process of <span className="text-[#148696]">Change</span>
						</Heading>
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
						{/* Left Column: Text Content */}
						<motion.div className="flex flex-col gap-8" variants={itemVariants}>
							<p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
								By analyzing the frequency distribution of our recruitment case
								closure times, we can immediately identify how well we are
								meeting our efficiency targets.
							</p>
							<p className="text-lg md:text-xl text-gray-700 leading-relaxed">
								The goal is{" "}
								<span className="font-bold text-black">
									to see the majority of cases resolved in the earliest time
									ranges
								</span>
								, indicating a reliable and swift remediation process.
							</p>
						</motion.div>

						{/* Right Column: Chart */}
						<motion.div className="relative bg-white" variants={itemVariants}>
							<div className="h-[400px] w-full">
								<ReactECharts
									option={distributionOption}
									style={{ height: "100%", width: "100%" }}
								/>
							</div>
						</motion.div>
					</div>
				</motion.div>
			</Container>
		</section>
	);
};
