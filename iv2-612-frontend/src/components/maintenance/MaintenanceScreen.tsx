import { type CSSProperties, useEffect, useState } from "react";
import issaraLogo from "$src/assets/img/issara-logo.png";
import {
	formatLocalTimestamp,
	formatUtcTimestamp,
	type SystemMaintenanceStatus,
} from "$src/services/systemMaintenanceService";

interface MaintenanceScreenProps {
	status?: SystemMaintenanceStatus | null;
	onRefresh?: () => void | Promise<unknown>;
	isChecking?: boolean;
}

/** The maintenance window is drawn as this many steps of the cascade. */
const STEP_COUNT = 8;

/** Stable identities for the cascade steps, top of the fall to the bottom. */
const STEPS = Array.from({ length: STEP_COUNT }, (_, index) => ({
	id: `cascade-step-${index}`,
	index,
}));

interface Remaining {
	hours: number;
	minutes: number;
	seconds: number;
	/** 0 → window just opened, 1 → window elapsed. */
	progress: number;
	isOverdue: boolean;
}

/** Splits a clock value into fixed-width digit boxes so ticking never reflows. */
function Digits({ value }: { value: number }) {
	const [tens, ones] = String(value).padStart(2, "0").split("");
	return (
		<>
			<span className="mtn-digit">{tens}</span>
			<span className="mtn-digit">{ones}</span>
		</>
	);
}

