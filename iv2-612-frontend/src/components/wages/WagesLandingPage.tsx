import { Heading } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
import { WagesOurImpactSection } from "./WagesOurImpactSection";

const CTASection = lazy(() => import("../home/CTASection"));
// import DemographicComponent from "../labor/DemographicComponent";

const WagesViolationsSection = lazy(() =>
	import("./WagesViolationsSection").then((mod) => ({
		default: (mod as any).WagesViolationsSection,
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

export const WagesLandingPage = () => {
	const [heroUrl, setHeroUrl] = useState<string>("");

	useEffect(() => {
		let mounted = true;
		import("$src/assets/img/banner-image/for-wages.png").then((m) => {
			if (mounted) setHeroUrl((m as any).default ?? m);
		});
		return () => {
			mounted = false;
		};
	}, []);
	return (
		<div className="bg-white w-full">
			{/* Hero Section */}
			<div className="bg-[#004A60] px-4 h-16" />

			<div
				className="relative h-[85vh] sm:h-[90vh] md:h-[100vh] bg-scroll sr-cover-image"
				style={{
					background: heroUrl ? `url(${heroUrl})` : undefined,
				}}
			>
				{/* Dark overlay */}
				<div className="absolute inset-0 bg-black/40" />
				{/* Centered overlay text */}
				<div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
					<Heading
						className="text-white leading-tight tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl max-w-5xl"
						size="9"
					>
						Fair wages{" "}
						<span className="text-yellow-100">
							and transparency to ensure decent work and responsible procurement
						</span>
					</Heading>
				</div>
			</div>
			<div className="relative flex items-center justify-center bg-gradient-to-br from-[#148696] to-[#0d5f6d] text-white py-8">
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
								Ensuring Fair Compensation and Transparent Payment in{" "}
								<p className="text-yellow-100">Wages & Benefits</p>
							</Heading>

							<p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
								Every worker deserves fair and timely compensation for their
								work. Our platform monitors wage violations—from payment delays
								to unauthorized deductions—and tracks how businesses respond to
								ensure
								<span className="text-yellow-100">
									&nbsp;workers receive the compensation they've earned.
								</span>
							</p>
						</motion.div>
					</motion.div>
				</div>
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
								Fair Wages are a Fundamental Right
								<br />
								<span className="text-[#148696] font-semibold">
									Not a Business Privilege
								</span>
							</Heading>
						</motion.div>

						<motion.div className="my-8" variants={itemVariants}>
							<Text
								className="text-base md:text-lg text-gray-700 leading-relaxed max-w-4xl"
								size="4"
							>
								Workers deserve to be paid fairly and on time for their work.
								Our platform exposes wage violations—from payment delays to
								below-minimum wages—and tracks how businesses respond to ensure
								workers receive their rightful compensation.{" "}
								<span className="text-[#148696] font-semibold">
									We believe economic justice drives social progress, and fair
									wages drive economic dignity.
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
								Every worker deserves fair compensation for their contribution
							</Heading>
						</motion.div>
					</motion.div>
				</Container>
			</div> */}
			{/* <DemographicComponent /> */}
			{/* <OutreachEffectivenessSection /> */}
			<Suspense
				fallback={<div className="py-12 text-center">Loading sections…</div>}
			>
				<WagesViolationsSection />
				{/* <WagesProcessOfChange /> */}
				<WagesOurImpactSection categoryIds={[4]} />
				<CTASection />
			</Suspense>
		</div>
	);
};
