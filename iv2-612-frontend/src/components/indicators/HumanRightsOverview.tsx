import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { Container } from "@radix-ui/themes";
import type React from "react";
import KPIicon from "$src/assets/img/icons/kpiIcon";
import { statusColorPalette } from "$src/assets/mock/common-data";
import { KPI_COLORS } from "$src/constants/categoryColors";

interface HumanRightsSlide {
	title: string;
	value: string;
	status: string;
	description: string;
	trend?: number;
}

interface HumanRightsOverviewProps {
	slides: HumanRightsSlide[];
}

const CircularGauge = ({ value, color }: { value: number; color: string }) => {
	const r = 50;
	const circumference = 2 * Math.PI * r;
	const filled = (value / 100) * circumference;
	return (
		<svg height="150" viewBox="0 0 120 120" width="150">
			<circle
				cx="60"
				cy="60"
				fill="none"
				r={r}
				stroke="#e5e7eb"
				strokeLinecap="round"
				strokeWidth="10"
				transform="rotate(-90 60 60)"
			/>
			<circle
				cx="60"
				cy="60"
				fill="none"
				r={r}
				stroke={color}
				strokeDasharray={`${filled} ${circumference}`}
				strokeLinecap="round"
				strokeWidth="10"
				transform="rotate(-90 60 60)"
			/>
			<text
				dominantBaseline="middle"
				fill={color}
				fontFamily="sans-serif"
				fontSize="28"
				fontWeight="900"
				textAnchor="middle"
				x="60"
				y="60"
			>
				{value}
			</text>
		</svg>
	);
};

const CARD_CONFIGS: {
	bgColor: string;
	Icon: React.ReactNode;
	iconBackground: string;
	infoTitle: string;
	label: string;
}[] = [
	{
		bgColor: KPI_COLORS.labor,
		iconBackground: "#ffffff",
		Icon: (
			<KPIicon color="#000000" type="labor" width={28} />
		) as unknown as React.ReactNode,
		infoTitle:
			"The Labor Rights Score is a dynamic metric that evaluates how effectively businesses respond to worker-reported labor issues, considering both the timeliness and quality of their responses within a selected timeframe.",
		label: "Labor",
	},
	{
		bgColor: KPI_COLORS.recruitment,
		iconBackground: "#ffffff",
		Icon: (
			<KPIicon color="#000000" type="recruitment" width={28} />
		) as unknown as React.ReactNode,
		infoTitle:
			"The Recruitment Score evaluates the effectiveness and ethical standards of a company's hiring practices, considering factors such as fairness, transparency, and compliance with labor laws.",
		label: "Recruitment",
	},
	{
		bgColor: KPI_COLORS.wages,
		iconBackground: "#ffffff",
		Icon: (
			<KPIicon color="#000000" type="wages" width={28} />
		) as unknown as React.ReactNode,
		infoTitle:
			"The Wages Score evaluates the compliance and fairness of a company's compensation practices, considering factors such as minimum wage adherence, benefits, and overall employee satisfaction.",
		label: "Wage",
	},
];

const CASCADE_INDEX_INFO =
	"Overall Social Responsibility Score that combines scores from worker validation of recruitment, wages, and labor conditions. It provides a comprehensive view of overall responsiveness across the supply chain to real-time worker voice.";

export const InfoTooltip = ({
	content,
	buttonClassName,
}: {
	content: string;
	buttonClassName?: string;
}) => {
	return (
		<RadixTooltip.Provider delayDuration={200}>
			<RadixTooltip.Root>
				<RadixTooltip.Trigger asChild>
					<button
						aria-label={content}
						className={buttonClassName}
						type="button"
					>
						<InfoOutlinedIcon fontSize="small" />
					</button>
				</RadixTooltip.Trigger>
				<RadixTooltip.Portal>
					<RadixTooltip.Content
						className="bg-white text-gray-800 text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-100 max-w-[20rem] z-50"
						sideOffset={6}
					>
						{content}
						<RadixTooltip.Arrow className="fill-white drop-shadow-sm" />
					</RadixTooltip.Content>
				</RadixTooltip.Portal>
			</RadixTooltip.Root>
		</RadixTooltip.Provider>
	);
};

