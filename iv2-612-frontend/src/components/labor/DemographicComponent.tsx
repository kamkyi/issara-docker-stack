import { Container, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { statusColorPalette } from "$src/assets/mock/common-data";
import { useDemographics } from "$src/hooks/useSocialResponsibility";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";

const DemographicComponent: React.FC = () => {
	const { data, isLoading, error } = useDemographics();
	const demographicTexts = [
		...(data?.data.nationality ?? []).map((item) => item.name),
		...(data?.data.gender ?? []).map((item) => item.name),
		"Nationality",
		"Gender",
	];
	const { translations } = useTranslateBatch(demographicTexts);
	const translateValue = (value: string) => translations[value] ?? value;

	if (isLoading) {
		return (
			<div className="bg-gray-50 px-4 py-12 md:py-20">
				<Container size="4">
					<Flex direction="column" gap="6">
						<Skeleton className="h-12 w-1/3 mb-4" />
						<Skeleton className="h-6 w-2/3 mb-8" />
						<Skeleton className="h-[600px] w-full rounded-2xl" />
					</Flex>
				</Container>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="bg-gray-50 px-4 py-12 md:py-20">
				<Container size="4">
					<Flex
						align="center"
						className="min-h-[400px]"
						direction="column"
						justify="center"
					>
						<Text color="red" size="5" weight="bold">
							Failed to load demographic data
						</Text>
						<Text color="gray" size="2">
							Please try again later or check your connection.
						</Text>
					</Flex>
				</Container>
			</div>
		);
	}

	const nationalityData = data.data.nationality;
	const genderDataRaw = data.data.gender;

	// Define color palettes
	const nationalityColors = statusColorPalette;
	const genderColors: Record<string, string> = {
		Male: statusColorPalette[0],
		Female: statusColorPalette[4],
	};

	const formattedNationalityData = nationalityData
		.sort((a, b) => b.value - a.value)
		.map((item, idx) => ({
			...item,
			name: translateValue(item.name),
			itemStyle: {
				color: nationalityColors[idx % nationalityColors.length],
			},
		}));

	const formattedGenderData = genderDataRaw.map((item) => ({
		...item,
		name: translateValue(item.name),
		itemStyle: {
			color: genderColors[item.name] || "#718096",
		},
	}));

	const option = {
		textStyle: {
			fontFamily: "DM Sans",
		},
		tooltip: {
			trigger: "item",
			formatter: "{a} <br/>{b}: {c} ({d}%)",
			backgroundColor: "rgba(255, 255, 255, 0.9)",
			textStyle: {
				color: "#333",
				fontFamily: "DM Sans",
			},
			extraCssText: "box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px;",
		},
		legend: {
			orient: "vertical",
			left: "right",
			data: Array.from(
				new Set(formattedNationalityData.map((item) => item.name)),
			),
			top: "middle",
			textStyle: {
				fontFamily: "DM Sans",
			},
		},
		series: [
			{
				name: translateValue("Nationality"),
				type: "pie",
				selectedMode: "single",
				radius: ["45%", "65%"],

				label: {
					formatter: "{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{c}  {per|{d}%}  ",
					backgroundColor: "#F6F8FC",
					borderColor: "#8C8C8C",
					borderWidth: 1,
					borderRadius: 4,
					rich: {
						a: {
							color: "#6E7079",
							lineHeight: 22,
							align: "center",
							fontFamily: "DM Sans",
						},
						hr: {
							borderColor: "#8C8C8C",
							width: "100%",
							borderWidth: 1,
							height: 0,
						},
						b: {
							color: "#4C5058",
							fontSize: 12,
							fontWeight: "bold",
							lineHeight: 33,
							fontFamily: "DM Sans",
						},
						per: {
							color: "#fff",
							backgroundColor: "#4C5058",
							padding: [3, 4],
							borderRadius: 4,
							fontFamily: "DM Sans",
						},
					},
				},
				labelLine: {
					show: true,
					length: 30,
				},
				data: formattedNationalityData,
			},
			{
				name: translateValue("Gender"),
				type: "pie",
				radius: [0, "35%"],
				label: {
					show: false,
				},
				labelLine: {
					show: false,
				},
				data: formattedGenderData,
			},
		],
	};

	return (
		<div className="bg-gray-50 px-4 py-12 md:py-20">
			<Container size="4">
				<Flex direction="column" gap="6">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						whileInView={{ opacity: 1, y: 0 }}
					>
						<Heading className="text-black font-bold" mb="4" size="8">
							Workforce <span className="text-[#148696]">Demographics</span>
						</Heading>
						<Text className="text-gray-600 max-w-2xl leading-relaxed" size="3">
							A comprehensive breakdown of our workforce by nationality and
							gender, providing transparency into the diverse communities we
							serve and represent.
						</Text>
					</motion.div>

					<motion.div
						className="bg- p-6 rounded-2xl"
						initial={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						viewport={{ once: true }}
						whileInView={{ opacity: 1, scale: 1 }}
					>
						<ReactECharts
							option={option}
							style={{ height: "600px", width: "100%" }}
						/>
					</motion.div>
				</Flex>
			</Container>
		</div>
	);
};

export default DemographicComponent;
