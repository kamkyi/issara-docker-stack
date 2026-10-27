import {
	ArrowLeftIcon,
	ChatBubbleIcon,
	DownloadIcon,
	ExternalLinkIcon,
	Link2Icon,
} from "@radix-ui/react-icons";
import { Badge } from "@radix-ui/themes";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getCompanyDescription,
	getCompanyLogo,
	type PolicyEntry,
} from "$src/utils/memberDirectory";
import MapMarkerIcon from "./MapMarkerIcon";

interface GlobalBuyerDetailViewProps {
	company: any;
	companyTypeLabel: string;
	formattedAddress: string;
	statusLabel: string;
	policyEntries: PolicyEntry[];
}

function PolicyDocumentIcon() {
	return (
		<svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
			<path
				d="M6.5 3.75h7.1l3.9 3.9v11.1a1.9 1.9 0 0 1-1.9 1.9H6.5a1.9 1.9 0 0 1-1.9-1.9V5.65a1.9 1.9 0 0 1 1.9-1.9Z"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
			/>
			<path
				d="M13.5 3.9v3.95h3.85"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.8"
			/>
			<path
				d="M7.9 10.35h5.25M7.9 13.45h3.75"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.8"
			/>
			<circle
				cx="15.35"
				cy="15.85"
				r="2.4"
				stroke="currentColor"
				strokeWidth="1.8"
			/>
			<path
				d="m14.35 18.05-.7 2.2 1.7-.85 1.7.85-.7-2.2"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.6"
			/>
		</svg>
	);
}

