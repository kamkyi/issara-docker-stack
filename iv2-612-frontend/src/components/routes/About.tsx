import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Container, Grid, Heading, Text } from "@radix-ui/themes";
import { motion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useInView } from "react-intersection-observer";
import { api } from "$src/api/axios";
import partner7 from "$src/assets/img/partners/AMKAS.png";
import partner5 from "$src/assets/img/partners/CDI.png";
import partner2 from "$src/assets/img/partners/issara.png";
import partner3 from "$src/assets/img/partners/mib.png";
import partner8 from "$src/assets/img/partners/nomogaia.jpg";
import partner6 from "$src/assets/img/partners/safwa.jpg";
import partner1 from "$src/assets/img/partners/wage_indicator.png";

import ethicalSupplyChainDesigner from "$src/assets/img/thumbnails/ethical-supply-chain-designer.png";
import CTASection from "../home/CTASection";
import AnimatedStickyNavbar from "../navbars/AnimatedStickyNavbar";

interface Partner {
	name: string;
	description: string;
	link?: string;
	linkText?: string;
	image?: string;
	placeholder?: {
		text: string;
		bgColor: string;
		textColor: string;
	};
	dataSection?: string;
}

const PARTNERS: Partner[] = [
	{
		name: "Issara Institute",
		description:
			"Providing the ILM (Inclusive Labor Monitoring) system,  real-time worker voice channels, Issara Academy multi-stakeholder trainings and events on the ground, and the vetting, funding, and capacity building mechanisms for local NGOs and trade union partners.",
		link: "https://www.issarainstitute.org/",
		linkText: "Learn More →",
		image: partner2,
		dataSection: "issara",
	},
	{
		name: "WageIndicator",
		description:
			"WageIndicator shares detailed data on minimum wages and living wages, enabling clear benchmarking of wages against both legal standards and cost-of-living estimates. This helps identify underpayment risks, prioritise action, and track progress towards closing the living wage gap.",
		link: "https://wageindicator.org/work/living-wages/open-access",
		linkText: "Explore living wage data →",
		image: partner1,
		dataSection: "wages",
	},
	{
		name: "Mapped in Bangladesh",
		description:
			"Mapped in Bangladesh (MiB) is a research and data initiative originally designed to systematically map industrial supply chains through credible, ground-verified data. It produces transparent, accessible databases that improve accountability and stakeholder knowledge of production networks. It  is the first-ever digital map of the ready-made garment (RMG) industry of Bangladesh.",
		link: "https://mappedinbangladesh.org/",
		linkText: "Explore the map →",
		placeholder: {
			text: "MiB",
			bgColor: "bg-gray-100",
			textColor: "text-teal-700",
		},
		image: partner3,
	},
	{
		name: "Capacity Development Institute",
		description:
			"CDI is a local labor rights organization, with a particular focus on labor rights. The concept of Capacity development Institute is to emerge from the Labor Union and protect Labor Rights, child labor cases and force labor problems.",
		placeholder: {
			text: "CDI",
			bgColor: "bg-amber-50",
			textColor: "text-amber-700",
		},
		image: partner5,
	},
	{
		name: "Self Administrated Funeral Welfare Association",
		description:
			"SAFWA provides Burmese migrant workers, their families, and relatives with social and health services in Thailand, such as health care, hospitalization support, and other emergency needs.",
		link: "https://www.facebook.com/safwa.rng?mibextid=LQQJ4d",
		linkText: "Visit Facebook page →",
		placeholder: {
			text: "SAFWA",
			bgColor: "bg-purple-50",
			textColor: "text-purple-700",
		},
		image: partner6,
	},
	{
		name: "AMKAS",
		description:
			'Aaprabasi Mahila Kamdar Samuha (AMKAS), or The Returnee Women Migrant Workers\' Group, is a civil society organization led and administered by returnee women migrant workers. AMKAS was founded in 2016 by a group of well-known and experienced Nepali migrant rights activists to promote the rights and interests of Nepali migrant workers in both their home and destination countries, based on the idea that "Migrant Rights are Human Rights."',
		link: "https://amkas.org.np/",
		linkText: "Visit website →",
		placeholder: {
			text: "AMKAS",
			bgColor: "bg-green-50",
			textColor: "text-green-700",
		},
		image: partner7,
	},
	{
		name: "NomoGaia",
		description:
			"NomoGaia is a nonprofit research organization focused on business and human rights. Since 2008, we have developed methodologies and pilot programs for human rights due diligence, grievances, and remediation. Our global team has worked on six continents across industries including mining, manufacturing, trade and logistics, agriculture, energy, and technology.",
		link: "https://nomogaia.org/",
		linkText: "Visit website →",
		placeholder: {
			text: "NomoGaia",
			bgColor: "bg-gray-100",
			textColor: "text-teal-700",
		},
		image: partner8,
	},
];

