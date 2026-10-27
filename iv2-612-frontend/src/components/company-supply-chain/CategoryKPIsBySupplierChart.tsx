import { Box, Card, CardContent, CardHeader } from "@mui/material";
import type React from "react";
import { useMemo } from "react";
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
import { statusColorPalette } from "$src/assets/mock/common-data";
import type { SupplierKPI } from "$src/hooks/useSupplyChain";

interface CategoryKPIsBySupplierChartProps {
	header: React.ReactNode;
	kpis: SupplierKPI[];
}

const CategoryKPIsBySupplierChart: React.FC<
	CategoryKPIsBySupplierChartProps
> = ({ header, kpis = [] }) => {
	const chartData = useMemo(() => {
		if (!kpis || kpis.length === 0) return [];

		// Get unique KPI descriptions and suppliers
		const kpiDescriptions = [...new Set(kpis.map((kpi) => kpi.description))];
		const suppliers = [...new Set(kpis.map((kpi) => kpi.supplier_name))];

		// Create data structure for horizontal stacked bar chart
		return kpiDescriptions
			.map((description) => {
				const dataPoint: any = {
					description:
						description.length > 50
							? `${description.substring(0, 50)}...`
							: description,
					fullDescription: description,
				};

				// Initialize all suppliers with 0, then count actual KPIs
				suppliers.forEach((supplier) => {
					const count = kpis.filter(
						(kpi) =>
							kpi.description === description && kpi.supplier_name === supplier,
					).length;

					// Always set the value, even if 0, for proper stacking
					dataPoint[supplier] = count;
				});

				return dataPoint;
			})
			.filter((item) => {
				// Only include items that have at least one KPI
				return suppliers.some((supplier) => item[supplier] > 0);
			});
	}, [kpis]);

	const suppliers = useMemo(() => {
		return [...new Set(kpis.map((kpi) => kpi.supplier_name))];
	}, [kpis]);

	if (!kpis || kpis.length === 0) {
		return (
			<Card>
				<CardHeader title={header} />
				<CardContent>
					<Box sx={{ textAlign: "center", py: 4 }}>
						<p>No Issues Found</p>
					</Box>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader title={header} />
			<CardContent>
				<Box
					sx={{ width: "100%", height: Math.max(400, chartData.length * 60) }}
				>
					<ResponsiveContainer height="100%" width="100%">
						<BarChart
							data={chartData}
							layout="vertical"
							margin={{
								top: 20,
								right: 30,
								left: 0,
								bottom: 5,
							}}
						>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								allowDecimals={false}
								domain={[0, "dataMax"]}
								type="number"
							/>
							<YAxis
								dataKey="description"
								interval={0}
								tick={{ fontSize: 11 }}
								type="category"
								width={240}
							/>
							<Tooltip
								content={({ active, payload, label }) => {
									if (active && payload && payload.length) {
										// Filter out zero values
										const filtered = payload.filter(
											(entry) => (entry.value as number) > 0,
										);

										if (filtered.length === 0) return null;

										return (
											<div
												style={{
													background: "white",
													border: "1px solid #ccc",
													padding: "6px",
												}}
											>
												<strong>
													{chartData.find((d) => d.description === label)
														?.fullDescription || label}
												</strong>
												<ul
													style={{ margin: 0, padding: 0, listStyle: "none" }}
												>
													{filtered.map((entry, idx) => (
														<li key={idx} style={{ color: entry.color }}>
															{entry.name}: {entry.value} issues
														</li>
													))}
												</ul>
											</div>
										);
									}
									return null;
								}}
								formatter={(value, name) => [`${value} issues`, name]}
								labelFormatter={(label) => {
									const item = chartData.find((d) => d.description === label);
									return item?.fullDescription || label;
								}}
							/>
							<Legend />
							{suppliers.map((supplier, index) => (
								<Bar
									dataKey={supplier}
									fill={statusColorPalette[index]}
									key={supplier}
									name={supplier}
									stackId="a"
								/>
							))}
						</BarChart>
					</ResponsiveContainer>
				</Box>
			</CardContent>
		</Card>
	);
};

export default CategoryKPIsBySupplierChart;