function PolicyRow({ policy }: { policy: PolicyEntry }) {
	const rawPolicy = policy as PolicyEntry & {
		source_type?: string;
		type?: string;
		file_url?: string;
		file?: string;
		file_name?: string;
		filename?: string;
		link_url?: string;
		linkUrl?: string;
		url?: string;
	};

	const sourceType = String(
		rawPolicy.sourceType ?? rawPolicy.source_type ?? rawPolicy.type ?? "",
	).toLowerCase();

	const fileUrl = rawPolicy.fileUrl ?? rawPolicy.file_url ?? rawPolicy.file;
	const linkUrl =
		rawPolicy.link ?? rawPolicy.link_url ?? rawPolicy.linkUrl ?? rawPolicy.url;
	const fileName =
		rawPolicy.fileName ?? rawPolicy.file_name ?? rawPolicy.filename;

	const isFilePolicy = sourceType === "file";
	const isLinkPolicy = sourceType === "link";
	const isTextPolicy = sourceType === "text";

	const hasFile = isFilePolicy && !!fileUrl;
	const hasLink = isLinkPolicy && !!linkUrl;

	const tags =
		rawPolicy.tags ??
		(rawPolicy.text
			? rawPolicy.text
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: []);

	const subtitle = fileName || rawPolicy.description;

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-[#f1ddb2] bg-[#fffdf8] px-4 py-4 shadow-[0_1px_0_rgba(193,153,72,0.04)] transition-shadow duration-200 hover:shadow-[0_8px_18px_rgba(44,85,92,0.06)] sm:flex-row sm:items-center sm:gap-5 md:px-6 md:py-5">
			<div
				className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
					isFilePolicy
						? "bg-[#a8e2e5] text-[#0b6773]"
						: "bg-[#e6c0ff] text-[#7d3bb1]"
				}`}
			>
				{isFilePolicy ? (
					<PolicyDocumentIcon />
				) : isTextPolicy ? (
					<ChatBubbleIcon className="h-5 w-5" />
				) : (
					<Link2Icon className="h-5 w-5" />
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="text-[0.98rem] font-black leading-tight text-[#111111] md:text-[1.08rem]">
					{policy.label}
				</p>
				{subtitle && (
					<p className="mt-0.5 text-[0.86rem] text-[#747474] md:text-[0.92rem]">
						{subtitle}
					</p>
				)}
				{tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-2">
						{tags.map((tag) => (
							<span
								className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-[#efd8ab] bg-white px-2.5 py-0.5 text-[0.78rem] leading-none text-[#3f3f3f]"
								key={tag}
							>
								<span className="h-1.5 w-1.5 rounded-full bg-[#1c9aad]" />
								{tag}
							</span>
						))}
					</div>
				)}
			</div>

			<div className="shrink-0 sm:ml-3 sm:min-w-[116px] sm:text-right">
				{hasFile ? (
					<a
						className="inline-flex items-center gap-1.5 text-[0.95rem] font-black text-[#1c1c1c] transition-colors hover:text-[#0b6773] md:text-[1rem]"
						href={fileUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Download
						<DownloadIcon className="h-5 w-5" />
					</a>
				) : hasLink ? (
					<a
						className="inline-flex items-center gap-1.5 text-[0.95rem] font-black text-[#1c1c1c] transition-colors hover:text-[#7d3bb1] md:text-[1rem]"
						href={linkUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Open Link
						<ExternalLinkIcon className="h-5 w-5" />
					</a>
				) : null}
			</div>
		</div>
	);
}

export default function GlobalBuyerDetailView({
	company,
	companyTypeLabel,
	formattedAddress,
	statusLabel,
	policyEntries,
}: GlobalBuyerDetailViewProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [logoError, setLogoError] = useState(false);

	const logo = getCompanyLogo(company);
	const companyName = company.name_en || company.name;
	const description = getCompanyDescription(company);

	return (
		<div
			className="-mx-6 -mb-4 min-h-[calc(100vh-10rem)] bg-gradient-to-b from-white via-[rgba(20,134,150,0.12)] to-[#148696] pb-16 shadow-[0_16px_0_#148696]"
			data-member-directory-detail
		>
			<div className="mx-auto max-w-6xl px-6 py-4">
				{/* Back button */}
				<button
					className="mb-6 flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 no-underline transition-colors hover:border-[#148696] hover:text-[#004A60] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148696] cursor-pointer"
					onClick={() => navigate({ to: "/member-directory" })}
					type="button"
				>
					<ArrowLeftIcon />
					{t("memberDirectoryDetail.actions.backToDirectory", {
						defaultValue: "Back to Directory",
					})}
				</button>

				{/* Header Card */}
				<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
					<div className="flex items-start gap-4">
						{/* Logo */}
						<div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
							{logo && !logoError ? (
								<img
									alt={companyName}
									className="w-full h-full object-contain p-1"
									onError={() => setLogoError(true)}
									src={logo}
								/>
							) : (
								<span className="text-2xl font-bold text-gray-400">
									{companyName?.charAt(0)?.toUpperCase() ?? "?"}
								</span>
							)}
						</div>

						{/* Name + badge + location + status */}
						<div className="flex-1 min-w-0">
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<h1 className="text-2xl font-semibold text-gray-900">
										{companyName}
									</h1>
									{formattedAddress && (
										<p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
											<MapMarkerIcon className="w-3.5 h-3.5 shrink-0 text-gray-400" />
											{formattedAddress}
										</p>
									)}
								</div>
								<span className="inline-flex min-w-28 shrink-0 items-center justify-center rounded-full bg-[#ff7f78] px-4 py-1 text-[10px] font-medium uppercase leading-none text-[#7a1f1a]">
									{companyTypeLabel.toUpperCase()}
								</span>
							</div>
							<div className="flex items-center gap-2 mt-2">
								<span className="text-sm text-gray-700 font-medium">
									{t("memberDirectoryDetail.header.status")}:
								</span>
								<Badge color="green" radius="full" size="1" variant="soft">
									{statusLabel}
								</Badge>
							</div>

							{description && (
								<div className="mt-4 border-t border-gray-300 pt-3">
									<h2 className="text-base font-semibold text-gray-900 mb-2">
										{t("memberDirectoryDetail.common.description", {
											defaultValue: "Description",
										})}
									</h2>
									<p className="text-sm text-gray-600 leading-relaxed">
										{description}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Policies & Compliance */}
				{policyEntries.length > 0 && (
					<div className="rounded-2xl border border-white/60 bg-white px-5 py-6 shadow-sm md:px-6 md:py-7">
						<h2 className="mb-4 text-lg font-black text-[#111111]">
							Policies & Compliance
						</h2>
						<div className="space-y-4">
							{policyEntries.map((policy) => (
								<PolicyRow key={String(policy.id)} policy={policy} />
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