function PartnerCard({
	partner,
	wagesSectionId,
	sfpSectionId,
}: {
	partner: Partner;
	wagesSectionId: string;
	sfpSectionId: string;
}) {
	const [ref, inView] = useInView({
		triggerOnce: true,
		threshold: 0.2,
	});

	return (
		<motion.section
			animate={inView ? "visible" : "hidden"}
			className={
				"grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-8" +
				(PARTNERS.indexOf(partner) === PARTNERS.length - 1
					? ""
					: " border-b border-gray-200")
			}
			data-section={partner.dataSection}
			id={
				partner.dataSection === "wages"
					? wagesSectionId
					: partner.dataSection === "sfp"
						? sfpSectionId
						: undefined
			}
			initial="hidden"
			ref={ref}
			variants={{
				hidden: { opacity: 0, y: 50 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.6, ease: "easeOut" },
				},
			}}
		>
			{/* Image on Left */}
			<motion.div
				className="order-1"
				transition={{ duration: 0.3 }}
				whileHover={{ scale: 1.15 }}
			>
				{partner.image ? (
					<img
						alt={partner.name}
						className="w-2/5 justify-center mx-auto"
						src={partner.image}
					/>
				) : partner.placeholder ? (
					<div
						className={`w-2/5 justify-center mx-auto ${partner.placeholder.bgColor} rounded-lg p-8 flex items-center justify-center`}
					>
						<Text
							className={`text-4xl font-bold ${partner.placeholder.textColor}`}
						>
							{partner.placeholder.text}
						</Text>
					</div>
				) : null}
			</motion.div>

			{/* Content on Right */}
			<div className="order-2 flex flex-col gap-3">
				<h2 className="text-gray-800 text-2xl font-bold">{partner.name}</h2>
				<p className="text-gray-600 text-lg leading-relaxed">
					{partner.description}
				</p>
				{partner.link && (
					<a
						className="mt-3 inline-block text-sm text-teal-600 hover:underline font-semibold"
						href={partner.link}
						rel="noopener noreferrer"
						target="_blank"
					>
						{partner.linkText || "Learn more →"}
					</a>
				)}
			</div>
		</motion.section>
	);
}

