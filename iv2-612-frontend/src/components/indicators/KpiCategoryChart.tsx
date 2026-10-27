import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import styles from "./KpiCategoryChart.module.css";

type KpiCategoryData = {
	category: string;
	Open: number;
	Closed: number;
};

type Props = {
	data: KpiCategoryData[];
	colors: string[];
};

export default function KpiCategoryChart({ data, colors }: Props) {
	return (
		<div className={styles.chartContainer}>
			<ResponsiveContainer height={420} width="100%">
				<BarChart
					className={styles.chart}
					data={data}
					margin={{ top: 10, right: 30, left: 20, bottom: 110 }}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="category"
						height={180}
						interval={0}
						tick={(props) => {
							const { x, y, payload } = props;
							const text = payload.value;
							let lines: string[] = [];

							// Create text segments for specific categories
							if (text.includes("Employer-employee")) {
								lines = ["Employer-", "employee", "communications"];
							} else if (text.includes("Payment systems")) {
								lines = ["Payment", "systems", "and", "transparency"];
							} else if (text.includes("Living and eating")) {
								lines = ["Living", "and eating", "conditions"];
							} else if (text === "Working conditions") {
								lines = ["Working", "conditions"];
							} else if (text === "Labor recruitment") {
								lines = ["Labor", "recruitment"];
							} else {
								// For any other categories, split by spaces
								lines = text.split(" ");
							}

							// Find index for staggering
							const index = data.findIndex((item) => item.category === text);
							const isEven = index % 2 === 0;

							// Calculate vertical position adjustment
							const yOffset = isEven ? 0 : 40;

							return (
								<g transform={`translate(${x},${y + yOffset})`}>
									{lines.map((line, i) => (
										<text
											className={isEven ? styles.evenLabel : styles.oddLabel}
											dy={10}
											fontSize={10}
											fontWeight="500"
											key={i}
											textAnchor="middle"
											x={0}
											y={i * 16}
										>
											{line}
										</text>
									))}
								</g>
							);
						}}
						tickLine={false}
						type="category"
					/>
					<YAxis
						tick={{ fontFamily: "DM Sans", fontSize: 11 }}
						tickFormatter={(value) => value.toLocaleString()}
						type="number"
					/>
					<Tooltip
						formatter={(value: number) => [value.toLocaleString(), "Cases"]}
						labelFormatter={(label) => `Category: ${label}`}
					/>
					<Legend
						wrapperStyle={{
							paddingTop: 20,
							fontFamily: "DM Sans",
						}}
					/>
					<Bar
						dataKey="Open"
						fill={colors[0] || "#148696"}
						name="Open Cases"
						stackId="a"
					/>
					<Bar
						dataKey="Closed"
						fill={colors[1] || "#4ede8f"}
						name="Closed Cases"
						stackId="a"
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