export default function MaintenanceScreen({
	status,
	onRefresh,
	isChecking = false,
}: MaintenanceScreenProps) {
	const [remaining, setRemaining] = useState<Remaining | null>(null);

	const endTimeIso = status?.end_time;
	const startTimeIso = status?.start_time;

	useEffect(() => {
		if (!endTimeIso) {
			setRemaining(null);
			return;
		}

		const endMs = new Date(endTimeIso).getTime();
		const startMs = startTimeIso
			? new Date(startTimeIso).getTime()
			: endMs - 2 * 3600 * 1000;
		const windowMs = Math.max(1000, endMs - startMs);

		const tick = () => {
			const diffMs = endMs - Date.now();

			if (diffMs <= 0) {
				setRemaining({
					hours: 0,
					minutes: 0,
					seconds: 0,
					progress: 1,
					isOverdue: true,
				});
				return;
			}

			const totalSeconds = Math.floor(diffMs / 1000);
			setRemaining({
				hours: Math.floor(totalSeconds / 3600),
				minutes: Math.floor((totalSeconds % 3600) / 60),
				seconds: totalSeconds % 60,
				progress: Math.min(1, Math.max(0, (windowMs - diffMs) / windowMs)),
				isOverdue: false,
			});
		};

		tick();
		const timer = setInterval(tick, 1000);
		return () => clearInterval(timer);
	}, [endTimeIso, startTimeIso]);

	const localStart = formatLocalTimestamp(status?.start_time ?? null);
	const utcStart = formatUtcTimestamp(status?.start_time ?? null);
	const localEnd = formatLocalTimestamp(status?.end_time ?? null);
	const utcEnd = formatUtcTimestamp(status?.end_time ?? null);

	const title = status?.title || "CASCADE is paused for maintenance";
	const message =
		status?.message ||
		"We're upgrading the platform. Nothing you've submitted is affected — every record will be where you left it when the system comes back.";

	const timezone =
		Intl.DateTimeFormat().resolvedOptions().timeZone || "your timezone";

	const activeStep = remaining
		? Math.min(STEP_COUNT - 1, Math.floor(remaining.progress * STEP_COUNT))
		: -1;

	return (
		<div className="mtn relative min-h-screen w-full flex flex-col font-sans selection:bg-[#148696]/20">
			<div
				aria-hidden="true"
				className="mtn-glow pointer-events-none absolute inset-0"
			/>

			<header className="relative z-10 w-full border-b border-[var(--mtn-line)]">
				<div className="mx-auto w-full max-w-6xl px-6 py-5 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<img alt="" className="h-8 w-8 object-contain" src={issaraLogo} />
						<div className="leading-none">
							<div className="font-display text-lg tracking-wide text-[var(--mtn-ink)]">
								CASCADE
							</div>
							<div className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--mtn-caption)]">
								Issara Institute
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] text-[var(--mtn-ink)]">
						<span
							aria-hidden="true"
							className="h-1.5 w-1.5 rounded-full bg-[var(--mtn-coral)]"
						/>
						Paused
					</div>
				</div>
			</header>

			<main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 sm:py-16">
				<div className="w-full grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20 lg:items-center">
					{/* Left: what happened, when it ends, what to do */}
					<div>
						<p
							className="mtn-rise text-[11px] uppercase tracking-[0.28em] text-[var(--mtn-teal)]"
							style={{ "--d": 0 } as CSSProperties}
						>
							System status
						</p>

						<h1
							className="mtn-rise mt-5 max-w-lg font-display text-[2rem] leading-[1.15] uppercase text-[var(--mtn-ink)] sm:text-[2.75rem]"
							style={{ "--d": 60 } as CSSProperties}
						>
							{title}
						</h1>

						<p
							className="mtn-rise mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--mtn-body)] sm:text-base"
							style={{ "--d": 120 } as CSSProperties}
						>
							{message}
						</p>

						{remaining && !remaining.isOverdue && (
							<div
								className="mtn-rise mt-10"
								style={{ "--d": 180 } as CSSProperties}
							>
								<p className="text-[11px] uppercase tracking-[0.22em] text-[var(--mtn-caption)]">
									Back online in
								</p>
								<p className="mt-3 font-sans font-bold text-[2.75rem] leading-none text-[var(--mtn-ink)] sm:text-[3.5rem]">
									<Digits value={remaining.hours} />
									<span className="px-1 text-[var(--mtn-teal)]">:</span>
									<Digits value={remaining.minutes} />
									<span className="px-1 text-[var(--mtn-teal)]">:</span>
									<span className="text-[var(--mtn-teal)]">
										<Digits value={remaining.seconds} />
									</span>
								</p>
								<p className="mt-3 text-xs tracking-wide text-[var(--mtn-body)]">
									Hours · Minutes · Seconds
								</p>
							</div>
						)}

						{remaining?.isOverdue && (
							<p
								className="mtn-rise mt-10 flex items-center gap-2.5 text-sm text-[var(--mtn-ink)]"
								style={{ "--d": 180 } as CSSProperties}
							>
								<span
									aria-hidden="true"
									className="h-1.5 w-1.5 rounded-full bg-[var(--mtn-teal)]"
								/>
								Running final checks. CASCADE returns in a moment.
							</p>
						)}

						<div
							className="mtn-rise mt-10 flex flex-wrap items-center gap-x-5 gap-y-3"
							style={{ "--d": 240 } as CSSProperties}
						>
							<button
								className="cascade-btn cascade-btn--primary rounded-xl px-7 py-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mtn-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mtn-ground)] disabled:cursor-not-allowed"
								disabled={isChecking}
								onClick={() => {
									if (onRefresh) {
										void onRefresh();
									} else {
										window.location.reload();
									}
								}}
								type="button"
							>
								{isChecking ? "Checking…" : "Check again"}
							</button>
							<span className="text-xs text-[var(--mtn-caption)]">
								This page does not refresh on its own.
							</span>
						</div>
					</div>

					{/* Right: the cascade — one step per slice of the window */}
					<div className="mtn-rise" style={{ "--d": 120 } as CSSProperties}>
						<div className="mb-4 flex items-baseline justify-between gap-4">
							<span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mtn-caption)]">
								Maintenance window
							</span>
							{remaining && (
								<span className="text-xs font-semibold text-[var(--mtn-teal)]">
									{Math.round(remaining.progress * 100)}% elapsed
								</span>
							)}
						</div>

						{endTimeIso ? (
							<div
								aria-label={
									remaining
										? `Maintenance window ${Math.round(remaining.progress * 100)}% elapsed`
										: "Maintenance window"
								}
								className="mtn-cascade"
								role="img"
							>
								{STEPS.map(({ id, index: step }) => {
									const fill = remaining
										? Math.min(
												1,
												Math.max(0, remaining.progress * STEP_COUNT - step),
											)
										: 0;
									return (
										<div
											className={`mtn-step${step === activeStep && !remaining?.isOverdue ? " mtn-step--active" : ""}`}
											key={id}
											style={{ "--i": step } as CSSProperties}
										>
											<span
												className="mtn-step-fill"
												style={{ "--fill": `${fill * 100}%` } as CSSProperties}
											/>
										</div>
									);
								})}
							</div>
						) : (
							<div aria-hidden="true" className="mtn-cascade">
								{STEPS.map(({ id, index: step }) => (
									<div
										className="mtn-step mtn-drift"
										key={id}
										style={
											{
												"--i": step,
												animationDelay: `${step * 90}ms`,
											} as CSSProperties
										}
									/>
								))}
							</div>
						)}

						<dl className="mt-10 border-t border-[var(--mtn-line)] text-sm">
							<div className="flex items-baseline justify-between gap-6 border-b border-[var(--mtn-line)] py-4">
								<dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--mtn-caption)]">
									Paused
								</dt>
								<dd className="text-right">
									<span className="block font-semibold text-[var(--mtn-ink)]">
										{localStart || status?.display_start_time || "—"}
									</span>
									{utcStart && (
										<span className="block text-xs text-[var(--mtn-caption)]">
											{utcStart}
										</span>
									)}
								</dd>
							</div>
							<div className="flex items-baseline justify-between gap-6 border-b border-[var(--mtn-line)] py-4">
								<dt className="text-[11px] uppercase tracking-[0.18em] text-[var(--mtn-caption)]">
									Expected back
								</dt>
								<dd className="text-right">
									<span className="block font-semibold text-[var(--mtn-teal)]">
										{localEnd || status?.display_end_time || "To be confirmed"}
									</span>
									{utcEnd && (
										<span className="block text-xs text-[var(--mtn-caption)]">
											{utcEnd}
										</span>
									)}
								</dd>
							</div>
						</dl>

						<p className="mt-4 text-xs text-[var(--mtn-caption)]">
							Shown in {timezone}, with UTC underneath.
						</p>
					</div>
				</div>
			</main>

			<footer className="relative z-10 w-full border-t border-[var(--mtn-line)]">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-[var(--mtn-caption)] sm:flex-row sm:items-center sm:justify-between">
					<span>© {new Date().getFullYear()} Issara Institute</span>
					<span>
						Need help before then?{" "}
						<a
							className="font-semibold text-[var(--mtn-teal)] underline-offset-4 hover:underline"
							href="mailto:support@issarainstitute.org"
						>
							support@issarainstitute.org
						</a>
					</span>
				</div>
			</footer>
		</div>
	);
}
