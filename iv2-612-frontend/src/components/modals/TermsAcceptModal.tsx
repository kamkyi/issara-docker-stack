import * as Dialog from "@radix-ui/react-dialog";
import {
	ArrowDownIcon,
	CheckIcon,
	Cross2Icon,
	ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import { termsLastUpdated, termsSections } from "$src/data/termsSections";

interface TermsAcceptModalProps {
	open: boolean;
	onAccept: () => void | Promise<void>;
	onDecline: () => void | Promise<void>;
	isSubmitting?: boolean;
	error?: string | null;
}

const READ_THRESHOLD = 0.9;

export function TermsAcceptModal({
	open,
	onAccept,
	onDecline,
	isSubmitting = false,
	error = null,
}: TermsAcceptModalProps) {
	const [accepted, setAccepted] = useState(false);
	const [hasReadTerms, setHasReadTerms] = useState(false);
	const [scrollProgress, setScrollProgress] = useState(0);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const titleId = useId();
	const descriptionId = useId();
	const checkboxId = useId();

	const updateProgress = () => {
		const el = scrollRef.current;
		if (!el) return;
		const scrollable = el.scrollHeight - el.clientHeight;
		if (scrollable <= 4) {
			setScrollProgress(1);
			setHasReadTerms(true);
			return;
		}
		const progress = Math.min(1, el.scrollTop / scrollable);
		setScrollProgress(progress);
		if (progress >= READ_THRESHOLD) setHasReadTerms(true);
	};

	useEffect(() => {
		if (!open) {
			setAccepted(false);
			setHasReadTerms(false);
			setScrollProgress(0);
			return;
		}
		const id = window.requestAnimationFrame(() => {
			window.requestAnimationFrame(updateProgress);
		});
		return () => window.cancelAnimationFrame(id);
	}, [open]);

	const scrollToBottom = () => {
		const el = scrollRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
	};

	const handleAccept = () => {
		if (!accepted || !hasReadTerms || isSubmitting) return;
		void onAccept();
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (isSubmitting) return;
		if (!isOpen) void onDecline();
	};

	const canAccept = accepted && hasReadTerms && !isSubmitting;
	const progressPercent = Math.round(scrollProgress * 100);

	return (
		<Dialog.Root onOpenChange={handleOpenChange} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[3px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
				<Dialog.Content
					aria-busy={isSubmitting}
					aria-describedby={descriptionId}
					aria-labelledby={titleId}
					className="fixed top-1/2 left-1/2 z-50 flex h-[85vh] max-h-[680px] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none data-[state=closed]:animate-modal-out data-[state=open]:animate-modal-in"
					onEscapeKeyDown={(e) => {
						if (isSubmitting) e.preventDefault();
					}}
					onInteractOutside={(e) => {
						if (isSubmitting) e.preventDefault();
					}}
				>
					{/* Header */}
					<div className="relative shrink-0 px-6 pt-5 pb-4 sm:px-7">
						<Dialog.Close
							aria-label="Close"
							className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] disabled:cursor-not-allowed disabled:opacity-40"
							disabled={isSubmitting}
						>
							<Cross2Icon className="h-4 w-4" />
						</Dialog.Close>

						<div className="flex items-center gap-3">
							<div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#148696]/15 to-[#148696]/5 ring-1 ring-inset ring-[#148696]/20">
								<svg
									aria-hidden="true"
									className="h-5 w-5 text-[#148696]"
									fill="none"
									stroke="currentColor"
									strokeWidth={1.8}
									viewBox="0 0 24 24"
								>
									<path
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
							<div className="min-w-0 pr-8">
								<Dialog.Title
									className="font-heading text-lg font-semibold tracking-tight text-gray-900"
									id={titleId}
								>
									CASCADE Data Privacy Policy
								</Dialog.Title>
								<Dialog.Description
									className="mt-0.5 text-xs leading-relaxed text-gray-500"
									id={descriptionId}
								>
									Last updated {termsLastUpdated} · Review and agree to
									continue.
								</Dialog.Description>
							</div>
						</div>
					</div>

					{/* Progress bar */}
					<div
						aria-hidden="true"
						className="mx-6 mb-3 h-1 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:mx-7"
					>
						<div
							className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out ${
								hasReadTerms ? "bg-emerald-500" : "bg-[#148696]"
							}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>

					{/* Scrollable terms (this element scrolls) */}
					<div
						className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4 sm:px-7"
						onScroll={updateProgress}
						ref={scrollRef}
					>
						<ol className="space-y-3">
							{termsSections.map((section) => (
								<li
									className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
									key={section.number}
								>
									<div className="mb-2 flex items-center gap-2">
										<span className="rounded-md bg-[#148696]/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#148696]">
											{section.number}
										</span>
										<h3 className="font-heading text-sm font-semibold text-gray-900">
											{section.title}
										</h3>
									</div>
									<p className="text-sm leading-relaxed text-gray-600">
										{section.content}
									</p>
									{section.list && (
										<ul className="mt-2 space-y-1.5">
											{section.list.map((item) => (
												<li
													className="flex items-start gap-2 text-sm leading-relaxed text-gray-600"
													key={item}
												>
													<span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#148696]" />
													<span>{item}</span>
												</li>
											))}
										</ul>
									)}
									{section.subsections?.map((sub) => (
										<div className="mt-3" key={sub.title}>
											<h4 className="mb-1.5 text-xs font-semibold tracking-wide text-gray-700 uppercase">
												{sub.title}
											</h4>
											<ul className="space-y-1.5">
												{sub.items.map((item) => (
													<li
														className="flex items-start gap-2 text-sm leading-relaxed text-gray-600"
														key={item}
													>
														<span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#148696]/60" />
														<span>{item}</span>
													</li>
												))}
											</ul>
										</div>
									))}
									{section.contact && (
										<a
											className="mt-2 inline-block text-sm font-medium text-[#148696] underline underline-offset-2 hover:text-[#004A60]"
											href={`mailto:${section.contact}`}
										>
											{section.contact}
										</a>
									)}
								</li>
							))}
						</ol>
					</div>

					{/* "Scroll to bottom" floating button — visible whenever the user isn't near the bottom */}
					<button
						aria-hidden={scrollProgress >= 0.95}
						aria-label="Scroll to bottom of terms"
						className={`pointer-events-auto absolute right-5 bottom-[170px] z-10 inline-flex items-center gap-1.5 rounded-full bg-[#148696] px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#148696]/30 transition-all duration-200 hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus-visible:ring-offset-2 ${
							scrollProgress >= 0.95
								? "pointer-events-none translate-y-1 opacity-0"
								: "translate-y-0 opacity-100"
						}`}
						onClick={scrollToBottom}
						tabIndex={scrollProgress >= 0.95 ? -1 : 0}
						type="button"
					>
						<ArrowDownIcon className="h-3 w-3" />
						{hasReadTerms ? "Back to bottom" : "Scroll to bottom"}
					</button>

					{/* Footer */}
					<div className="shrink-0 border-t border-gray-100 bg-white px-6 pt-4 pb-5 sm:px-7">
						{/* Acceptance row */}
						<label
							className={`group mb-3 flex items-start gap-3 rounded-lg border p-3 transition-colors duration-200 select-none ${
								!hasReadTerms
									? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
									: accepted
										? "cursor-pointer border-[#148696] bg-[#148696]/5"
										: "cursor-pointer border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
							}`}
							htmlFor={checkboxId}
						>
							<span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
								<input
									checked={accepted}
									className="peer sr-only"
									disabled={!hasReadTerms || isSubmitting}
									id={checkboxId}
									onChange={(e) => setAccepted(e.target.checked)}
									type="checkbox"
								/>
								<span
									className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150 ${
										accepted
											? "border-[#148696] bg-[#148696]"
											: "border-gray-300 bg-white group-hover:border-gray-400"
									} peer-focus-visible:ring-2 peer-focus-visible:ring-[#148696] peer-focus-visible:ring-offset-2`}
								>
									<CheckIcon
										className={`h-3.5 w-3.5 text-white transition-opacity duration-150 ${accepted ? "opacity-100" : "opacity-0"}`}
									/>
								</span>
							</span>
							<span className="text-sm leading-relaxed text-gray-700">
								I have read and agree to the CASCADE Data Privacy Policy.
								{!hasReadTerms && (
									<span className="mt-0.5 block text-xs text-gray-500">
										Scroll through the terms above to enable.
									</span>
								)}
							</span>
						</label>

						{/* Error */}
						{error && (
							<div
								className="mb-3 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2"
								role="alert"
							>
								<ExclamationTriangleIcon
									aria-hidden="true"
									className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
								/>
								<p className="text-sm leading-relaxed text-red-700">{error}</p>
							</div>
						)}

						{/* Actions */}
						<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<button
								className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isSubmitting}
								onClick={() => void onDecline()}
								type="button"
							>
								Cancel & Sign Out
							</button>
							<button
								className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#148696] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#148696]/40 disabled:shadow-none disabled:hover:bg-[#148696]/40"
								disabled={!canAccept}
								onClick={handleAccept}
								type="button"
							>
								{isSubmitting ? (
									<>
										<svg
											aria-hidden="true"
											className="h-4 w-4 animate-spin"
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
												d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
												fill="currentColor"
											/>
										</svg>
										Saving…
									</>
								) : (
									"Accept & Continue"
								)}
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
