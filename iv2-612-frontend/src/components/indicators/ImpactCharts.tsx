import { Box } from "@radix-ui/themes";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface ImpactChartsProps {
	pieChart1Data: { name: string; value: number }[];
	pieChart2Data: { name: string; value: number }[];
	barChartData: { name: string; value: number }[];
}

const ImpactCharts = ({
	pieChart1Data,
	pieChart2Data,
	barChartData,
}: ImpactChartsProps) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
			{/* Pie Chart 1 - Full width on mobile, Column span 3 on medium screens and up */}
			<Box className="col-span-1 md:col-span-3 h-[250px] md:h-[200px]">
				<ResponsiveContainer height="100%" width="100%">
					<PieChart>
						<Pie
							cx="50%"
							cy="50%"
							data={pieChart1Data}
							dataKey="value"
							fill="#8884d8"
							label
							nameKey="name"
							outerRadius={60}
						/>
					</PieChart>
				</ResponsiveContainer>
			</Box>

			{/* Pie Chart 2 - Full width on mobile, Column span 3 on medium screens and up */}
			<Box className="col-span-1 md:col-span-3 h-[250px] md:h-[200px]">
				<ResponsiveContainer height="100%" width="100%">
					<PieChart>
						<Pie
							cx="50%"
							cy="50%"
							data={pieChart2Data}
							dataKey="value"
							fill="#82ca9d"
							label
							nameKey="name"
							outerRadius={60}
						/>
					</PieChart>
				</ResponsiveContainer>
			</Box>

			{/* Bar Charts (Stacked vertically) - Full width on mobile, Column span 6 on medium screens and up */}
			<Box className="col-span-1 md:col-span-6 space-y-4">
				{barChartData.map((data, idx) => (
					<div className="h-[60px]" key={idx}>
						<ResponsiveContainer height="100%" width="100%">
							<BarChart
								data={[data]}
								layout="vertical"
								margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis type="number" />
								<YAxis dataKey="name" type="category" />
								<Tooltip />
								<Bar dataKey="value" fill="#8884d8" />
							</BarChart>
						</ResponsiveContainer>
					</div>
				))}
			</Box>
		</div>
	);
};

export default ImpactCharts;
