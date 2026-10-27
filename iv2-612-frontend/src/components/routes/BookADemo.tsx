import { Container } from "@radix-ui/themes";
import { motion, type Variants } from "framer-motion";
import { useId, useState } from "react";

import imgOne from "$src/assets/img/book-a-demo/one.png";
import imgThree from "$src/assets/img/book-a-demo/three.png";
import imgTwo from "$src/assets/img/book-a-demo/two.png";
import CTASection from "$src/components/home/CTASection";
import AnimatedStickyNavbar from "$src/components/navbars/AnimatedStickyNavbar";

// ─── Types ──────────────────────────────────────────────────────────────────

type UserCategory =
	| "global-buyer"
	| "supplier"
	| "recruitment"
	| "certification"
	| "philanthropic"
	| "civil-society"
	| "other"
	| "";

type FormState = "idle" | "loading" | "success" | "error";

interface FormData {
	// Section 1
	fullName: string;
	jobTitle: string;
	workEmail: string;
	company: string;
	// Section 2
	category: UserCategory;
	otherCategory: string;
	// Section 3
	message: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { key: UserCategory; label: string }[] = [
	{
		key: "global-buyer",
		label: "Global Buyer / Brand / Retailer",
	},
	{
		key: "supplier",
		label: "Supplier",
	},
	{
		key: "recruitment",
		label: "Recruitment Agency",
	},
	{
		key: "certification",
		label: "Certification Body / Rating Agency",
	},
	{
		key: "philanthropic",
		label: "Philanthropic Donor",
	},
	{
		key: "civil-society",
		label: "Civil Society Organization",
	},
	{
		key: "other",
		label: "Other",
	},
];

const INITIAL_FORM: FormData = {
	fullName: "",
	jobTitle: "",
	workEmail: "",
	company: "",
	category: "",
	otherCategory: "",
	message: "",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionBadge({ num, label }: { num: number; label: string }) {
	return (
		<div className="flex items-center gap-3 mb-l">
			<span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#148696] text-white text-sm font-bold flex items-center justify-center">
				{num}
			</span>
			<h2 className="text-lg font-semibold text-[#0f172a] tracking-tight">
				{label}
			</h2>
		</div>
	);
}

function FieldLabel({
	htmlFor,
	children,
}: {
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<label
			className="block text-sm font-medium text-[#56666C] mb-1.5"
			htmlFor={htmlFor}
		>
			{children} <span className="text-[#148696]">*</span>
		</label>
	);
}

function TextInput({
	id,
	name,
	type = "text",
	placeholder,
	value,
	onChange,
	required = true,
}: {
	id: string;
	name: string;
	type?: string;
	placeholder: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	required?: boolean;
}) {
	return (
		<input
			className="w-full rounded-xl border border-[#D2D2D2] bg-white px-4 py-3 text-sm text-[#56666C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#148696]/30 focus:border-[#148696] transition-all"
			id={id}
			name={name}
			onChange={onChange}
			placeholder={placeholder}
			required={required}
			type={type}
			value={value}
		/>
	);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BookADemo() {
	const nameId = useId();
	const jobId = useId();
	const emailId = useId();
	const companyId = useId();
	const otherCategoryId = useId();
	const messageId = useId();

	const [form, setForm] = useState<FormData>(INITIAL_FORM);
	const [formState, setFormState] = useState<FormState>("idle");
	const [errorMsg, setErrorMsg] = useState("");

	const setField = <K extends keyof FormData>(key: K, val: FormData[K]) =>
		setForm((prev) => ({ ...prev, [key]: val }));

	const handleTextChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => setField(e.target.name as keyof FormData, e.target.value as never);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = form.fullName.trim();
		const trimmedEmail = form.workEmail.trim();
		const trimmedCompany = form.company.trim();
		const trimmedMessage = form.message.trim();
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (
			!trimmedName ||
			!trimmedEmail ||
			!trimmedCompany ||
			!form.category ||
			!trimmedMessage
		) {
			setFormState("error");
			setErrorMsg(
				"Please complete all required fields: Full Name, Work Email, Company, Organization Category, and Message.",
			);
			return;
		}
		if (!emailPattern.test(trimmedEmail)) {
			setFormState("error");
			setErrorMsg("Please enter a valid work email address.");
			return;
		}
		setFormState("loading");
		setErrorMsg("");

		try {
			const apiBase = import.meta.env.VITE_APP_CASCADE_API_URL || "";

			const res = await fetch(`${apiBase}/contact`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fullName: trimmedName,
					workEmail: trimmedEmail,
					company: trimmedCompany,
					category: form.category,
					otherCategory:
						form.category === "other" ? form.otherCategory.trim() : undefined,
					jobTitle: form.jobTitle,
					message: trimmedMessage,
					username: trimmedName,
					email: trimmedEmail,
					subject: `CASCADE Inquiry - ${form.category}`,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					(data as { message?: string }).message ?? "Something went wrong",
				);
			}

			setFormState("success");
			setForm(INITIAL_FORM);
		} catch (err) {
			setFormState("error");
			setErrorMsg(
				err instanceof Error
					? err.message
					: "Something went wrong. Please try again.",
			);
		}
	};

	const fadeUp: Variants = {
		hidden: { opacity: 0, y: 24 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, ease: "easeOut" },
		},
	};

