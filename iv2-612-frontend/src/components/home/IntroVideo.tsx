import { Heading, Text } from "@radix-ui/themes";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import introPdf from "$src/assets/pdf/April 2026 Issara Institute intro.pdf";

export const IntroVideo: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isMuted, setIsMuted] = useState(true);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		// Start muted so autoplay is allowed by browser policies.
		video.muted = true;
		video.defaultMuted = true;
		video.play().catch(() => {});
	}, []);

	const handleUnmute = () => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = false;
		video.defaultMuted = false;
		video.volume = 1;
		video.play().catch(() => {});
		setIsMuted(false);
	};

	// Mouse tracking for 3D tilt
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const mouseXSpring = useSpring(x);
	const mouseYSpring = useSpring(y);

	const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
	const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;
		x.set(xPct);
		y.set(yPct);
	};

	const handleMouseLeave = () => {
		x.set(0);
		y.set(0);
	};

	return (
		<section
			className="relative min-h-[100vh] bg-[#22333B] overflow-hidden flex items-center justify-center py-24"
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
			ref={containerRef}
		>
			{/* Decorative Pattern - Subtle texture instead of gradients */}
			<div className="absolute inset-0 z-0">
				<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] mix-blend-overlay" />
			</div>

			<div className="container mx-auto relative z-10 px-6">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
					{/* Text Content */}
					<motion.div
						className="lg:col-span-6 order-2 lg:order-1 text-center lg:text-left z-20"
						initial={{ opacity: 0, x: -100 }}
						transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
						whileInView={{ opacity: 1, x: 0 }}
					>
						<Heading
							className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-22 pb-22 tracking-tighter"
							size="9"
						>
							Go Beyond Compliance.
						</Heading>

						<Heading
							className="text-[#148696] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-4 pb-4 tracking-tighter"
							size="8"
						>
							The power of direct worker and community voice and partnership.
						</Heading>

						<Text className="text-white/80 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl block">
							The ground truth that traditional audits miss, and the solutions
							to human rights risk that only trusted on-the-ground partners can
							offer.
						</Text>

						<div className="mt-3 inline-flex flex-col items-start gap-2">
							<a
								className="group inline-flex items-center gap-2 rounded-xl border border-[#148696] bg-[#148696] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00516a] hover:bg-[#00516a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
								download="April 2026 Issara Institute intro"
								href={introPdf}
							>
								<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
									<svg
										aria-hidden="true"
										className="h-3.5 w-3.5"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
										/>
									</svg>
								</span>
								Download the 2-pager
							</a>
							<span className="text-xs text-white/60">PDF quick overview</span>
						</div>
					</motion.div>

					{/* 3D Portal Video Section */}
					<motion.div
						className="lg:col-span-6 order-1 lg:order-2 perspective-[2000px]"
						initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
						transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
						whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
					>
						<motion.div
							className="relative preserve-3d"
							style={{
								rotateX,
								rotateY,
								transformStyle: "preserve-3d",
							}}
						>
							{/* Layered Glass Cards behind video */}
							<motion.div
								animate={{
									y: [0, -40, 0],
									rotate: [5, 8, 5],
								}}
								className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl z-0"
								transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY }}
							/>
							<motion.div
								animate={{
									y: [0, 40, 0],
									rotate: [-5, -8, -5],
								}}
								className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#148696]/10 backdrop-blur-xl border border-white/5 rounded-3xl z-0"
								transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
							/>

							{/* Main Video Portal */}
							<div className="relative z-10 p-1.5 bg-gradient-to-br from-white/20 via-white/5 to-white/20 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
								<div className="relative aspect-video rounded-[2rem] overflow-hidden group">
									<video
										autoPlay
										className="absolute inset-0 w-full h-full object-cover"
										loop
										muted={isMuted}
										playsInline
										ref={videoRef}
										src={`${import.meta.env.VITE_CASCADE_MEDIA_BASE_URL}CASCADE-Explainer-video.mov`}
									>
										<track
											default
											kind="captions"
											label="English"
											src="/captions/cascade-intro-en.vtt"
											srcLang="en"
										/>
									</video>
									{isMuted && (
										<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35">
											<button
												aria-label="Unmute intro video"
												className="inline-flex items-center gap-2 rounded-xl border border-[#148696] bg-[#148696] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00516a] hover:border-[#00516a] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
												onClick={handleUnmute}
												type="button"
											>
												<svg
													aria-hidden="true"
													className="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
												>
													<path
														d="M11 5 6 9H3v6h3l5 4V5Zm5.5 3.5a6 6 0 0 1 0 7m-3-4.5a2 2 0 0 1 0 2"
														stroke="currentColor"
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
													/>
												</svg>
												Unmute video
											</button>
										</div>
									)}
									{/* Interactive Overlay */}
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								</div>
							</div>

							{/* Floating Data Labels */}
							{/* <motion.div
								className="absolute top-1/2 -right-10 bg-[#148696] text-white px-6 py-3 rounded-xl font-bold shadow-2xl z-30 pointer-events-none"
								style={{ translateZ: "100px" }}
							>
								82,000+ WORKERS
							</motion.div> */}
							<motion.div
								className="absolute bottom-10 -left-10 bg-white/10 backdrop-blur-md text-white px-5 py-2 rounded-lg text-xs font-black tracking-widest border border-white/20 z-30 pointer-events-none"
								style={{ translateZ: "50px" }}
							>
								REAL-TIME DATA
							</motion.div>
						</motion.div>
					</motion.div>
				</div>
			</div>
		</section>
	);
};

export default IntroVideo;
