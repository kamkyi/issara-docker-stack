import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Badge, Button, Text, TextArea } from "@radix-ui/themes";
import { useFlags } from "flagsmith/react";
import type { IFlagsmithFeature } from "flagsmith/types";
import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import {
	type AccessRequest,
	type AccessRequestStatus,
	useAccessRequests,
	useUpdateAccessRequestStatus,
} from "$src/queries/accessRequests";
import { authStatus } from "$src/queries/auth";
import { canApproveAccessRequests } from "$src/utils/account";
import EmailRecipientsSettings from "./EmailRecipientsSettings";

/**
 * Review panel for CASCADE access requests. All Issara staff/management can see
 * requests; only Issara Management (canApproveAccessRequests) gets Approve/Reject
 * controls — staff see a read-only status. Backed by cascade-api /access-requests.
 */

const ORG_TYPE_LABELS: Record<string, string> = {
	supplier: "Supplier",
	global_partner: "Global Partner",
	recruiter: "Recruitment Agency",
	certification_body: "Certification Body",
	philanthropic_donor: "Philanthropic Donor",
	cso_ngo: "CSO / NGO",
	other: "Other",
};

// Status-colored triage rail + badge tone. Pending stands out (amber) so the
// queue reads at a glance; resolved requests recede (green / red).
const STATUS_ACCENT: Record<AccessRequestStatus, string> = {
	pending: "#FDDA61",
	approved: "#A6DFDD",
	rejected: "#FB8379",
};

type FilterValue = AccessRequestStatus | "all";

const FILTERS: { value: FilterValue; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: AccessRequestStatus }) {
	const accent = STATUS_ACCENT[status];
	return (
		<Badge
			style={{
				backgroundColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
				color: "#333333",
			}}
			variant="soft"
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</Badge>
	);
}

function formatDate(value: string | null): string {
	if (!value) return "—";
	try {
		return new Date(value).toLocaleString();
	} catch {
		return value;
	}
}

function DetailField({
	label,
	value,
	wrap = false,
}: {
	label: string;
	value: React.ReactNode;
	wrap?: boolean;
}) {
	return (
		<div className="min-w-0">
			<Text
				as="div"
				size="1"
				style={{
					color: "var(--color-caption)",
					textTransform: "uppercase",
					letterSpacing: "0.06em",
					fontFamily: '"DM Mono", monospace',
					marginBottom: 2,
				}}
			>
				{label}
			</Text>
			<Text
				as="div"
				className={wrap ? "break-words whitespace-pre-wrap" : "truncate"}
				size="2"
				style={{ color: "var(--text-primary)" }}
			>
				{value}
			</Text>
		</div>
	);
}