const HumanRightsOverview: React.FC<HumanRightsOverviewProps> = ({
	slides,
}) => {
	const [indexSlide, ...kpiSlides] = slides;
	const indexValue = Number(indexSlide?.value ?? 0);
	const indexTrend = indexSlide?.trend ?? 3;
	const indexPositive = indexTrend > 0;
	const indexNeutral = indexTrend === 0;

	return (
		<Container>
			<div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
				{/* CASCADE Index card */}
				{indexSlide && (
					<div className="relative flex flex-col items-center gap-4 p-6 rounded-4xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
						<InfoTooltip
							buttonClassName="absolute top-3 right-3 text-gray-400 hover:text-[#148696] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] rounded-full"
							content={CASCADE_INDEX_INFO}
						/>
						<h4 className="font-black text-base tracking-widest uppercase text-[#004A60] text-center leading-snug">
							{indexSlide.title}
						</h4>
						<CircularGauge color="#f97316" value={indexValue} />
						{indexNeutral ? (
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
								<TrendingFlatIcon fontSize="small" />
								0%
							</span>
						) : indexPositive ? (
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
								<TrendingUpIcon fontSize="small" />+{indexTrend}%
							</span>
						) : (
							<span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
								<TrendingDownIcon fontSize="small" />
								{indexTrend}%
							</span>
						)}
						<p className="text-sm text-gray-500 text-center mt-1">
							{indexSlide.description}
						</p>
					</div>
				)}

				{/* KPI cards — Labor, Recruitment, Wage */}
				{kpiSlides.map((slide, i) => {
					const config = CARD_CONFIGS[i];
					if (!config) return null;
					const trendValue = slide.trend ?? (i === 1 ? -2 : 3);
					const isPositive = trendValue > 0;
					const isNeutral = trendValue === 0;
					const cardColor = isNeutral
						? "#6b7280"
						: isPositive
							? statusColorPalette[0]
							: "#C54B8C";
					return (
						<div
							className="relative flex flex-col h-full p-4 rounded-4xl shadow-sm hover:shadow-lg transition-shadow duration-200"
							key={slide.title}
							style={{
								background: `linear-gradient(-45deg, ${cardColor}cc 0%, ${cardColor} 100%)`,
							}}
						>
							<InfoTooltip
								buttonClassName="absolute top-4 right-4 text-white/70 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
								content={config.infoTitle}
							/>

							{/* Card header */}
							<div className="flex gap-2 items-center mb-3">
								<div
									className="flex items-center rounded-full p-2"
									style={{ backgroundColor: config.iconBackground }}
								>
									{config.Icon}
								</div>
								<h4 className="font-bold text-sm tracking-widest uppercase leading-tight text-white">
									{slide.title}
								</h4>
							</div>

							{/* Bottom section pushed to end */}
							<div className="flex-1 flex flex-col justify-end gap-2 mb-2 ps-3">
								{isNeutral ? (
									<span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-white/80 border border-gray-200 px-3 py-1 rounded-full self-start">
										<TrendingFlatIcon fontSize="small" />
										0%
									</span>
								) : isPositive ? (
									<span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full self-start">
										<TrendingUpIcon fontSize="small" />+{trendValue}%
									</span>
								) : (
									<span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded-full self-start">
										<TrendingDownIcon fontSize="small" />
										{trendValue}%
									</span>
								)}
								<span className="text-sm text-white">{slide.description}</span>

								<p className="text-7xl font-black leading-none tracking-tight text-white">
									{slide.value}
								</p>
							</div>
							<div className="flex items-center justify-center gap-1 my-3">
								<div className="bg-1 h-1 w-25 rounded-full bg-white"></div>
							</div>
						</div>
					);
				})}
			</div>
		</Container>
	);
};

export default HumanRightsOverview;
