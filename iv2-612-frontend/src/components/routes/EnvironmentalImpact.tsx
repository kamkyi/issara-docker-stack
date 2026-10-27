import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Container, Grid, Heading, Text } from "@radix-ui/themes";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useInView } from "react-intersection-observer";
import ethicalSupplyChainDesigner from "$src/assets/img/thumbnails/ethical-supply-chain-designer.png";
import CTASection from "../home/CTASection";
import AnimatedStickyNavbar from "../navbars/AnimatedStickyNavbar";

export function EnvironmentalImpact() {
	const { scrollY } = useScroll();
	const imageY = useTransform(scrollY, [0, 500], [0, -50]);

	const [heroRef, heroInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	const [impactRef, impactInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	const [initiativesRef, initiativesInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	return (
		<div className="overflow-hidden w-full">
			<AnimatedStickyNavbar />

			{/* Hero Section */}
			<div className="relative w-full min-h-screen flex items-center bg-gradient-to-bl from-[#004A60] via-emerald-100 to-teal-50">
				<Container className="w-full px-4 sm:px-6 md:px-8" size="4">
					<motion.div
						animate={heroInView ? "visible" : "hidden"}
						className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center py-10 sm:py-14 md:py-20"
						initial="hidden"
						ref={heroRef}
						variants={{
							visible: { transition: { staggerChildren: 0.2 } },
						}}
					>
						{/* Text Content */}
						<motion.div
							className="z-10"
							variants={{
								hidden: { opacity: 0, x: -50 },
								visible: {
									opacity: 1,
									x: 0,
									transition: { duration: 0.8, ease: "easeOut" },
								},
							}}
						>
							<motion.div
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: {
										opacity: 1,
										y: 0,
										transition: { duration: 0.6, delay: 0.2 },
									},
								}}
							>
								<Text className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl block font-bold mb-4 sm:mb-5 md:mb-6 text-emerald-900 leading-tight">
									Environmental
									<br />
									Impact
									<br />
									for Change
								</Text>
							</motion.div>

							<motion.div
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: {
										opacity: 1,
										y: 0,
										transition: { duration: 0.6, delay: 0.3 },
									},
								}}
							>
								<Text className="text-sm sm:text-base md:text-lg text-emerald-800 leading-relaxed mb-l sm:mb-7 md:mb-8 max-w-lg block">
									Building sustainable supply chains that protect our planet
									while empowering workers and communities. Together, we can
									create a future where environmental responsibility and social
									justice go hand in hand.
								</Text>
							</motion.div>

							<motion.div
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: {
										opacity: 1,
										y: 0,
										transition: { duration: 0.6, delay: 0.4 },
									},
								}}
							>
								<Link
									className="inline-block bg-teal-700 text-white px-6 sm:px-7 md:px-8 py-2.5 sm:py-3 md:py-4 my-2 sm:my-3 md:my-4 rounded-sm font-semibold text-sm sm:text-base hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
									to="/"
								>
									Learn More
								</Link>
							</motion.div>
						</motion.div>

						{/* Image Content */}
						<motion.div
							className="relative h-full flex items-center justify-center"
							variants={{
								hidden: { opacity: 0, scale: 0.9 },
								visible: {
									opacity: 1,
									scale: 1,
									transition: { duration: 1, ease: "easeOut" },
								},
							}}
						>
							<motion.div
								className="relative w-full max-w-[20rem] sm:max-w-sm md:max-w-lg aspect-square"
								style={{ y: imageY }}
							>
								<div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-8 border-white">
									<motion.img
										alt="environmental-sustainability"
										className="w-full h-full object-cover"
										src={ethicalSupplyChainDesigner}
										transition={{ duration: 0.3 }}
										whileHover={{ scale: 1.05 }}
									/>
								</div>
								{/* Decorative circles */}
								<div className="absolute -top-8 -right-8 w-32 h-32 bg-green-400 rounded-full opacity-60 blur-xl" />
								<div className="absolute -bottom-8 -left-8 w-40 h-40 bg-emerald-600 rounded-full opacity-50 blur-xl" />
							</motion.div>
						</motion.div>
					</motion.div>
				</Container>

				{/* Scroll Indicator */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
					initial={{ opacity: 0, y: -10 }}
					transition={{
						delay: 1,
						duration: 0.5,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
					}}
				>
					<ChevronDownIcon className="w-8 h-8 text-emerald-600" />
				</motion.div>
			</div>

			{/* Impact Areas Section */}
			<div className="bg-white py-8 sm:py-12 md:py-20">
				<Container className="px-4 sm:px-6 md:px-8" size="4">
					<motion.div
						animate={impactInView ? "visible" : "hidden"}
						initial="hidden"
						ref={impactRef}
						variants={{
							visible: { transition: { staggerChildren: 0.15 } },
						}}
					>
						<motion.div
							className="text-center mb-8 sm:mb-12 md:mb-16"
							variants={{
								hidden: { opacity: 0, y: 20 },
								visible: { opacity: 1, y: 0 },
							}}
						>
							<Heading className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
								Our Environmental Focus
							</Heading>
							<Text className="text-sm sm:text-base md:text-lg text-[#56666C] max-w-2xl mx-auto">
								We're committed to reducing environmental impact across the
								entire supply chain ecosystem
							</Text>
						</motion.div>

						<Grid
							className="gap-4 sm:gap-6 md:gap-8"
							columns={{ initial: "1", md: "2", lg: "3" }}
						>
							{/* Carbon Footprint */}
							<motion.div
								className="bg-gradient-to-br from-green-50 to-emerald-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									🌍 Carbon Footprint
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Tracking and reducing greenhouse gas emissions across supply
									chains. We help companies measure, monitor, and minimize their
									carbon impact through data-driven insights.
								</p>
							</motion.div>

							{/* Sustainable Fisheries */}
							<motion.div
								className="bg-gradient-to-br from-blue-50 to-cyan-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									🐟 Sustainable Fisheries
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Partnering with the Sustainable Fisheries Partnership (SFP) to
									protect ocean ecosystems while supporting fishing communities
									and ensuring responsible seafood sourcing.
								</p>
							</motion.div>

							{/* Waste Reduction */}
							<motion.div
								className="bg-gradient-to-br from-amber-50 to-yellow-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									♻️ Waste Reduction
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Implementing circular economy principles to minimize waste,
									promote recycling, and create more efficient resource use
									throughout supply chains.
								</p>
							</motion.div>

							{/* Water Conservation */}
							<motion.div
								className="bg-gradient-to-br from-cyan-50 to-blue-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									💧 Water Conservation
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Monitoring water usage and promoting conservation practices to
									protect this vital resource in water-intensive industries.
								</p>
							</motion.div>

							{/* Biodiversity */}
							<motion.div
								className="bg-gradient-to-br from-purple-50 to-pink-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									🦋 Biodiversity
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Supporting initiatives that protect ecosystems and promote
									biodiversity in regions impacted by supply chain operations.
								</p>
							</motion.div>

							{/* Clean Energy */}
							<motion.div
								className="bg-gradient-to-br from-yellow-50 to-orange-100 p-m sm:p-l md:p-xl rounded-2xl shadow-lg"
								variants={{
									hidden: { opacity: 0, y: 50 },
									visible: { opacity: 1, y: 0 },
								}}
								whileHover={{
									scale: 1.03,
									y: -5,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text className="text-[#56666C] text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">
									⚡ Clean Energy
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base">
									Encouraging the transition to renewable energy sources in
									manufacturing and logistics operations across supply chains.
								</p>
							</motion.div>
						</Grid>
					</motion.div>
				</Container>
			</div>

			{/* Initiatives Section */}
			<div className="bg-gradient-to-br from-gray-50 to-green-50 py-8 sm:py-12 md:py-20">
				<Container className="px-4 sm:px-6 md:px-8" size="4">
					<motion.div
						animate={initiativesInView ? "visible" : "hidden"}
						initial="hidden"
						ref={initiativesRef}
						variants={{
							visible: { transition: { staggerChildren: 0.15 } },
						}}
					>
						<motion.div
							className="text-center mb-8 sm:mb-12 md:mb-16"
							variants={{
								hidden: { opacity: 0, y: 20 },
								visible: { opacity: 1, y: 0 },
							}}
						>
							<Heading className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
								Current Initiatives
							</Heading>
							<Text className="text-sm sm:text-base md:text-lg text-[#56666C] max-w-2xl mx-auto">
								Active programs making a measurable difference in environmental
								sustainability
							</Text>
						</motion.div>

						<Grid
							className="gap-4 sm:gap-6 md:gap-8"
							columns={{ initial: "1", md: "2" }}
						>
							{/* Carbon Tracking Tool */}
							<motion.div
								className="bg-white p-m sm:p-l md:p-xl rounded-2xl shadow-lg border border-green-100"
								variants={{
									hidden: { opacity: 0, x: -50 },
									visible: { opacity: 1, x: 0 },
								}}
								whileHover={{
									scale: 1.02,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text
									className="text-[#56666C] text-base sm:text-lg md:text-xl font-bold"
									size="5"
								>
									Carbon Tracking Dashboard
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base mt-3 sm:mt-4 mb-3 sm:mb-4">
									Real-time monitoring of carbon emissions across your entire
									supply chain. Our advanced analytics help identify hotspots
									and opportunities for reduction.
								</p>
								<div className="bg-emerald-50 p-3 sm:p-4 rounded-lg">
									<p className="text-xs sm:text-sm text-emerald-800">
										<strong>Impact:</strong> Help companies reduce carbon
										emissions by an average of 25% in the first year
									</p>
								</div>
							</motion.div>

							{/* SFP Partnership */}
							<motion.div
								className="bg-white p-m sm:p-l md:p-xl rounded-2xl shadow-lg border border-blue-100"
								variants={{
									hidden: { opacity: 0, x: 50 },
									visible: { opacity: 1, x: 0 },
								}}
								whileHover={{
									scale: 1.02,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text
									className="text-[#56666C] text-base sm:text-lg md:text-xl font-bold"
									size="5"
								>
									Sustainable Fisheries Partnership (SFP)
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base mt-3 sm:mt-4 mb-3 sm:mb-4">
									Working with SFP to ensure responsible fishing practices that
									protect marine ecosystems while supporting coastal
									communities.
								</p>
								<div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
									<p className="text-xs sm:text-sm text-blue-800">
										<strong>Impact:</strong> Supporting sustainable practices
										across 150+ fisheries worldwide
									</p>
								</div>
							</motion.div>

							{/* Supplier Training */}
							<motion.div
								className="bg-white p-m sm:p-l md:p-xl rounded-2xl shadow-lg border border-amber-100"
								variants={{
									hidden: { opacity: 0, x: -50 },
									visible: { opacity: 1, x: 0 },
								}}
								whileHover={{
									scale: 1.02,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text
									className="text-[#56666C] text-base sm:text-lg md:text-xl font-bold"
									size="5"
								>
									Environmental Training Programs
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base mt-3 sm:mt-4 mb-3 sm:mb-4">
									Capacity-building programs that equip suppliers with knowledge
									and tools to implement environmentally sustainable practices.
								</p>
								<div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
									<p className="text-xs sm:text-sm text-amber-800">
										<strong>Impact:</strong> Trained over 5,000 suppliers in
										sustainable practices
									</p>
								</div>
							</motion.div>

							{/* Circular Economy */}
							<motion.div
								className="bg-white p-m sm:p-l md:p-xl rounded-2xl shadow-lg border border-purple-100"
								variants={{
									hidden: { opacity: 0, x: 50 },
									visible: { opacity: 1, x: 0 },
								}}
								whileHover={{
									scale: 1.02,
									boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
								}}
							>
								<Text
									className="text-[#56666C] text-base sm:text-lg md:text-xl font-bold"
									size="5"
								>
									Circular Economy Initiatives
								</Text>
								<p className="text-[#56666C] text-sm sm:text-base mt-3 sm:mt-4 mb-3 sm:mb-4">
									Helping companies redesign products and processes to minimize
									waste, maximize recycling, and create closed-loop systems.
								</p>
								<div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
									<p className="text-xs sm:text-sm text-purple-800">
										<strong>Impact:</strong> Diverted 2 million tons of waste
										from landfills
									</p>
								</div>
							</motion.div>
						</Grid>
					</motion.div>
				</Container>
			</div>

			{/* CTA Section */}
			<CTASection />
		</div>
	);
}
