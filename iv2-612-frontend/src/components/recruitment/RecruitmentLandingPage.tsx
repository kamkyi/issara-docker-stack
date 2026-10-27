import { ChatBubbleIcon } from "@radix-ui/react-icons";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";

// import { useRecruitmentMetrics } from "$src/hooks/useSocialResponsibility";

const CTASection = lazy(() => import("../home/CTASection"));
const EthicalRecruitmentMap = lazy(() =>
	import("./EthicalRecruitmentMap").then((mod) => ({
		default: mod.EthicalRecruitmentMap,
	})),
);
// import WorkerVoiceCallChart from "../home/WorkerVoiceChart";
// import GoldenDreamsSection from "./GoldenDreamsSection";
const OurImpactSection = lazy(() =>
	import("./OurImpactSection").then((mod) => ({
		default: mod.OurImpactSection,
	})),
);

const RecruitmentViolationsSection = lazy(() =>
	import("./RecruitmentViolationsSection").then((mod) => ({
		default: (mod as any).RecruitmentViolationsSection,
	})),
);

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
		},
	},
};

export const RecruitmentLandingPage = () => {
	// const { data: metrics, isLoading } = useRecruitmentMetrics();

	const [heroUrl, setHeroUrl] = useState<string>("");

	useEffect(() => {
		let mounted = true;
		import("$src/assets/img/banner-image/workers-and-RA.jpg").then((m) => {
			if (mounted) setHeroUrl((m as any).default ?? m);
		});
		return () => {
			mounted = false;
		};
	}, []);

	// const brokerFeesAmount =
	// 	metrics?.data?.recruitment_related_fees_detected_and_intercepted ?? 151665;
	// const remediationAmount =
	// 	metrics?.data?.remediation_for_recruitment_fees_and_cases ?? 1988760;

	return (
		<div className="bg-white w-full">
			<div className="bg-[#004A60] px-4 h-16" />
			<div
				className="relative h-[85vh] sm:h-[90vh] md:h-[100vh] bg-scroll md:bg-fixed sr-cover-image"
				style={{
					background: heroUrl ? `url(${heroUrl})` : undefined,
					backgroundColor: heroUrl ? undefined : "#08393b",
				}}
			>
				{/* Dark overlay */}
				<div className="absolute inset-0 bg-black/40" />
				{/* Heading - positioned at top */}
				<div className="absolute inset-0 flex flex-col items-center justify-start px-4 text-center pt-20 sm:pt-24 md:pt-52">
					<Heading
						className="text-white leading-tight tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl max-w-5xl"
						size="9"
					>
						<span className="text-yellow-100">Worker-validated</span> debt-free
						labor recruitment, down to the first mile
					</Heading>
				</div>
				{/* Paragraph - shows on scroll */}
				{/* <motion.div
					className="absolute bottom-0 left-0 right-0 p-4 md:p-0"
					initial="hidden"
					variants={itemVariants}
					viewport={{ once: true, margin: "-200px" }}
					whileInView="visible"
				>
					<p className="border-l-4 py-3 sm:py-4 md:py-5 px-3 sm:px-4 text-white w-full max-w-2xl md:ml-4 text-sm sm:text-base md:text-lg lg:text-xl font-light leading-relaxed">
						Social risk has emerged as a premier and arguably defining,
						challenge for global supply chains in 2025, driven by a convergence
						of intense regulatory scrutiny, heightened consumer awareness and
						rampant unethical labor practices.
					</p>
				</motion.div> */}
			</div>
			<div className="relative flex justify-center items-center bg-gradient-to-br from-[#148696] to-[#0d5f6d] text-white py-8">
				<div className="max-w-[1200px] px-4">
					<motion.div
						animate="visible"
						initial="hidden"
						variants={containerVariants}
					>
						<motion.div className="text-center mb-8" variants={itemVariants}>
							<Heading
								className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight"
								mb={"6"}
								size="8"
							>
								Detecting and eliminating labor recruitment risk before it
								happens is better than paying the price later.
							</Heading>
							<Text className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
								This goes for businesses and workers alike. Here's how we do it
								and what we're learning in the CASCADE Community about
								<span className="text-yellow-100">
									&nbsp;detecting and eliminating exploitative recruitment in
									global supply chains.
								</span>
							</Text>
						</motion.div>
					</motion.div>
				</div>
			</div>

			{/* Broker Fees Interception Section — O1 */}
			<div className="bg-gradient-to-b from-gray-50 to-white py-16 px-4">
				<Container size="4">
					<motion.div
						className="mb-12"
						initial="hidden"
						variants={itemVariants}
						viewport={{ once: true }}
						whileInView="visible"
					>
						<Heading
							className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-4 leading-tight"
							mb={"4"}
							size="8"
						>
							Intercepting illicit brokers prior to migration
						</Heading>
						<Text
							className="text-gray-600 text-base sm:text-lg max-w-3xl"
							size="4"
						>
							Leveraging our deep expertise in complex migration corridors, our
							teams and networks on the ground can detect and intervene on
							illicit recruitment fees before workers even cross a border. By
							intercepting exploitative brokering at the first mile, we ensure
							workers arrive at their destination debt-free. Our proven
							methodology—built on real-time worker voice and recruitment agency
							vetting and capacity building—is designed to be adaptable across
							diverse legal and geographic contexts, securing ethical labor
							chains from origin to destination.
						</Text>
					</motion.div>

					<div className="grid md:grid-cols-2 gap-6 items-stretch">
						{/*
						{/* Box 1: Metric (commented out to preserve markup for future) */}
						{/* <motion.div
							className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300"
							initial="hidden"
							style={{ minHeight: "380px" }}
							variants={itemVariants}
							viewport={{ once: true }}
							whileInView="visible"
						>
							<div className="absolute inset-0 bg-cover bg-center">
								<div className="absolute inset-0 bg-gradient-to-br from-[#148696]/90 to-[#0d5f6d]/90" />
							</div>
							<div className="relative z-10 p-6 sm:p-8 h-full flex flex-col justify-between">
								<Heading
									className="text-white text-base sm:text-lg font-bold leading-tight"
									size="7"
								>
									Illegal Broker Fees Detected &amp; Intercepted
								</Heading>

								<div className="text-center">
									{isLoading ? (
										<div className="h-10 w-32 bg-white/20 animate-pulse rounded mx-auto" />
									) : (
										<Text
											className="text-2xl sm:text-3xl md:text-4xl font-black text-white block"
											size="9"
										>
											$ {brokerFeesAmount.toLocaleString()}
										</Text>
									)}
								</div>
								<Text className="text-white" size="4">
									Protecting workers from exploitative recruitment fees and
									ensuring ethical hiring practices.
								</Text>
								<Text className="text-sm text-white/80 text-end">
									From <b>2023</b> to present
								</Text>
							</div>
						</motion.div> */}
						{/* Box 2: Country Map */}

						<motion.div
							className="rounded-lg hover:shadow-xl overflow-hidden col-span-2"
							initial="hidden"
							style={{ minHeight: "380px" }}
							variants={itemVariants}
							viewport={{ once: true }}
							whileInView="visible"
						>
							<Suspense
								fallback={
									<div
										className="h-full w-full bg-gray-100 animate-pulse rounded-lg"
										style={{ minHeight: "380px" }}
									/>
								}
							>
								<EthicalRecruitmentMap />
							</Suspense>
						</motion.div>
					</div>
				</Container>
			</div>

			{/* Mission Section */}
			{/* <div className="bg-white px-4 py-16">
				<Container size="4">
					<motion.div
						initial="hidden"
						variants={containerVariants}
						viewport={{ once: true }}
						whileInView="visible"
					>
						<motion.div className="mb-8" variants={itemVariants}>
							<Heading
								className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black leading-tight tracking-tight mb-4"
								size="8"
							>
								Ethical Recruitment is a Human Right
								<br />
								<span className="text-[#148696] font-semibold">
									Not a Privilege
								</span>
							</Heading>
						</motion.div>

						<motion.div className="my-8" variants={itemVariants}>
							<Text
								className="text-base md:text-lg text-gray-700 leading-relaxed max-w-4xl"
								size="4"
							>
								Workers deserve fair treatment from the moment they're hired.
								Our platform exposes recruitment violations—from excessive fees
								to document retention—and tracks how businesses respond.{" "}
								<span className="text-[#148696] font-semibold">
									We believe transparency drives accountability, and
									accountability drives change.
								</span>
							</Text>
						</motion.div>

						<motion.div
							className="my-8 sm:my-10 p-4 sm:p-6 bg-[#f0f9fa] border-l-4 border-[#148696] rounded"
							variants={itemVariants}
						>
							<Heading
								className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#148696] leading-relaxed font-semibold"
								size="5"
							>
								Every worker deserves protection from the moment they sign up
							</Heading>
						</motion.div>
					</motion.div>
				</Container>
			</div> */}
			{/* <WorkerVoiceCallChart /> */}
			<Suspense
				fallback={<div className="py-16 text-center">Loading sections…</div>}
			>
				<RecruitmentViolationsSection />
				{/* <RecruitmentProcessOfChange /> */}
				<OurImpactSection
					categoryIds={[1]}
					subtext={
						"The CASCADE Network is highly proficient at detecting exploitative labor recruitment, due to our presence in both origin and production countries, and having the trust of workers. However, remediating exploitative labor recruitment is challenging without the commitments of global brands, retailers, and producers to ensure that no workers are having to pay for their job. Many of these cases were reported from workers in sites where companies did not have responsible recruitment policies. The quality of recruitment-related remediation outcomes are improving over time, but more business commitments are needed to eliminate debt bondage in supply chains, down to the first mile."
					}
					title={
						<>
							Our Impact:{" "}
							<span className="text-[#148696]">
								De-risking Labor Recruitment
							</span>
						</>
					}
				/>

				{/* Worker Voices Section */}
				<div className="bg-gradient-to-br from-gray-50 to-gray-100 py-20 px-4">
					<Container size="4">
						<motion.div
							initial="hidden"
							variants={{
								hidden: { opacity: 0 },
								visible: {
									opacity: 1,
									transition: { staggerChildren: 0.2 },
								},
							}}
							viewport={{ once: true }}
							whileInView="visible"
						>
							<motion.div className="mb-16" variants={itemVariants}>
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
									className="text-lg md:text-xl text-gray-600 mx-auto leading-relaxed text-center block"
									size="4"
								>
									Real voices, real experiences, real change. These are the
									stories that drive our mission to create safer, fairer
									recruitment processes across global supply chains.
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
												src="https://www.youtube.com/embed/J5dFAAS71cQ?si=t2xA5YQwRl7axtRc"
												title="Worker Experiences with Recruitment"
											/>
										</div>
										<div className="p-6">
											<Heading
												className="text-xl font-bold text-gray-900 uppercase"
												mb={"4"}
												size="5"
											>
												Debt Bondage & Recruitment Fees
											</Heading>
											<Text className="text-gray-600 leading-relaxed" size="3">
												Migrant workers share their experiences with recruitment
												agents, the fees they were charged, and the profound
												impact of debt on their lives and families before and
												after remediation.
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
												className="w-full h-full border-0"
												src="https://www.youtube.com/embed/QNiCdzLqJOo?si=oQSWuLFtj2xGKySz"
												title="The Journey to Ethical Recruitment"
											/>
										</div>
										<div className="p-6">
											<Heading
												className="text-xl font-bold text-gray-900 uppercase"
												mb={"4"}
												size="5"
											>
												The Path to Fair Hiring
											</Heading>
											<Text className="text-gray-600 leading-relaxed" size="3">
												Discover the real-life impact of ethical recruitment
												practices as workers discuss how transparent hiring
												processes and fee-free migration have positively changed
												their employment journey.
											</Text>
										</div>
									</motion.div>
								</div>
							</motion.div>
						</motion.div>
					</Container>
				</div>

				{/* <GoldenDreamsSection /> */}
				<CTASection />
			</Suspense>
		</div>
	);
};
