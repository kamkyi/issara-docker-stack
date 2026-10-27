import { BarChartIcon } from "@radix-ui/react-icons";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useMemo } from "react";
import Chart from "react-apexcharts";
import { statusColorPalette } from "$src/assets/mock/common-data";
import { useDetailedKpiUpdates } from "$src/hooks/useSocialResponsibility";

interface RemediationData {
	quality: string;
	count: number;
	color: string;
}

const WAGES_KPI_IDS = [5, 8, 9];

const itemVariants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6 },
	},
};

const qualityLabels: Record<string, string> = {
	poor: "Poor",
	fair: "Fair",
	good: "Good",
	excellent: "Excellent",
};

const qualityColors: Record<string, string> = {
	poor: statusColorPalette[6],
	fair: statusColorPalette[4],
	good: statusColorPalette[3],
	excellent: statusColorPalette[1],
};

const QUALITY_ORDER = ["poor", "fair", "good", "excellent"];

export const WagesOurImpactSection = ({
	categoryIds = WAGES_KPI_IDS,
	rightContent,
	title,
	subtext,
}: {
	categoryIds?: number[];
	rightContent?: React.ReactNode;
	title?: React.ReactNode;
	subtext?: React.ReactNode;
}) => {
	const { data, isLoading, error } = useDetailedKpiUpdates();

	// Aggregate closed_quality counts for closed cases filtered by categoryIds
	const remediationData = useMemo<RemediationData[]>(() => {
		const updates = data?.data ?? [];
		const laborClosed = updates.filter(
			(item) =>
				item.status_id === 3 && categoryIds.includes(item.kpi_category_id),
		);

		// Sum affected workers per remediation quality instead of counting responses
		const counts: Record<string, number> = {
			poor: 0,
			fair: 0,
			good: 0,
			excellent: 0,
		};

		for (const item of laborClosed) {
			const key = item.closed_quality?.toLowerCase().replace(" ", "_") ?? "";
			const affected = Number(item.affected_workers || 0);
			if (key in counts) {
				counts[key] += affected;
			}
		}

		return QUALITY_ORDER.map((key) => ({
			quality: qualityLabels[key] ?? key,
			count: counts[key] ?? 0,
			color: qualityColors[key] ?? "#6B7280",
		}));
	}, [data, categoryIds]);

	// ApexCharts configuration
	const chartOptions = {
		chart: {
			id: "wages-remediation-quality",
			toolbar: {
				show: false,
			},
			background: "transparent",
		},
		xaxis: {
			categories: remediationData.map((item) => item.quality),
			labels: {
				style: {
					colors: "#6b7280",
					fontWeight: 500,
					fontSize: "12px",
				},
			},
			axisBorder: {
				show: false,
			},
			axisTicks: {
				show: false,
			},
		},
		yaxis: {
			show: true,
			labels: {
				style: {
					colors: "#6b7280",
					fontWeight: 500,
				},
			},
			min: 0,
			title: {
				text: "Affected Workers",
				style: {
					color: "#6b7280",
					fontWeight: 500,
				},
			},
		},
		grid: {
			show: true,
			borderColor: "#f3f4f6",
			strokeDashArray: 3,
			yaxis: {
				lines: {
					show: true,
				},
			},
			xaxis: {
				lines: {
					show: false,
				},
			},
		},
		plotOptions: {
			bar: {
				borderRadius: 3,
				borderRadiusApplication: "end",
				columnWidth: "60%",
				dataLabels: {
					position: "top",
				},
				distributed: true,
			},
		},
		dataLabels: {
			enabled: true,
			offsetY: -20,
			style: {
				fontSize: "14px",
				fontWeight: "bold",
				colors: ["#374151"] as string[],
			},
		},
		colors: remediationData.map((item) => item.color),
		legend: {
			show: false,
		},
		tooltip: {
			y: {
				formatter: (val: number) => val + " workers affected",
			},
		},
		fill: {
			colors: remediationData.map((item) => item.color),
		},
		stroke: {
			show: false,
		},
	} as const;

	const chartSeries = [
		{
			name: "Affected Workers",
			data: remediationData.map((item) => item.count),
		},
	];

	if (isLoading) {
		return (
			<div className="py-10 px-4 border-b border-gray-100">
				<Container size="4">
					<div className="flex items-center justify-center min-h-[500px]">
						<div className="text-center">
							<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#148696]"></div>
							<p className="mt-4 text-gray-600">Loading impact data...</p>
						</div>
					</div>
				</Container>
			</div>
		);
	}

	if (error) {
		return (
			<div className="py-10 px-4 border-b border-gray-100">
				<Container size="4">
					<div className="text-center text-red-600 min-h-[500px] flex items-center justify-center">
						<div>
							<p className="text-lg font-semibold">Failed to load data</p>
							<p className="text-sm mt-2">Please try again later</p>
						</div>
					</div>
				</Container>
			</div>
		);
	}

	return (
		<div className="py-10 px-4 border-b border-gray-100">
			<Container size="4">
				<motion.div
					initial="hidden"
					variants={{
						hidden: { opacity: 0 },
						visible: {
							opacity: 1,
							transition: { staggerChildren: 0.2 },
						},
					}}
					viewport={{ once: true }}
					whileInView="visible"
				>
					{/* Section Header */}
					<motion.div className="text-center mb-16" variants={itemVariants}>
						<Heading
							className="text-4xl md:text-5xl lg:text-6xl font-bold"
							mb={"8"}
							size="9"
						>
							{title ?? (
								<>
									Our <span className="text-[#148696]">Impact</span>
								</>
							)}
						</Heading>
						<Text
							className="text-lg md:text-xl max-w-5xl mx-auto leading-relaxed"
							size="4"
						>
							{subtext ?? (
								<>
									Workers deserve to be paid fairly and on time for their work.
									Our worker voice-driven system detects and remediates wage
									violations—from payment delays to below-minimum wages—and
									tracks how businesses respond to ensure that workers receive
									their rightful compensation.
								</>
							)}
						</Text>
					</motion.div>

					{/* Impact Content Grid — chart takes 2/3, testimonial takes 1/3 */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-stretch">
						{/* Chart Section — spans 2 columns */}
						<motion.div
							className="lg:col-span-2 bg-white rounded-md p-8 shadow-sm hover:shadow-lg h-full flex flex-col"
							variants={itemVariants}
						>
							<div className="mb-8">
								<Flex align="center" className="mb-4" gap="3">
									<BarChartIcon className="w-6 h-6 text-[#148696]" />
									<Heading className="text-lg font-bold text-gray-900" size="6">
										Remediation Quality
									</Heading>
								</Flex>
								<Text className="text-base text-[#148696] font-medium" size="3">
									By Severity
								</Text>
							</div>

							{/* ApexCharts Bar Chart */}
							<div className="bg-white rounded-md p-6 h-80">
								<Chart
									height={280}
									options={chartOptions}
									series={chartSeries}
									type="bar"
									width="100%"
								/>
							</div>
						</motion.div>

						{/* Testimonial Section — spans 1 column, no card bg */}
						<motion.div
							className="lg:col-span-1 flex flex-col justify-center px-2 h-full"
							variants={itemVariants}
						>
							{rightContent ? (
								rightContent
							) : (
								<>
									<Text
										className="text-gray-700 mb-8 italic"
										size="4"
										style={{
											lineHeight: "var(--line-height-7)",
											fontSize: "var(--font-size-5)",
										}}
									>
										"Before I met Issara, I didn't know to whom I should raise
										the issues. Now, after learning about Issara, I feel
										confident discussing any issues I have. Thank you for the
										opportunity to attend worker trainings. I gained knowledge
										about basic labor rights and employer-employee
										communications.{" "}
										<strong>
											I have also shared it with as many other workers as I can.
										</strong>
										"
									</Text>

									<div>
										<Text
											className="font-semibold text-[#148696] text-lg block"
											size="4"
										>
											- Burmese seafood worker in Thailand
										</Text>
										{/* <p className="text-gray-600">from Myanmar (in Thailand)</p> */}
									</div>
								</>
							)}
						</motion.div>
					</div>
				</motion.div>
			</Container>
		</div>
	);
};
