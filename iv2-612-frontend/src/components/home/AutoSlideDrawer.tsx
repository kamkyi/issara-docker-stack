import {
	ChevronLeftIcon,
	ChevronRightIcon,
	PauseIcon,
	PlayIcon,
} from "@radix-ui/react-icons";
import { Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import companyDashboard from "$src/assets/img/thumbnails/slide-1.jpg";
import dashboardChart from "$src/assets/img/thumbnails/slide-2.png";
import dashboard from "$src/assets/img/thumbnails/slide-3.png";
import talkingWalkers from "$src/assets/img/thumbnails/slide-4.jpg";

import styles from "./AutoSlideDrawer.module.css";

const SLIDES = [
	{
		image: companyDashboard,
		title: "Identify risk from worker voice",
		description: [
			"Credible, independent, and real-time data based on insights from workers and communities.",
			"Visibility of changing ethical conditions and trends across supply chains, with data and reporting that matter to your company.",
			"Tools for reporting, social compliance, and trade facilitation",
		],
		cta: "Learn More",
	},
	{
		image: dashboardChart,
		title: "Select and implement solutions from the CASCADE Marketplace",
		description: [
			"Partnerships with data-driven non-profits on the ground for both data and action, including safeguarded remediation and technical support to suppliers",
			"Easily connect with best-in-class capacity building, analysis, and technical support from a range of vetted, independent non-profit partners.",
			"Actions and solutions that address the real risks - not just activities for the sake of activities",
		],
		cta: "Explore Features",
	},
	{
		image: dashboard,
		title: "Receive worker validation of remediation and improvement",
		description: [
			"What no audits can provide: credible validation of remediation by impacted workers, as well as by suppliers",
			"The CASCADE Index increases as actions are taken to address risks identified by worker voice - meeting companies where they are at and measuring continuous improvement",
			"Case tracking, benchmarking, and monitoring that you can be confident in",
		],
		cta: "Get Started",
	},
	{
		image: talkingWalkers,
		title:
			"Ongoing assurances and positive impact provide market and trade advantages",
		description: [
			"Unprecedented data for responsible purchasing practices",
			"Design and build the ethical supply chain of your dreams with the CASCADE Index and Marketplace",
			"Social compliance, reporting, partnership, and improvement made easy - with real-time data, credible forced labor signals, and early warning systems that identify and address risks before they escalate",
		],
		cta: "Get Started",
	},
];

export default function AutoSlideDrawer() {
	const [index, setIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(true);

	useEffect(() => {
		if (!isPlaying) return;
		const timer = setInterval(() => {
			setIndex((i) => (i + 1) % SLIDES.length);
		}, 5000);
		return () => clearInterval(timer);
	}, [isPlaying]);

	const prev = () => {
		setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
		setIsPlaying(false);
	};

	const next = () => {
		setIndex((i) => (i + 1) % SLIDES.length);
		setIsPlaying(false);
	};

	return (
		<div className={styles.wrapper}>
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
						className="text-center text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-[#148696] "
						mb={"4"}
						mt={"8"}
						size={"9"}
					>
						How CASCADE works
					</Heading>
				</motion.div>

				<motion.p
					className="text-base text-lg md:text-xl lg:text-2xl text-gray-600 text-center mb-8 sm:mb-12 px-2 sm:px-0"
					variants={{
						hidden: { opacity: 0, y: 52 },
						visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
					}}
				>
					The CASCADE continuous improvement loop - for buyers, suppliers, and
					recruitment agencies
				</motion.p>
			</motion.div>

			<div className={styles.container}>
				<div className={styles.slidesWrapper}>
					{SLIDES.map((slideItem, i) => (
						<motion.div
							animate={{
								opacity: i === index ? 1 : 0,
								x: i === index ? 0 : -20,
							}}
							aria-hidden={i !== index}
							className={styles.slide}
							initial={false}
							key={i}
							style={{
								pointerEvents: i === index ? "auto" : "none",
								zIndex: i === index ? 1 : 0,
								visibility: i === index ? "visible" : "hidden",
							}}
							transition={{ duration: 0.5 }}
						>
							<div className={styles.imageArea}>
								<img alt={slideItem.title} src={slideItem.image} />
							</div>
							<div className={styles.textArea}>
								<Heading className={styles.title} size={"7"}>
									{i + 1}. {slideItem.title}
								</Heading>
								<div className={styles.description}>
									{slideItem.description.map((d, idx) => {
										return (
											<div
												className={
													idx !== slideItem.description.length - 1
														? "border-b border-gray-100 py-2"
														: "py-2"
												}
												key={idx}
												style={{
													listStyle: "number",
												}}
											>
												{d}
											</div>
										);
									})}
								</div>
								{/* <a className={styles.cta} href="#">
									{slideItem.cta}
								</a> */}
							</div>
						</motion.div>
					))}
				</div>

				<div className={styles.controls}>
					<button
						aria-label="Previous slide"
						className={styles.navButton}
						onClick={prev}
					>
						<ChevronLeftIcon height={20} width={20} />
					</button>

					<div className={styles.dots}>
						{SLIDES.map((_, i) => (
							<button
								aria-label={`Go to slide ${i + 1}`}
								className={`${styles.dot} ${i === index ? styles.active : ""}`}
								key={i}
								onClick={() => {
									setIndex(i);
									setIsPlaying(false);
								}}
							/>
						))}
					</div>

					<button
						aria-label="Next slide"
						className={styles.navButton}
						onClick={next}
					>
						<ChevronRightIcon height={20} width={20} />
					</button>

					<button
						aria-label={isPlaying ? "Pause" : "Play"}
						className={styles.togglePlay}
						onClick={() => setIsPlaying(!isPlaying)}
					>
						{isPlaying ? (
							<PauseIcon height={18} width={18} />
						) : (
							<PlayIcon height={18} width={18} />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
