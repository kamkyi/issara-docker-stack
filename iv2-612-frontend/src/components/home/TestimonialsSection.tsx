import FaceIcon from "@mui/icons-material/Face";
import Face2Icon from "@mui/icons-material/Face2";
import PeopleIcon from "@mui/icons-material/People";
import WorkIcon from "@mui/icons-material/Work";
import { QuoteIcon } from "@radix-ui/react-icons";
import { Avatar, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Testimonial {
	quote: string;
	author?: string;
	role?: string;
	company?: string;
	gender?: "male" | "female";
	type?: "worker" | "partner" | "recruitmentAgency";
}

const getQuoteParagraphs = (quote: string) =>
	quote
		.split(/\n+/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);

const QUOTE_SECTION_TITLES = [
	"How Issara Supports Us",
	"Worker Engagement",
	"Risk Mitigation",
	"Collaborative Problem Solving",
] as const;

const splitQuoteHeading = (paragraph: string) => {
	const matchedTitle = QUOTE_SECTION_TITLES.find((title) =>
		paragraph.startsWith(title),
	);

	if (!matchedTitle) {
		return null;
	}

	return {
		heading: matchedTitle,
		body: paragraph.slice(matchedTitle.length).trimStart(),
	};
};

const testimonials: Testimonial[] = [
	{
		quote:
			"The reason worker issues are being solved is primarily that employers now listen to the voices of the workers. Issues like erratic work hours, cursing, or physical abuse no longer happen at all. [Workers] have organizations like Issara to turn to to raise grievances, and the employer is also resolving these kinds of issues peacefully and smoothly.",
		author: "Burmese Worker Mobilizer",
		company: "Canned Tuna & Pet Food Manufacturing",
		gender: "male",
	},
	{
		quote:
			"We are proud to recognize the 10-year collaboration between Seafarm as a strategic partner and the Issara Institute as a dedicated Civil Society Organization (CSO) partner. This enduring partnership has been instrumental in driving significant improvements within Seafarm's supply chain, particularly through the achievements of its key supplier, Seafresh. Together, we have focused on enhancing labor practices from the first mile ethical recruitment to upstream shrimp farms labor monitoring. The continuous worker satisfaction surveys foster a culture of consistent efforts for improvement, and implementing crucial capacity building through upstream shrimp farm supplier training. By integrating Issara's ILM system in their supplier facility, Seafresh, has allowed the real-time labor monitoring and improvement of the working conditions of their workers.",
		company: "Seafresh Group",
	},
	{
		quote: `We see Issara Institute as a "crucial partner" rather than just a service provider. In an industry as fast-paced as ours, having a team that focuses so deeply on ethical labor practices and worker voice is invaluable. Your approach is practical and transparent, which makes it much easier for businesses like ours to navigate complex supply chain challenges.
How Issara Supports Us
The support has been great, particularly in these areas.
Worker Engagement
The Helpline and the way you facilitate direct communication with workers give us insights we wouldn't otherwise have. It helps us stay proactive rather than reactive.

Risk Mitigation
Having your team as an "extra set of eyes" on the ground provides a lot of peace of mind. It helps ensure we are meeting both international standards and our own internal ethics.

Collaborative Problem Solving
 Whenever an issue arises, the focus is always on "how to fix it together" rather than just pointing out the problem. That collaborative spirit is what makes the relationship work.

We really value the transparency and the expertise your team brings to the table.`,
		company: "Apparel manufacturer in Thailand",
	},
	{
		quote:
			"Thanks to Issara, my workplace is getting better, and we feel free to reach out to Issara for support. It is really helpful.",
		author: "Cambodian Worker",
		company: "Electronics Manufacturing in Phetchaburi, Thailand",
		gender: "female",
	},
	{
		quote:
			"The Issara staff listened carefully about the problems that we faced, and gave us advice and counseling. I believe that this experience not only will help us to solve similar problems, but also, we can help other workers.",
		author: "Burmese Worker",
		company: "Construction Sub-contractor in Chonburi",
		gender: "male",
	},
	{
		quote:
			"The Issara Academy training empowers RAs to build trust with both workers and employers. When we, as agencies, are known for treating people with dignity, we not only enhance our brand reputation but also create a self-sustaining network of referrals from satisfied workers, leading to a steady, reliable talent pool.",
		author: "Recruitment Agency Based in Myanmar",
		type: "recruitmentAgency",
	},
	{
		quote:
			"RAs can get a competitive advantage. As global brands commit to fair labor practices and the Employer Pays Principle, ethical recruiters become the preferred partners. I believe Issara Academy graduates are uniquely positioned to win contracts with international companies by demonstrating our commitment to worker welfare, which sets us apart from the competition.",
		author: "Recruitment Agency Based in Myanmar",
		type: "recruitmentAgency",
	},
	{
		quote:
			"...we have benefited greatly from Issara's advice and assistance in communicating complex matters to our workers. Moving forward, we are committed to our action plan for Ethical Recruitment (ER) and are collaborating closely with Issara to conduct surveys for our customers.",
		author: "Seafood processing supplier",
		company: "Samut Sakhon, Thailand",
		type: "partner",
	},
	{
		quote:
			"I am impressed with Issara and their dedication to developing and improving operations for migrant workers, both here in Thailand and in their countries of origin.",
		author: "Thai Seafood processing supplier",
		company: "Samut Prakan, Thailand",
		type: "partner",
	},
];

export const TestimonialsSection = () => {
	const [expanded, setExpanded] = useState<Record<number, boolean>>({});
	const [truncated, setTruncated] = useState<Record<number, boolean>>({});
	const quoteRefs = useRef<Array<HTMLDivElement | null>>([]);

	const toggleExpanded = (i: number) =>
		setExpanded((s) => ({ ...s, [i]: !s[i] }));

	const checkTruncation = () => {
		setTruncated((prev) => {
			const next = { ...prev };
			testimonials.forEach((_, index) => {
				const element = quoteRefs.current[index];
				if (element) {
					next[index] = element.scrollHeight > element.clientHeight + 8;
				}
			});
			return next;
		});
	};

	// On mount: run after paint, fonts, and after Framer Motion settles
	useEffect(() => {
		requestAnimationFrame(checkTruncation);
		document.fonts.ready.then(checkTruncation);
		const late = setTimeout(checkTruncation, 500);
		window.addEventListener("resize", checkTruncation);
		return () => {
			clearTimeout(late);
			window.removeEventListener("resize", checkTruncation);
		};
	}, []);

	const [activeIndex, setActiveIndex] = useState(0);
	const userInteracted = useRef(false);

	// Re-check truncation after each slide change — newly rendered cards
	// (previously outside the ±2 window) now have refs for the first time.
	// Also collapse any expanded card so "Read more" resets on slide change.
	useEffect(() => {
		setExpanded({});
		const id = setTimeout(checkTruncation, 350);
		return () => clearTimeout(id);
	}, [activeIndex]);

	// Resettable timer — restarts whenever activeIndex changes.
	// After user interaction it waits 20s before auto-advancing again.
	useEffect(() => {
		const delay = userInteracted.current ? 20000 : 15000;
		userInteracted.current = false;
		const timer = setTimeout(() => {
			setActiveIndex((prev) => (prev + 1) % testimonials.length);
		}, delay);
		return () => clearTimeout(timer);
	}, [activeIndex]);

	const handleCardClick = (index: number) => {
		userInteracted.current = true;
		setActiveIndex(index);
	};

	return (
		<Flex
			align="center"
			className="py-12 md:py-24 min-h-[85vh] relative overflow-hidden bg-[#22333B]"
			direction="column"
		>
			{/* Decorative background elements */}
			<div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
				<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#148696]/10 blur-[120px] rounded-full" />
				<div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[#00516a]/10 blur-[120px] rounded-full" />
			</div>

			<div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 mb-12">
				<div className="text-center px-4 max-w-3xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.6 }}
						whileInView={{ opacity: 1, y: 0 }}
					>
						<Heading
							className="text-white text-5xl sm:text-6xl md:text-7xl font-heading font-black leading-tight tracking-tighter mb-6"
							size="9"
						>
							Our Shared Success
						</Heading>
						<p className="text-lg md:text-xl text-gray-300 font-sans">
							Voices from workers and our partners in global supply chains
						</p>
					</motion.div>
				</div>
			</div>

			<div className="relative w-full flex flex-col items-center justify-center py-12">
				<div className="relative min-h-[450px] w-full max-w-4xl flex items-start justify-center">
					<AnimatePresence mode="popLayout">
						{testimonials.map((testimonial, index) => {
							const displayAuthor =
								testimonial.author ?? testimonial.company ?? "Anonymous";
							const isCompany = !testimonial.author;
							const fallbackContent =
								testimonial.type === "recruitmentAgency" ? (
									<PeopleIcon fontSize="small" />
								) : isCompany ? (
									<WorkIcon fontSize="small" />
								) : testimonial.gender === "female" ? (
									<Face2Icon fontSize="small" />
								) : (
									<FaceIcon fontSize="small" />
								);

							const isExpanded = Boolean(expanded[index]);
							const isTruncated = Boolean(truncated[index]);
							const quoteParagraphs = getQuoteParagraphs(testimonial.quote);

							// Calculate position relative to active index, with wrapping
							let relativeIndex = index - activeIndex;
							const half = Math.floor(testimonials.length / 2);
							if (relativeIndex > half) relativeIndex -= testimonials.length;
							if (relativeIndex < -half) relativeIndex += testimonials.length;
							const absIndex = Math.abs(relativeIndex);

							// Only show current and 2 neighbors on each side
							if (absIndex > 2) return null;

							return (
								<motion.div
									animate={{
										opacity: absIndex === 0 ? 1 : absIndex === 1 ? 0.9 : 0.2,
										scale: 1 - absIndex * 0.19,
										x: relativeIndex * (window.innerWidth < 768 ? 80 : 320),
										z: -absIndex * 100,
										zIndex: 10 - absIndex,
										rotateY: relativeIndex * -15,
									}}
									className={`absolute w-[90%] md:w-[600px] cursor-pointer touch-none ${isExpanded && index === activeIndex ? "h-auto" : "h-auto md:h-[420px]"}`}
									exit={{ opacity: 0, scale: 0.5, x: relativeIndex * 200 }}
									initial={{ opacity: 0, scale: 0.8, x: relativeIndex * 200 }}
									key={index}
									onClick={() => handleCardClick(index)}
									style={{
										transformStyle: "preserve-3d",
									}}
									transition={{
										type: "spring",
										stiffness: 300,
										damping: 30,
										mass: 1,
									}}
								>
									<Card
										className={`p-6 md:p-8 h-full transition-all duration-300 rounded-2xl shadow-xl flex flex-col justify-between ${
											index === activeIndex
												? "bg-white"
												: "bg-white/90 backdrop-blur-md "
										}`}
									>
										<Flex className="h-full" direction="column" gap="5">
											<div className="flex justify-between items-start">
												<QuoteIcon className="w-10 h-10 text-[#148696]" />
												{index === activeIndex && (
													<span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-wider">
														{index + 1} / {testimonials.length}
													</span>
												)}
											</div>

											<div
												className={
													isExpanded
														? "overflow-y-auto pr-1"
														: "overflow-hidden max-h-[9.5rem]"
												}
												ref={(element: HTMLDivElement | null) => {
													quoteRefs.current[index] = element;
												}}
												style={{ maxHeight: isExpanded ? "12rem" : undefined }}
											>
												{quoteParagraphs.map((paragraph, paragraphIndex) => {
													const isFirstParagraph = paragraphIndex === 0;
													const isLastParagraph =
														paragraphIndex === quoteParagraphs.length - 1;
													const paragraphWithHeading =
														splitQuoteHeading(paragraph);

													return (
														<p
															className="text-gray-800 text-lg md:text-xl leading-relaxed mb-4 last:mb-0"
															key={`${index}-${paragraphIndex}`}
														>
															{isFirstParagraph ? '"' : ""}
															{paragraphWithHeading ? (
																<>
																	<strong className="bold">
																		{paragraphWithHeading.heading}
																	</strong>
																	{paragraphWithHeading.body
																		? ` ${paragraphWithHeading.body}`
																		: ""}
																</>
															) : (
																paragraph
															)}
															{isLastParagraph ? '"' : ""}
														</p>
													);
												})}
											</div>

											{isTruncated && index === activeIndex && (
												<button
													aria-expanded={isExpanded}
													className="text-sm text-[#148696] font-semibold mt-1 self-start hover:underline"
													onClick={(e) => {
														e.stopPropagation();
														toggleExpanded(index);
													}}
												>
													{isExpanded ? "Show less" : "Read more"}
												</button>
											)}

											<Flex
												align="center"
												className="mt-8 pt-6 border-t border-gray-100"
												gap="4"
											>
												<Avatar
													className="shadow-sm"
													fallback={fallbackContent}
													radius="full"
													size="4"
												/>
												<div>
													<Text className="block font-heading font-semibold text-lg text-[#00516a]">
														{displayAuthor}
													</Text>
													{(testimonial.type || testimonial.gender) && (
														<p className="text-sm text-gray-500 font-sans">
															{testimonial.role && (
																<span>{testimonial.role}</span>
															)}
															{testimonial.role && testimonial.company && (
																<span>, </span>
															)}
															{testimonial.company && (
																<span>{testimonial.company}</span>
															)}
														</p>
													)}
												</div>
											</Flex>
										</Flex>
									</Card>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>

				{/* Pagination Dots */}
				<div className="flex gap-3 mt-12">
					{testimonials.map((_, i) => (
						<button
							aria-label={`Go to slide ${i + 1}`}
							className={`h-2 transition-all duration-300 rounded-full ${
								i === activeIndex
									? "w-8 bg-[#148696]"
									: "w-2 bg-gray-600 hover:bg-gray-400"
							}`}
							key={i}
							onClick={() => {
								userInteracted.current = true;
								setActiveIndex(i);
							}}
						/>
					))}
				</div>
			</div>
		</Flex>
	);
};