function FaqItem({
	question,
	answer,
}: {
	question: string;
	answer: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
			<button
				className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
				onClick={() => setOpen((v) => !v)}
				type="button"
			>
				<span className="text-lg md:text-xl font-bold text-gray-800">
					{question}
				</span>
				<ChevronDownIcon
					className={`w-5 h-5 text-[#148696] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<div className="px-6 pb-6 text-base md:text-lg text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
					{answer}
				</div>
			)}
		</div>
	);
}

export function About() {
	const wagesSectionId = useId();
	const sfpSectionId = useId();

	const { scrollY } = useScroll();
	const imageY = useTransform(scrollY, [0, 500], [0, -50]);

	const [heroRef, heroInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	const [statsRef, statsInView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const target = params.get("scroll");
		if (!target) return;
		const el = document.querySelector(`[data-section="${target}"]`);
		if (el) {
			setTimeout(() => {
				(el as HTMLElement).scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 100);
			// remove the scroll param from the URL without reloading
			params.delete("scroll");
			const newSearch = params.toString();
			const newUrl =
				window.location.pathname + (newSearch ? `?${newSearch}` : "");
			window.history.replaceState({}, "", newUrl);
		}
	}, []);

	// Live recruitment metrics payload (used for multiple stats)
	const [, setRecruitmentMetrics] = useState<Record<string, any> | null>(null);

	useEffect(() => {
		let mounted = true;
		const API_BASE =
			import.meta.env.VITE_APP_CASCADE_API_URL ??
			"http://localhost:3000/api/v1";
		const url = `${API_BASE}/social-responsibility/labor/recruitment-metrics`;

		async function load() {
			try {
				const res = await api.get(url);
				const payload = (res.data as any).data ?? res.data;
				if (mounted) setRecruitmentMetrics(payload || null);
			} catch (e) {
				// ignore failures and keep null
			}
		}

		load();
		return () => {
			mounted = false;
		};
	}, []);

	return (
		<div className="overflow-hidden w-full">
			<AnimatedStickyNavbar />

			{/* Hero Section */}
			<div className="relative w-full min-h-screen flex items-center bg-gradient-to-bl from-[#004A60] via-blue-50 to-amber-50">
				<Container className="w-full px-4 sm:px-6 md:px-8" size="4">
					<motion.div
						animate={heroInView ? "visible" : "hidden"}
						className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-20"
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
								<Heading
									className="text-black font-bold "
									mb={"4"}
									size={{ md: "8", lg: "9", initial: "8" }}
									style={{
										fontFamily: "DM Sans",
									}}
								>
									Transforming Compliance into a Virtuous Cycle
								</Heading>
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
								<Text
									className=" text-[#148696] leading-relaxed mb-8 max-w-lg block"
									size={"4"}
								>
									CASCADE is a global network of values-aligned, data-driven
									civil society organizations (CSOs) dedicated to improving the
									lives of people in supply chains through worker voice,
									partnership, and innovation. Our goal is to shift corporate
									focus from risk avoidance to a virtuous cycle of continuous
									improvement, where ethical business conduct is recognized and
									incentivized.
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
							></motion.div>
						</motion.div>

						{/* Circular Image Content */}
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
								className="relative w-full max-w-lg aspect-square"
								style={{ y: imageY }}
							>
								<div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-8 border-white">
									<motion.img
										alt="supply-chain-team"
										className="w-full h-full object-cover scale-150"
										src={ethicalSupplyChainDesigner}
										transition={{ duration: 0.3 }}
										whileHover={{ scale: 1.2 }}
									/>
								</div>
								{/* Decorative circles */}
								<div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-400 rounded-full opacity-60 blur-xl" />
								<div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#004A60] rounded-full opacity-50 blur-xl" />
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
					<ChevronDownIcon className="w-8 h-8 text-teal-600" />
				</motion.div>
			</div>

			{/* Stats Section */}
			<div className="bg-[#004A60] text-white py-20">
				<Container size="4">
					<motion.div
						animate={statsInView ? "visible" : "hidden"}
						initial="hidden"
						ref={statsRef}
						variants={{
							visible: { transition: { staggerChildren: 0.2 } },
						}}
					>
						<motion.div
							className="text-center mb-12"
							variants={{
								hidden: { opacity: 0, y: 30 },
								visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
							}}
						>
							<h2
								className="text-4xl md:text-5xl font-bold mb-4"
								style={{
									color: "#ffffff",
								}}
							>
								Our Impact
							</h2>
							<span className="text-lg text-white  block">
								<b>Impact</b> is achieved through workers empowerment and
								partnership with Civil Society Organizations and progressive
								businesses. We provide the infrastructure for businesses to
								discover risks early and the tools to fix them collaboratively,
								ensuring that compliance is an investment in supply chain
								resilience, not just a cost of doing business.
							</span>
						</motion.div>

						<Grid className="mt-12" columns={{ initial: "2", md: "5" }} gap="8">
							<motion.div
								className="text-center"
								variants={{
									hidden: { opacity: 0, y: 30 },
									visible: { opacity: 1, y: 0 },
								}}
							>
								<div className="text-5xl md:text-4xl font-bold mb-2 text-white">
									{/*
									{recruitmentMetrics?.workers_receiving_remediation != null
										? `${new Intl.NumberFormat().format(
											recruitmentMetrics.workers_receiving_remediation,
										)}+`
										: `${new Intl.NumberFormat().format(480000)}+`}
									*/}
									{`${new Intl.NumberFormat().format(480000)}+`}
								</div>
								<div className="text-teal-200">
									Number of workers with labor issues identified and remediated
									(2021-2025)
								</div>
							</motion.div>

							<motion.div
								className="text-center"
								variants={{
									hidden: { opacity: 0, y: 30 },
									visible: { opacity: 1, y: 0 },
								}}
							>
								<div className="text-5xl md:text-4xl font-bold mb-2 text-white">
									{/*
									{recruitmentMetrics?.strategic_partners_count != null
										? `${new Intl.NumberFormat().format(
											recruitmentMetrics.strategic_partners_count,
										)}+`
										: `${new Intl.NumberFormat().format(15)}+`}
									*/}
									{`${new Intl.NumberFormat().format(15)}+`}
								</div>
								<div className="text-teal-200">
									Global Brands and Retailers - Strategic Partners
								</div>
							</motion.div>

							<motion.div
								className="text-center"
								variants={{
									hidden: { opacity: 0, y: 30 },
									visible: { opacity: 1, y: 0 },
								}}
							>
								<div className="text-5xl md:text-4xl font-bold mb-2 text-white">
									{/*
									{recruitmentMetrics?.industries_count != null
										? `${new Intl.NumberFormat().format(
											recruitmentMetrics.industries_count,
										)}+`
										: `${new Intl.NumberFormat().format(10)}+`}
									*/}
									{`${new Intl.NumberFormat().format(10)}+`}
								</div>
								<div className="text-teal-200">Industries covered</div>
							</motion.div>

							<motion.div
								className="text-center"
								variants={{
									hidden: { opacity: 0, y: 30 },
									visible: { opacity: 1, y: 0 },
								}}
							>
								<div className="text-5xl md:text-4xl font-bold mb-2 text-white">
									{/*
									{recruitmentMetrics?.suppliers_representatives_trained != null
										? `${new Intl.NumberFormat().format(
											recruitmentMetrics.suppliers_representatives_trained,
										)}+`
										: `${new Intl.NumberFormat().format(800)}+`}
									*/}
									{`${new Intl.NumberFormat().format(800)}+`}
								</div>
								<div className="text-teal-200">
									Suppliers representatives trained
								</div>
							</motion.div>

							<motion.div
								className="text-center"
								variants={{
									hidden: { opacity: 0, y: 30 },
									visible: { opacity: 1, y: 0 },
								}}
							>
								<div className="text-5xl md:text-4xl font-bold mb-2 text-white">
									{/*
									{recruitmentMetrics?.recruitment_agencies_representatives_trained !=
										null
										? `${new Intl.NumberFormat().format(
											recruitmentMetrics.recruitment_agencies_representatives_trained,
										)}+`
										: `${new Intl.NumberFormat().format(1900)}+`}
									*/}
									{`${new Intl.NumberFormat().format(1900)}+`}
								</div>
								<div className="text-teal-200">
									Recruitment agencies representatives trained
								</div>
							</motion.div>
						</Grid>
					</motion.div>
				</Container>
			</div>

			{/* Why CASCADE Section */}
			<div className="bg-gray-50 py-20">
				<Container className="px-4 sm:px-6 md:px-8 w-full" size="3">
					<motion.div
						initial="hidden"
						variants={{
							hidden: { opacity: 0 },
							visible: {
								opacity: 1,
								transition: { staggerChildren: 0.15 },
							},
						}}
						viewport={{ once: true, amount: 0.2 }}
						whileInView="visible"
					>
						<motion.div
							className="text-center mb-12"
							variants={{
								hidden: { opacity: 0, y: 20 },
								visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
							}}
						>
							<h2 className="text-4xl md:text-5xl font-bold text-[#148696] mb-4 animated-underline inline-block">
								Why CASCADE?
							</h2>
							<p className="text-lg md:text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
								Ongoing worker engagement yields better impact and better data
							</p>
						</motion.div>

						<div className="flex flex-col gap-8 max-w-4xl mx-auto">
							<motion.p
								className="text-base md:text-lg text-gray-700 leading-relaxed text-center"
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
								}}
							>
								Traditional audits frequently fail to uncover forced labor and
								other labor abuses, leading to labor-washing and corporate
								responsible sourcing decisions being based on flawed, unreliable
								data.
							</motion.p>

							<motion.p
								className="text-base md:text-lg text-gray-700 leading-relaxed text-center"
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
								}}
							>
								The advantage of collaborating with a network of data-forward
								independent frontline organizations is that we have a clear,
								firsthand view of the constantly changing on-the-ground reality.
								We are trusted by workers and well positioned to help drive
								remediation and continuous improvement. CASCADE brings grounded
								data and action together into a single platform for responsible
								business and trade.
							</motion.p>

							<motion.p
								className="text-base md:text-lg text-gray-700 leading-relaxed text-center"
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
								}}
							>
								The 'engine' of the CASCADE platform is the CASCADE Index: a
								dynamic, real-time measure of a company's social performance.
								Unlike traditional static audits, the Index captures a company's
								'rate of change,' rewarding the positive momentum of those
								actively improving their supply chains.
							</motion.p>
						</div>

						{/* FAQ Accordion */}
						<div className="mt-10 flex flex-col gap-4 max-w-4xl mx-auto">
							{[
								{
									question: "What data contributes to the CASCADE Index?",
									answer: (
										<>
											<p className="mb-4">
												The Index is powered by two distinct data streams:
											</p>
											<p className="mb-3">
												<span className="font-semibold text-[#148696]">
													Worker-Validated Remediation:
												</span>{" "}
												Direct evidence of how effectively and timely a company
												responds to worker engagement and resolves reported
												issues and implements corrections that really address
												the issue, and is verified by workers.
											</p>
											<p>
												<span className="font-semibold text-[#148696]">
													The CASCADE Marketplace:
												</span>{" "}
												A proactive tools and solutions-oriented resource for
												'Continuous Improvement'. Companies can gain access to
												CASCADE Network services and support to improve their
												own performance by investing in capacity building,
												ethical policy implementation, and worker engagement
												activities.
											</p>
										</>
									),
								},
								{
									question:
										"What makes the CASCADE Index unique and impactful?",
									answer: (
										<p>
											What sets the CASCADE Index apart is its ability to
											integrate Worker Voice to validate actions and
											improvements taken by a business. Typically a buyer's main
											source of information that corrective actions have been
											taken is self-reporting from the business. Now, in
											addition to the business response, you can have greater
											assurances by also hearing from workers. Workers
											themselves can confirm through independent channels that
											the issue has actually been resolved — supporting efforts
											to get to the root cause so that issues don't repeat. This
											focus on the speed and quality of a supplier's response to
											worker-reported risks ensures that the scoring reflects
											the lived reality on the ground, and how dynamic workplace
											and recruitment risk can be. By prioritizing these
											authentic feedback loops, the Index identifies resilient
											suppliers who don't just hide problems, but have the
											systems in place to fix them. By linking the Index
											directly to the Marketplace, CASCADE transforms compliance
											from a checklist into a virtuous cycle: companies use the
											Marketplace to access expert-led activities and support,
											which in turn drives their Index score upward, signaling
											resilience and ethical leadership to the global market.
										</p>
									),
								},
							].map((item, i) => (
								<FaqItem
									answer={item.answer}
									key={i}
									question={item.question}
								/>
							))}
						</div>
					</motion.div>
				</Container>
			</div>

			{/* Feature Sections */}
			<div className="bg-white py-20">
				<Container
					className="mt-12 mb-12 px-4 sm:px-6 md:px-8 w-full"
					data-section="core-partners"
					size="4"
				>
					<div className="w-full text-center mb-4">
						<h2 className="text-5xl font-bold animated-underline">
							CASCADE Core Partners
						</h2>
					</div>
					<div className="flex flex-col gap-16">
						{PARTNERS.map((partner) => (
							<PartnerCard
								key={partner.name}
								partner={partner}
								sfpSectionId={sfpSectionId}
								wagesSectionId={wagesSectionId}
							/>
						))}
					</div>
				</Container>
				<div className="flex w-full text-center justify-center mt-12">
					<a
						className="bg-[#148696] p-4 rounded-lg font-semibold hover:bg-[#004A60] text-white transition-colors"
						href={"/book-a-demo"}
						style={{
							display: "block",
							textDecoration: "none",
						}}
					>
						Book a Demo
					</a>
				</div>
			</div>

			<CTASection />
		</div>
	);
}