	return (
		<div className="flex w-full flex-col">
			<AnimatedStickyNavbar />
			<div className="bg-[#004A60] px-4 h-16" />

			<div className="bg-" />
			{/* ── Hero ─────────────────────────────────────────────────────── */}
			<section className="relative min-h-[45vh] sm:min-h-[52vh] flex items-end overflow-hidden">
				{/* ── Triptych panels ────────────────────────── */}
				<div className="absolute inset-0 flex">
					{([imgOne, imgThree, imgTwo] as const).map((src, i) => (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className="relative flex-1 overflow-hidden"
							initial={{ opacity: 0, scale: 1.06 }}
							key={i}
							transition={{ delay: i * 0.18, duration: 1, ease: "easeOut" }}
						>
							<img
								alt=""
								aria-hidden="true"
								className="absolute inset-0 h-full w-full object-cover object-center"
								src={src}
							/>
							{i < 2 && (
								<div className="absolute right-0 top-0 bottom-0 z-10 w-px bg-white/20" />
							)}
						</motion.div>
					))}
				</div>

				<div className="absolute inset-0 bg-gradient-to-b from-[#004A60]/60 via-[#004A60]/55 to-[#0f172a]/85" />
				<div className="relative z-10 w-full pb-10 pt-28 sm:pb-14 sm:pt-44">
					<Container size="3">
						<motion.div
							animate="visible"
							initial="hidden"
							variants={{
								hidden: {},
								visible: { transition: { staggerChildren: 0.12 } },
							}}
						>
							<motion.h1
								className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-5"
								variants={fadeUp}
							>
								BOOK A DEMO
							</motion.h1>
						</motion.div>
					</Container>
				</div>
			</section>

			{/* ── Form body ────────────────────────────────────────────────── */}
			<section className="flex-1 bg-gray-50 py-10 sm:py-16">
				<Container size="3">
					{formState === "success" ? (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="mx-auto w-full max-w-[36rem] rounded-2xl border border-[#D2D2D2] bg-white px-6 py-10 text-center shadow-sm sm:p-12"
							initial={{ opacity: 0, y: 24 }}
							role="status"
						>
							<div className="w-16 h-16 rounded-full bg-[#148696]/10 flex items-center justify-center mx-auto mb-5">
								<svg
									className="w-8 h-8 text-[#148696]"
									fill="none"
									stroke="currentColor"
									strokeWidth={2}
									viewBox="0 0 24 24"
								>
									<path
										d="M5 13l4 4L19 7"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<h2 className="text-2xl font-bold text-[#0f172a] mb-2">
								Inquiry Submitted!
							</h2>
							<p className="mb-l leading-relaxed text-[#8A979C]">
								Thank you for reaching out. Our team will review your message
								and get back to you shortly via email.
							</p>
							<button
								className="text-[#148696] text-sm font-medium underline underline-offset-2"
								onClick={() => setFormState("idle")}
								type="button"
							>
								Submit another inquiry
							</button>
						</motion.div>
					) : (
						<form onSubmit={handleSubmit}>
							<motion.div
								animate="visible"
								className="flex flex-col gap-l"
								initial="hidden"
								variants={{
									hidden: {},
									visible: { transition: { staggerChildren: 0.08 } },
								}}
								viewport={{ once: true }}
								whileInView="visible"
							>
								{/* ── Section 1 ───────────────────────────────── */}
								<motion.div
									className="bg-white rounded-2xl shadow-sm border border-[#D2D2D2] p-m sm:p-8"
									variants={fadeUp}
								>
									<SectionBadge label="About You" num={1} />
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
										<div>
											<FieldLabel htmlFor={nameId}>Full Name</FieldLabel>
											<input
												className="w-full rounded-xl border border-[#D2D2D2] bg-white px-4 py-3 text-sm text-[#56666C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#148696]/30 focus:border-[#148696] transition-all"
												id={nameId}
												name="fullName"
												onChange={handleTextChange}
												placeholder="Jane Smith"
												required
												type="text"
												value={form.fullName}
											/>
										</div>
										<div>
											<FieldLabel htmlFor={jobId}>Job Title</FieldLabel>
											<TextInput
												id={jobId}
												name="jobTitle"
												onChange={handleTextChange}
												placeholder="Head of Sustainability"
												value={form.jobTitle}
											/>
										</div>
										<div>
											<FieldLabel htmlFor={emailId}>Work Email</FieldLabel>
											<TextInput
												id={emailId}
												name="workEmail"
												onChange={handleTextChange}
												placeholder="jane@company.com"
												type="email"
												value={form.workEmail}
											/>
										</div>
										<div>
											<FieldLabel htmlFor={companyId}>
												Company / Organization Name
											</FieldLabel>
											<TextInput
												id={companyId}
												name="company"
												onChange={handleTextChange}
												placeholder="Acme Corp"
												value={form.company}
											/>
										</div>
									</div>
								</motion.div>

								{/* ── Section 2 ───────────────────────────────── */}
								<motion.div
									className="bg-white rounded-2xl shadow-sm border border-[#D2D2D2] p-m sm:p-8"
									variants={fadeUp}
								>
									<SectionBadge label="Your Organization" num={2} />
									<p className="text-sm text-[#8A979C] mb-5 -mt-2">
										Please select the category that best describes your
										organization. <span className="text-[#148696]">*</span>
									</p>
									<div className="flex flex-col gap-3">
										{CATEGORIES.map((cat) => {
											const isSelected = form.category === cat.key;
											return (
												<div key={cat.key}>
													<button
														className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all cursor-pointer ${
															isSelected
																? "border-[#148696] bg-[#148696]/5"
																: "border-[#D2D2D2] bg-gray-50 hover:border-[#148696]/40"
														}`}
														onClick={() =>
															setField("category", isSelected ? "" : cat.key)
														}
														type="button"
													>
														<div className="flex items-center gap-3">
															<div
																className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
																	isSelected
																		? "border-[#148696] bg-[#148696]"
																		: "border-[#D2D2D2]"
																}`}
															>
																{isSelected && (
																	<div className="w-2 h-2 rounded-full bg-white" />
																)}
															</div>
															<p
																className={`text-sm font-semibold ${isSelected ? "text-[#148696]" : "text-[#56666C]"}`}
															>
																{cat.label}
															</p>
														</div>
													</button>
													{cat.key === "other" && isSelected && (
														<div className="mt-3 px-5 pb-4">
															<label
																className="block text-xs font-medium text-[#8A979C] mb-1.5"
																htmlFor={otherCategoryId}
															>
																Tell us a bit more about your organization{" "}
																<span className="text-[#8A979C]">
																	(optional)
																</span>
															</label>
															<input
																className="w-full rounded-lg border border-[#148696]/30 bg-[#148696]/5 px-4 py-2.5 text-sm text-[#56666C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#148696]/30 focus:border-[#148696] transition-all"
																id={otherCategoryId}
																name="otherCategory"
																onChange={handleTextChange}
																placeholder="e.g. Investor, Researcher, Government agency, Media…"
																type="text"
																value={form.otherCategory}
															/>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</motion.div>

								{/* ── Section 3 ───────────────────────────────── */}
								<motion.div
									className="bg-white rounded-2xl shadow-sm border border-[#D2D2D2] p-m sm:p-8"
									variants={fadeUp}
								>
									<SectionBadge label="Message / Specific Inquiry" num={3} />
									<label
										className="block text-sm font-medium text-[#56666C] mb-1.5"
										htmlFor={messageId}
									>
										Please tell us more about your specific interests and
										priorities <span className="text-[#148696]">*</span>
									</label>
									<textarea
										className="w-full h-36 rounded-xl border border-[#D2D2D2] bg-white px-4 py-3 text-sm text-[#56666C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#148696]/30 focus:border-[#148696] transition-all resize-none"
										id={messageId}
										name="message"
										onChange={handleTextChange}
										placeholder="Tell us about your goals, priorities, or any specific questions for the CASCADE team…"
										required
										value={form.message}
									/>
								</motion.div>

								{/* ── Section 4 – CTA ─────────────────────────── */}
								<motion.div
									className="bg-white rounded-2xl shadow-sm border border-[#D2D2D2] px-5 py-l sm:px-8 sm:py-8"
									variants={fadeUp}
								>
									{formState === "error" && (
										<div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-[#FB8379] text-sm px-4 py-3">
											{errorMsg}
										</div>
									)}

									<button
										className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all ${
											formState === "loading" ||
											!form.category ||
											!form.message.trim()
												? "bg-[#148696]/30 text-white cursor-not-allowed"
												: "bg-[#148696] text-white hover:bg-[#004A60] active:scale-95"
										}`}
										disabled={
											formState === "loading" ||
											!form.category ||
											!form.message.trim()
										}
										type="submit"
									>
										{formState === "loading" ? (
											<>
												<svg
													className="w-4 h-4 animate-spin"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													/>
													<path
														className="opacity-75"
														d="M4 12a8 8 0 018-8v8z"
														fill="currentColor"
													/>
												</svg>
												Submitting…
											</>
										) : (
											<>
												Submit Inquiry
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													strokeWidth={2}
													viewBox="0 0 24 24"
												>
													<path
														d="M17 8l4 4m0 0l-4 4m4-4H3"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</>
										)}
									</button>
								</motion.div>
							</motion.div>
						</form>
					)}
				</Container>
			</section>

			<CTASection />
		</div>
	);
}
