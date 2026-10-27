import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { LaborOurImpactSection } from "./LaborOurImpactSection";

// interface WorkerTestimonial {
// 	id: string;
// 	quote: string;
// 	worker: string;
// 	location: string;
// 	industry: string;
// 	category: string;
// }

// const testimonials: WorkerTestimonial[] = [
// 	{
// 		id: "1",
// 		quote:
// 			"The living conditions in our dormitory were overcrowded with poor ventilation. After reporting through the platform, management provided better facilities within 3 months.",
// 		worker: "Anonymous Worker",
// 		location: "Southeast Asia",
// 		industry: "Textile Manufacturing",
// 		category: "Living Conditions",
// 	},
// 	{
// 		id: "2",
// 		quote:
// 			"Safety equipment was not provided regularly. The reporting system helped us get proper protective gear and safety training for all workers.",
// 		worker: "Factory Worker",
// 		location: "South Asia",
// 		industry: "Electronics",
// 		category: "Working Conditions",
// 	},
// 	{
// 		id: "3",
// 		quote:
// 			"We weren't receiving overtime compensation as required by law. The platform helped us resolve this wage issue with transparent communication.",
// 		worker: "Manufacturing Worker",
// 		location: "East Asia",
// 		industry: "Automotive",
// 		category: "Employer Relations",
// 	},
// ];

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.2,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6 },
	},
};

export const WorkerVoicesSection = () => {
	return (
		<>
			{/* Our Impact Section */}
			<LaborOurImpactSection />

			{/* Worker Voices Section */}
			<div className="bg-gradient-to-br from-gray-50 to-gray-100 py-20 px-4">
				<Container size="4">
					<motion.div
						initial="hidden"
						variants={containerVariants}
						viewport={{ once: true }}
						whileInView="visible"
					>
						{/* Section Header */}
						<motion.div className="text- mb-16" variants={itemVariants}>
							<Flex align="center" className="justify-center mb-4" gap="3">
								<ChatBubbleIcon className="w-8 h-8 text-[#148696]" />
								<Heading
									className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900"
									size="8"
								>
									Hearing Directly from Workers
								</Heading>
							</Flex>

							<Text
								className="text-lg md:text-xl text-gray-600 mx-auto leading-relaxed"
								size="4"
							>
								Real voices, real experiences, real change. These are the
								stories that drive our mission to create safer, fairer
								workplaces across global supply chains.
							</Text>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
								<motion.div
									className="bg-white rounded-md hover:shadow-lg overflow-hidden"
									variants={itemVariants}
								>
									<div className="aspect-video bg-gray-200 relative">
										<iframe
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											className="w-full h-full"
											src="https://www.youtube.com/embed/CFah7PbcaTU?si=zGqYM4ZzuXRVitf0"
											title="Worker Safety and Living Conditions"
										/>
									</div>
									<div className="p-6">
										<Heading
											className="text-xl font-bold text-gray-900"
											mb={"4"}
											size="5"
										>
											HOW CAN FORCED LABOR EXIST IN WORKPLACES THAT SEEM FINE?
										</Heading>
										<Text className="text-gray-600 leading-relaxed" size="3">
											This video reveals how forced labor can exist in
											workplaces that appear normal, exposing the hidden tactics
											employers use to conceal exploitation. Through real cases
											and expert insights, it highlights why forced labor
											persists and stresses the need for awareness,
											transparency, and strong monitoring to eliminate it.
										</Text>
									</div>
								</motion.div>

								<motion.div
									className="bg-white rounded-md hover:shadow-lg overflow-hidden"
									variants={itemVariants}
								>
									<div className="aspect-video bg-gray-200 relative">
										<iframe
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											className="w-full h-full"
											frameBorder="0"
											src="https://www.youtube.com/embed/zraXpymQ6cE?si=fUTEHusE9RLwbAU-"
											title="Building Fair Employment Practices"
										/>
									</div>
									<div className="p-6">
										<Heading
											className="text-xl font-bold text-gray-900"
											mb={"4"}
											size="5"
										>
											WORKERS' VOICES: ADDRESSING CHALLENGES IN THE WORKPLACE
										</Heading>
										<Text className="text-gray-600 leading-relaxed" size="3">
											Workers share candid insights into common workplace
											challenges—such as sick leave, long hours, language
											barriers, and weak grievance systems—while offering
											practical recommendations for employers and buyers. Their
											voices highlight the urgent need to improve working
											conditions and protect workers across supply chains.
										</Text>
									</div>
								</motion.div>
							</div>
						</motion.div>

						{/* Testimonials Grid */}
						{/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{testimonials.map((testimonial) => (
								<motion.div
									className="group"
									key={testimonial.id}
									variants={itemVariants}
								>
									<div className="bg-gradient-to-br from-[#148696] to-[#0d5f6d] rounded-md shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full border border-[#148696]/50 group-hover:scale-105">
										
										<div className="mb-6">
											<QuoteIcon className="w-8 h-8 text-white/80" />
										</div>

										
										<Text
											className="text-white text-base leading-relaxed mb-6 italic"
											size="3"
										>
											"{testimonial.quote}"
										</Text>

										
										<div className="border-t border-white/20 pt-6">
											<Flex align="center" className="mb-3" gap="2">
												<PersonIcon className="w-5 h-5 text-white" />
												<Text className="font-semibold text-white" size="3">
													{testimonial.worker}
												</Text>
											</Flex>

											<div className="space-y-2">
												<Flex className="justify-between">
													<Text className="text-white/70 text-sm" size="2">
														Location:
													</Text>
													<Text
														className="text-white text-sm font-medium"
														size="2"
													>
														{testimonial.location}
													</Text>
												</Flex>

												<Flex className="justify-between">
													<Text className="text-white/70 text-sm" size="2">
														Industry:
													</Text>
													<Text
														className="text-white text-sm font-medium"
														size="2"
													>
														{testimonial.industry}
													</Text>
												</Flex>

												<div className="pt-2">
													<span className="inline-block bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
														{testimonial.category}
													</span>
												</div>
											</div>
										</div>
									</div>
								</motion.div>
							))}
						</div> */}

						{/* Call to Action */}
						{/* <motion.div className="text-center mt-16" variants={itemVariants}>
							<div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100">
								<Heading
									className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-6"
									size="7"
								>
									Your Voice Matters
								</Heading>
								<Text
									className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed"
									size="4"
								>
									Join thousands of workers who have shared their experiences to
									create positive change. Every report helps build safer, more
									equitable workplaces.
								</Text>
								<Flex className="justify-center gap-4 flex-wrap">
									<button className="bg-gradient-to-r from-[#148696] to-[#0d5f6d] text-white border-0 px-8 py-4 text-base font-semibold rounded-lg cursor-pointer transition-all duration-300 ease-in-out hover:from-[#0d5f6d] hover:to-[#084a57] hover:shadow-lg shadow-md">
										Report an Issue
									</button>
									<button className="border-2 border-[#148696] text-[#148696] bg-transparent px-8 py-4 text-base font-semibold rounded-lg cursor-pointer transition-all duration-300 ease-in-out hover:bg-[#148696] hover:text-white shadow-md">
										Learn More
									</button>
								</Flex>
							</div>
						</motion.div> */}
					</motion.div>
				</Container>
			</div>
		</>
	);
};
