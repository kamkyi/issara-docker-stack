import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import type { ApexOptions } from "apexcharts";
import moment from "moment";
import { useTheme } from "next-themes";
import ReactApexChart from "react-apexcharts";

interface GridCardProps {
	slides: {
		category: string;
		q1: number;
		q2: number;
		history?: { date: string; value: number | null }[];
	}[];
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({
	data,
	color,
}) => {
	const chartOptions: ApexOptions = {
		chart: {
			type: "area",
			sparkline: {
				enabled: true,
			},
			animations: {
				enabled: true,
				speed: 500,
			},
		},

		stroke: {
			curve: "smooth",
			width: 2,
		},
		fill: {
			type: "gradient",
			gradient: {
				shadeIntensity: 1,
				opacityFrom: 0.2,
				opacityTo: 0,
				stops: [0, 100],
			},
		},
		colors: [color],
		tooltip: {
			enabled: false,
		},
	};

	return (
		<div className="w-[90%] h-16">
			<ReactApexChart
				height={64}
				options={chartOptions}
				series={[{ data }]}
				type="area"
				width="100%"
			/>
		</div>
	);
};

const GridCard: React.FC<GridCardProps> = ({ slides }) => {
	const { theme } = useTheme();

	return (
		<div className="my-4">
			<div className="mb-4 px-1">
				<p className="text-sm text-gray-400 italic">
					Showing data as of <strong>{moment().format("MMMM D, YYYY")}</strong>.
					Benchmark comparison is set to the last 6 months.
				</p>
			</div>

			{/* Grid Layout */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
				{slides.map((slide, index) => {
					const isCascadeIndex = slide.category === "Cascade Index";
					const statusColor =
						slide.q1 > slide.q2
							? "red"
							: slide.q1 < slide.q2
								? "green"
								: "gray";
					const trendValue = (slide.q2 - slide.q1).toFixed(2);
					const historyValues = (slide.history || [])
						.map((h) => h.value)
						.filter((v): v is number => v !== null);

					return (
						<div
							className={`w-full transition-all rounded-md duration-300 hover:shadow-lg ${
								isCascadeIndex ? "md:col-span-2" : ""
							}`}
							key={index}
						>
							<div
								className={`w-full h-full p-6 flex shadow-sm rounded-lg px-4 ${
									isCascadeIndex
										? "flex-col md:flex-row md:items-center gap-6"
										: "flex-col justify-between gap-5"
								}`}
								style={{
									background: theme === "dark" ? "#002a38" : "white",
								}}
							>
								<div
									className={`${
										isCascadeIndex
											? "flex-1 flex flex-col gap-3"
											: "flex flex-col gap-5 w-full text-center"
									}`}
								>
									<h3 className="font-bold text-lg">{slide.category}</h3>
									{!isCascadeIndex && <hr className="opacity-10" />}

									<div
										className={`${
											isCascadeIndex
												? "text-5xl md:text-6xl my-2 font-black"
												: "flex items-center justify-center text-6xl font-black"
										}`}
										style={{ color: statusColor }}
									>
										{isCascadeIndex ? slide.q2.toFixed(1) : slide.q2}
									</div>

									<div
										className={`${
											isCascadeIndex ? "flex" : "flex justify-center"
										}`}
									>
										{slide.q2 > slide.q1 ? (
											<span className="text-sm font-bold text-green-600 p-1 px-3 rounded-full bg-green-100 flex items-center gap-1">
												<TrendingUpIcon fontSize="small" /> +{trendValue} %
											</span>
										) : slide.q2 < slide.q1 ? (
											<span className="text-sm font-bold text-red-600 p-1 px-3 rounded-full bg-red-100 flex items-center gap-1">
												<TrendingDownIcon fontSize="small" /> {trendValue} %
											</span>
										) : (
											<span className="text-sm font-bold text-white p-1 px-3 rounded-full bg-gray-400 flex items-center gap-1">
												<TrendingFlatIcon fontSize="small" /> No Change
											</span>
										)}
									</div>
								</div>

								{isCascadeIndex && historyValues.length > 0 && (
									<div>
										<p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">
											Last 6 Months Trend
										</p>
										<Sparkline color={statusColor} data={historyValues} />
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default GridCard;
