import {
	ArrowRightIcon,
	CheckIcon,
	MagicWandIcon,
} from "@radix-ui/react-icons";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
	getStoredSupplierTrack,
	SUPPLIER_TRACK_CHANGED_EVENT,
	type SupplierTrack,
} from "$src/services/supplierTrackService";
import styles from "./OnboardingOverlay.module.css";

type Phase = "welcome" | "tour" | "congrats";

/** Which of the navbar's own pill colors the tour paints on the step's menu
 *  item. Overview keeps the active-item teal; the other tabs use the cream. */
type NavHighlight = "teal" | "cream";

interface TourStepSpec {
	key: string;
	targetSelector: string;
	num: string;
	sectionKey: string;
	highlight: NavHighlight;
}

interface TourStep extends TourStepSpec {
	eyebrow: string;
	title: string;
	body: string;
	hits: string[];
}

const TOUR_STEP_SPECS: TourStepSpec[] = [
	{
		key: "profile",
		targetSelector: '[data-onboarding-target="company"]',
		num: "01",
		sectionKey: "profile",
		highlight: "teal",
	},
	{
		key: "dashboard",
		targetSelector: '[data-onboarding-target="company"]',
		num: "02",
		sectionKey: "dashboard",
		highlight: "teal",
	},
	{
		key: "marketplace",
		targetSelector: '[data-onboarding-target="cascade-marketplace"]',
		num: "03",
		sectionKey: "marketplace",
		highlight: "cream",
	},
	{
		key: "feedback",
		targetSelector: '[data-onboarding-target="employee"]',
		num: "04",
		sectionKey: "grievance",
		highlight: "cream",
	},
];

export const getTourStepSpecsForSupplierTrack = (
	track: SupplierTrack | null,
) =>
	track === "MARKETPLACE"
		? TOUR_STEP_SPECS.filter((step) => step.key === "marketplace")
		: TOUR_STEP_SPECS;

interface Rect {
	top: number;
	left: number;
	width: number;
	height: number;
}

function useTargetRect(selector: string, deps: unknown[] = []): Rect | null {
	const [rect, setRect] = useState<Rect | null>(null);

	useLayoutEffect(() => {
		const measure = () => {
			const el = document.querySelector(selector) as HTMLElement | null;
			if (!el) {
				setRect(null);
				return;
			}
			const r = el.getBoundingClientRect();
			setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
		};
		measure();
		const t1 = window.setTimeout(measure, 50);
		const t2 = window.setTimeout(measure, 250);
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, true);
		return () => {
			window.clearTimeout(t1);
			window.clearTimeout(t2);
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, true);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selector, ...deps]);

	return rect;
}

/** Mirrors the navbar's pill on the menu item the tour is pointing at, so it
 *  tracks the tour instead of staying on the item for the current route.
 *  Styled in global.css via the data attribute because the navbar paints its
 *  own active state with utility classes. */
function useActiveNavHighlight(
	selector: string | null,
	highlight: NavHighlight,
) {
	useEffect(() => {
		if (!selector) return;
		const el = document.querySelector(selector);
		if (!el) return;
		el.setAttribute("data-onboarding-active", highlight);
		return () => el.removeAttribute("data-onboarding-active");
	}, [selector, highlight]);
}

interface CoachPosition {
	top: number;
	left: number;
}

function computeCoachPosition(
	rect: Rect | null,
	size: { w: number; h: number },
): CoachPosition {
	if (!rect) return { top: -9999, left: -9999 };
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const gap = 20;
	const offsetY = 48;
	const { w, h } = size;
	const fitsBottom = rect.top + rect.height + gap + h <= vh - 16;
	const top = fitsBottom
		? rect.top + rect.height + gap + offsetY
		: Math.max(16, rect.top - gap - h + offsetY);
	const left = Math.min(
		Math.max(16, rect.left + rect.width / 2 - 70),
		vw - w - 16,
	);
	return { top, left };
}

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 14;
/** Softness of the blurred-to-sharp transition around the cut-out, in px. */
const SCRIM_FEATHER = 6;

