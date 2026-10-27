import { Box, Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Carousel1 } from "./carousel-components/carousel1";

interface Slide {
	id: number;
	title: string;
	subtitle: string;
	text: string;
	description: string;
	comp: ReactNode;
	ctaText: string;
}

const slides: Slide[] = [
	{
		id: 1,
		title: "CASCADE",
		subtitle: "Better Data + Better Solutions \nfor People & Planet",
		description:
			"CASCADE connects you with workers, communities and businesses in global supply chains",
		text: "Empowered Worker Voice. Ongoing Monitoring. System Changes.",
		comp: <Carousel1 />,
		ctaText: "How to CASCADE",
	},
];

export const HeroCarousel = () => {
	// Render a single static hero (first slide) instead of a slideshow
	const currentSlide = slides[0];

	return (
		<Box className="relative min-h-[100svh] overflow-hidden text-white md:min-h-screen">
			{currentSlide.comp}
			<div className="absolute inset-0 bg-black/30 pointer-events-none" />
			<div className="container absolute left-1/2 top-1/2 mx-auto w-full -translate-x-1/2 -translate-y-1/2 px-16 md:top-32 md:translate-y-0 md:px-8 lg:top-40 xl:px-0">
				<div className="relative py-4 md:py-10 z-20">
					<motion.div
						animate="visible"
						className="mx-auto max-w-5xl"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
					>
						<Heading
							className="uppercase text-white pb-2 text-shadow-sm"
							mb={"4"}
							size={{
								initial: "7",
								md: "7",
							}}
						>
							{currentSlide.title}
						</Heading>

						<div className="max-w-5xl">
							<h2
								className="mb-4 pb-6 md:pb-10 text-3xl sm:text-4xl md:text-6xl font-bold whitespace-pre-line"
								style={{ color: "white" }}
							>
								{currentSlide.subtitle}
							</h2>
						</div>
						<div className="pb-6 md:pb-10">
							<p className="text-white p-2 text-base md:text-xl lg:text-xl backdrop-blur-sm rounded-md leading-relaxed bg-black/10">
								{currentSlide.description}
							</p>
						</div>

						{/* <CascadeButton
							buttonText={currentSlide.ctaText}
							color="#00516a"
							handleOnClick={() => {
								document
									.getElementById(CONTACT_SECTION_ID)
									?.scrollIntoView({ behavior: "smooth" });
							}}
							size={"4"}
						/> */}
					</motion.div>
				</div>

				{/* <div className="relative mt-12 md:mt-20 z-20">
					<motion.div
						animate="visible"
						className="max-w-6xl mx-auto"
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
					>
						<Heading
							className="text-white pb-0 text-shadow-sm text-center text-lg md:text-2xl lg:text-3xl"
							size={"6"}
						>
							{currentSlide.text}
						</Heading>
					</motion.div>
				</div> */}
			</div>
		</Box>
	);
};
