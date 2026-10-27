import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Container, Heading } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface FAQ {
	id: number;
	question: string;
	answer: string;
}

const faqs: FAQ[] = [
	{
		id: 1,
		question: "How does the ethical labor monitoring work?",
		answer:
			"Our platform integrates worker voice mechanisms, supply chain tracking, and real-time alerts to monitor labor practices across your supply chain. We use a combination of on-the-ground research, worker feedback, and data analytics.",
	},
	{
		id: 2,
		question: "What is the onboarding process?",
		answer:
			"The onboarding process typically takes 2-4 weeks. Our team will work with you to map your supply chain, set up monitoring parameters, and train your team on using the platform.",
	},
	{
		id: 3,
		question: "How can I access the worker feedback system?",
		answer:
			"Workers can provide feedback through multiple channels including SMS, mobile app, phone hotline, and in-person interviews. Feedback is anonymized and secure.",
	},
	{
		id: 4,
		question: "What kind of reports does the platform generate?",
		answer:
			"Our platform generates comprehensive reports on labor compliance, worker welfare indicators, remediation tracking, and supply chain transparency. Reports are customizable based on your needs.",
	},
];

export function FrequentlyAskedQuestions() {
	const [expandedId, setExpandedId] = useState<number | null>(null);

	const toggleExpand = (id: number) => {
		setExpandedId(expandedId === id ? null : id);
	};

	return (
		<section className="w-full py-8 md:py-16 bg-white flex justify-center items-center min-h-[70vh] lg:h-[100vh]">
			<Container className="px-4 sm:px-6 md:px-8 w-full" size="3">
				<div className="text-center mb-12">
					<Heading
						className="text-center animated-underline text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-[#148696] "
						mb={"4"}
						size={"9"}
					>
						Frequently Asked Questions
					</Heading>
					<p className="text-base text-lg md:text-xl lg:text-2xl text-gray-600">
						Find answers to common questions about our platform
					</p>
				</div>

				<div className="max-w-3xl mx-auto space-y-4">
					<AnimatePresence>
						{faqs.map((faq) => (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm"
								exit={{ opacity: 0, y: -10 }}
								initial={{ opacity: 0, y: 10 }}
								key={faq.id}
								transition={{ duration: 0.3 }}
							>
								<button
									aria-expanded={expandedId === faq.id}
									className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
									onClick={() => toggleExpand(faq.id)}
									type="button"
								>
									<span className="text-lg font-semibold text-gray-900 text-left">
										{faq.question}
									</span>
									<motion.div
										animate={{
											rotate: expandedId === faq.id ? 180 : 0,
										}}
										className="flex-shrink-0 ml-4"
										transition={{ duration: 0.3 }}
									>
										<ChevronDownIcon
											aria-hidden
											className="w-6 h-6 text-[#148696] cursor-pointer"
										/>
									</motion.div>
								</button>

								<AnimatePresence>
									{expandedId === faq.id && (
										<motion.div
											animate={{ opacity: 1, height: "auto" }}
											className="overflow-hidden"
											exit={{ opacity: 0, height: 0 }}
											initial={{ opacity: 0, height: 0 }}
											transition={{ duration: 0.3 }}
										>
											<div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
												<p className="text-gray-600 leading-relaxed">
													{faq.answer}
												</p>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			</Container>
		</section>
	);
}
