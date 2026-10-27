import { Container, Heading, Text } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { useGdMetrics } from "$src/hooks/useGdMetrics";

export const GoldenDreamsSection = () => {
	const { data: metrics, isLoading } = useGdMetrics();

	const goldenDreamsStats = [
		{
			label: "Number of Employers Listed in Golden Dreams",
			value: metrics?.data?.totalEmployers?.toLocaleString() ?? "0",
		},
		{
			label: "Number of Recruiters Listed in Golden Dreams",
			value: metrics?.data?.totalRecruiters?.toLocaleString() ?? "0",
		},
		{
			label: "Number of Comments from Users",
			value: metrics?.data?.totalComments?.toLocaleString() ?? "0",
		},
		{
			label: "Number of Problems and Answers Shared",
			value: metrics?.data?.totalQuestionsAndAnswers?.toLocaleString() ?? "0",
		},
	];

	const chartOption = {
		tooltip: {
			trigger: "item",
		},
		legend: {
			orient: "vertical",
			left: "right",
			textStyle: {
				fontSize: 10,
			},
		},
		series: [
			{
				name: "Language Preference",
				type: "pie",
				radius: ["40%", "70%"],
				avoidLabelOverlap: false,
				label: {
					show: false,
					position: "center",
				},
				emphasis: {
					label: {
						show: true,
						fontSize: "14",
						fontWeight: "bold",
					},
				},
				labelLine: {
					show: false,
				},
				data:
					metrics?.data?.languages.map((l) => ({
						value: l.count,
						name: l.name,
					})) ?? [],
				color: [
					"#148696",
					"#4BC0C0",
					"#36A2EB",
					"#FFCE56",
					"#FF6384",
					"#9966FF",
					"#4BC0C0",
				],
			},
		],
	};

	return (
		<div className="bg-white px-4 pb-16">
			<Container size="4">
				<Heading mb={"4"} size="8">
					GOLDEN DREAMS
				</Heading>
				<Text>
					Our Golden Dreams platform empowers workers to share their experiences
					with employers and recruiters, fostering transparency and
					accountability in the labor market. By providing a space for workers
					to voice their stories, we aim to drive positive change and promote
					ethical practices across industries.
				</Text>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
					<div className="rounded-xl border border-[#d3ecef] bg-[#f7fcfd] p-5 md:p-6 flex flex-col justify-center">
						<Text className="block uppercase" mb={"4"} weight={"bold"}>
							Golden Dreams Users
						</Text>

						<Text align={"center"} className="block" size={"9"}>
							{isLoading
								? "..."
								: (metrics?.data?.totalUsers?.toLocaleString() ?? "0")}{" "}
							<span className="text-teal-600">+</span>
						</Text>
					</div>
					<div className="rounded-xl border border-[#d3ecef] bg-[#f7fcfd] p-5 md:p-6">
						<Text className="block uppercase" mb={"2"} weight={"bold"}>
							Golden Dreams Users by Language Preference
						</Text>
						<div style={{ height: "250px" }}>
							<ReactECharts
								option={chartOption}
								style={{ height: "100%", width: "100%" }}
							/>
						</div>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
					{goldenDreamsStats.map((item) => (
						<div
							className="rounded-xl border border-[#d3ecef] bg-[#f7fcfd] p-5 md:p-6"
							key={item.label}
						>
							<Text
								className="text-[#148696] text-3xl md:text-4xl font-black block"
								size="8"
							>
								{item.value}
							</Text>
							<Text
								className="text-gray-700 text-sm md:text-base leading-snug mt-2 block"
								size="3"
							>
								{item.label}
							</Text>
						</div>
					))}
				</div>
			</Container>
		</div>
	);
};

export default GoldenDreamsSection;
