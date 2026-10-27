import { Heading } from "@radix-ui/themes";
import { motion } from "motion/react";
import { useState } from "react";
import news1 from "$src/assets/img/news/1.png";
import news2 from "$src/assets/img/news/2.png";
import news3 from "$src/assets/img/news/3.jpg";

interface Update {
	id: number;
	date: string;
	title: string;
	excerpt: string;
	image: string;
	category: string;
	href?: string;
	action: string;
}

const updates: Update[] = [
	{
		id: 1,
		date: "Apr, 2026",
		title: "WageIndicator",
		excerpt:
			"Where does your supply chain stand? WageIndicator covers minimum wages globally and living wages in 186 countries — publicly accessible, updated annually, with quarterly more granular data available for a fee.",
		image: news1,
		action: "Explore Minimum Wage vs Living Wage Comparison",
		category: "Feature",
		href: "https://wageindicator.org/work/minimum-wage/comparison-map",
	},
	{
		id: 2,
		date: "Apr, 2026",
		title: "Mapped in Bangladesh",
		excerpt:
			"Addressing Climate Change and Plastic Waste in Bangladesh’s Garment Industry from a Global Value Chain Perspective.",
		image: news2,
		action: "Read the news blog post",
		category: "News",
		href: "https://ced.bracu.ac.bd/accpw/",
	},
	{
		id: 3,
		date: "Aug, 2026",
		title: "Issara Academy",
		excerpt:
			"Ethical Recruitment 201: Practical Tools for Ethical Recruitment (English Language) — Participants will be introduced to Issara's Worker Voice-Driven Ethical Recruitment Toolkit — practical tools to support the more effective worker voice-driven approach to ethical recruitment, and the Golden Dreams Marketplace.",
		image: news3,
		action: "Register Now",
		category: "Event",
		href: "https://www.issarainstitute.org/event-details/ethical-recruitment-201-practical-tools-for-ethical-recruitment-english-language",
	},
];

export function LatestUpdates() {
	const [hoveredId, setHoveredId] = useState<number | null>(null);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
				delayChildren: 0.2,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.6,
				ease: "easeOut" as const,
			},
		},
	};

	return (
		<section className="w-full py-6 sm:py-8 md:py-16 bg-gray-50 min-h-[70vh] flex items-center">
			<div className="container mx-auto relative z-10 px-6">
				<div className="text-center mb-6 sm:mb-8 md:mb-12 px-2 sm:px-4">
					<Heading
						className="text-[#148696] animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl"
						mb={"3"}
						size={"9"}
					>
						Featured from the CASCADE Community
					</Heading>
					<p className="text-lg md:text-xl lg:text-2xl text-gray-600 px-2 sm:px-0">
						The latest from Community partners
					</p>
				</div>

				<motion.div
					className="flex flex-col md:flex-row gap-4 sm:gap-5 md:gap-8 px-2 sm:px-4 md:px-0"
					initial="hidden"
					transition={{ duration: 1.8 }}
					variants={containerVariants}
					viewport={{ once: true, margin: "-100px" }}
					whileInView="visible"
				>
					{updates.map((update) => (
						<motion.div
							className="group cursor-pointer w-full md:flex-1 md:min-w-0"
							key={update.id}
							onMouseEnter={() => setHoveredId(update.id)}
							onMouseLeave={() => setHoveredId(null)}
							variants={itemVariants}
						>
							<div className="overflow-hidden rounded-sm shadow-md h-full flex flex-col min-h-[360px] sm:min-h-[380px] md:min-h-[420px]">
								{/* Image */}
								<motion.div
									className="overflow-hidden bg-gray-200 relative flex"
									style={{
										height: 300,
									}}
									transition={{ duration: 0.8 }}
									whileHover={{ scale: 1.05 }}
								>
									<img
										alt={update.title}
										className="w-full object-cover"
										src={update.image}
									/>
									<motion.div
										animate={{
											opacity: hoveredId === update.id ? 1 : 0,
										}}
										className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
										initial={{ opacity: 0 }}
									/>
								</motion.div>

								{/* Content */}
								<div className="p-3 sm:p-4 md:p-6 flex flex-col flex-grow bg-white">
									<div className="flex items-center justify-between mb-2 sm:mb-3">
										<span className="text-xs font-semibold text-blue-600 uppercase">
											{update.category}
										</span>
										<span className="text-xs text-gray-500">{update.date}</span>
									</div>

									<h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
										{update.title}
									</h3>

									<p className="text-xs sm:text-sm text-gray-600 flex-grow mb-2 sm:mb-3 md:mb-4 leading-relaxed line-clamp-6 lg:line-clamp-none">
										{update.excerpt}
									</p>

									{/* Read More */}
									<a
										href={update.href}
										rel="noopener noreferrer"
										target="_blank"
									>
										<motion.div
											animate={{
												x: hoveredId === update.id ? 4 : 0,
											}}
											className="flex items-center text-[#148696] font-semibold text-xs sm:text-sm border-t pt-2 mt-auto"
										>
											{update.action}
											<motion.span
												animate={{
													x: hoveredId === update.id ? 4 : 0,
												}}
												className="ml-2"
											>
												→
											</motion.span>
										</motion.div>
									</a>
								</div>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