function RequestRow({
	request,
	canApprove,
}: {
	request: AccessRequest;
	canApprove: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const [notes, setNotes] = useState("");
	const { mutate, isPending } = useUpdateAccessRequestStatus();

	const act = (e: React.MouseEvent, status: "approved" | "rejected") => {
		e.stopPropagation();
		mutate({ id: request.id, status, reviewNotes: notes.trim() || undefined });
	};

	const orgLabel =
		ORG_TYPE_LABELS[request.organization_type] ?? request.organization_type;

	return (
		<div
			className="overflow-hidden rounded-xl bg-white"
			style={{
				border: "1px solid var(--color-border)",
				borderLeft: `4px solid ${STATUS_ACCENT[request.status]}`,
			}}
		>
			{/* ── Summary row (always visible) ── */}
			<button
				className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50/60"
				onClick={() => setExpanded((prev) => !prev)}
				style={{ cursor: "pointer" }}
				type="button"
			>
				{/* Name + email */}
				<div className="min-w-0 flex-1">
					<Text
						as="div"
						size="2"
						style={{
							fontFamily: '"DM Sans", sans-serif',
							color: "var(--text-primary)",
						}}
						weight="bold"
					>
						{request.full_name}
					</Text>
					<Text
						as="div"
						className="truncate"
						size="1"
						style={{ color: "var(--color-body)" }}
					>
						{request.email}
					</Text>
				</div>

				{/* Org + Type (hidden on small screens) */}
				<div className="hidden min-w-0 max-w-[140px] sm:block">
					<Text
						as="div"
						className="truncate"
						size="2"
						style={{ color: "var(--text-primary)" }}
					>
						{request.organization_name}
					</Text>
					<Text
						as="div"
						className="truncate"
						size="1"
						style={{ color: "var(--color-caption)" }}
					>
						{orgLabel}
					</Text>
				</div>

				{/* Submitted date (hidden on small screens) */}
				<div className="hidden min-w-0 max-w-[150px] md:block">
					<Text
						as="div"
						className="truncate"
						size="1"
						style={{ color: "var(--color-caption)" }}
					>
						{formatDate(request.createdAt)}
					</Text>
				</div>

				{/* Status badge */}
				<StatusBadge status={request.status} />

				{/* Approve/Reject inline (pending only, management only) */}
				{canApprove && request.status === "pending" && (
					<div
						className="flex gap-1.5"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<Button
							disabled={isPending}
							onClick={(e) => act(e, "approved")}
							size="1"
							style={{
								cursor: "pointer",
								backgroundColor: STATUS_ACCENT.approved,
								color: "#00516A",
							}}
						>
							Approve
						</Button>
						<Button
							disabled={isPending}
							onClick={(e) => act(e, "rejected")}
							size="1"
							style={{
								cursor: "pointer",
								backgroundColor: STATUS_ACCENT.rejected,
								color: "#7A1F1F",
							}}
						>
							Reject
						</Button>
					</div>
				)}

				{/* Chevron */}
				<motion.div
					animate={{ rotate: expanded ? 180 : 0 }}
					style={{ flexShrink: 0 }}
					transition={{ duration: 0.2 }}
				>
					<ChevronDownIcon
						height={16}
						style={{ color: "var(--color-caption)" }}
						width={16}
					/>
				</motion.div>
			</button>

			{/* ── Expandable details ── */}
			<AnimatePresence initial={false}>
				{expanded && (
					<motion.div
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						initial={{ height: 0, opacity: 0 }}
						key="details"
						style={{ overflow: "hidden" }}
						transition={{ duration: 0.25, ease: "easeInOut" }}
					>
						<div
							className="px-4 py-4"
							style={{ borderTop: "1px solid var(--color-border)" }}
						>
							{/* Top metadata grid */}
							<div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
								<DetailField
									label="Affiliation / Company"
									value={request.organization_name}
								/>
								<DetailField
									label="Affiliation / Company Category"
									value={orgLabel}
								/>
								{request.title && (
									<DetailField label="Title" value={request.title} />
								)}
								{request.company_website && (
									<DetailField
										label="Affiliation / Company Website"
										value={request.company_website}
									/>
								)}
								{request.hear_about_us && (
									<DetailField
										label="How did you hear about us?"
										value={request.hear_about_us}
									/>
								)}
								<DetailField
									label="Submitted"
									value={formatDate(request.createdAt)}
								/>
								{request.workos_user_id && (
									<DetailField
										label="WorkOS user"
										value={request.workos_user_id}
									/>
								)}
							</div>

							{/* Long-form fields */}
							<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
								<DetailField
									label="Specific Interests / Reasons for Requesting Access"
									value={request.role_or_reason}
									wrap
								/>
								{request.message && (
									<DetailField label="Message" value={request.message} wrap />
								)}
							</div>

							{/* Review notes input (pending + management) */}
							{canApprove && request.status === "pending" && (
								<div className="mt-4">
									<TextArea
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Review notes (optional)"
										rows={2}
										value={notes}
									/>
								</div>
							)}

							{/* Reviewed-by footer (resolved requests) */}
							{request.status !== "pending" && (
								<div className="mt-3">
									<Text
										as="div"
										size="1"
										style={{ color: "var(--color-caption)" }}
									>
										Reviewed by {request.reviewed_by_name ?? "—"} ·{" "}
										{formatDate(request.reviewed_at)}
										{request.review_notes ? ` — "${request.review_notes}"` : ""}
									</Text>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function FilterPill({
	active,
	label,
	count,
	accent,
	onClick,
}: {
	active: boolean;
	label: string;
	count: number;
	accent?: string;
	onClick: () => void;
}) {
	return (
		<button
			className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
			onClick={onClick}
			style={{
				cursor: "pointer",
				fontFamily: '"DM Sans", sans-serif',
				border: `1px solid ${active ? "var(--color-secondary)" : "var(--color-border)"}`,
				backgroundColor: active ? "var(--color-secondary)" : "transparent",
				color: active ? "#ffffff" : "var(--color-body)",
			}}
			type="button"
		>
			{accent && (
				<span
					className="h-2 w-2 rounded-full"
					style={{ backgroundColor: accent }}
				/>
			)}
			{label}
			<span
				className="rounded-full px-1.5 text-xs"
				style={{
					backgroundColor: active
						? "rgba(255,255,255,0.22)"
						: "color-mix(in srgb, var(--color-caption) 20%, transparent)",
					color: active ? "#ffffff" : "var(--color-caption)",
				}}
			>
				{count}
			</span>
		</button>
	);
}

export default function AccessRequestsPanel() {
	const { role } = authStatus();
	const canApprove = canApproveAccessRequests(role ?? "");
	const [filter, setFilter] = useState<FilterValue>("all");

	const flags = useFlags(["access_request_email_notifications"]) as Record<
		string,
		IFlagsmithFeature | undefined
	>;
	const showEmailSettings =
		flags["access_request_email_notifications"]?.enabled;

	const { data, isLoading, isError } = useAccessRequests();
	const requests = data ?? [];

	const counts = {
		all: requests.length,
		pending: requests.filter((r) => r.status === "pending").length,
		approved: requests.filter((r) => r.status === "approved").length,
		rejected: requests.filter((r) => r.status === "rejected").length,
	};

	const visible =
		filter === "all" ? requests : requests.filter((r) => r.status === filter);

	return (
		<div className="mt-4">
			{canApprove && showEmailSettings && <EmailRecipientsSettings />}

			<div className="mb-5 flex flex-wrap gap-2">
				{FILTERS.map((f) => (
					<FilterPill
						accent={
							f.value === "all"
								? undefined
								: STATUS_ACCENT[f.value as AccessRequestStatus]
						}
						active={filter === f.value}
						count={counts[f.value]}
						key={f.value}
						label={f.label}
						onClick={() => setFilter(f.value)}
					/>
				))}
			</div>

			{isLoading && (
				<Text size="2" style={{ color: "var(--color-body)" }}>
					Loading requests…
				</Text>
			)}
			{isError && (
				<Text color="red" size="2">
					Failed to load access requests.
				</Text>
			)}
			{!isLoading && !isError && visible.length === 0 && (
				<div
					className="rounded-xl px-6 py-10 text-center"
					style={{
						backgroundColor: "var(--color-surface)",
						border: "1px dashed var(--color-border)",
					}}
				>
					<Text as="div" size="2" style={{ color: "var(--color-body)" }}>
						{filter === "all"
							? "No access requests yet."
							: `No ${filter} requests.`}
					</Text>
				</div>
			)}

			<div className="flex flex-col gap-2">
				{visible.map((request) => (
					<RequestRow
						canApprove={canApprove}
						key={request.id}
						request={request}
					/>
				))}
			</div>
		</div>
	);
}
