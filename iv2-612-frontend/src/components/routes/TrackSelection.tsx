import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarIcon,
	CheckIcon,
	ChevronDownIcon,
	CubeIcon,
	LockClosedIcon,
} from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import issaraLogo from "$src/assets/img/issara-logo.png";
import NavbarLanguageSelector from "$src/components/i18n/NavbarLanguageSelector";
import LoadingSpinner from "$src/components/ui/LoadingSpinner";
import {
	getStoredWorkosUserId,
	getSupplierTrackQueryOptions,
	getSupplierTrackStatus,
	selectFullTrack,
	selectMarketplaceTrack,
} from "$src/services/supplierTrackService";
import styles from "./TrackSelection.module.css";

type Screen = "select" | "license" | "confirm";

const formatDatePart = (value: number) => value.toString().padStart(2, "0");

function getBangkokToday() {
	const parts = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "Asia/Bangkok",
	}).formatToParts(new Date());
	const value = Object.fromEntries(
		parts.map(({ type, value: partValue }) => [type, partValue]),
	);
	return new Date(
		Number(value.year),
		Number(value.month) - 1,
		Number(value.day),
	);
}

function formatSignedDateDisplay(date: Date) {
	return `${formatDatePart(date.getDate())}/${formatDatePart(
		date.getMonth() + 1,
	)}/${date.getFullYear()}`;
}

function formatSignedDateValue(date: Date) {
	return `${date.getFullYear()}-${formatDatePart(
		date.getMonth() + 1,
	)}-${formatDatePart(date.getDate())}`;
}

function errorMessage(error: unknown) {
	if (
		typeof error === "object" &&
		error !== null &&
		"response" in error &&
		typeof error.response === "object" &&
		error.response !== null
	) {
		const response = error.response as { data?: { message?: string } };
		return response.data?.message ?? "Could not save your selection.";
	}
	return "Could not save your selection. Please try again.";
}

function FeatureRow({
	children,
	full = false,
}: {
	children: string;
	full?: boolean;
}) {
	return (
		<li className={styles.featureRow}>
			<span
				className={`${styles.featureCheck} ${
					full ? styles.featureCheckFull : styles.featureCheckMarketplace
				}`}
			>
				<CheckIcon aria-hidden height="12" width="12" />
			</span>
			<span>{children}</span>
		</li>
	);
}

function Footer() {
	return (
		<footer className={styles.footer}>
			<div className={styles.footerInner}>
				<div className={styles.footerBrand}>
					<img alt="" className={styles.footerLogo} src={issaraLogo} />
					<div>
						<p className={styles.footerName}>CASCADE</p>
						<p className={styles.footerTagline}>
							Better Data + Better Solutions
						</p>
					</div>
				</div>
				<div className={styles.footerDivider} />
				<div className={styles.footerBottom}>
					<p>© 2026 CASCADE | cascade@issarainstitute.org</p>
					<nav aria-label="Footer" className={styles.footerLinks}>
						<a href="/privacy-policy">Privacy Policy</a>
						<a href="mailto:cascade@issarainstitute.org">Contact Us:</a>
						<span aria-hidden className={styles.socialIcons}>
							<span>
								<svg height="14" viewBox="0 0 24 24" width="14">
									<path d="M18.9 2H22l-7.6 8.7L23.3 22h-6.9l-5.4-6.8L4.8 22H1.7l8.1-9.3L1 2h7l4.9 6.2L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z" />
								</svg>
							</span>
							<span>
								<svg height="14" viewBox="0 0 24 24" width="14">
									<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21h-4V9z" />
								</svg>
							</span>
							<span>
								<svg height="16" viewBox="0 0 24 24" width="16">
									<path d="M21.6 7.2s-.2-1.5-.8-2.2c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.1c-.4 0-1.3.1-2.1.9-.6.7-.8 2.2-.8 2.2s-.2 1.8-.2 3.5v1.6c0 1.7.2 3.5.2 3.5s.2 1.5.8 2.2c.8.8 1.9.8 2.4.9 1.7.1 6.4.1 6.4.1s3.9 0 6.7-.1c.4 0 1.3-.1 2.1-.9.6-.7.8-2.2.8-2.2s.2-1.7.2-3.5v-1.6c0-1.7-.2-3.5-.2-3.5zM9.9 14.6V8.9l5.3 2.9-5.3 2.8z" />
								</svg>
							</span>
						</span>
					</nav>
				</div>
			</div>
		</footer>
	);
}

