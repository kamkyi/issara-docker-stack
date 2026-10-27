import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import type React from "react";
import { useState } from "react";
import logoUrl from "$src/assets/img/logo.png";
import useAuthData from "$src/store/store.auth";
import { handleForceSignOut } from "$src/utils/workos-utils";
import AccessRequestForm from "./AccessRequestForm";

interface UnauthorizedAccessProps {
	message?: string;
	showContactInfo?: boolean;
	// The friendly access-request form. On by default (the /unauthorized page);
	// turned off for the AuthGuard "please sign in" fallback, where a not-yet
	// authenticated user has nothing to request.
	showRequestForm?: boolean;
}

const contactEmail = "cascade@issarainstitute.org";

const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
	showContactInfo = true,
	showRequestForm = true,
}) => {
	const [isSubmitted, setIsSubmitted] = useState(false);
	const navigate = useNavigate();
	const { signOut } = useAuth();
	const { session } = useAuthData();

	const handleLogout = async () => {
		await handleForceSignOut({ signOut, session });
		navigate({ to: "/" });
	};

	return (
		<div className="h-screen w-full overflow-hidden grid grid-cols-1 md:grid-cols-12">
			{/* Brand panel — welcome + what happens next. Solid teal. */}
			<div
				className="relative flex flex-col justify-between p-8 md:p-12 text-white h-full overflow-y-auto md:col-span-5"
				style={{
					background:
						"linear-gradient(135deg, rgb(0, 74, 96) 0%, rgb(20, 134, 150) 100%)",
				}}
			>
				<div>
					<div className="mb-6 flex items-center justify-start">
						<img alt="ILM Logo" src={logoUrl} width="60" />
					</div>

					<h1
						className="mt-4 text-xl sm:text-2xl lg:text-3xl font-bold leading-[1.1] uppercase tracking-wide"
						style={{
							fontFamily: '"Fugaz One", sans-serif',
							color: "#ffffff",
							fontStyle: "italic",
						}}
					>
						CASCADING SUSTAINABILITY DATA ECOSYSTEM (CASCADE)
					</h1>

					<div className="mt-8 flex flex-col gap-5">
						<div className="flex gap-4">
							<div className="flex-none flex h-6 w-6 items-center justify-center rounded-full bg-white/20 mt-0.5">
								<svg
									fill="none"
									height="12"
									viewBox="0 0 12 12"
									width="12"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M10 3L4.5 8.5L2 6"
										stroke="white"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
									/>
								</svg>
							</div>
							<div>
								<div
									className="text-base sm:text-lg lg:text-xl font-black italic uppercase tracking-wider mb-1"
									style={{
										fontFamily: '"Fugaz One", sans-serif',
										color: "#ffffff",
									}}
								>
									BETTER DATA.
								</div>
								<div className="text-[13px] sm:text-[14px] lg:text-[15px] leading-relaxed text-white/90">
									Worker voice-driven, AI-powered tech and data, for visibility
									of labor risks across supply chains
								</div>
							</div>
						</div>

						<div className="flex gap-4">
							<div className="flex-none flex h-6 w-6 items-center justify-center rounded-full bg-white/20 mt-0.5">
								<svg
									fill="none"
									height="12"
									viewBox="0 0 12 12"
									width="12"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M10 3L4.5 8.5L2 6"
										stroke="white"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
									/>
								</svg>
							</div>
							<div>
								<div
									className="text-base sm:text-lg lg:text-xl font-black italic uppercase tracking-wider mb-1"
									style={{
										fontFamily: '"Fugaz One", sans-serif',
										color: "#ffffff",
									}}
								>
									BETTER SOLUTIONS.
								</div>
								<div className="text-[13px] sm:text-[14px] lg:text-[15px] leading-relaxed text-white/90">
									On-the-ground solutions to remediate issues in a timely
									manner, and address root causes
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-6 text-[11px] sm:text-[12px] lg:text-[13px] leading-relaxed text-white/90 font-medium pb-2 sm:pb-4">
					CASCADE team will verify your request and get back to you via email
					within 7 working days.
					<div className="font-bold mt-1 text-white text-[12px] sm:text-[13px] lg:text-sm">
						We look forward to connecting with you soon.
					</div>
				</div>
			</div>

			{/* Form panel — the primary action. Adapts to light/dark theme. */}
			<div
				className="px-8 py-6 md:px-16 md:py-8 h-full overflow-y-auto md:col-span-7 flex flex-col justify-center"
				style={{ backgroundColor: "var(--color-bg)" }}
			>
				<div className="mx-auto" style={{ maxWidth: "540px", width: "100%" }}>
					{!isSubmitted && (
						<div className="mb-4">
							<h2 className="mb-2">
								<span
									className="inline-block text-[11px] font-bold uppercase tracking-[0.2em]"
									style={{ color: "var(--color-secondary)" }}
								>
									CASCADE · ACCESS
								</span>
							</h2>
							{showRequestForm ? (
								<h2
									className="text-2xl md:text-3xl font-bold"
									style={{
										fontFamily: '"DM Sans", sans-serif',
										color: "var(--color-ink)",
									}}
								>
									Request Access
								</h2>
							) : (
								<h2
									className="text-3xl font-bold"
									style={{
										fontFamily: '"DM Sans", sans-serif',
										color: "var(--color-primary)",
									}}
								>
									Please sign in
								</h2>
							)}
						</div>
					)}

					{showRequestForm ? (
						<AccessRequestForm onSuccess={() => setIsSubmitted(true)} />
					) : (
						<div className="flex-1 flex flex-col justify-center">
							<p className="text-sm" style={{ color: "var(--color-body)" }}>
								Sign in to your CASCADE account to continue. If you don't have
								access yet, an Issara team member can set you up.
							</p>
						</div>
					)}

					<div
						className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
						style={{ borderTop: "1px solid var(--color-border)" }}
					>
						{showContactInfo && (
							<p className="text-sm" style={{ color: "var(--color-body)" }}>
								Prefer email?{" "}
								<a
									className="font-medium underline hover:opacity-80 transition-opacity"
									href={`mailto:${contactEmail}`}
									style={{ color: "var(--color-secondary)" }}
								>
									{contactEmail}
								</a>
							</p>
						)}
						<button
							className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-[#FB8379]/10"
							onClick={handleLogout}
							style={{
								color: "#FB8379",
								border: "1px solid #FB8379",
								cursor: "pointer",
								backgroundColor: "transparent",
							}}
							type="button"
						>
							<svg
								fill="none"
								height="16"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								viewBox="0 0 24 24"
								width="16"
							>
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
								<polyline points="16 17 21 12 16 7" />
								<line x1="21" x2="9" y1="12" y2="12" />
							</svg>
							Log out
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UnauthorizedAccess;
