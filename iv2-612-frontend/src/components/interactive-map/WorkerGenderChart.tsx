import { Text } from "@radix-ui/themes";
import type { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";

type WorkerGenderChartProps = {
	menWorkers: number;
	womenWorkers: number;
};

export default function WorkerGenderChart({
	menWorkers,
	womenWorkers,
}: WorkerGenderChartProps) {
	const chartData = useMemo(() => {
		const series = [
			{
				name: "Workers",
				data: [menWorkers, womenWorkers],
			},
		];

		const options: ApexOptions = {
			chart: {
				type: "bar",
				height: 300,
				toolbar: {
					show: false,
				},
			},
			plotOptions: {
				bar: {
					horizontal: false,
					columnWidth: "55%",
					borderRadius: 0,
					distributed: true,
					dataLabels: {
						position: "top",
					},
				},
			},
			legend: {
				show: false,
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => val.toLocaleString(),
				offsetY: -20,
				style: {
					fontSize: "12px",
					colors: ["#304758"],
				},
			},
			xaxis: {
				categories: ["Men", "Women"],
				labels: {
					style: {
						fontSize: "14px",
						fontWeight: 600,
					},
				},
			},
			yaxis: {
				labels: {
					formatter: (val: number) => val.toLocaleString(),
				},
			},
			colors: ["#32b2c3", "#f472b6"],
			title: {
				text: "Workers by Gender",
				align: "center",
				style: {
					fontSize: "16px",
					fontWeight: "bold",
					color: "#475569",
				},
			},
			grid: {
				borderColor: "#f1f5f9",
			},
		};

		return { series, options };
	}, [menWorkers, womenWorkers]);

	const totalWorkers = menWorkers + womenWorkers;

	if (totalWorkers === 0) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "300px",
					color: "#94a3b8",
				}}
			>
				<Text size="3">No gender data available</Text>
			</div>
		);
	}

	return (
		<>
			<ReactApexChart
				height={300}
				options={chartData.options}
				series={chartData.series}
				type="bar"
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
					marginTop: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						padding: "0.75rem",
						background: "white",
						borderRadius: "6px",
						border: "1px solid #e2e8f0",
					}}
				>
					<Text size="2" weight="bold">
						Total Workers:
					</Text>
					<Text size="2" weight="medium">
						{totalWorkers ? totalWorkers.toLocaleString() : "N/A"}
					</Text>
				</div>
				{totalWorkers > 0 && (
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							padding: "0.75rem",
							background: "white",
							borderRadius: "6px",
							border: "1px solid #e2e8f0",
						}}
					>
						<Text size="2" weight="bold">
							Men:
						</Text>
						<Text size="2" weight="medium">
							{menWorkers ? menWorkers.toLocaleString() : "N/A"}
						</Text>
					</div>
				)}
				{totalWorkers > 0 && (
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							padding: "0.75rem",
							background: "white",
							borderRadius: "6px",
							border: "1px solid #e2e8f0",
						}}
					>
						<Text size="2" weight="bold">
							Women:
						</Text>
						<Text size="2" weight="medium">
							{womenWorkers ? womenWorkers.toLocaleString() : "N/A"}
						</Text>
					</div>
				)}
			</div>
		</>
	);
}