/** Rounded, feathered cut-out for the scrim mask, as an SVG data URI. */
function holeMaskStyle(rect: Rect): CSSProperties {
	const pad = SPOTLIGHT_PADDING;
	const bleed = SCRIM_FEATHER * 2;
	const holeW = rect.width + pad * 2;
	const holeH = rect.height + pad * 2;
	// the SVG is oversized by `bleed` on each side so the blur isn't clipped
	const w = holeW + bleed * 2;
	const h = holeH + bleed * 2;
	const svg =
		`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
		`<filter id='f' x='-50%' y='-50%' width='200%' height='200%'>` +
		`<feGaussianBlur stdDeviation='${SCRIM_FEATHER / 2}'/></filter>` +
		`<rect x='${bleed}' y='${bleed}' width='${holeW}' height='${holeH}' ` +
		`rx='${SPOTLIGHT_RADIUS}' fill='%23fff' filter='url(%23f)'/></svg>`;
	const image = `linear-gradient(#000 0 0), url("data:image/svg+xml;utf8,${svg}")`;
	const position = `0 0, ${rect.left - pad - bleed}px ${rect.top - pad - bleed}px`;
	const size = `100% 100%, ${w}px ${h}px`;

	return {
		maskImage: image,
		WebkitMaskImage: image,
		maskPosition: position,
		WebkitMaskPosition: position,
		maskSize: size,
		WebkitMaskSize: size,
	};
}

/** Scrim with a soft cut-out so the spotlighted target is neither dimmed nor
 *  blurred by the overlay's backdrop-filter. */
function Scrim({ hole }: { hole: Rect | null }) {
	if (!hole) return <div className={styles.scrim} />;
	return <div className={styles.scrimHole} style={holeMaskStyle(hole)} />;
}

function Spotlight({
	rect,
	padding = SPOTLIGHT_PADDING,
}: {
	rect: Rect | null;
	padding?: number;
}) {
	if (!rect) return null;
	return (
		<div
			className={styles.spotlight}
			style={{
				top: rect.top - padding,
				left: rect.left - padding,
				width: rect.width + padding * 2,
				height: rect.height + padding * 2,
			}}
		/>
	);
}

function Coachmark({
	step,
	index,
	total,
	rect,
	onPrev,
	onNext,
}: {
	step: TourStep;
	index: number;
	total: number;
	rect: Rect | null;
	onPrev: () => void;
	onNext: () => void;
}) {
	const { t } = useTranslation();
	const tooltipSize = { w: 360, h: 320 };
	const pos = computeCoachPosition(rect, tooltipSize);
	return (
		<div
			className={styles.coach}
			style={{ top: pos.top, left: pos.left, width: tooltipSize.w }}
		>
			<div className={styles.coachHead}>
				<div className={styles.coachNum}>{step.num}</div>
				<div>
					<div className={styles.coachEyebrow}>{step.eyebrow}</div>
					<h3 className={styles.coachTitle}>{step.title}</h3>
				</div>
			</div>
			<div className={styles.coachBody}>
				<p>{step.body}</p>
				<div className={styles.hits}>
					{step.hits.map((h) => (
						<span className={styles.hit} key={h}>
							{h}
						</span>
					))}
				</div>
			</div>
			<div className={styles.coachFoot}>
				<div className={styles.dots}>
					{Array.from({ length: total }).map((_, i) => (
						<span
							className={`${styles.dot} ${i === index ? styles.dotOn : ""}`}
							key={`dot-${i}`}
						/>
					))}
				</div>
				<div className={styles.navBtns}>
					<button
						className={`${styles.btn} ${styles.btnGhost}`}
						onClick={onPrev}
						type="button"
					>
						{t("onboarding.back")}
					</button>
					<button
						className={`${styles.btn} ${styles.btnPrimary}`}
						onClick={onNext}
						type="button"
					>
						{index < total - 1 ? (
							<>
								{t("onboarding.next")} <ArrowRightIcon />
							</>
						) : (
							<>
								{t("onboarding.finish")} <CheckIcon />
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

function WelcomeModal({ onStart }: { onStart: () => void }) {
	const { t } = useTranslation();
	return (
		<div className={styles.modalWrap}>
			<div className={styles.modalCard}>
				<div className={styles.modalHero}>
					<div className={styles.badge}>
						<MagicWandIcon height={26} width={26} />
					</div>
					<div className={styles.eyebrow}>{t("onboarding.firstLogin")}</div>
					<h2 className={styles.heroTitle}>
						{t("onboarding.welcomeTitlePart1")}{" "}
						<span style={{ color: "var(--ob-gold)" }}>
							{t("onboarding.welcomeTitleAccent")}
						</span>
					</h2>
					<p className={styles.heroBody}>{t("onboarding.welcomeBody")}</p>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.row}>
						<div className={styles.rowNum}>01</div>
						<div className={styles.rowText}>
							<b>{t("onboarding.welcomeStep1Title")}</b>{" "}
							<small>{t("onboarding.welcomeStep1Desc")}</small>
						</div>
					</div>
					<div className={styles.row}>
						<div className={styles.rowNum}>02</div>
						<div className={styles.rowText}>
							<b>{t("onboarding.welcomeStep2Title")}</b>{" "}
							<small>{t("onboarding.welcomeStep2Desc")}</small>
						</div>
					</div>
					<div className={styles.modalActions}>
						<button
							className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
							onClick={onStart}
							style={{ background: "var(--ob-coral)" }}
							type="button"
						>
							<MagicWandIcon /> {t("onboarding.startTour")} <ArrowRightIcon />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

const CONFETTI_PALETTE = [
	"#FDDA61",
	"#A6DFDD",
	"#FFEDAF",
	"#FB8379",
	"#6F2E97",
];
const CONFETTI_SHAPES = ["rect", "circle", "tri", "line"] as const;
type ConfettiShape = (typeof CONFETTI_SHAPES)[number];

function Confetti({ density = 22 }: { density?: number }) {
	const items = useMemo(
		() =>
			Array.from({ length: density }).map((_, i) => ({
				key: `confetti-${i}`,
				x: Math.random() * 100,
				y: Math.random() * 100,
				r: 0.6 + Math.random() * 0.9,
				rot: Math.random() * 360,
				c: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
				s: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length] as ConfettiShape,
			})),
		[density],
	);
	return (
		<svg
			aria-hidden
			className={styles.confettiSvg}
			preserveAspectRatio="none"
			viewBox="0 0 100 100"
		>
			<title>Celebration confetti</title>
			{items.map((it) => {
				const t = `translate(${it.x} ${it.y}) rotate(${it.rot}) scale(${it.r})`;
				if (it.s === "rect") {
					return (
						<rect
							fill={it.c}
							height={0.5}
							key={it.key}
							transform={t}
							width={1.2}
							x={-0.6}
							y={-0.2}
						/>
					);
				}
				if (it.s === "circle") {
					return <circle fill={it.c} key={it.key} r={0.55} transform={t} />;
				}
				if (it.s === "tri") {
					return (
						<path
							d="M-0.6 0.5 L0 -0.6 L0.6 0.5 Z"
							fill={it.c}
							key={it.key}
							transform={t}
						/>
					);
				}
				return (
					<line
						key={it.key}
						stroke={it.c}
						strokeLinecap="round"
						strokeWidth={0.25}
						transform={t}
						x1={-0.8}
						x2={0.8}
						y1={0}
						y2={0}
					/>
				);
			})}
		</svg>
	);
}

function CongratsModal({
	userName,
	companyName,
	memberSince,
	region,
	onEnter,
}: {
	userName: string;
	companyName: string;
	memberSince: string;
	region: string;
	onEnter: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className={styles.congratsWrap}>
			<div className={styles.congratsPanel}>
				<div className={`${styles.modalHero} ${styles.congratsHero}`}>
					<Confetti density={26} />
					<div className={styles.congratsContent}>
						<div className={styles.badge}>
							<MagicWandIcon height={26} width={26} />
						</div>
						<div className={styles.eyebrow}>
							{t("onboarding.congratsEyebrow")}
						</div>
						<h2 className={styles.heroTitle}>
							{t("onboarding.congratsTitle")}{" "}
							<span style={{ color: "var(--ob-gold)" }}>{userName}!</span>
						</h2>
						<p className={styles.heroBody}>{t("onboarding.congratsBody")}</p>
					</div>
				</div>
				<div className={styles.congratsBody}>
					<div className={styles.statsGrid}>
						<Stat label={t("onboarding.statCompany")} value={companyName} />
						<Stat label={t("onboarding.statMemberSince")} value={memberSince} />
						<Stat label={t("onboarding.statRegion")} value={region} />
						<Stat
							label={t("onboarding.statOnboarding")}
							value={t("onboarding.statComplete")}
						/>
					</div>
					<button
						className={styles.congratsCta}
						onClick={onEnter}
						type="button"
					>
						<MagicWandIcon /> {t("onboarding.enterCascade")} <ArrowRightIcon />
					</button>
					<div className={styles.congratsHint}>
						{t("onboarding.congratsHint")}
					</div>
				</div>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className={styles.stat}>
			<div className={styles.statLabel}>{label}</div>
			<div className={styles.statValue}>{value}</div>
		</div>
	);
}

function ProgressStrip({
	phase,
	totalTourSteps,
	tourIndex,
	style,
}: {
	phase: Phase;
	totalTourSteps: number;
	tourIndex: number;
	style?: CSSProperties;
}) {
	const { t } = useTranslation();
	const segments = useMemo(
		() => [
			"welcome",
			...Array.from({ length: totalTourSteps }).map((_, i) => `tour-${i}`),
			"congrats",
		],
		[totalTourSteps],
	);
	const currentIndex = (() => {
		if (phase === "welcome") return 0;
		if (phase === "tour") return 1 + tourIndex;
		return 1 + totalTourSteps;
	})();

	return (
		<div className={styles.flowProgress} style={style}>
			<span className={styles.flowLabel}>
				{t("onboarding.progress")} ·{" "}
				{Math.min(segments.length, currentIndex + 1)}/{segments.length}
			</span>
			{segments.map((s, i) => (
				<span
					className={`${styles.seg} ${
						i < currentIndex
							? styles.segDone
							: i === currentIndex
								? styles.segNow
								: ""
					}`}
					key={s}
				/>
			))}
		</div>
	);
}

interface OnboardingOverlayProps {
	open: boolean;
	userName?: string;
	companyName?: string;
	memberSince?: string;
	region?: string;
	onComplete: () => void;
}

export function OnboardingOverlay({
	open,
	userName,
	companyName,
	memberSince,
	region,
	onComplete,
}: OnboardingOverlayProps) {
	const { t } = useTranslation();
	const [phase, setPhase] = useState<Phase>("welcome");
	const [tourIndex, setTourIndex] = useState(0);
	const [supplierTrack, setSupplierTrack] = useState<SupplierTrack | null>(
		() => (typeof window === "undefined" ? null : getStoredSupplierTrack()),
	);

	const tourSteps: TourStep[] = useMemo(() => {
		const specs = getTourStepSpecsForSupplierTrack(supplierTrack);
		return specs.map((spec, i) => ({
			...spec,
			num: String(i + 1).padStart(2, "0"),
			eyebrow: t("onboarding.sectionLabel", {
				current: i + 1,
				total: specs.length,
			}),
			title: t(`onboarding.sections.${spec.sectionKey}.title`),
			body: t(`onboarding.sections.${spec.sectionKey}.body`),
			hits: t(`onboarding.sections.${spec.sectionKey}.hits`, {
				returnObjects: true,
				defaultValue: [],
			}) as string[],
		}));
	}, [supplierTrack, t]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const syncSupplierTrack = () => setSupplierTrack(getStoredSupplierTrack());
		syncSupplierTrack();
		window.addEventListener("storage", syncSupplierTrack);
		window.addEventListener(SUPPLIER_TRACK_CHANGED_EVENT, syncSupplierTrack);

		return () => {
			window.removeEventListener("storage", syncSupplierTrack);
			window.removeEventListener(
				SUPPLIER_TRACK_CHANGED_EVENT,
				syncSupplierTrack,
			);
		};
	}, []);

	useEffect(() => {
		if (open) {
			setPhase("welcome");
			setTourIndex(0);
		}
	}, [open]);

	useEffect(() => {
		if (!open) {
			document.body.style.overflow = "";
			return;
		}
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	const onTourNext = useCallback(() => {
		setTourIndex((idx) => {
			if (idx < tourSteps.length - 1) return idx + 1;
			setPhase("congrats");
			return idx;
		});
	}, [tourSteps.length]);

	const onTourPrev = useCallback(() => {
		setTourIndex((idx) => {
			if (idx === 0) {
				setPhase("welcome");
				return 0;
			}

			return idx - 1;
		});
	}, []);

	useEffect(() => {
		if (phase !== "tour") return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") onTourNext();
			if (e.key === "ArrowLeft") onTourPrev();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [phase, onTourNext, onTourPrev]);

	const activeStep = tourSteps[tourIndex];
	const rect = useTargetRect(activeStep?.targetSelector ?? "body", [
		tourIndex,
		phase,
		open,
	]);
	useActiveNavHighlight(
		phase === "tour" && activeStep && rect ? activeStep.targetSelector : null,
		activeStep?.highlight ?? "teal",
	);
	const progressStyle = useMemo<CSSProperties | undefined>(() => {
		if (phase === "tour" && rect) {
			const pos = computeCoachPosition(rect, { w: 360, h: 320 });
			return {
				left: `${Math.max(16, pos.left)}px`,
				top: `${Math.max(72, pos.top - 56)}px`,
				transform: "none",
			};
		}

		if (phase === "congrats") {
			return {
				top: "50px",
			};
		}

		return undefined;
	}, [phase, rect]);

	useEffect(() => {
		if (tourIndex < tourSteps.length) return;
		setTourIndex(Math.max(0, tourSteps.length - 1));
	}, [tourIndex, tourSteps.length]);

	useEffect(() => {
		if (phase !== "tour" || !activeStep) return;
		const timeout = window.setTimeout(() => {
			if (document.querySelector(activeStep.targetSelector)) return;
			setTourIndex((idx) => {
				if (idx < tourSteps.length - 1) return idx + 1;
				setPhase("congrats");
				return idx;
			});
		}, 300);

		return () => window.clearTimeout(timeout);
	}, [activeStep, phase, tourSteps.length]);

	if (!open) return null;

	return (
		<div aria-modal="true" className={styles.root} role="dialog">
			<Scrim hole={phase === "tour" && activeStep ? rect : null} />

			{phase === "tour" && activeStep && (
				<>
					<Spotlight rect={rect} />
					<Coachmark
						index={tourIndex}
						onNext={onTourNext}
						onPrev={onTourPrev}
						rect={rect}
						step={activeStep}
						total={tourSteps.length}
					/>
				</>
			)}

			{phase === "welcome" && (
				<WelcomeModal
					onStart={() => {
						setTourIndex(0);
						setPhase(tourSteps.length > 0 ? "tour" : "congrats");
					}}
				/>
			)}

			{phase === "congrats" && (
				<CongratsModal
					companyName={companyName ?? "—"}
					memberSince={memberSince ?? "Today"}
					onEnter={onComplete}
					region={region ?? "—"}
					userName={userName ?? "there"}
				/>
			)}

			<ProgressStrip
				phase={phase}
				style={progressStyle}
				totalTourSteps={tourSteps.length}
				tourIndex={tourIndex}
			/>
		</div>
	);
}
