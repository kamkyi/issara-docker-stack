import { ArrowRightIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Card,
	Container,
	Flex,
	Grid,
	Heading,
} from "@radix-ui/themes";
import { motion } from "framer-motion";
import ethicalRecruitment from "$src/assets/img/our_services/ethical_recruitment.jpeg";
import ethicalRecruitmentSeafood from "$src/assets/img/our_services/ethical_recruitment_in_the_seafood_industry_1.jpeg";

const services = [
	{
		title: "Ethical Recruitment",
		description:
			"Ethical recruitment solutions that ensure fair hiring practices and worker protection",
		image: ethicalRecruitment,
		link: "/recruitment",
	},
	{
		title: "Supply Chain Management",
		description:
			"Comprehensive supply chain monitoring and transparency tools for your business",
		image: ethicalRecruitmentSeafood,
		link: "/company-supply-chain",
	},
	{
		title: "Worker Support",
		description:
			"Grievance mechanisms and support systems to empower workers and improve conditions",
		image: ethicalRecruitment,
		link: "/employee-relations",
	},
];

const containerVariants = {
	hidden: {},
	show: {
		transition: {
			staggerChildren: 0.12,
		},
	},
};

const fadeUpVariants = {
	hidden: {
		opacity: 0,
		y: 12,
	},
	show: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.45,
		},
	},
};

export const ServicesSection = () => {
	return (
		<Flex className="py-6 sm:py-8 md:py-16 bg-gray-50 min-h-screen sm:min-h-[70vh] lg:h-[100vh] items-center">
			<Container className="w-full px-4 sm:px-6 md:px-8" size="4">
				<Flex direction="column" gap="6">
					<motion.div
						className="text-center px-2 sm:px-4"
						initial="hidden"
						variants={containerVariants}
						viewport={{ once: true, amount: 0.2 }}
						whileInView="show"
					>
						<Heading
							className="animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl"
							mb={"3"}
							size={"9"}
						>
							Our Services
						</Heading>
						<p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
							Comprehensive solutions for ethical business practices and supply
							chain management
						</p>
					</motion.div>

					<Grid
						className="px-2 sm:px-4 md:px-0"
						columns={{ lg: "3", md: "2", sm: "1", xs: "1" }}
						gap={{ initial: "3", sm: "4", md: "5" }}
					>
						{services.map((service, index) => (
							<motion.div
								initial="hidden"
								key={index}
								variants={fadeUpVariants}
								viewport={{ once: true, amount: 0.2 }}
								whileInView="show"
							>
								<Card
									className="overflow-hidden hover:shadow-xl transition-shadow w-full bg-white h-full"
									key={index}
								>
									<img
										alt={service.title}
										className="w-full h-32 sm:h-40 md:h-48 object-cover"
										src={service.image}
									/>
									<Box className="p-3 sm:p-4 md:p-5">
										<Heading className="mb-2 sm:mb-2.5 md:mb-3 text-base sm:text-lg md:text-xl">
											{service.title}
										</Heading>
										<p className="text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3 md:mb-4">
											{service.description}
										</p>
										<Button
											className="text-[#148696] hover:text-[#0d5f6d] cursor-pointer text-xs sm:text-sm md:text-base"
											variant="ghost"
										>
											Learn More{" "}
											<ArrowRightIcon className="ml-1 sm:ml-1.5 md:ml-2" />
										</Button>
									</Box>
								</Card>
							</motion.div>
						))}
					</Grid>
				</Flex>
			</Container>
		</Flex>
	);
};
