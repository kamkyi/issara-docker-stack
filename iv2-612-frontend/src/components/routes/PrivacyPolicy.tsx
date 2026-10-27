import { motion, type Variants } from "framer-motion";
import Logo from "$src/assets/img/logo.png";
import {
	termsSections as sections,
	termsEffectiveDate,
	termsLastUpdated,
} from "$src/data/termsSections";

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.45, ease: "easeOut" },
	},
};

const stagger: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.08 } },
};

export function PrivacyPolicy() {
	return (
		<div>
			{/* Header */}
			<header className="bg-white border-b border-[#D2D2D2] shadow-sm sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-l h-16 flex items-center justify-between">
					<a aria-label="Go to CASCADE home" href="/">
						<img alt="CASCADE" className="h-8 w-auto" src={Logo} />
					</a>
					<span className="text-sm font-medium text-[#148696]">
						Privacy Policy
					</span>
				</div>
			</header>

			{/* Hero */}
			<div className="bg-[#004A60] py-16">
				<div className="max-w-6xl mx-auto px-l">
					<motion.div animate="visible" initial="hidden" variants={stagger}>
						<motion.p
							className="text-[rgba(20,134,150,0.6)] text-sm font-semibold uppercase tracking-widest mb-3"
							variants={fadeUp}
						>
							Legal
						</motion.p>
						<motion.h1
							className="font-heading text-4xl font-semibold text-white mb-4 leading-tight"
							variants={fadeUp}
						>
							CASCADE Data Privacy Policy
						</motion.h1>
						<motion.p
							className="text-gray-300 text-base max-w-[36rem]"
							variants={fadeUp}
						>
							Please review this policy carefully before signing in to CASCADE.
							It explains how Issara Institute collects, uses, and protects your
							data.
						</motion.p>
						<motion.p className="text-[#8A979C] text-sm mt-4" variants={fadeUp}>
							Last updated: {termsLastUpdated} · Effective: {termsEffectiveDate}
						</motion.p>
					</motion.div>
				</div>
			</div>

			{/* Body */}
			<div className="max-w-6xl mx-auto px-l py-12">
				<div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
					{/* Content — 3/5 */}
					<motion.div
						animate="visible"
						className="lg:col-span-3"
						initial="hidden"
						variants={stagger}
					>
						<div className="space-y-6">
							{sections.map((section) => (
								<motion.div
									className="rounded-2xl border border-[#D2D2D2] bg-white p-l shadow-sm"
									id={`section-${section.number}`}
									key={section.number}
									variants={fadeUp}
								>
									<div className="flex items-start gap-m">
										<span className="shrink-0 text-xs font-semibold text-[#148696] bg-[rgba(20,134,150,0.1)] rounded-lg px-2.5 py-1 mt-0.5 tabular-nums">
											{section.number}
										</span>
										<div className="flex-1">
											<h2 className="font-heading text-lg font-semibold mb-3">
												{section.title}
											</h2>
											<p className="text-[#56666C] text-sm leading-relaxed">
												{section.content}
											</p>
											{section.list && (
												<ul className="mt-3 space-y-2">
													{section.list.map((item) => (
														<li
															className="flex items-start gap-2 text-sm text-[#56666C]"
															key={item}
														>
															<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#148696]" />
															{item}
														</li>
													))}
												</ul>
											)}
											{section.subsections?.map((sub) => (
												<div className="mt-4" key={sub.title}>
													<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">
														{sub.title}
													</h3>
													<ul className="space-y-2">
														{sub.items.map((item) => (
															<li
																className="flex items-start gap-2 text-sm text-[#56666C]"
																key={item}
															>
																<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#148696]/60" />
																{item}
															</li>
														))}
													</ul>
												</div>
											))}
											{section.contact && (
												<a
													className="mt-3 inline-block text-sm font-medium text-[#148696] hover:text-[#004A60] transition-colors"
													href={`mailto:${section.contact}`}
												>
													{section.contact}
												</a>
											)}
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>

					{/* Sticky sidebar — 2/5 */}
					<div className="lg:col-span-2 lg:sticky lg:top-24">
						<motion.div animate="visible" initial="hidden" variants={fadeUp}>
							{/* Quick index */}
							<div className="rounded-2xl border border-[#D2D2D2] bg-white p-l shadow-sm">
								<p className="text-xs font-semibold uppercase tracking-widest text-[#8A979C] mb-3">
									Sections
								</p>
								<ol className="space-y-2">
									{sections.map((s) => (
										<li key={s.number}>
											<a
												className="flex items-center gap-2 text-sm text-[#8A979C] hover:text-[#148696] transition-colors"
												href={`#section-${s.number}`}
											>
												<span className="text-[#148696] font-semibold tabular-nums text-xs">
													{s.number}
												</span>
												{s.title}
											</a>
										</li>
									))}
								</ol>
							</div>

							{/* Back to home */}
							<div className="mt-4 rounded-2xl border border-[#D2D2D2] bg-white p-l shadow-sm">
								<p className="text-sm text-[#8A979C] mb-3 leading-relaxed">
									To sign in, return to the home page and click{" "}
									<strong className="text-[#56666C]">Sign In</strong>.
								</p>
								<a
									className="inline-block w-full rounded-xl border border-[#D2D2D2] px-5 py-2.5 text-center text-sm font-semibold text-[#56666C] transition-all duration-200 hover:border-[#148696] hover:text-[#148696] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696]"
									href="/"
								>
									Back to Home
								</a>
							</div>
						</motion.div>
					</div>
				</div>
			</div>
		</div>
	);
}
