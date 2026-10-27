import * as Icons from "@mui/icons-material";
import { Card, Flex, Select, Text } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import thumbsUpImage from "$src/assets/img/thumbs_up.png";
import {
	type AnswerMap,
	computeOverallPercent,
	computeSectionPercent,
	computeSectionPoints,
	type DiagnosticSection,
	diagnosticSections,
	getStars,
} from "$src/data/grievanceDiagnosticSections";
import { GuestLayout } from "$src/layouts/GuestLayout";
import { useSubmitDiagnostic } from "$src/queries/useGrievanceDiagnostic";
import type {
	ConfettiShape,
	ConfettiSpawn,
	SavedProgressPayload,
	Step,
} from "$src/types/grievance-self-diagnostic";
import { getUserIdentifiers } from "$src/utils/getUserIdentifiers";

const TEAL = "#148696";
const GRADIENT_BG = "linear-gradient(135deg, #1aaec3 0%, #148696 100%)";
const PROGRESS_KEY_PREFIX = "gm-diagnostic-progress";
const LEGACY_PROGRESS_KEY = PROGRESS_KEY_PREFIX;

const COMPONENT_CARDS = [
	{
		number: 1,
		titleKey: "grievanceSelfDiagnostic.components.cards.safeguards",
	},
	{
		number: 2,
		titleKey: "grievanceSelfDiagnostic.components.cards.communications",
	},
	{
		number: 3,
		titleKey: "grievanceSelfDiagnostic.components.cards.access",
	},
	{
		number: 4,
		titleKey: "grievanceSelfDiagnostic.components.cards.remediation",
	},
	{
		number: 5,
		titleKey: "grievanceSelfDiagnostic.components.cards.retaliation",
	},
	{
		number: 6,
		titleKey: "grievanceSelfDiagnostic.components.cards.conflicts",
	},
	{
		number: 7,
		titleKey: "grievanceSelfDiagnostic.components.cards.empowerment",
	},
	{
		number: 8,
		titleKey: "grievanceSelfDiagnostic.components.cards.channels",
	},
	{
		number: 9,
		titleKey: "grievanceSelfDiagnostic.components.cards.mindset",
	},
];

const SECTION_TITLE_KEYS: Record<number, string> = Object.fromEntries(
	COMPONENT_CARDS.map(({ number, titleKey }) => [number, titleKey]),
);

const SECTION_CONFETTI_THEMES: Array<{
	colors: string[];
	count: number;
	maxDelay: number;
	maxRotate: number;
	spawn: ConfettiSpawn;
	shapes: ConfettiShape[];
}> = [
	// Section 1 — teal/green foundation
	{
		colors: ["#1aaec3", "#148696", "#f59e0b", "#10b981", "#facc15"],
		count: 80,
		maxDelay: 0.4,
		maxRotate: 720,
		spawn: "top",
		shapes: ["rect", "square", "circle", "diamond"],
	},
	// Section 2 — vibrant rainbow (communications)
	{
		colors: ["#f43f5e", "#ec4899", "#a855f7", "#3b82f6", "#06b6d4", "#facc15"],
		count: 90,
		maxDelay: 0.5,
		maxRotate: 900,
		spawn: "center",
		shapes: ["star", "circle", "diamond", "rect"],
	},
	// Section 3 — cool blues (privacy)
	{
		colors: ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9", "#22d3ee"],
		count: 80,
		maxDelay: 0.4,
		maxRotate: 720,
		spawn: "left",
		shapes: ["rect", "diamond", "square", "star"],
	},
	// Section 4 — golden celebration (halfway!)
	{
		colors: ["#facc15", "#fbbf24", "#f59e0b", "#10b981", "#f43f5e", "#1aaec3"],
		count: 140,
		maxDelay: 0.7,
		maxRotate: 1080,
		spawn: "burst",
		shapes: ["star", "star", "circle", "diamond", "rect"],
	},
	// Section 5 — warm red/orange (retaliation-free)
	{
		colors: ["#ef4444", "#f97316", "#ec4899", "#fb923c", "#fca5a5"],
		count: 85,
		maxDelay: 0.4,
		maxRotate: 720,
		spawn: "bottom",
		shapes: ["square", "rect", "circle", "diamond"],
	},
	// Section 6 — deep purple (integrity)
	{
		colors: ["#7c3aed", "#6d28d9", "#4f46e5", "#a78bfa", "#c4b5fd"],
		count: 85,
		maxDelay: 0.5,
		maxRotate: 800,
		spawn: "right",
		shapes: ["diamond", "rect", "square", "star"],
	},
	// Section 7 — orange/amber (empowerment)
	{
		colors: ["#f59e0b", "#d97706", "#10b981", "#059669", "#fbbf24"],
		count: 90,
		maxDelay: 0.5,
		maxRotate: 800,
		spawn: "sides",
		shapes: ["rect", "circle", "star", "diamond"],
	},
	// Section 8 — emerald green (independence)
	{
		colors: ["#10b981", "#059669", "#047857", "#34d399", "#6ee7b7", "#1aaec3"],
		count: 95,
		maxDelay: 0.5,
		maxRotate: 800,
		spawn: "corners",
		shapes: ["star", "diamond", "square", "circle"],
	},
	// Section 9 — all colors, maximum celebration!
	{
		colors: [
			"#1aaec3",
			"#f43f5e",
			"#facc15",
			"#10b981",
			"#a855f7",
			"#f97316",
			"#3b82f6",
			"#ec4899",
		],
		count: 170,
		maxDelay: 0.9,
		maxRotate: 1440,
		spawn: "topBottom",
		shapes: ["star", "rect", "diamond", "circle", "square"],
	},
];

const STAR_CLIP_PATH =
	"polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)";

const DIAMOND_CLIP_PATH = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

const randomBetween = (min: number, max: number) =>
	min + Math.random() * (max - min);

const buildTrajectory = (
	spawn: ConfettiSpawn,
	index: number,
	total: number,
	driftScale: number,
) => {
	switch (spawn) {
		case "top": {
			const startX = randomBetween(0, 100);
			const startY = randomBetween(-12, -3);
			return {
				startX,
				startY,
				endX: startX + randomBetween(-driftScale, driftScale),
				endY: randomBetween(106, 120),
			};
		}
		case "bottom": {
			const startX = randomBetween(0, 100);
			const startY = randomBetween(102, 112);
			return {
				startX,
				startY,
				endX: startX + randomBetween(-driftScale, driftScale),
				endY: randomBetween(-24, -6),
			};
		}
		case "left": {
			const startX = randomBetween(-14, -4);
			const startY = randomBetween(6, 94);
			return {
				startX,
				startY,
				endX: randomBetween(108, 124),
				endY: startY + randomBetween(-driftScale * 0.6, driftScale * 0.6),
			};
		}
		case "right": {
			const startX = randomBetween(104, 114);
			const startY = randomBetween(6, 94);
			return {
				startX,
				startY,
				endX: randomBetween(-24, -8),
				endY: startY + randomBetween(-driftScale * 0.6, driftScale * 0.6),
			};
		}
		case "center": {
			const startX = randomBetween(43, 57);
			const startY = randomBetween(32, 68);
			const angle = randomBetween(0, Math.PI * 2);
			const distance = randomBetween(24, 56);
			return {
				startX,
				startY,
				endX: startX + Math.cos(angle) * distance,
				endY: startY + Math.sin(angle) * distance,
			};
		}
		case "sides": {
			const fromLeft = index % 2 === 0;
			const startX = fromLeft
				? randomBetween(-12, -4)
				: randomBetween(104, 112);
			const startY = randomBetween(6, 94);
			return {
				startX,
				startY,
				endX: fromLeft ? randomBetween(104, 118) : randomBetween(-18, -6),
				endY: startY + randomBetween(-driftScale * 0.7, driftScale * 0.7),
			};
		}
		case "corners": {
			const corner = index % 4;
			const cornerPoints = [
				{ x: randomBetween(-10, 6), y: randomBetween(-10, 8) },
				{ x: randomBetween(94, 110), y: randomBetween(-10, 8) },
				{ x: randomBetween(-10, 6), y: randomBetween(92, 110) },
				{ x: randomBetween(94, 110), y: randomBetween(92, 110) },
			];
			const point = cornerPoints[corner];
			return {
				startX: point.x,
				startY: point.y,
				endX: randomBetween(22, 78),
				endY: randomBetween(16, 88),
			};
		}
		case "topBottom": {
			const fromTop = index % 2 === 0;
			const startX = randomBetween(0, 100);
			const startY = fromTop ? randomBetween(-12, -4) : randomBetween(104, 112);
			return {
				startX,
				startY,
				endX: startX + randomBetween(-driftScale, driftScale),
				endY: fromTop ? randomBetween(104, 118) : randomBetween(-22, -8),
			};
		}
		case "burst":
		default: {
			const arc = (Math.PI * 2 * index) / Math.max(1, total);
			const jitter = randomBetween(-0.35, 0.35);
			const angle = arc + jitter;
			const startX = randomBetween(46, 54);
			const startY = randomBetween(42, 58);
			const distance = randomBetween(30, 78);
			return {
				startX,
				startY,
				endX: startX + Math.cos(angle) * distance,
				endY: startY + Math.sin(angle) * distance,
			};
		}
	}
};

