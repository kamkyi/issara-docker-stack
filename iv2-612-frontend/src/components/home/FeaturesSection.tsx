import {
	BarChartIcon,
	CheckCircledIcon,
	GearIcon,
} from "@radix-ui/react-icons";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";

const HandHeartIcon = ({ className }: { className?: string }) => (
	<svg
		aria-hidden="true"
		className={className}
		fill="none"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M9.5 10.2c0-1.3 1-2.3 2.3-2.3.6 0 1.2.2 1.6.7.4-.5 1-.7 1.6-.7 1.3 0 2.3 1 2.3 2.3 0 2-1.9 3.3-3.9 4.8-2-1.5-3.9-2.8-3.9-4.8Z"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
		/>
		<path
			d="M3 15.8c2.6-.9 4.7-1.4 6.4-1.4 1.2 0 2.1.8 2.1 1.8 0 .8-.6 1.5-1.5 1.7l-2.2.4"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
		/>
		<path
			d="M11.3 17.9h4.1c.5 0 1-.2 1.4-.5l4.2-3.5c.6-.5.6-1.4.1-1.9-.5-.5-1.3-.6-1.9-.1l-2 1.4"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
		/>
	</svg>
);

const features = [
	{
		icon: <BarChartIcon className="w-8 h-8" />,
		title: "ACTIONABLE INTELLIGENCE",
		description:
			"Worker voice channels that workers actually trust yield intelligence that you can trust to reflect the realities on the ground.",
		backgroundImage: "src/assets/img/wave-1.png",
	},
	{
		icon: <HandHeartIcon className="w-8 h-8" />,
		title: "RISK MITIGATION & REMEDIATION",
		description:
			"Identify issues before they escalate, with timely and expert remediation support if issues arise.",
		backgroundImage: "src/assets/img/wave-2.png",
	},
	{
		icon: <GearIcon className="w-8 h-8" />,
		title: "CONTINUOUS IMPROVEMENT",
		description:
			"The CASCADE Community supports suppliers and recruitment agencies with training, data, and other tools for more ethical and sustainable business practices.",
		backgroundImage: "src/assets/img/wave-3.png",
	},
	{
		icon: <CheckCircledIcon className="w-8 h-8" />,
		title: "REGULATORY READINESS",
		description:
			"Our data-driven reporting aligns with global due diligence and trade legislation.",
		backgroundImage: "src/assets/img/wave-4.png",
	},
];

export const FeaturesSection = () => {
	return (
		<Flex
			align={"center"}
			className="py-6 sm:py-8 md:py-16 bg-gray-50 min-h-[70vh]"
		>
			<div className="container mx-auto relative z-10 px-6">
				{/* Animated header + description */}
				<motion.div
					className="max-w-5xl mx-auto px-0 sm:px-4"
					initial="hidden"
					variants={{
						hidden: {},
						visible: { transition: { staggerChildren: 0.12 } },
					}}
					viewport={{ once: true, amount: 0.3 }}
					whileInView="visible"
				>
					<motion.div
						variants={{
							hidden: { opacity: 0, y: 58 },
							visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
						}}
					>
						<Heading
							className="text-[#148696] text-center mb-30 animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl"
							mb={"6"}
							size={"9"}
						>
							The CASCADE Community Ecosystem
						</Heading>
					</motion.div>

					<motion.p
						className="text-base text-lg md:text-xl lg:text-2xl text-gray-600 text-center mb-8 sm:mb-12 px-2 sm:px-0"
						variants={{
							hidden: { opacity: 0, y: 52 },
							visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
						}}
					>
						A model built on worker voice, partnership, and tech innovation
					</motion.p>
				</motion.div>
				<Flex
					className="px-2 sm:px-4 md:px-0 sm:gap-4"
					direction={{ initial: "column", sm: "row" }}
					gap="4"
					wrap="wrap"
				>
					{features.map((feature, index) => (
						<motion.div
							className={`rounded-[5px] shadow-sm relative hover:shadow-none hover:z-10 w-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(25%-0.75rem)]`}
							initial={{ y: 80 * (index + 1), opacity: 0 }}
							key={index}
							transition={{
								duration: 0.6,
								delay: index * 0.12,
							}}
							viewport={{ once: true, amount: 0.2 }}
							whileInView={{ y: 0, opacity: 1 }}
						>
							<div
								className="p-4 sm:p-5 md:p-6 hover:shadow-2xl hover:border-2 hover:border-[#ffffff] hover:scale-105 lg:hover:scale-110 transition-all duration-300 rounded-md cursor-pointer group h-full"
								key={index}
								style={{
									// backgroundImage: `url(${feature.backgroundImage})`,
									backgroundRepeat: "no-repeat",
									backgroundSize: "cover",
									backgroundPosition: "center",
									minHeight: "280px",
									backgroundImage:
										"linear-gradient(-45deg, rgba(20, 134, 150, 0.8), #00516a)",
								}}
							>
								<Flex className="h-full" direction="column" gap="3">
									<div className="w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 bg-white text-gray-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-[#00516a] group-hover:text-[#ffffff] transition-all duration-300 flex-shrink-0">
										{feature.icon}
									</div>
									<p className="text-shadow-sm font-bold text-base sm:text-lg md:text-lg text-white transition-colors duration-300 line-clamp-3">
										{feature.title.toUpperCase()}
									</p>
									<hr className="opacity-30 border-white" />
									<Text className="text-xs sm:text-sm md:text-base text-gray-100 transition-colors duration-300">
										{feature.description}
									</Text>
								</Flex>
							</div>
						</motion.div>
					))}
				</Flex>
			</div>
		</Flex>
	);
};
