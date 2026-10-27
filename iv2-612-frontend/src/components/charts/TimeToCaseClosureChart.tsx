import ReactApexChart from "react-apexcharts";

interface ClosureBucket {
	name: string;
	value: number;
}

interface TimeToCaseClosureChartProps {
	data: ClosureBucket[];
	avgClosureTime: number;
	/** Primary fill colour — defaults to brand teal */
	color?: string;
	/** Gradient end colour — defaults to brand green */
	gradientColor?: string;
	height?: number;
}

export default function TimeToCaseClosureChart({
	data,
	avgClosureTime,
	color = "#148696",
	gradientColor = "#4ede8f",
	height = 260,
}: TimeToCaseClosureChartProps) {
	return (
		<>
			<ReactApexChart
				height={height}
				options={{
					chart: {
						type: "area",
						toolbar: { show: false },
						zoom: { enabled: false },
					},
					stroke: {
						curve: "smooth",
						width: 3,
					},
					xaxis: {
						categories: data.map((d) => d.name),
						labels: {
							style: {
								fontFamily: "DM Sans",
								colors: ["#718096"],
								fontSize: "12px",
							},
						},
						title: {
							text: "Closure Time Range",
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
							text: "Closed Cases",
							style: {
								fontFamily: "DM Sans",
								fontWeight: 500,
							},
						},
					},
					legend: {
						show: false,
					},
					colors: [color],
					fill: {
						type: "gradient",
						gradient: {
							shade: "light",
							type: "vertical",
							shadeIntensity: 0.5,
							gradientToColors: [gradientColor],
							inverseColors: false,
							opacityFrom: 0.7,
							opacityTo: 0.2,
							stops: [0, 100],
						},
					},
					tooltip: {
						y: {
							formatter: (value) => `${value} closed cases`,
						},
					},
				}}
				series={[
					{
						name: "Closed Cases",
						data: data.map((d) => d.value),
					},
				]}
				type="area"
			/>
			<p className="text-xs text-gray-500 mt-1">
				Average time to closure:{" "}
				<span className="font-medium text-gray-700">
					{avgClosureTime.toFixed(1)} days
				</span>
			</p>
		</>
	);
}