export default function TrackSelection() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const signerNameId = useId();
	const signerTitleId = useId();
	const signerAffiliationId = useId();
	const signedDateId = useId();
	const standardsSectionId = useId();
	const validationModalTitleId = useId();
	const [screen, setScreen] = useState<Screen>("select");
	const [expanded, setExpanded] = useState(false);
	const [accepted, setAccepted] = useState(false);
	const [accordionOverviewOpen, setAccordionOverviewOpen] = useState(true);
	const [accordionPrinciplesOpen, setAccordionPrinciplesOpen] = useState(false);
	const [accordionStandardsOpen, setAccordionStandardsOpen] = useState(false);
	const [readOverview, setReadOverview] = useState(false);
	const [readPrinciples, setReadPrinciples] = useState(false);
	const [readStandards, setReadStandards] = useState(false);
	const [showValidationModal, setShowValidationModal] = useState(false);
	const [attemptedSubmitWithUnchecked, setAttemptedSubmitWithUnchecked] =
		useState(false);
	const standardsSectionRef = useRef<HTMLElement>(null);
	const [signerName, setSignerName] = useState("");
	const [signerTitle, setSignerTitle] = useState("");
	const [signerAffiliation, setSignerAffiliation] = useState("");
	const [touchedFields, setTouchedFields] = useState({
		signerName: false,
		signerTitle: false,
		signerAffiliation: false,
	});
	const [signedDate] = useState(getBangkokToday);
	const [emailSent, setEmailSent] = useState<boolean | null>(null);

	const storedUserEmail = (() => {
		try {
			const raw = localStorage.getItem("auth_user");
			if (!raw) return "";
			return (JSON.parse(raw) as { email?: string }).email ?? "";
		} catch {
			return "";
		}
	})();

	const trackQueryOptions = getSupplierTrackQueryOptions(
		getStoredWorkosUserId(),
		getSupplierTrackStatus,
	);

	const statusQuery = useQuery(trackQueryOptions);

	const scrollToStandards = () => {
		if (standardsSectionRef.current) {
			standardsSectionRef.current.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	};

	const handleSignAgreement = () => {
		setTouchedFields({
			signerName: true,
			signerTitle: true,
			signerAffiliation: true,
		});

		if (!readOverview || !readPrinciples || !readStandards) {
			setAttemptedSubmitWithUnchecked(true);
			setShowValidationModal(true);
			scrollToStandards();
			return;
		}

		if (
			!accepted ||
			signerName.trim().length < 2 ||
			!signerTitle.trim() ||
			!signerAffiliation.trim()
		) {
			return;
		}

		fullMutation.mutate();
	};

	const { t, i18n } = useTranslation();

	const marketplaceMutation = useMutation({
		mutationFn: () => selectMarketplaceTrack({ lang: i18n.language }),
		onSuccess: async (result) => {
			queryClient.setQueryData(trackQueryOptions.queryKey, result.data);
			await navigate({ to: "/cascade-marketplace" });
		},
	});

	const fullMutation = useMutation({
		mutationFn: () =>
			selectFullTrack({
				signerName: signerName.trim(),
				signerTitle: signerTitle.trim(),
				signerAffiliation: signerAffiliation.trim(),
				agreementVersion: statusQuery.data?.agreement_version ?? "",
				lang: i18n.language,
			}),
		onSuccess: (result) => {
			queryClient.setQueryData(trackQueryOptions.queryKey, result.data);
			setEmailSent(result.email_sent);
			setScreen("confirm");
		},
	});

	const marketplaceItems = [
		t(
			"supplierTrackSelection.marketplaceItem1",
			"Register for online learning, tools and diagnostics, or tailored training and advisory services in your language and locality",
		),
	];

	const fullAccessMain = [
		t(
			"supplierTrackSelection.fullItem1",
			"Real-time monitoring and analytics of what is happening across your site(s)",
		),
		t(
			"supplierTrackSelection.fullItem2",
			"Real-time progress on worker voice coverage and efforts to strengthen systems and policies through training and tools",
		),
	];

	const fullAccessExtra = [
		t(
			"supplierTrackSelection.fullItem3",
			"Track, manage, and resolve worker grievances all in one place",
		),
		t(
			"supplierTrackSelection.fullItem4",
			"Make your business viewable to global brands and other partners in the industry",
		),
		t(
			"supplierTrackSelection.fullItem5",
			"Register for online learning, tools and diagnostics, or tailored training and advisory services in your language and locality",
		),
	];

	const signedDateDisplay = formatSignedDateDisplay(signedDate);
	const signedDateValue = formatSignedDateValue(signedDate);
	const signerNameError =
		touchedFields.signerName && signerName.trim().length < 2
			? t(
					"supplierTrackSelection.formErrorSignerName",
					"Please enter your full legal name.",
				)
			: null;
	const signerTitleError =
		touchedFields.signerTitle && !signerTitle.trim()
			? t(
					"supplierTrackSelection.formErrorSignerTitle",
					"Please enter your professional title.",
				)
			: null;
	const signerAffiliationError =
		touchedFields.signerAffiliation && !signerAffiliation.trim()
			? t(
					"supplierTrackSelection.formErrorSignerAffiliation",
					"Please enter your affiliation or company.",
				)
			: null;

	const mutationError = marketplaceMutation.error ?? fullMutation.error;
	const signerFirstName = signerName.trim().split(/\s+/)[0] || "there";
	const requiresFullReagreement =
		statusQuery.data?.track_selection === "FULL" &&
		!statusQuery.data.license_agreed_at;
	const activeScreen =
		requiresFullReagreement && screen === "select" ? "license" : screen;

	return (
		<div className={styles.page}>
			<main className={styles.content}>
				<div className={styles.topBar}>
					<img
						alt="Issara Institute"
						className={styles.logo}
						src={issaraLogo}
					/>
					<NavbarLanguageSelector variant="light" />
				</div>

				{statusQuery.isLoading && (
					<div className={styles.statusPanel}>
						<LoadingSpinner
							subtitle={t(
								"supplierTrackSelection.loadingSubtitle",
								"Preparing one-time setup",
							)}
							title={t("supplierTrackSelection.loadingTitle", "Loading...")}
						/>
					</div>
				)}

				{(statusQuery.isError ||
					(!statusQuery.isLoading && !statusQuery.data)) && (
					<section className={styles.statusCard}>
						<h1>
							{t(
								"supplierTrackSelection.unavailableTitle",
								"Setup unavailable",
							)}
						</h1>
						<p>
							{t(
								"supplierTrackSelection.unavailableSubtitle",
								"We could not load your supplier access options.",
							)}
						</p>
						<button onClick={() => statusQuery.refetch()} type="button">
							{t("supplierTrackSelection.retry", "Retry")}
						</button>
					</section>
				)}

				{statusQuery.data && activeScreen === "select" && (
					<>
						<header className={styles.selectionHeader}>
							<span className={styles.setupBadge}>
								{t("supplierTrackSelection.setupBadge", "One-time setup")}
							</span>
							<h1>
								{t(
									"supplierTrackSelection.title",
									"How would you like to get started?",
								)}
							</h1>
							<p>
								{t(
									"supplierTrackSelection.subtitle",
									"Choose the track that matches what you need from CASCADE today. You can always expand your access later.",
								)}
							</p>
						</header>

						<div className={styles.cards}>
							<div className={styles.cardWrap}>
								<section className={styles.card}>
									<div
										aria-hidden
										className={`${styles.cardBanner} ${styles.marketplaceBanner}`}
									>
										<span className={styles.marketplaceIcon}>
											<CubeIcon height="30" width="30" />
										</span>
										<span className={styles.userBadge}>
											{t(
												"supplierTrackSelection.marketplaceBadge",
												"Standard user",
											)}
										</span>
									</div>

									<div className={styles.cardIntro}>
										<h2>
											{t(
												"supplierTrackSelection.marketplaceTitle",
												"CASCADE Marketplace",
											)}
										</h2>
										<p>
											{t(
												"supplierTrackSelection.marketplaceDescription",
												"Looking to strengthen your knowledge, systems, policies, and practices to address the root causes of labor issues and prevent future risks? Access the CASCADE Marketplace — a marketplace where you can 'shop' for tools, training, solutions, and partnerships!",
											)}
										</p>
									</div>

									<ul className={styles.features}>
										{marketplaceItems.map((item) => (
											<FeatureRow key={item}>{item}</FeatureRow>
										))}
									</ul>

									<div className={styles.cardAction}>
										<p>
											{t(
												"supplierTrackSelection.marketplaceActionNote",
												"Continuous engagement drives continuous improvement!",
											)}
										</p>
										<button
											className={styles.primaryButton}
											disabled={marketplaceMutation.isPending}
											onClick={() => marketplaceMutation.mutate()}
											type="button"
										>
											{marketplaceMutation.isPending
												? t(
														"supplierTrackSelection.marketplaceSaving",
														"Saving...",
													)
												: t(
														"supplierTrackSelection.marketplaceContinue",
														"Continue",
													)}
											<ArrowRightIcon />
										</button>
									</div>
								</section>
							</div>

							<div className={styles.cardWrap}>
								<span className={styles.agreementBadge}>
									{t(
										"supplierTrackSelection.fullLicenseRequired",
										"🔒 License Agreement Required",
									)}
								</span>
								<section className={`${styles.card} ${styles.cardFull}`}>
									<div
										aria-hidden
										className={`${styles.cardBanner} ${styles.fullBanner}`}
									>
										<span className={styles.fullIcon}>
											<LockClosedIcon height="28" width="28" />
										</span>
										<span className={styles.userBadge}>
											{t("supplierTrackSelection.fullBadge", "Super user")}
										</span>
									</div>

									<div className={styles.cardIntro}>
										<h2>
											{t(
												"supplierTrackSelection.fullTitle",
												"Full CASCADE Access",
											)}
										</h2>
										<p>
											{t(
												"supplierTrackSelection.fullDescription",
												"Ready to get started with better data and better solutions for your business on CASCADE? CASCADE isn't another audit — it's human rights due diligence (HRDD), day to day, equipping your teams and company with the tools and real-time data to meet the evolving HRDD and trade integrity requirements in the Americas, EU, Australia, and beyond.",
											)}
										</p>
									</div>

									<ul className={styles.features}>
										{fullAccessMain.map((item) => (
											<FeatureRow full key={item}>
												{item}
											</FeatureRow>
										))}
										{expanded &&
											fullAccessExtra.map((item) => (
												<FeatureRow full key={item}>
													{item}
												</FeatureRow>
											))}
									</ul>

									<button
										aria-expanded={expanded}
										className={styles.expandButton}
										onClick={() => setExpanded((value) => !value)}
										type="button"
									>
										{expanded
											? t("supplierTrackSelection.fullShowLess", "Show less")
											: t("supplierTrackSelection.fullShowMore", "Show 3 more")}
										<ChevronDownIcon
											className={expanded ? styles.rotated : ""}
										/>
									</button>

									<div className={`${styles.cardAction} ${styles.fullAction}`}>
										<p>
											{t(
												"supplierTrackSelection.fullActionNote",
												"Make your real commitment to HRDD today!",
											)}
										</p>
										<button
											className={styles.coralButton}
											onClick={() => setScreen("license")}
											type="button"
										>
											{t(
												"supplierTrackSelection.fullReviewButton",
												"Review Agreement",
											)}
											<ArrowRightIcon />
										</button>
									</div>
								</section>
							</div>
						</div>

						{mutationError && (
							<p className={styles.error} role="alert">
								{errorMessage(mutationError)}
							</p>
						)}

						<p className={styles.accessNote}>
							{t(
								"supplierTrackSelection.standardUpgradeNote",
								"Standard users can upgrade to Super User later. Super User access cannot be reverted.",
							)}
						</p>
					</>
				)}

				{statusQuery.data && activeScreen === "license" && (
					<section className={styles.licenseScreen}>
						{!requiresFullReagreement && (
							<button
								className={styles.backButton}
								onClick={() => setScreen("select")}
								type="button"
							>
								<ArrowLeftIcon />{" "}
								{t(
									"supplierTrackSelection.licenseBack",
									"Back to Track Selection",
								)}
							</button>
						)}

						<div className={styles.licenseCard}>
							<header className={styles.licenseHeader}>
								<p className={styles.licenseEyebrow}>
									{t(
										"supplierTrackSelection.licenseEyebrow",
										"Full CASCADE Access",
									)}
								</p>
								<h1>
									{t(
										"supplierTrackSelection.licenseHeaderTitle",
										"Issara Institute CASCADE Agreement",
									)}
								</h1>
								<p className={styles.licenseSubtitle}>
									{t(
										"supplierTrackSelection.licenseHeaderSubtitle",
										"Review and sign the agreement to activate your Super User dashboard and worker-voice tools.",
									)}
								</p>
							</header>

							<div className={styles.agreementWrap}>
								<div className={styles.agreementText}>
									<div className={styles.agreementMeta}>
										<p>
											<strong>
												{t(
													"supplierTrackSelection.publishedLabel",
													"Published:",
												)}
											</strong>{" "}
											{t(
												"supplierTrackSelection.publishedDate",
												"August 25, 2026",
											)}
										</p>
										<p>
											<strong>
												{t(
													"supplierTrackSelection.effectiveDateLabel",
													"Effective Date:",
												)}
											</strong>{" "}
											{signedDateDisplay}
										</p>
									</div>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section1Title",
												"Introduction to the Issara Institute CASCADE Agreement",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section1Body",
												"The Issara Institute CASCADE Agreement is an agreement between Issara Institute and the company or business entity on whose behalf you are accessing or using the CASCADE platform and products and services (including related support) ('Company'). 'You' or 'User' refers to the individual accessing or using the platform on behalf of the Company. By accepting this Agreement or using the CASCADE platform, you represent and warrant that you are an authorized representative with full legal authority to bind the Company to this Agreement.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section2Title",
												"Purpose",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section2Body",
												"Issara, a not-for-profit organization and has projects regarding human rights and global supply chains. Issara and Company wish to work together for the purpose of improving labor conditions and recruitment practices, and expanding public-private cooperation to improve working, living, and educational opportunities for migrant workers and their families.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section3Title",
												"Relationship of the Parties",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section3Body",
												"The parties to this agreement remain separate and independent organizations who are agreeing to collaborate on a project of mutual interest. Nothing in this agreement should be read to create an employment relationship, legal partnership, or new business venture. A Company’s financial contribution to Issara does not create a fee-for-service arrangement, but rather is a donation to help further the overall social mission of Issara.",
											)}
										</p>
									</section>

									<section id={standardsSectionId} ref={standardsSectionRef}>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section4Title",
												"Principles and Operating Standards",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section4Intro",
												"Company affirms that it has reviewed Issara’s “Principles and Operating Standards,” (hereafter ‘Standards’). Those Standards are hereby incorporated by reference into this agreement, and available on the Company Profile page of CASCADE. Issara and Company mutually commit to giving their best efforts to carry out their respective responsibilities as laid out in the Standards.",
											)}
										</p>

										<div className={styles.accordionGroup}>
											<div className={styles.accordionItem}>
												<button
													aria-expanded={accordionOverviewOpen}
													className={styles.accordionToggle}
													onClick={() =>
														setAccordionOverviewOpen((prev) => !prev)
													}
													type="button"
												>
													<span className={styles.accordionToggleTitle}>
														{t(
															"supplierTrackSelection.agreement.overviewToggle",
															"Principles and Operating Standards Overview",
														)}
													</span>
													<ChevronDownIcon
														className={
															accordionOverviewOpen ? styles.rotated : ""
														}
													/>
												</button>
												{accordionOverviewOpen && (
													<div className={styles.accordionBody}>
														<p>
															{t(
																"supplierTrackSelection.agreement.overviewP1",
																"Issara Institute is a non-profit organization, with clear human rights fundamentals underpinning our work. These Guiding Principles and Operational Standards are a public document of the guidelines for our partnerships with businesses (“Companies”) through the Issara Inclusive Labor Monitoring (ILM) system and CASCADE platform. Examples of Companies could include global buyers, brands, retailers, importers, agents, suppliers, recruitment agencies, financial institutions, and other stakeholder businesses in supply chains.",
															)}
														</p>
														<p>
															{t(
																"supplierTrackSelection.agreement.overviewP2",
																"Issara’s Inclusive Labor Monitoring (ILM) system and CASCADE platform are at the center of our engagement with Companies, where worker validation of labor recruitment and working conditions informs and drives remediation and iterative systems strengthening on the part of businesses. Issara Programs aim to provide a framework for collaboration to eliminate labor exploitation across global supply chains, including forced labor and human trafficking, that reaffirms the need for worker voice as a central part of the solution.",
															)}
														</p>
														<p>
															{t(
																"supplierTrackSelection.agreement.overviewP3",
																"The Guiding Principles outline the ethos of Issara’s worker voice-centered approach, the primacy of ethics, and the international labor standards underpinning all work, while the Operational Standards highlight the expectations of Companies and our own organization.",
															)}
														</p>
														<label
															className={`${styles.accordionCheckLabel} ${
																attemptedSubmitWithUnchecked && !readOverview
																	? styles.accordionCheckLabelRequired
																	: ""
															}`}
														>
															<input
																checked={readOverview}
																onChange={(event) =>
																	setReadOverview(event.target.checked)
																}
																type="checkbox"
															/>
															<span>
																{t(
																	"supplierTrackSelection.agreement.overviewConfirm",
																	"I confirm that I have read the Principles and Operating Standards Overview.",
																)}
															</span>
														</label>
													</div>
												)}
											</div>

											<div
												className={`${styles.accordionItem} ${
													attemptedSubmitWithUnchecked && !readPrinciples
														? styles.accordionItemRequired
														: ""
												}`}
											>
												<button
													aria-expanded={accordionPrinciplesOpen}
													className={styles.accordionToggle}
													onClick={() =>
														setAccordionPrinciplesOpen((prev) => !prev)
													}
													type="button"
												>
													<span className={styles.accordionToggleTitle}>
														{t(
															"supplierTrackSelection.agreement.principlesToggle",
															"Five Guiding Principles",
														)}
													</span>
													<ChevronDownIcon
														className={
															accordionPrinciplesOpen ? styles.rotated : ""
														}
													/>
												</button>
												{accordionPrinciplesOpen && (
													<div className={styles.accordionBody}>
														<div className={styles.principleBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.principle1Title",
																	"1. EMPOWERED WORKER VOICE",
																)}
															</h4>
															<p>
																{t(
																	"supplierTrackSelection.agreement.principle1Body",
																	"Data to verify labor conditions must include empowered worker voice linking safeguarded worker feedback to management response, systems change, and remediation. Remediation and improvements must be verified by workers. Any suppression of workers’ ability to voice their concerns throughout recruitment and employment, through whatever channel they trust, is considered a serious violation of the spirit of Issara Inclusive Labor Monitoring (ILM).",
																)}
															</p>
														</div>
														<div className={styles.principleBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.principle2Title",
																	"2. SHARED RESPONSIBILITY",
																)}
															</h4>
															<p>
																{t(
																	"supplierTrackSelection.agreement.principle2Body",
																	"Management response, systems change, and remediation are shared responsibilities across the supply chain. Downstream buyers benefit from these and so, as responsible, ethical buyers should actively promote and incentivize worker voice and improvements.",
																)}
															</p>
														</div>
														<div className={styles.principleBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.principle3Title",
																	"3. RIGHT TO REMEDIATION",
																)}
															</h4>
															<p>
																{t(
																	"supplierTrackSelection.agreement.principle3Body",
																	"Workers whose rights are violated have the right to access remedy and justice. Business mechanisms for addressing violations and increasing human rights accountability may not be responsive enough within a reasonable timeframe to stop harm, and workers have the right to collectively or individually access alternative channels for remediation. Workers should not be deterred in any way from accessing alternative channels for remediation by any party to ILM.",
																)}
															</p>
														</div>
														<div className={styles.principleBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.principle4Title",
																	"4. RIGHT TO PROTECTION",
																)}
															</h4>
															<p>
																{t(
																	"supplierTrackSelection.agreement.principle4Body",
																	"Workers whose rights are violated have the right to protection. NGOs and individuals may also be subject to retaliation, for which protection may be required as well. All parties of ILM are expected to support safeguards for workers and human rights defenders as needed.",
																)}
															</p>
														</div>
														<div className={styles.principleBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.principle5Title",
																	"5. ETHICS AND HUMAN RIGHTS AT THE FOREFRONT",
																)}
															</h4>
															<p>
																{t(
																	"supplierTrackSelection.agreement.principle5Body",
																	"All activities are conducted with professionalism, ethics, and support for universal human rights and labor rights principles. The fundamental ethical principle of Do No Harm will be followed and prioritized in every instance and situation, with no exception.",
																)}
															</p>
														</div>
														<label
															className={`${styles.accordionCheckLabel} ${
																attemptedSubmitWithUnchecked && !readPrinciples
																	? styles.accordionCheckLabelRequired
																	: ""
															}`}
														>
															<input
																checked={readPrinciples}
																onChange={(event) =>
																	setReadPrinciples(event.target.checked)
																}
																type="checkbox"
															/>
															<span>
																{t(
																	"supplierTrackSelection.agreement.principlesConfirm",
																	"I confirm that I have read the Five Guiding Principles.",
																)}
															</span>
														</label>
													</div>
												)}
											</div>

											<div
												className={`${styles.accordionItem} ${
													attemptedSubmitWithUnchecked && !readStandards
														? styles.accordionItemRequired
														: ""
												}`}
											>
												<button
													aria-expanded={accordionStandardsOpen}
													className={styles.accordionToggle}
													onClick={() =>
														setAccordionStandardsOpen((prev) => !prev)
													}
													type="button"
												>
													<span className={styles.accordionToggleTitle}>
														{t(
															"supplierTrackSelection.agreement.standardsToggle",
															"Operational Standards (with the 3 Areas)",
														)}
													</span>
													<ChevronDownIcon
														className={
															accordionStandardsOpen ? styles.rotated : ""
														}
													/>
												</button>
												{accordionStandardsOpen && (
													<div className={styles.accordionBody}>
														<div className={styles.areaBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.area1Title",
																	"AREA 1. WORKER VOICE, SAFEGUARDS, AND VALIDATION",
																)}
															</h4>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area1Item1Label",
																		"Worker Voice:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area1Item1Body",
																	"Worker voice is critical to Issara’s mission, approach, and programmatic activities. Worker voice connected to remediation and with clear safeguards must be supported by Companies. If worker voice is not supported, there is heightened risk to Issara, workers, and the Company. Companies must therefore support Issara’s independent worker voice channels and Issara’s engagement with workers at workplace sites.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area1Item2Label",
																		"Worker Safeguards:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area1Item2Body",
																	"Safeguards may be needed to protect workers communicating grievances against reprisals, power imbalances, and threats from supervisors, interpreters, and others. Companies must support worker safeguards and protection (and not suppression) of worker voice so that workers can raise grievances without fear of reprisal. Issara places worker safety at the forefront, and a “do no harm” philosophy must be prioritized within Programs with Companies.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area1Item3Label",
																		"Worker Validation:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area1Item3Body",
																	"Verification of practices and changes that Companies undertake must be verified with workers and job seekers, as appropriate. Issara does not close out reported labor issues until workers have validated the nature and quality of actions that businesses claim to have made. Worker validation not only provides greater confidence in business’ handling of labor issues, but also helps ensure that those actions have indeed been effective.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area1Item4Label",
																		"Worker Voice Integration:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area1Item4Body",
																	"True worker voice-driven initiatives, such as Issara Inclusive Labor Monitoring, are very different from traditional audit compliance approaches or many worker feedback tools, and may be new to Companies. Businesses participating in Programs must therefore be open to discussing with Issara how worker voice findings and data are being integrated and elevated into their business’ working conditions, recruitment practices, grievance mechanisms, and systems strengthening.",
																)}
															</p>
														</div>

														<div className={styles.areaBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.area2Title",
																	"AREA 2. RESPONSIVENESS, RESPONSIBILITY, AND REMEDIATION",
																)}
															</h4>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area2Item1Label",
																		"Progress and Solutions-Oriented:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area2Item1Body",
																	"Issara Programs are designed for businesses that not only seek increased transparency and accountability about labor issues in their operations and supply chains but also seek and actively work toward ongoing improvement and solutions by addressing root cause issues and systems strengthening. Companies can view Issara as a professional, independent, technical partner whose mission centers on improving labor conditions for workers and helping to drive better business practices more generally. And while Issara may develop tools, research, data and technology to help drive solutions, it is the duty bearers (typically buyers, suppliers, recruitment agencies, and government) who are responsible for good working conditions, more ethical recruitment, and clean supply chains. Companies commit to measurable and continuous work toward targets and timelines across three work areas: Worker Voice, Labor Recruitment, and Working Conditions.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area2Item2Label",
																		"Recognizing Engaged Businesses:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area2Item2Body",
																	"Businesses that embrace worker voice and become more responsive to it will have greater transparency and visibility of risks than those that do not. Understandably, issues may surface that audits or other approaches had not previously been identified. This should be recognized and understood by Companies. Global buyers should consider providing a “safe space” for businesses in their supply chain to address issues raised by worker voice and provide opportunity for suppliers to demonstrate their openness to reforms and quality and timeliness of responses.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area2Item3Label",
																		"Supply Chain Response:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area2Item3Body",
																	"Issara’s general operational approach is to not “name and shame” or campaign against businesses, but rather to help businesses responsibly use worker voice, data, and technical support to improve workplace conditions and contribute to industry transformation. Companies will work within their business and industry to cultivate a greater appreciation of worker voice as a valuable tool to help improve business systems and national industry practices.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area2Item4Label",
																		"Oversight:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area2Item4Body",
																	"Being solutions-oriented also includes encouraging and supporting well-functioning grievance mechanisms and remedies for workers throughout the supply chain. Companies, as duty bearers, are expected to uphold their own codes of conduct, human rights policies, and migrant worker policies at all times. There must be consequences for non-compliant businesses, which are clearly communicated and understood before issues arise.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area2Item5Label",
																		"Remedy and Timeliness:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area2Item5Body",
																	"If labor violations are uncovered, remediation is expected to take place within a reasonable timeframe. Workers must be assured dignity, protection against retaliation, decent working conditions, and access to justice. Workers may pursue other channels to ensure their rights are upheld and should not be suppressed from doing so.",
																)}
															</p>
														</div>

														<div className={styles.areaBlock}>
															<h4>
																{t(
																	"supplierTrackSelection.agreement.area3Title",
																	"AREA 3. TRANSFORMING THE ECOSYSTEM",
																)}
															</h4>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area3Item1Label",
																		"Multi-Stakeholder Participation and Collaboration:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area3Item1Body",
																	"Business responsibility efforts go from being transactional to truly transformational when values-aligned businesses apply their buying power and voice collectively to make responsible supply chains a sustainable reality. All Companies are expected to actively participate and collaborate in multi-stakeholder conversations to help build shared values, commitments, and vision, and transform the ethical supply chain ecosystem. Issara will aim to make participation easy and more accessible through expanding free online webinars and collaboration events, arranged at various times for the convenience of colleagues in different time zones.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area3Item2Label",
																		"Supporting Learning and Evidence-Based Advocacy:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area3Item2Body",
																	"Issara Programs are underpinned by Issara’s worker voice-centered programming and research, which generates considerable learning and data. Companies should take all opportunities to embrace and promote this learning, to support more thought leadership and more responsible business practices globally.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area3Item3Label",
																		"Transparency:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area3Item3Body",
																	"As a non-profit organization, Issara’s focus on tackling forced labor and improving labor conditions also means sharing information about what is happening on the ground and generating public goods that help practitioners and stakeholders. While details will not be made public about a Company’s specific supply chain without consent, ILM data and trends are anonymized and aggregated to promote public sharing of information, successes, challenges, and lessons learned through www.workervoices.org, toward the goal of broader industry and ecosystem transformation, and broader acceptance and integration of worker voice as a key tool for HRDD and ethical supply chains.",
																)}
															</p>
															<p>
																<strong>
																	{t(
																		"supplierTrackSelection.agreement.area3Item4Label",
																		"Empowerment and Civil Society Support:",
																	)}
																</strong>{" "}
																{t(
																	"supplierTrackSelection.agreement.area3Item4Body",
																	"Issara works both at an international level through global supply chains, and at a grassroots and community level with workers and civil society partners. The support of Companies working with Issara broadly contributes to our network’s worker voice channels, ability to support harm prevention and remediation, and to more transformational systems changes, allowing us to leverage these partnerships to effectuate improvements in the Company’s supply chain and also the broader industry and ecosystem.",
																)}
															</p>
														</div>

														<label
															className={`${styles.accordionCheckLabel} ${
																attemptedSubmitWithUnchecked && !readStandards
																	? styles.accordionCheckLabelRequired
																	: ""
															}`}
														>
															<input
																checked={readStandards}
																onChange={(event) =>
																	setReadStandards(event.target.checked)
																}
																type="checkbox"
															/>
															<span>
																{t(
																	"supplierTrackSelection.agreement.standardsConfirm",
																	"I confirm that I have read the Operational Standards (with the 3 Areas).",
																)}
															</span>
														</label>
													</div>
												)}
											</div>
										</div>

										<p>
											{t(
												"supplierTrackSelection.agreement.section4Remedy",
												"The sole remedy available to either party as a result of the other party’s failure to meet the commitments laid out in the Standards is to terminate this agreement. Neither Issara nor Company shall have any right to enforce the commitments made under the Standards by means of a lawsuit compelling the other party to act. In addition, the Parties shall not be liable to the other party for any financial damages stemming from this agreement or the work performed by Issara thereunder.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section5Title",
												"Term and Termination",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section5P1",
												'This Agreement becomes effective on the date you accept it or first access the CASCADE platform ("Effective Date": {{effectiveDate}}) and will remain in effect for an initial term of one (1) year. At the conclusion of the original one-year term, the agreement will automatically renew for an additional year if it is not terminated by either party.',
												{ effectiveDate: signedDateDisplay },
											)}
										</p>
										<p>
											<strong>
												{t(
													"supplierTrackSelection.agreement.section5ConvenienceLabel",
													"Termination for Convenience:",
												)}
											</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section5ConvenienceBody",
												"Either Issara or Company may terminate this Agreement at any time, for any reason, by providing at least thirty (30) days’ written notice to the other party.",
											)}
										</p>
										<p>
											<strong>
												{t(
													"supplierTrackSelection.agreement.section5ImmediateLabel",
													"Immediate Termination:",
												)}
											</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section5ImmediateIntro",
												"Either party may terminate the agreement immediately upon written notice under any of the following circumstances:",
											)}
										</p>
										<ul className={styles.agreementList}>
											<li>
												{t(
													"supplierTrackSelection.agreement.section5ImmediateItem1",
													"The failure of the other party to meet its commitments as laid out in the Standards.",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section5ImmediateItem2",
													"Breach of the terms of this agreement by the other party.",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section5ImmediateItem3",
													"Failure of Company to make the donation laid out below.",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section5ImmediateItem4",
													"Bankruptcy, insolvency, or liquidation of either party.",
												)}
											</li>
										</ul>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section6Title",
												"Contribution",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section6Body",
												"To support Issara’s charitable work, the Company shall make a donation to Issara of $0.00 USD per year. The first year’s donation shall become due and payable 30 days after the effective date of this agreement. The donation is not refundable under any circumstances.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section7Title",
												"Intellectual Property",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section7P1",
												"All plans, protocols, methodologies, instruments, software, templates, and other documents prepared by Issara prior to or under this Agreement shall remain the property of Issara. All data collected by Issara prior to or under this Agreement shall become and remain the property of Issara. Data obtained by Issara under this agreement will only be distributed in a non-commercial manner and subject to the confidentiality provisions described in this agreement.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section7P2",
												"This Agreement does not assign or otherwise transfer any intellectual property rights of either party except as laid out herein. Each party retains sole and exclusive rights to all intellectual property which it created prior to this agreement, or which it develops during the term of this agreement.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section7P3",
												"Issara grants to Company a non-exclusive, non-transferable, revocable license to use certain software developed and owned by Issara – including the Inclusive Labor Monitoring (ILM), CASCADE Supplier Dashboard and the Golden Dreams Marketplace – during the term of this agreement. The terms of that license are subject to change by Issara at any time upon notice to Company.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section8Title",
												"Issara Worker Voice Channels and Worker-Provided Information",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section8P1",
												"Worker-provided information collected through Issara’s worker voice channels is made available on the CASCADE platform. Information available on the platform does not necessarily represent the views of Issara. While Issara makes reasonable efforts to ensure the accuracy and reliability of the information collected, Issara is not responsible for any errors or omissions, or for the results obtained from the use of this information. In no event will the Company hold Issara or its employees, consultants, officers, or representatives liable for information in CASCADE or for decisions made or actions taken by any party in reliance on such information.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section8P2",
												"The Company also agrees to not penalize workers, formally or informally, for information reported on the CASCADE platform. An aim of Issara worker voice channels is to provide workers with a safe, independent mechanism to provide feedback, positive or negative, regarding matters of importance to the worker. CASCADE is a tool that can help the Company and businesses to have visibility of worker reported feedback that they otherwise might not receive. The ILM and CASCADE information can be useful for improving business intelligence, building trust with workers, improving working conditions, strengthening grievance mechanisms and remediation, operationalizing ethical recruitment, addressing labor risks, monitoring progress and continuous improvement, and demonstrating business leadership and commitment to responsible labor practices. Any penalization of workers for utilizing Issara worker voice channels is a breach of this agreement and a breach of the license to use ILM and CASCADE.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section9Title",
												"Publicity",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section9Body",
												"Neither party shall use the other party’s name and logo in any external public announcement, press release, or marketing materials regarding CASCADE, without the prior written consent of the other party. The existence of this agreement and of Company’s participation in Issara ILM, CASCADE, and related programs is not intended to be confidential. Any proposed publicity must be shared with the other party at least seven (7) business days in advance for review and approval. Such approval shall not be unreasonably withheld, provided the communication accurately reflects the scope and nature of the partnership.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section10Title",
												"Confidentiality",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section10P1",
												"For the purposes of this agreement, “Confidential Information” means:",
											)}
										</p>
										<ul className={styles.agreementList}>
											<li>
												{t(
													"supplierTrackSelection.agreement.section10Item1",
													"Any information concerning working conditions of the employees or contractors of the Company and its suppliers;",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section10Item2",
													"The specific terms of this Agreement;",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section10Item3",
													"Any recommendation, advice, report, service, protocol, procedure, or methodology given, rendered, or recommended by Issara to the Company; and",
												)}
											</li>
											<li>
												{t(
													"supplierTrackSelection.agreement.section10Item4",
													"All information or materials which can reasonably be considered to be confidential.",
												)}
											</li>
										</ul>
										<p>
											{t(
												"supplierTrackSelection.agreement.section10Commitments",
												"The parties hereby make the following commitments regarding Confidential Information:",
											)}
										</p>
										<p>
											<strong>1.1</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section10Clause1",
												"Issara and the Company shall limit the internal availability of Confidential Information to those employees or advisors who are reasonably necessary to effectuate the performance of the parties’ responsibilities under this Agreement and the Standards.",
											)}
										</p>
										<p>
											<strong>1.2</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section10Clause2",
												"The Company shall not disclose Confidential Information to any third party, except that Company may disclose information to third parties concerning working conditions of Company’s employees or contractors and those of its suppliers.",
											)}
										</p>
										<p>
											<strong>1.3</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section10Clause3",
												"Issara and the Company shall not use, or allow to be used, any of the Confidential Information in any manner in violation of applicable laws, rules or regulations, including any relevant governmental order; and",
											)}
										</p>
										<p>
											<strong>1.4</strong>{" "}
											{t(
												"supplierTrackSelection.agreement.section10Clause4",
												"Issara and the Company shall take all reasonable measures to protect the confidentiality of all Confidential Information in its possession or under its control.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section10Exceptions",
												"The provisions of Sections 1.1 – 1.4 above shall not apply to any disclosure (i) required by law, regulation, governmental order, and/or order of any competent court; (ii) in response to requests for information requested by government investigators or (iii) any information that is already in the public domain at the time of disclosure, provided that such information did not enter the public domain as the result of a breach of confidentiality by any person, including a breach of this Agreement. In addition, Issara shall have a limited right to disclose confidential information about working conditions of Company employees or contractors to the extent necessary to protect the health and safety of those workers, as described in the Standards, and to share such information with Issara Strategic Partners which are engaged in a business relationship with the Company.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section11Title",
												"Privacy and Data - Thailand Personal Data Protection Act",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section11P1",
												"This Agreement takes into consideration the requirements of Thailand’s Personal Data Protection Act (PDPA) as well as additional worker safeguarding requirements, which exceed the standard of Thai PDPA.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section11P2",
												"The PDPA sets forth requirements for data controllers and data processors, including both public and private entities, on how to receive consent from data subjects before processing, collecting, or disclosing personal data. Issara collects personal data of individuals, primarily workers and job seekers, as a part of its activities (for example, running a worker helpline) only when the individuals voluntarily provide this personal data. This personal data is collected from workers only after clarifying the nature and extent of their informed consent - for example, what information of theirs can be shared with whom, and for what purpose. Workers and job seekers do not need to provide their personal data in order to receive services and support from Issara.",
											)}
										</p>
										<p>
											{t(
												"supplierTrackSelection.agreement.section11P3",
												"Personal data from workers will only be disclosed to the Company if workers have provided informed consent, in compliance with PDPA, and additionally only after risk assessment has been undertaken by Issara staff. The data owner can reject or change their decision on the sharing of their information at any time, for example if the risk situation changes. The data owner can also request deletion of some or all of their personal data from the platform anytime.",
											)}
										</p>
									</section>

									<section>
										<h3>
											{t(
												"supplierTrackSelection.agreement.section12Title",
												"Interpretation and Governing Laws",
											)}
										</h3>
										<p>
											{t(
												"supplierTrackSelection.agreement.section12Body",
												"This Agreement, and any related instrument or agreement, shall be governed and interpreted according to the laws of Thailand and shall be interpreted according to the plain language of its terms. If any portion of this agreement is deemed to be unenforceable the rest of the agreement shall remain in force and the offending portion stricken from the agreement (i.e., the agreement is severable). This agreement may not be modified or amended except by written agreement signed by authorized representatives of both parties.",
											)}
										</p>
									</section>
								</div>
							</div>

							<div className={styles.licenseForm}>
								<h3 className={styles.formSectionHeading}>
									{t(
										"supplierTrackSelection.formHeading",
										"Affirmation and Agreement",
									)}
								</h3>
								<label className={styles.acceptLabel}>
									<input
										checked={accepted}
										onChange={(event) => setAccepted(event.target.checked)}
										type="checkbox"
									/>
									<span>
										{t(
											"supplierTrackSelection.formAffirmation",
											"By clicking ‘I Agree’, you confirm that you have read the agreement in its entirety, understand it, are authorized to act on behalf of your company and agree to bind your company to these terms.",
										)}
									</span>
								</label>

								<div className={styles.fields}>
									<label htmlFor={signerNameId}>
										<span className={styles.fieldLabel}>
											{t(
												"supplierTrackSelection.formSignerName",
												"Full legal name",
											)}
										</span>
										<input
											aria-describedby={
												signerNameError ? `${signerNameId}-error` : undefined
											}
											aria-invalid={Boolean(signerNameError)}
											autoComplete="name"
											id={signerNameId}
											maxLength={255}
											onBlur={() =>
												setTouchedFields((fields) => ({
													...fields,
													signerName: true,
												}))
											}
											onChange={(event) => setSignerName(event.target.value)}
											placeholder={t(
												"supplierTrackSelection.formSignerNamePlaceholder",
												"e.g. Somchai Prasert",
											)}
											type="text"
											value={signerName}
										/>
										{signerNameError && (
											<span
												className={styles.fieldError}
												id={`${signerNameId}-error`}
												role="alert"
											>
												{signerNameError}
											</span>
										)}
									</label>
									<label htmlFor={signerTitleId}>
										<span className={styles.fieldLabel}>
											{t("supplierTrackSelection.formSignerTitle", "Title")}
										</span>
										<input
											aria-describedby={
												signerTitleError ? `${signerTitleId}-error` : undefined
											}
											aria-invalid={Boolean(signerTitleError)}
											autoComplete="organization-title"
											id={signerTitleId}
											maxLength={255}
											onBlur={() =>
												setTouchedFields((fields) => ({
													...fields,
													signerTitle: true,
												}))
											}
											onChange={(event) => setSignerTitle(event.target.value)}
											placeholder={t(
												"supplierTrackSelection.formSignerTitlePlaceholder",
												"e.g. Compliance Manager",
											)}
											type="text"
											value={signerTitle}
										/>
										{signerTitleError && (
											<span
												className={styles.fieldError}
												id={`${signerTitleId}-error`}
												role="alert"
											>
												{signerTitleError}
											</span>
										)}
									</label>
									<label htmlFor={signerAffiliationId}>
										<span className={styles.fieldLabel}>
											{t(
												"supplierTrackSelection.formSignerAffiliation",
												"Affiliation / Company",
											)}
										</span>
										<input
											aria-describedby={
												signerAffiliationError
													? `${signerAffiliationId}-error`
													: undefined
											}
											aria-invalid={Boolean(signerAffiliationError)}
											autoComplete="organization"
											id={signerAffiliationId}
											maxLength={255}
											onBlur={() =>
												setTouchedFields((fields) => ({
													...fields,
													signerAffiliation: true,
												}))
											}
											onChange={(event) =>
												setSignerAffiliation(event.target.value)
											}
											placeholder={t(
												"supplierTrackSelection.formSignerAffiliationPlaceholder",
												"Type your organization",
											)}
											type="text"
											value={signerAffiliation}
										/>
										{signerAffiliationError && (
											<span
												className={styles.fieldError}
												id={`${signerAffiliationId}-error`}
												role="alert"
											>
												{signerAffiliationError}
											</span>
										)}
									</label>
									<div className={styles.dateField}>
										<span className={styles.fieldLabel} id={signedDateId}>
											{t("supplierTrackSelection.formDate", "Date")}
										</span>
										<div className={styles.calendarDisplay}>
											<span className={styles.calendarFullDate}>
												{signedDateDisplay}
											</span>
											<CalendarIcon
												aria-hidden
												className={styles.calendarInlineIcon}
											/>
										</div>
										<time className={styles.srOnly} dateTime={signedDateValue}>
											{signedDateDisplay}
										</time>
									</div>
								</div>

								{storedUserEmail && (
									<div className={styles.emailFieldWrap}>
										<span className={styles.fieldLabel}>
											{t(
												"supplierTrackSelection.formWorkEmail",
												"Work email address (associated with the Company)",
											)}
										</span>
										<div className={styles.emailDisplay}>{storedUserEmail}</div>
									</div>
								)}

								<button
									className={styles.coralButton}
									disabled={fullMutation.isPending}
									onClick={handleSignAgreement}
									type="button"
								>
									{fullMutation.isPending
										? t(
												"supplierTrackSelection.formSigningButton",
												"Signing...",
											)
										: t("supplierTrackSelection.formSignButton", "I Agree")}
								</button>
								<p className={styles.emailNote}>
									{t(
										"supplierTrackSelection.formEmailNote",
										"A signed copy of this agreement will be emailed to you for your records.",
									)}
								</p>
							</div>
						</div>

						{showValidationModal && (
							<div
								aria-labelledby={validationModalTitleId}
								aria-modal="true"
								className={styles.modalOverlay}
								role="dialog"
							>
								<div className={styles.modalCard}>
									<h2 id={validationModalTitleId}>
										{t(
											"supplierTrackSelection.modalTitle",
											"Checkboxes Required",
										)}
									</h2>
									<p>
										{t(
											"supplierTrackSelection.modalDescription",
											"Please confirm you have read each of the following 3 sections under Principles and Operating Standards by checking their confirmation boxes before completing the agreement:",
										)}
									</p>
									<ul className={styles.modalMissingList}>
										{!readOverview && (
											<li>
												{t(
													"supplierTrackSelection.modalItemOverview",
													"Principles and Operating Standards Overview",
												)}
											</li>
										)}
										{!readPrinciples && (
											<li>
												{t(
													"supplierTrackSelection.modalItemPrinciples",
													"Five Guiding Principles",
												)}
											</li>
										)}
										{!readStandards && (
											<li>
												{t(
													"supplierTrackSelection.modalItemStandards",
													"Operational Standards (with the 3 Areas)",
												)}
											</li>
										)}
									</ul>
									<button
										className={styles.primaryButton}
										onClick={() => {
											setShowValidationModal(false);
											scrollToStandards();
										}}
										type="button"
									>
										{t(
											"supplierTrackSelection.modalReviewButton",
											"Understand & Review",
										)}
									</button>
								</div>
							</div>
						)}
					</section>
				)}

				{statusQuery.data && activeScreen === "confirm" && (
					<section className={styles.confirmation}>
						<span className={styles.confirmationIcon}>
							<CheckIcon aria-hidden height="28" width="28" />
						</span>
						<h1>
							{t("supplierTrackSelection.confirmTitle", "Agreement signed")}
						</h1>
						<p>
							{t("supplierTrackSelection.confirmMessage", {
								name: signerFirstName,
								emailSentText:
									emailSent === true
										? t(
												"supplierTrackSelection.confirmEmailSent",
												"A copy of the signed License Agreement has been sent to your email. ",
											)
										: "",
								defaultValue: `Thanks, ${signerFirstName}. ${
									emailSent === true
										? "A copy of the signed License Agreement has been sent to your email. "
										: ""
								}You now have Super User access to all pages on CASCADE.`,
							})}
						</p>
						{emailSent === false && (
							<p className={styles.formError}>
								{t(
									"supplierTrackSelection.confirmEmailFailed",
									"Your agreement was saved, but the confirmation email could not be delivered. Please contact Issara support if you need a copy.",
								)}
							</p>
						)}
						<button
							className={styles.primaryButton}
							onClick={() => navigate({ to: "/company-dashboard" })}
							type="button"
						>
							{t(
								"supplierTrackSelection.confirmContinueButton",
								"Continue to CASCADE",
							)}
						</button>
					</section>
				)}
			</main>
			<Footer />
		</div>
	);
}