const Confetti = ({ sectionNumber = 1 }: { sectionNumber?: number }) => {
	const theme =
		SECTION_CONFETTI_THEMES[
			(sectionNumber - 1) % SECTION_CONFETTI_THEMES.length
		];
	const { colors, count, maxDelay, maxRotate, spawn, shapes } = theme;

	const particles = useMemo(
		() => {
			const driftScale =
				sectionNumber === 9 ? 34 : sectionNumber === 4 ? 28 : 20;
			return Array.from({ length: count }, (_, i) => {
				const trajectory = buildTrajectory(spawn, i, count, driftScale);
				const shape = shapes[i % shapes.length];
				const sizeBase =
					sectionNumber === 9 ? 13 : sectionNumber === 4 ? 11 : 9;
				const width = randomBetween(5, sizeBase);
				const height =
					shape === "circle" || shape === "square"
						? width
						: randomBetween(width + 2, width + (sectionNumber >= 8 ? 10 : 8));

				return {
					id: i,
					startX: trajectory.startX,
					startY: trajectory.startY,
					endX: trajectory.endX,
					endY: trajectory.endY,
					delay: Math.random() * maxDelay,
					duration: 1.9 + Math.random() * 2.3,
					rotate: (Math.random() - 0.5) * maxRotate,
					initialRotate: randomBetween(-90, 90),
					color: colors[i % colors.length],
					width,
					height,
					shape,
					startScale: randomBetween(0.7, 1.05),
				};
			});
		},
		// stable on mount — random values intentionally fixed per render
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return (
		<div
			aria-hidden
			className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
		>
			{particles.map((p) => (
				<motion.span
					animate={{
						top: `${p.endY}%`,
						left: `${p.endX}%`,
						rotate: p.rotate,
						opacity: [1, 1, 0],
						scale: [p.startScale, 1, 0.92],
					}}
					initial={{
						top: `${p.startY}%`,
						left: `${p.startX}%`,
						rotate: p.initialRotate,
						opacity: 0,
						scale: p.startScale,
					}}
					key={p.id}
					style={{
						position: "absolute",
						width: p.width,
						height: p.height,
						background: p.color,
						borderRadius:
							p.shape === "circle"
								? "50%"
								: p.shape === "square"
									? 2
									: p.shape === "rect"
										? 1
										: 0,
						clipPath:
							p.shape === "star"
								? STAR_CLIP_PATH
								: p.shape === "diamond"
									? DIAMOND_CLIP_PATH
									: undefined,
					}}
					transition={{
						duration: p.duration,
						delay: p.delay,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
};

const StarRow = ({ stars, size = 32 }: { stars: number; size?: number }) => (
	<div
		aria-label={`${stars} of 5 stars`}
		className="flex items-center gap-1"
		role="img"
	>
		{[1, 2, 3, 4, 5].map((n) => (
			<Icons.Star
				key={n}
				style={{
					color: n <= stars ? "#facc15" : "#e5e7eb",
					fontSize: size,
				}}
			/>
		))}
	</div>
);

const LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "th", name: "ไทย" },
	{ code: "my", name: "မြန်မာ" },
	{ code: "km", name: "ខ្មែរ" },
	{ code: "ne", name: "नेपाली" },
	{ code: "ja", name: "日本語" },
];

const getSectionTitle = (
	sectionNumber: number,
	t: ReturnType<typeof useTranslation>["t"],
) => t(SECTION_TITLE_KEYS[sectionNumber]);

const translateOptionLabel = (
	label: string,
	t: ReturnType<typeof useTranslation>["t"],
) => {
	switch (label) {
		case "Not at all":
			return t("grievanceSelfDiagnostic.options.notAtAll");
		case "Partially, in progress":
			return t("grievanceSelfDiagnostic.options.partially");
		case "Yes, fully":
			return t("grievanceSelfDiagnostic.options.yesFully");
		case "No":
			return t("grievanceSelfDiagnostic.options.no");
		case "A lot":
			return t("grievanceSelfDiagnostic.options.aLot");
		case "I'm not sure":
			return t("grievanceSelfDiagnostic.options.notSure");
		case "Sometimes":
			return t("grievanceSelfDiagnostic.options.sometimes");
		case "Yes":
			return t("grievanceSelfDiagnostic.options.yes");
		case "Yes, regularly":
			return t("grievanceSelfDiagnostic.options.yesRegularly");
		default:
			return label;
	}
};

const PrintProgressButton = ({
	answers,
	t,
}: {
	answers: AnswerMap;
	t: ReturnType<typeof useTranslation>["t"];
}) => {
	const handlePrint = () => {
		const lines: string[] = [];

		lines.push("GRIEVANCE SELF-DIAGNOSTIC");
		lines.push("");

		for (const section of diagnosticSections) {
			lines.push(
				`Section ${section.number}: ${getSectionTitle(section.number, t)}`,
			);
			for (const question of section.questions) {
				const selectedIndex = answers[question.id];
				const selectedLabel =
					typeof selectedIndex === "number" &&
					selectedIndex >= 0 &&
					selectedIndex < question.options.length
						? translateOptionLabel(question.options[selectedIndex].label, t)
						: "Not answered";

				lines.push(`- ${question.text}`);
				lines.push(`  Answer: ${selectedLabel}`);
			}
			lines.push("");
		}

		const escaped = lines
			.join("\n")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		const iframe = document.createElement("iframe");
		iframe.setAttribute("aria-hidden", "true");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		document.body.appendChild(iframe);

		const printDoc = iframe.contentWindow?.document;
		if (!printDoc) {
			iframe.remove();
			return;
		}

		printDoc.open();
		printDoc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Grievance Self-Diagnostic</title>
    <style>
      body {
        margin: 24px;
        font-family: "DM Sans", sans-serif;
        color: #111827;
        line-height: 1.5;
        white-space: pre-wrap;
      }
      pre {
        margin: 0;
        font-family: "DM Sans", sans-serif;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <pre>${escaped}</pre>
  </body>
</html>`);
		printDoc.close();

		const doPrint = () => {
			const win = iframe.contentWindow;
			if (!win) {
				iframe.remove();
				return;
			}
			win.focus();
			win.print();
			setTimeout(() => {
				iframe.remove();
			}, 0);
		};

		setTimeout(doPrint, 50);
	};

	return (
		<button
			aria-label={t("grievanceSelfDiagnostic.progress.print")}
			className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A979C] hover:text-[#148696] transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
			onClick={handlePrint}
			type="button"
		>
			<Icons.Print style={{ fontSize: 16 }} />
			{t("grievanceSelfDiagnostic.progress.print")}
		</button>
	);
};

export function GrievanceSelfDiagnostic() {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const { role, supplierId, partnerId, isSupplier } = getUserIdentifiers();

	const [step, setStep] = useState<Step>("intro");
	const [sectionIndex, setSectionIndex] = useState(0);
	const [questionIndex, setQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<AnswerMap>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [recommendedSolutions, setRecommendedSolutions] = useState<
		MarketplaceSolution[]
	>([]);
	const [email, setEmail] = useState("");
	const [emailOptIn, setEmailOptIn] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [emailSending, setEmailSending] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [saveIndicator, setSaveIndicator] = useState(false);
	const [hasSavedProgress, setHasSavedProgress] = useState(false);
	const summaryCardExportRef = useRef<HTMLDivElement | null>(null);

	const progressStorageKey = useMemo(() => {
		const rolePart = role ?? "anonymous";
		const supplierPart = supplierId
			? `supplier-${supplierId}`
			: "supplier-none";
		const partnerPart = partnerId ? `partner-${partnerId}` : "partner-none";
		return `${PROGRESS_KEY_PREFIX}:${rolePart}:${supplierPart}:${partnerPart}`;
	}, [role, supplierId, partnerId]);
	const readSavedProgress = () => {
		try {
			const scopedRaw = localStorage.getItem(progressStorageKey);
			if (scopedRaw) {
				return {
					payload: JSON.parse(scopedRaw) as SavedProgressPayload,
					fromLegacy: false,
				};
			}

			const legacyRaw = localStorage.getItem(LEGACY_PROGRESS_KEY);
			if (legacyRaw) {
				return {
					payload: JSON.parse(legacyRaw) as SavedProgressPayload,
					fromLegacy: true,
				};
			}
		} catch {
			/* ignore */
		}

		return null;
	};

	const normalizeSavedProgress = (payload: SavedProgressPayload) => {
		const rawSectionIndex =
			typeof payload.sectionIndex === "number"
				? Math.floor(payload.sectionIndex)
				: 0;
		const safeSectionIndex = Math.min(
			Math.max(rawSectionIndex, 0),
			diagnosticSections.length - 1,
		);

		const sectionQuestions =
			diagnosticSections[safeSectionIndex]?.questions ?? [];
		const maxQuestionIndex = Math.max(sectionQuestions.length - 1, 0);
		const rawQuestionIndex =
			typeof payload.questionIndex === "number"
				? Math.floor(payload.questionIndex)
				: 0;
		const safeQuestionIndex = Math.min(
			Math.max(rawQuestionIndex, 0),
			maxQuestionIndex,
		);

		return {
			step: payload.step,
			sectionIndex: safeSectionIndex,
			questionIndex: safeQuestionIndex,
			answers: payload.answers,
		};
	};

	// Check for saved progress on mount
	useEffect(() => {
		const saved = readSavedProgress();
		if (!saved) return;

		const { payload, fromLegacy } = saved;
		if (
			payload.step &&
			payload.step !== "intro" &&
			payload.step !== "results"
		) {
			setHasSavedProgress(true);
		}

		if (fromLegacy) {
			try {
				localStorage.setItem(progressStorageKey, JSON.stringify(payload));
				localStorage.removeItem(LEGACY_PROGRESS_KEY);
			} catch {
				/* ignore */
			}
		}
	}, [progressStorageKey]);

	// Auto-save progress whenever state changes
	useEffect(() => {
		if (step === "intro" || step === "results") return;
		try {
			localStorage.setItem(
				progressStorageKey,
				JSON.stringify({ step, sectionIndex, questionIndex, answers }),
			);
			localStorage.removeItem(LEGACY_PROGRESS_KEY);
		} catch {
			/* ignore */
		}
	}, [step, sectionIndex, questionIndex, answers, progressStorageKey]);

	useEffect(() => {
		const API_BASE = import.meta.env.VITE_APP_CASCADE_API_URL as string;
		const fetchUrl = API_BASE
			? `${API_BASE.replace(/\/$/, "")}/solutions`
			: "/api/v1/solutions";

		let cancelled = false;
		fetch(fetchUrl, { credentials: "include" })
			.then((res) => {
				if (!res.ok) throw new Error(`Fetch error ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				const items = Array.isArray(data)
					? data
					: data.data || data.items || [];
				if (items.length > 0) {
					setRecommendedSolutions(
						pickRecommendedSolutions(items as MarketplaceSolution[]),
					);
				}
			})
			.catch((err) => {
				console.error("Failed to load solutions from backend:", err);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const submitMutation = useSubmitDiagnostic();

	const totalSections = diagnosticSections.length;
	const currentSection = diagnosticSections[sectionIndex];
	const currentQuestion = currentSection?.questions[questionIndex];

	const totalQuestions = useMemo(
		() => diagnosticSections.reduce((s, sec) => s + sec.questions.length, 0),
		[],
	);
	const answeredCount = Object.keys(answers).length;
	const overallProgress = totalQuestions
		? (answeredCount / totalQuestions) * 100
		: 0;

	const overallPercent = useMemo(
		() => computeOverallPercent(diagnosticSections, answers),
		[answers],
	);
	const stars = getStars(overallPercent);

	const sectionPercents = useMemo(
		() =>
			diagnosticSections.map((s) => ({
				section: s,
				percent: computeSectionPercent(s, answers),
				points: computeSectionPoints(s, answers),
			})),
		[answers],
	);

	const weakestSections = useMemo(
		() =>
			[...sectionPercents]
				.sort((a, b) => a.percent - b.percent)
				.slice(0, 3)
				.filter((s) => s.percent < 80),
		[sectionPercents],
	);

	const handleAnswer = (questionId: string, optionIndex: number) => {
		setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
	};

	const goToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

	const handleStart = () => {
		setStep("components");
		goToTop();
	};

	const handleStartAssessment = () => {
		setSectionIndex(0);
		setQuestionIndex(0);
		setStep("question");
		goToTop();
	};

	const handleNextQuestion = () => {
		if (!currentSection) return;
		const isLastInSection =
			questionIndex >= currentSection.questions.length - 1;
		if (isLastInSection) {
			setStep("section_complete");
			goToTop();
			return;
		}
		setQuestionIndex((i) => i + 1);
		goToTop();
	};

	const handlePrevQuestion = () => {
		if (questionIndex > 0) {
			setQuestionIndex((i) => i - 1);
			goToTop();
			return;
		}
		if (sectionIndex > 0) {
			const prevSection = diagnosticSections[sectionIndex - 1];
			setSectionIndex((i) => i - 1);
			setQuestionIndex(prevSection.questions.length - 1);
			goToTop();
		}
	};

	const handleContinueAfterSection = async () => {
		const isLastSection = sectionIndex >= totalSections - 1;
		if (!isLastSection) {
			setSectionIndex((i) => i + 1);
			setQuestionIndex(0);
			setStep("question");
			goToTop();
			return;
		}
		await submitAndShowResults();
	};

	const submitAndShowResults = async () => {
		setSubmitError(null);
		try {
			await submitMutation.mutateAsync({
				supplier_id: isSupplier ? supplierId : null,
				partner_id: !isSupplier ? partnerId : null,
				overall_score: Number(overallPercent.toFixed(2)),
				stars,
				section_scores: Object.fromEntries(
					sectionPercents.map((sp) => [
						String(sp.section.number),
						Number(sp.percent.toFixed(2)),
					]),
				),
				answers,
			});
		} catch (err) {
			const message =
				(err as { response?: { data?: { detail?: string } } })?.response?.data
					?.detail ||
				(err instanceof Error
					? err.message
					: t("grievanceSelfDiagnostic.results.submitErrorFallback"));
			setSubmitError(message);
		}
		setStep("results");
		goToTop();
	};

	const handleRetake = () => {
		setAnswers({});
		setSectionIndex(0);
		setQuestionIndex(0);
		setSubmitError(null);
		setEmail("");
		setEmailOptIn(false);
		setEmailSent(false);
		setEmailError(null);
		setHasSavedProgress(false);
		try {
			localStorage.removeItem(progressStorageKey);
			localStorage.removeItem(LEGACY_PROGRESS_KEY);
		} catch {
			/* ignore */
		}
		setStep("intro");
		goToTop();
	};

	const handleResume = () => {
		const saved = readSavedProgress();
		if (saved) {
			const { payload, fromLegacy } = saved;
			const normalized = normalizeSavedProgress(payload);

			setSectionIndex(normalized.sectionIndex);
			setQuestionIndex(normalized.questionIndex);
			if (normalized.answers) setAnswers(normalized.answers);
			if (normalized.step) setStep(normalized.step);

			if (fromLegacy) {
				try {
					localStorage.setItem(progressStorageKey, JSON.stringify(normalized));
					localStorage.removeItem(LEGACY_PROGRESS_KEY);
				} catch {
					/* ignore */
				}
			}
		}
		goToTop();
	};

	const handleSave = () => {
		try {
			localStorage.setItem(
				progressStorageKey,
				JSON.stringify({ step, sectionIndex, questionIndex, answers }),
			);
			localStorage.removeItem(LEGACY_PROGRESS_KEY);
			setSaveIndicator(true);
			setTimeout(() => setSaveIndicator(false), 2200);
		} catch {
			/* ignore */
		}
	};

	const handleEmailSubmit = async () => {
		if (!email.trim()) return;
		setEmailSending(true);
		setEmailSent(false);
		setEmailError(null);

		const MAX_ATTACHMENT_BYTES = 3.5 * 1024 * 1024;
		const PDF_IMAGE_QUALITIES = [0.72, 0.6, 0.5, 0.4] as const;

		let attachment: File | undefined;
		const summaryCardEl = summaryCardExportRef.current;
		const replaceUnsupportedColorFns = (value: string) =>
			value.replace(/oklch\([^)]*\)/gi, "#6b7280");
		const sanitizeClonedDocumentColors = (clonedDoc: Document) => {
			clonedDoc.querySelectorAll("style").forEach((styleEl) => {
				if (!styleEl.textContent || !styleEl.textContent.includes("oklch(")) {
					return;
				}
				styleEl.textContent = replaceUnsupportedColorFns(styleEl.textContent);
			});

			clonedDoc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
				const inlineStyle = el.getAttribute("style");
				if (!inlineStyle || !inlineStyle.includes("oklch(")) {
					return;
				}
				el.setAttribute("style", replaceUnsupportedColorFns(inlineStyle));
			});
		};

		try {
			if (summaryCardEl) {
				const canvas = await html2canvas(summaryCardEl, {
					backgroundColor: "#ffffff",
					onclone: sanitizeClonedDocumentColors,
					scale: 1.25,
					useCORS: true,
				});

				let pdfBlob: Blob | null = null;
				for (const quality of PDF_IMAGE_QUALITIES) {
					const imageData = canvas.toDataURL("image/jpeg", quality);
					const pdf = new jsPDF({
						orientation: "p",
						unit: "pt",
						format: "a4",
						compress: true,
					});
					const pageWidth = pdf.internal.pageSize.getWidth();
					const pageHeight = pdf.internal.pageSize.getHeight();
					const margin = 28;
					const contentWidth = pageWidth - margin * 2;
					const contentHeight = pageHeight - margin * 2;
					const scaleRatio = Math.min(
						contentWidth / canvas.width,
						contentHeight / canvas.height,
					);
					const renderWidth = canvas.width * scaleRatio;
					const renderHeight = canvas.height * scaleRatio;
					const offsetX = margin + (contentWidth - renderWidth) / 2;
					const offsetY = margin + (contentHeight - renderHeight) / 2;

					pdf.addImage(
						imageData,
						"JPEG",
						offsetX,
						offsetY,
						renderWidth,
						renderHeight,
						undefined,
						"MEDIUM",
					);

					pdfBlob = pdf.output("blob");
					if (pdfBlob.size <= MAX_ATTACHMENT_BYTES) {
						break;
					}
				}

				if (pdfBlob) {
					attachment = new File(
						[pdfBlob],
						"grievance-self-diagnostic-results.pdf",
						{
							type: "application/pdf",
						},
					);
				}
			}
		} catch {
			// Continue even if attachment creation fails so email API is still called.
		}

		if (!attachment) {
			setEmailSending(false);
			setEmailError("Unable to generate the PDF attachment. Please try again.");
			return;
		}

		try {
			const apiBase = (
				(import.meta.env.VITE_APP_CASCADE_API_URL as string) || ""
			).replace(/\/$/, "");
			const url = apiBase
				? `${apiBase}/grievance-assessment-email`
				: "/api/v1/grievance-assessment-email";
			const message = `Your score: ${Math.round(overallPercent)}% (${stars} stars)${emailOptIn ? "\n\nMarketing opt-in: Yes" : ""}`;
			const formData = new FormData();
			formData.append("username", email.trim());
			formData.append("email", email.trim());
			formData.append("message", message);
			formData.append("subject", "CASCADE Grievance Self-Diagnostic Results");

			formData.append("attachment", attachment);

			const response = await fetch(url, {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			if (!response.ok) {
				const responseData = await response
					.json()
					.catch(() => null as { message?: string } | null);
				const errorMessage =
					responseData?.message || `Email API failed: ${response.status}`;
				throw new Error(errorMessage);
			}

			setEmailSent(true);
		} catch (error) {
			setEmailSent(false);
			setEmailError(
				error instanceof Error
					? error.message
					: "Unable to send email. Please try again.",
			);
		}
		setEmailSending(false);
	};

	const handleEmailChange = (value: string) => {
		setEmail(value);
		if (emailError) {
			setEmailError(null);
		}
	};

	const handleBackToDashboard = () => {
		navigate({ to: "/cascade-marketplace" });
	};

	const handleViewSolutions = () => {
		try {
			localStorage.setItem("cascade-marketplace-active-tab", "catalog");
		} catch {
			/* ignore */
		}
		navigate({ to: "/cascade-marketplace" });
	};

	const showProgress = step === "question" || step === "section_complete";

	return (
		<GuestLayout>
			<div className="min-h-screen bg-[#f8fafc] font-sans">
				<header className="border-b border-[#D2D2D2] sticky top-0 z-40 backdrop-blur-md bg-white/90">
					<div className="container mx-auto px-l h-14 flex items-center justify-between">
						{showProgress ? (
							<span className="text-sm font-semibold text-[#148696] hidden sm:block truncate max-w-[40%]">
								{getSectionTitle(sectionIndex + 1, t)}
							</span>
						) : (
							<span />
						)}
						<div className="flex items-center gap-3 ml-auto">
							{showProgress && (
								<>
									<PrintProgressButton answers={answers} t={t} />
									<button
										aria-label={t("grievanceSelfDiagnostic.progress.save")}
										className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A979C] hover:text-[#148696] transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
										onClick={handleSave}
										type="button"
									>
										{saveIndicator ? (
											<>
												<Icons.CloudDone
													style={{ fontSize: 16, color: "#10b981" }}
												/>
												<span className="text-[#10b981]">
													{t("grievanceSelfDiagnostic.progress.saved")}
												</span>
											</>
										) : (
											<>
												<Icons.Save style={{ fontSize: 16 }} />
												{t("grievanceSelfDiagnostic.progress.save")}
											</>
										)}
									</button>
									<span className="text-xs font-bold tabular-nums text-[#8A979C]">
										{t("grievanceSelfDiagnostic.progress.complete", {
											percent: Math.round(overallProgress),
										})}
									</span>
								</>
							)}
							<div className="hidden sm:flex items-center gap-2">
								<Select.Root
									onValueChange={(value) => i18n.changeLanguage(value)}
									value={i18n.language}
								>
									<Select.Trigger
										className="text-sm bg-white border border-[#D2D2D2] hover:border-[#148696]/40 rounded-lg h-9 min-w-[120px]"
										variant="surface"
									/>
									<Select.Content>
										{LANGUAGES.map((lang) => (
											<Select.Item key={lang.code} value={lang.code}>
												<Text size="2">{lang.name}</Text>
											</Select.Item>
										))}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</div>
					{showProgress && (
						<div className="container mx-auto px-l pb-m">
							<div className="flex items-center justify-between text-sm md:text-base font-bold text-[#56666C] mb-3">
								<span className="flex items-center gap-3">
									<span>
										{t("grievanceSelfDiagnostic.progress.sectionProgress", {
											current: sectionIndex + 1,
											total: totalSections,
										})}
									</span>
									{currentSection?.estimatedMinutes && (
										<span className="text-xs font-medium text-[#8A979C]">
											{t("grievanceSelfDiagnostic.progress.estTime", {
												minutes: currentSection.estimatedMinutes,
											})}
										</span>
									)}
									{step === "question" && currentQuestion?.isChallenge && (
										<span className="inline-flex items-center gap-1 text-xs md:text-sm font-bold text-[#B45309] bg-[#FEF3C7] rounded-full px-2.5 py-1">
											<Icons.AutoAwesome sx={{ fontSize: 14 }} />
											{t("grievanceSelfDiagnostic.progress.challenge")}
										</span>
									)}
								</span>
							</div>
							<div className="h-2.5 md:h-3 w-full bg-gray-200 border border-[#D2D2D2] rounded-full overflow-hidden">
								<motion.div
									animate={{ width: `${overallProgress}%` }}
									className="h-full rounded-full"
									initial={{ width: 0 }}
									style={{ background: GRADIENT_BG }}
									transition={{ duration: 0.4, ease: "easeOut" }}
								/>
							</div>
						</div>
					)}
				</header>

				<main className="container mx-auto px-l py-8 md:py-10 max-w-6xl">
					<AnimatePresence mode="wait">
						{step === "intro" && (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								initial={{ opacity: 0, y: 20 }}
								key="intro"
								transition={{ duration: 0.4 }}
							>
								<IntroPanel
									hasSavedProgress={hasSavedProgress}
									onResume={handleResume}
									onStart={handleStart}
								/>
							</motion.div>
						)}

						{step === "components" && (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								initial={{ opacity: 0, y: 20 }}
								key="components"
								transition={{ duration: 0.4 }}
							>
								<ComponentsPanel onContinue={handleStartAssessment} />
							</motion.div>
						)}

						{step === "question" && currentSection && currentQuestion && (
							<motion.div
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -20 }}
								initial={{ opacity: 0, x: 20 }}
								key={`question-${sectionIndex}-${questionIndex}`}
								transition={{ duration: 0.3 }}
							>
								<QuestionPanel
									answers={answers}
									isFirstOverall={sectionIndex === 0 && questionIndex === 0}
									onAnswer={handleAnswer}
									onNext={handleNextQuestion}
									onPrev={handlePrevQuestion}
									question={currentQuestion}
									questionIndex={questionIndex}
									section={currentSection}
								/>
							</motion.div>
						)}

						{step === "section_complete" && currentSection && (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								initial={{ opacity: 0, y: 20 }}
								key={`done-${sectionIndex}`}
								transition={{ duration: 0.4 }}
							>
								<SectionCompletePanel
									isLastSection={sectionIndex >= totalSections - 1}
									isSubmitting={submitMutation.isPending}
									onContinue={handleContinueAfterSection}
									points={computeSectionPoints(currentSection, answers)}
									section={currentSection}
								/>
							</motion.div>
						)}

						{step === "results" && (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								initial={{ opacity: 0, y: 20 }}
								key="results"
								transition={{ duration: 0.4 }}
							>
								<ResultsPanel
									email={email}
									emailError={emailError}
									emailOptIn={emailOptIn}
									emailSending={emailSending}
									emailSent={emailSent}
									onBackToDashboard={handleBackToDashboard}
									onEmailChange={handleEmailChange}
									onEmailOptInChange={setEmailOptIn}
									onEmailSubmit={handleEmailSubmit}
									onRetake={handleRetake}
									onViewSolutions={handleViewSolutions}
									overallPercent={overallPercent}
									recommendedSolutions={recommendedSolutions}
									sectionPercents={sectionPercents}
									stars={stars}
									submitError={submitError}
									summaryCardExportRef={summaryCardExportRef}
									weakestSections={weakestSections}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</main>
			</div>
		</GuestLayout>
	);
}

const IntroPanel = ({
	onStart,
	onResume,
	hasSavedProgress,
}: {
	onStart: () => void;
	onResume: () => void;
	hasSavedProgress: boolean;
}) => {
	const { t } = useTranslation();

	return (
		<Card className="px-8 py-10 md:px-16 md:py-14 border border-[#D2D2D2] bg-white shadow-sm rounded-3xl max-w-4xl mx-auto">
			<div className="flex justify-center mb-l">
				<div className="w-14 h-14 rounded-full bg-[#148696] flex items-center justify-center shadow-lg shadow-[#148696]/25">
					<Icons.CheckCircle style={{ color: "white", fontSize: 30 }} />
				</div>
			</div>

			<h1 className="text-2xl md:text-3xl font-heading font-bold text-[#004A60] mb-2 tracking-tight text-center">
				{t("grievanceSelfDiagnostic.intro.title")}
				<br />
				{t("grievanceSelfDiagnostic.intro.subtitle")}
			</h1>
			<p className="text-sm md:text-base text-[#148696] font-medium mb-8 text-center">
				{t("grievanceSelfDiagnostic.intro.tagline")}
			</p>

			{hasSavedProgress && (
				<div className="mb-l rounded-xl bg-[#eaf6f8] border border-[#148696]/20 p-m flex flex-col sm:flex-row items-start sm:items-center gap-m">
					<div className="flex items-center gap-2 flex-1 min-w-0">
						<Icons.RestorePage
							style={{ color: TEAL, fontSize: 22, flexShrink: 0 }}
						/>
						<p className="text-sm text-[#56666C] font-medium">
							{t("grievanceSelfDiagnostic.intro.resumeBanner")}
						</p>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							className="text-xs font-semibold text-[#8A979C] hover:text-[#56666C] transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
							onClick={onStart}
							type="button"
						>
							{t("grievanceSelfDiagnostic.intro.startFresh")}
						</button>
						<button
							className="text-xs font-bold text-white rounded-lg px-m py-1.5 transition-all hover:opacity-90"
							onClick={onResume}
							style={{ background: GRADIENT_BG }}
							type="button"
						>
							{t("grievanceSelfDiagnostic.intro.resumeButton")}
						</button>
					</div>
				</div>
			)}

			<div className="mb-l px-2">
				<h3 className="text-lg font-heading font-bold text-[#148696] mb-3">
					{t("grievanceSelfDiagnostic.intro.purposeTitle")}
				</h3>
				<p className="text-[#56666C] leading-relaxed mb-5">
					{t("grievanceSelfDiagnostic.intro.purposeBody")}
				</p>
				<ul className="space-y-2.5">
					{[
						t("grievanceSelfDiagnostic.intro.bullets.strengths"),
						t("grievanceSelfDiagnostic.intro.bullets.improvements"),
						t("grievanceSelfDiagnostic.intro.bullets.progress"),
					].map((item) => (
						<li className="flex items-start gap-3 text-[#56666C]" key={item}>
							<div className="shrink-0 w-5 h-5 rounded-full bg-[#148696]/10 flex items-center justify-center mt-0.5">
								<Icons.Check style={{ color: TEAL, fontSize: 12 }} />
							</div>
							<span className="leading-relaxed">{item}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mb-l px-2">
				<h3 className="text-lg font-heading font-bold text-[#148696] mb-3">
					{t("grievanceSelfDiagnostic.intro.expectTitle")}
				</h3>
				<ul className="space-y-2.5">
					{(
						[
							{ icon: Icons.ViewList, key: "sections" },
							{ icon: Icons.WorkspacePremium, key: "score" },
							{ icon: Icons.Email, key: "email" },
							{ icon: Icons.CloudDone, key: "save" },
						] as const
					).map(({ icon: Icon, key }) => (
						<li className="flex items-start gap-3 text-[#56666C]" key={key}>
							<div className="shrink-0 w-5 h-5 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center mt-0.5">
								<Icon style={{ color: "#0EA5E9", fontSize: 12 }} />
							</div>
							<span className="leading-relaxed text-sm">
								{t(`grievanceSelfDiagnostic.intro.expectItems.${key}`)}
							</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mb-l rounded-xl border border-[#148696]/15 p-m bg-[#f0fafb]">
				<div className="flex items-start gap-2">
					<Icons.BarChart
						style={{ color: TEAL, fontSize: 20, marginTop: 1, flexShrink: 0 }}
					/>
					<div>
						<p className="text-sm font-semibold text-[#004A60] mb-1">
							{t("grievanceSelfDiagnostic.intro.scoreTitle")}
						</p>
						<p className="text-sm text-[#56666C] leading-relaxed">
							{t("grievanceSelfDiagnostic.intro.scoreNote")}
						</p>
					</div>
				</div>
			</div>

			<div className="rounded-xl bg-[#eaf6f8] border border-[#148696]/15 p-m mb-l">
				<p className="text-sm text-[#56666C] leading-relaxed">
					{t("grievanceSelfDiagnostic.intro.note")}
				</p>
			</div>

			<button
				className="w-full inline-flex items-center justify-center gap-2 text-white font-bold rounded-xl px-8 py-3.5 text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
				onClick={onStart}
				style={{ background: GRADIENT_BG }}
				type="button"
			>
				{t("grievanceSelfDiagnostic.intro.start")}
				<Icons.ArrowForward style={{ fontSize: 20 }} />
			</button>
		</Card>
	);
};

const ComponentsPanel = ({ onContinue }: { onContinue: () => void }) => {
	const { t } = useTranslation();

	return (
		<div className="space-y-10">
			<div className="text-center">
				<h2 className="text-3xl md:text-4xl font-heading font-bold text-[#004A60] mb-2 tracking-tight">
					{t("grievanceSelfDiagnostic.components.title")}
				</h2>
				<p className="text-base text-[#8A979C]">
					{t("grievanceSelfDiagnostic.components.subtitle")}
				</p>
			</div>

			<div
				className="relative rounded-3xl overflow-hidden flex items-center justify-center min-h-80 md:min-h-[420px]"
				style={{
					background:
						"linear-gradient(135deg, #d6ecef 0%, #bfe2e7 60%, #a7d8df 100%)",
				}}
			>
				<button
					aria-label={t("grievanceSelfDiagnostic.components.videoLabel")}
					className="group flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-white shadow-xl hover:scale-105 transition-transform"
					type="button"
				>
					<Icons.PlayArrow
						style={{ color: TEAL, fontSize: 56, marginLeft: 4 }}
					/>
				</button>
				<div className="absolute bottom-5 left-0 right-0 text-center">
					<span className="inline-block px-m py-1.5 rounded-full bg-white/70 backdrop-blur-sm text-xs font-semibold text-[#004A60]">
						{t("grievanceSelfDiagnostic.components.videoCaption")}
					</span>
				</div>
			</div>

			<div>
				<h3 className="text-xl md:text-2xl font-heading font-bold text-[#004A60] mb-l">
					{t("grievanceSelfDiagnostic.components.assessedTitle")}
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-m">
					{COMPONENT_CARDS.map((c) => (
						<Card
							className="p-m border border-[#D2D2D2] bg-white hover:border-[#148696]/40 hover:shadow-md transition-all duration-200 rounded-2xl"
							key={c.number}
						>
							<div className="flex items-center gap-3">
								<span
									className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm tabular-nums shrink-0"
									style={{ background: GRADIENT_BG }}
								>
									{c.number}
								</span>
								<h4 className="text-sm font-bold text-[#004A60] leading-snug">
									{t(c.titleKey)}
								</h4>
							</div>
						</Card>
					))}
				</div>
			</div>

			<div className="rounded-xl bg-amber-50 border-l-4 border-amber-400 p-m flex items-start gap-3">
				<Icons.LightbulbOutlined
					style={{ color: "#b45309", fontSize: 22, marginTop: 1 }}
				/>
				<p className="text-sm text-amber-900 leading-relaxed">
					<strong>{t("grievanceSelfDiagnostic.components.noteTitle")}</strong>{" "}
					{t("grievanceSelfDiagnostic.components.noteBody")}
				</p>
			</div>

			<Flex justify="center" pt="2">
				<button
					className="w-full max-w-2xl inline-flex items-center justify-center gap-2 text-white font-bold rounded-xl px-8 py-m text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
					onClick={onContinue}
					style={{ background: GRADIENT_BG }}
					type="button"
				>
					{t("grievanceSelfDiagnostic.components.continue")}
					<Icons.ArrowForward style={{ fontSize: 20 }} />
				</button>
			</Flex>
		</div>
	);
};

const QuestionPanel = ({
	section,
	question,
	questionIndex,
	answers,
	onAnswer,
	onNext,
	onPrev,
	isFirstOverall,
}: {
	section: DiagnosticSection;
	question: DiagnosticSection["questions"][number];
	questionIndex: number;
	answers: AnswerMap;
	onAnswer: (questionId: string, optionIndex: number) => void;
	onNext: () => void;
	onPrev: () => void;
	isFirstOverall: boolean;
}) => {
	const { t } = useTranslation();
	const selected = answers[question.id];
	const answered = typeof selected === "number";
	const isLastInSection = questionIndex >= section.questions.length - 1;

	return (
		<div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-l items-start">
				{/* Question column — 2/3 width */}
				<div className="lg:col-span-2">
					<Card className="p-xl md:p-10 border border-[#D2D2D2] bg-white shadow-sm rounded-3xl">
						<div className="flex items-start gap-3 mb-l">
							<span
								className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm tabular-nums shrink-0 mt-0.5"
								style={{ background: GRADIENT_BG }}
							>
								{section.number}
							</span>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-xs font-bold uppercase tracking-widest text-[#148696]">
										{getSectionTitle(section.number, t)}
									</span>
									{question.isChallenge && (
										<span className="text-[10px] font-bold uppercase tracking-widest text-[#523bae] bg-[#523bae]/10 rounded-full px-2 py-0.5">
											{t("grievanceSelfDiagnostic.question.challengeBadge")}
										</span>
									)}
								</div>
								<span className="text-xs text-[#8A979C] mt-0.5 block">
									{t("grievanceSelfDiagnostic.question.of", {
										current: questionIndex + 1,
										total: section.questions.length,
									})}
								</span>
							</div>
						</div>

						<h2 className="text-xl md:text-2xl font-bold leading-snug mb-8">
							<span className="text-[#148696]">{question.text}</span>
							{question.intro && (
								<>
									{" "}
									<span className="text-[#333333]">{question.intro}</span>
								</>
							)}
						</h2>

						<div className="space-y-3">
							{question.options.map((opt, idx) => {
								const isSelected = selected === idx;
								const showPoints = !!question.isChallenge && opt.points > 0;
								return (
									<button
										aria-pressed={isSelected}
										className={`w-full rounded-full border px-6 py-m transition-all duration-200 grid grid-cols-[24px_1fr_auto] items-center gap-3 ${
											isSelected
												? "border-[#148696] bg-[#148696]/5"
												: "border-[#D2D2D2] bg-white hover:border-[#148696]/40 hover:bg-gray-50/50"
										}`}
										key={`${question.id}-${idx}-${opt.label}`}
										onClick={() => onAnswer(question.id, idx)}
										type="button"
									>
										<span
											className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
												isSelected
													? "border-[#148696] bg-[#148696]"
													: "border-[#D2D2D2] bg-white"
											}`}
										>
											{isSelected && (
												<span className="w-2 h-2 rounded-full bg-white" />
											)}
										</span>
										<span
											className={`text-sm md:text-base text-center transition-colors ${
												isSelected
													? "text-[#004A60] font-semibold"
													: "text-[#56666C]"
											}`}
										>
											{translateOptionLabel(opt.label, t)}
										</span>
										{showPoints ? (
											<span className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-[#F59E0B] shrink-0">
												<Icons.Star sx={{ fontSize: 16 }} />
												{opt.points}pts
											</span>
										) : (
											<span className="w-0" />
										)}
									</button>
								);
							})}
						</div>
					</Card>
				</div>

				{/* Guidance column — 1/3 width */}
				<div className="lg:col-span-1 space-y-4">
					<Card className="p-l border border-[#D2D2D2] bg-white shadow-sm rounded-2xl">
						<div className="flex items-center gap-2 mb-3">
							<div className="w-8 h-8 rounded-full bg-[#148696] flex items-center justify-center shrink-0">
								<Icons.Lightbulb style={{ color: "white", fontSize: 18 }} />
							</div>
							<h3 className="font-bold text-[#004A60] text-sm leading-tight">
								{section.guidance.title}
							</h3>
						</div>
						<p className="text-sm text-[#56666C] leading-relaxed mb-m">
							{section.guidance.body}
						</p>
						{section.guidance.example && (
							<div className="rounded-xl border border-[#148696]/20 bg-[#eaf6f8] p-3">
								<div className="flex items-start gap-2">
									<Icons.Lightbulb
										style={{
											color: "#f59e0b",
											fontSize: 16,
											marginTop: 1,
											flexShrink: 0,
										}}
									/>
									<div>
										<p className="text-[10px] font-bold uppercase tracking-widest text-[#148696] mb-1">
											Example
										</p>
										<p className="text-xs text-[#56666C] leading-relaxed">
											{section.guidance.example}
										</p>
									</div>
								</div>
							</div>
						)}
					</Card>

					{/* Decorative section illustration */}
					<div
						className="rounded-2xl overflow-hidden min-h-[140px] flex items-center justify-center"
						style={{
							background:
								"linear-gradient(135deg, #d6ecef 0%, #bfe2e7 60%, #a7d8df 100%)",
						}}
					>
						<div className="text-center px-m py-l">
							<div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center mx-auto mb-3">
								<Icons.Shield style={{ color: TEAL, fontSize: 24 }} />
							</div>
							<p className="text-xs text-[#004A60] font-medium leading-snug">
								{getSectionTitle(section.number, t)}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-l flex items-center gap-3">
				{!isFirstOverall && (
					<button
						className="shrink-0 inline-flex items-center gap-2 h-12 rounded-xl border border-[#D2D2D2] bg-white hover:border-[#148696]/40 hover:bg-gray-50 transition-colors px-m text-sm font-semibold text-[#56666C] hover:text-[#148696]"
						onClick={onPrev}
						type="button"
					>
						<Icons.ArrowBack style={{ fontSize: 18 }} />
						{t("grievanceSelfDiagnostic.question.back")}
					</button>
				)}
				<button
					className={`flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-8 py-m text-base transition-all ${
						answered
							? "text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
							: "bg-gray-100 text-[#8A979C] cursor-not-allowed"
					}`}
					disabled={!answered}
					onClick={onNext}
					style={answered ? { background: GRADIENT_BG } : undefined}
					type="button"
				>
					{isLastInSection
						? t("grievanceSelfDiagnostic.question.completeSection")
						: t("grievanceSelfDiagnostic.question.nextQuestion")}
					<Icons.ArrowForward style={{ fontSize: 18 }} />
				</button>
			</div>
		</div>
	);
};

const SectionCompletePanel = ({
	section,
	onContinue,
	isLastSection,
	isSubmitting,
}: {
	section: DiagnosticSection;
	points: number;
	onContinue: () => void;
	isLastSection: boolean;
	isSubmitting: boolean;
}) => {
	const { t } = useTranslation();
	const isHalfway = section.number === 4;

	const promptText = isLastSection
		? t("grievanceSelfDiagnostic.sectionComplete.promptLast")
		: t("grievanceSelfDiagnostic.sectionComplete.promptNext", {
				section: section.number + 1,
			});

	const buttonText = isSubmitting
		? t("grievanceSelfDiagnostic.sectionComplete.submitting")
		: isLastSection
			? t("grievanceSelfDiagnostic.sectionComplete.viewResults")
			: t("grievanceSelfDiagnostic.sectionComplete.continue");

	return (
		<>
			<Confetti sectionNumber={section.number} />
			<div className="max-w-2xl mx-auto space-y-5">
				{isHalfway && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="rounded-2xl overflow-hidden"
						initial={{ opacity: 0, y: -16 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						<div className="relative p-l text-center bg-white overflow-hidden">
							<div className="absolute inset-y-0 right-0 h-5/3 overflow-hidden pointer-events-none">
								<img
									alt=""
									aria-hidden
									className="h-full w-full object-cover object-left"
									src={thumbsUpImage}
								/>
							</div>
							<div className="absolute inset-y-0 right-1/3 w-16 bg-gradient-to-r from-white to-transparent pointer-events-none" />
							<div className="relative z-10 pr-[34%] text-left">
								{/* <div className="text-4xl mb-3">🎉</div> */}
								<h3 className="text-2xl font-heading font-bold mb-2">
									{t("grievanceSelfDiagnostic.sectionComplete.halfwayTitle")}
								</h3>
								<p className="text-md text-[#56666C] border-t border-[#D2D2D2] pt-2">
									{t("grievanceSelfDiagnostic.sectionComplete.halfwayBody")}
								</p>
							</div>
						</div>
						<div className="flex items-center justify-between bg-[#148696] px-l py-3">
							<div className="flex gap-1">
								{[1, 2, 3, 4].map((n) => (
									<span
										className="w-5 h-1 rounded-full"
										key={n}
										style={{ background: "#f59e0b" }}
									/>
								))}
								{[5, 6, 7, 8, 9].map((n) => (
									<span className="w-5 h-1 rounded-full bg-amber-200" key={n} />
								))}
							</div>
							<span className="text-xs font-bold text-white">4 / 9</span>
						</div>
					</motion.div>
				)}

				<Card className="p-12 md:p-16 border border-[#D2D2D2] bg-white shadow-md rounded-3xl text-center">
					<motion.div
						animate={{ scale: 1, opacity: 1 }}
						className="flex justify-center mb-8"
						initial={{ scale: 0.5, opacity: 0 }}
						transition={{ type: "spring", stiffness: 240, damping: 16 }}
					>
						<div
							className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25"
							style={{
								background: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
							}}
						>
							<Icons.Check
								style={{ color: "white", fontSize: 44, strokeWidth: 3 }}
							/>
						</div>
					</motion.div>

					<h2 className="text-3xl md:text-4xl font-bold  mb-3 text-center">
						{t("grievanceSelfDiagnostic.sectionComplete.title", {
							section: section.number,
						})}
					</h2>
					<p className="text-lg text-[#8A979C] text-center">
						{getSectionTitle(section.number, t)}
					</p>

					<p className="text-3xl text-[#56666C] text-center my-8">
						{promptText}
					</p>

					<button
						className="w-full inline-flex items-center justify-center gap-2 text-white font-bold rounded-xl px-8 py-m text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:translate-y-0"
						disabled={isSubmitting}
						onClick={onContinue}
						style={{ background: GRADIENT_BG }}
						type="button"
					>
						{buttonText}
						<Icons.ArrowForward style={{ fontSize: 18 }} />
					</button>
				</Card>
			</div>
		</>
	);
};

interface MarketplaceSolution {
	id: number;
	title: string;
	type: string;
	category: string;
	description: string;
	icon?: string;
	recommended?: boolean;
	comingSoon?: boolean;
}

const pickRecommendedSolutions = (
	all: MarketplaceSolution[],
): MarketplaceSolution[] =>
	all
		.filter((s) => s.category === "Worker Voice")
		.sort(
			(a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false),
		)
		.slice(0, 3);

const resultColor = (percent: number) => {
	if (percent >= 76) return "#22C55E"; // green
	if (percent >= 51) return "#3B82F6"; // blue
	if (percent >= 26) return "#F97316"; // orange
	return "#523BAE"; // purple
};

const ResultsPanel = ({
	overallPercent,
	stars,
	sectionPercents,
	recommendedSolutions,
	submitError,
	email,
	emailError,
	emailOptIn,
	emailSent,
	emailSending,
	onEmailChange,
	onEmailOptInChange,
	onEmailSubmit,
	onRetake,
	onBackToDashboard: _onBackToDashboard,
	onViewSolutions,
	summaryCardExportRef,
}: {
	overallPercent: number;
	stars: number;
	sectionPercents: {
		section: DiagnosticSection;
		percent: number;
		points: number;
	}[];
	recommendedSolutions: MarketplaceSolution[];
	weakestSections: { section: DiagnosticSection; percent: number }[];
	submitError: string | null;
	email: string;
	emailError: string | null;
	emailOptIn: boolean;
	emailSent: boolean;
	emailSending: boolean;
	onEmailChange: (value: string) => void;
	onEmailOptInChange: (value: boolean) => void;
	onEmailSubmit: () => void;
	onRetake: () => void;
	onBackToDashboard: () => void;
	onViewSolutions: () => void;
	summaryCardExportRef: RefObject<HTMLDivElement | null>;
}) => {
	const { t } = useTranslation();
	const resultMessage =
		overallPercent >= 90
			? t("grievanceSelfDiagnostic.results.messages.excellent")
			: overallPercent >= 80
				? t("grievanceSelfDiagnostic.results.messages.great")
				: overallPercent >= 60
					? t("grievanceSelfDiagnostic.results.messages.solid")
					: t("grievanceSelfDiagnostic.results.messages.grow");

	return (
		<div className="space-y-l">
			{submitError && (
				<Card className="p-m border border-amber-100 bg-amber-50 rounded-2xl">
					<div className="flex items-start gap-m">
						<Icons.WarningAmber style={{ color: "#c97a16" }} />
						<div className="text-sm text-amber-900">
							<strong className="block mb-1">
								{t("grievanceSelfDiagnostic.results.networkTitle")}
							</strong>
							{submitError}
						</div>
					</div>
				</Card>
			)}

			<div
				className="rounded-[28px] bg-white p-m md:p-6"
				ref={summaryCardExportRef}
			>
				<Card className="p-xl md:p-12 border border-[#D2D2D2] bg-white shadow-sm rounded-2xl">
					<div className="flex justify-center mb-5">
						<div className="w-16 h-16 rounded-full bg-[#148696] flex items-center justify-center shadow-lg shadow-[#148696]/20">
							<Icons.WorkspacePremium
								style={{ color: "white", fontSize: 36 }}
							/>
						</div>
					</div>
					<h1 className="text-3xl md:text-4xl font-heading font-bold text-center  mb-2">
						{t("grievanceSelfDiagnostic.results.assessmentComplete")}
					</h1>
					<p className="text-center text-[#8A979C] mb-8">
						{t("grievanceSelfDiagnostic.results.personalized")}
					</p>

					<div className="bg-[#EFF6FF] rounded-2xl p-xl text-center mb-10">
						<div
							className="text-5xl md:text-6xl font-bold mb-3 tabular-nums"
							style={{ color: resultColor(overallPercent) }}
						>
							{Math.round(overallPercent)}%
						</div>
						<div className="flex justify-center mb-3">
							<StarRow size={28} stars={stars} />
						</div>
						<p className="text-[#56666C]">{resultMessage}</p>
					</div>

					<h2 className="text-xl font-heading font-bold  mb-m">
						{t("grievanceSelfDiagnostic.results.detailedScores")}
					</h2>
					<div className="space-y-3">
						{sectionPercents.map((sp) => {
							const color = resultColor(sp.percent);
							return (
								<div
									className="border border-[#D2D2D2] rounded-2xl p-m"
									key={sp.section.number}
								>
									<div className="flex justify-between items-start gap-m mb-3">
										<div className="flex items-center gap-3 min-w-0">
											<span className="shrink-0 w-7 h-7 rounded-full bg-[#0EA5E9] text-white flex items-center justify-center text-xs font-bold tabular-nums">
												{sp.section.number}
											</span>
											<span className="text-[#333333] font-bold text-sm md:text-base">
												{getSectionTitle(sp.section.number, t)}
											</span>
										</div>
										<div className="text-right shrink-0">
											<div className="font-bold text-[#333333] tabular-nums">
												{sp.points} / {sp.section.maxScore}
											</div>
											<div className="text-xs text-[#8A979C] tabular-nums">
												{Math.round(sp.percent)}%
											</div>
										</div>
									</div>
									<div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
										<motion.div
											animate={{ width: `${sp.percent}%` }}
											className="h-full rounded-full"
											initial={{ width: 0 }}
											style={{ background: color }}
											transition={{ duration: 0.8, ease: "circOut" }}
										/>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-l border-l-4 border-[#3B82F6] bg-[#EFF6FF] rounded-r-lg p-m">
						<p className="text-sm text-[#56666C] leading-relaxed">
							<strong>
								{t("grievanceSelfDiagnostic.results.rememberTitle")}
							</strong>{" "}
							{t("grievanceSelfDiagnostic.results.rememberBody")}
						</p>
					</div>
				</Card>
			</div>

			<Card className="p-xl md:p-12 border border-[#D2D2D2] bg-white shadow-sm rounded-2xl">
				<div className="flex items-center gap-3 mb-2">
					<Icons.MenuBook style={{ color: "#3B82F6", fontSize: 24 }} />
					<h2 className="text-xl font-heading font-bold ">
						{t("grievanceSelfDiagnostic.results.recommendedTitle")}
					</h2>
				</div>
				<p className="text-[#8A979C] mb-l leading-relaxed">
					{t("grievanceSelfDiagnostic.results.recommendedBody")}
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-m mb-l">
					{recommendedSolutions.map((solution) => {
						const IconComponent =
							(solution.icon &&
								((Icons as Record<string, typeof Icons.Help>)[solution.icon] as
									| typeof Icons.Help
									| undefined)) ||
							Icons.School;
						return (
							<button
								className="text-left border border-[#D2D2D2] rounded-2xl p-m hover:shadow-md hover:border-[#3B82F6]/40 transition-all"
								key={solution.id}
								onClick={onViewSolutions}
								type="button"
							>
								<div className="flex items-start gap-3">
									<div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
										<IconComponent style={{ color: "#3B82F6", fontSize: 20 }} />
									</div>
									<div className="min-w-0">
										<div className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] mb-1">
											{solution.type}
										</div>
										<h3 className="font-bold  leading-tight mb-1">
											{solution.title}
										</h3>
										<p className="text-sm text-[#8A979C] leading-relaxed">
											{solution.description}
										</p>
									</div>
								</div>
							</button>
						);
					})}
				</div>

				<div className="border-l-4 border-[#10B981] bg-[#ECFDF5] rounded-r-lg p-m">
					<p className="text-sm text-[#56666C] leading-relaxed">
						<strong>
							{t("grievanceSelfDiagnostic.results.nextStepsTitle")}
						</strong>{" "}
						{t("grievanceSelfDiagnostic.results.nextStepsBody")}
					</p>
				</div>
			</Card>

			{/* Email capture card */}
			<Card className="p-xl md:p-10 border border-[#D2D2D2] bg-white shadow-sm rounded-2xl">
				<div className="flex items-center gap-3 mb-2">
					<Icons.Email style={{ color: TEAL, fontSize: 24 }} />
					<h2 className="text-xl font-heading font-bold ">
						{t("grievanceSelfDiagnostic.results.emailTitle")}
					</h2>
				</div>
				<p className="text-[#8A979C] mb-l leading-relaxed">
					{t("grievanceSelfDiagnostic.results.emailBody")}
				</p>

				{emailSent ? (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="flex items-center gap-3 rounded-xl bg-[#ECFDF5] border border-[#10B981]/30 p-m"
						initial={{ opacity: 0, y: 8 }}
					>
						<Icons.CheckCircle style={{ color: "#10b981", fontSize: 24 }} />
						<p className="font-semibold text-[#065f46]">
							{t("grievanceSelfDiagnostic.results.emailSent")}
						</p>
					</motion.div>
				) : (
					<div className="space-y-4">
						<div className="flex gap-3">
							<input
								aria-label={t(
									"grievanceSelfDiagnostic.results.emailPlaceholder",
								)}
								className="flex-1 h-11 rounded-xl border border-[#D2D2D2] bg-white px-m text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus:border-[#148696] transition-colors"
								onChange={(e) => onEmailChange(e.target.value)}
								placeholder={t(
									"grievanceSelfDiagnostic.results.emailPlaceholder",
								)}
								type="email"
								value={email}
							/>
							<button
								className="shrink-0 inline-flex items-center gap-2 text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
								disabled={!email.trim() || emailSending}
								onClick={onEmailSubmit}
								style={{ background: GRADIENT_BG }}
								type="button"
							>
								{emailSending ? (
									<>
										<Icons.HourglassEmpty style={{ fontSize: 16 }} />
										{t("grievanceSelfDiagnostic.results.emailSending")}
									</>
								) : (
									<>
										<Icons.Send style={{ fontSize: 16 }} />
										{t("grievanceSelfDiagnostic.results.emailSubmit")}
									</>
								)}
							</button>
						</div>
						{emailError && (
							<div className="rounded-xl border border-amber-200 bg-amber-50 px-m py-3 text-sm text-amber-900">
								{emailError}
							</div>
						)}
						<label className="flex items-start gap-3 cursor-pointer group">
							<div className="relative shrink-0 mt-0.5">
								<input
									checked={emailOptIn}
									className="sr-only"
									onChange={(e) => onEmailOptInChange(e.target.checked)}
									type="checkbox"
								/>
								<div
									className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
										emailOptIn
											? "border-[#148696] bg-[#148696]"
											: "border-[#D2D2D2] bg-white group-hover:border-[#148696]/60"
									}`}
								>
									{emailOptIn && (
										<Icons.Check style={{ color: "white", fontSize: 13 }} />
									)}
								</div>
							</div>
							<span className="text-sm text-[#56666C] leading-relaxed">
								{t("grievanceSelfDiagnostic.results.emailOptIn")}
							</span>
						</label>
					</div>
				)}
			</Card>

			<div className="flex justify-center pt-2 pb-l">
				<button
					className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 py-3 text-sm font-semibold transition-colors"
					onClick={onRetake}
					type="button"
				>
					<Icons.Refresh style={{ fontSize: 18 }} />
					{t("grievanceSelfDiagnostic.results.retake")}
				</button>
			</div>
		</div>
	);
};

export default GrievanceSelfDiagnostic;
