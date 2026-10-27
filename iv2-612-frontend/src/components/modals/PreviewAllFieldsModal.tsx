import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, FileTextIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { ServerAttachment } from "$src/services/workerFeedbackGrievanceService";

interface GrievanceSummary {
	caseId: number;
	dateReceived: string;
	issueCategories: string;
	affectedWorkers: string;
	currentStatus: string;
	issueDescription: string;
	assignedStaff?: string[];
	deadline?: string;
	nextSteps?: string;
}

interface PreviewAllFieldsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit?: () => void;
	data: Record<string, any>;
	summary?: GrievanceSummary;
	existingAttachments?: ServerAttachment[];
	newAttachments?: File[];
	removedAttachmentIds?: number[];
	isSubmitting?: boolean;
}

const formatBytes = (raw: string | number) => {
	const bytes = typeof raw === "number" ? raw : Number(raw);
	if (!Number.isFinite(bytes) || bytes <= 0) return "";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.min(
		units.length - 1,
		Math.floor(Math.log(bytes) / Math.log(1024)),
	);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

// Translator type matches react-i18next's t signature (subset).
type T = (key: string, options?: Record<string, unknown>) => string;

const getText = (value: unknown, t: T, fallback?: string) => {
	const fb = fallback ?? t("Not specified");
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : fb;
	}

	if (
		value &&
		typeof value === "object" &&
		"value" in value &&
		typeof value.value === "string"
	) {
		const trimmed = value.value.trim();
		return trimmed.length > 0 ? trimmed : fb;
	}

	return fb;
};

const getBooleanAnswer = (value: unknown, t: T) => {
	if (value === true || value === "true" || value === "yes") {
		return t("Yes");
	}

	if (value === false || value === "false" || value === "no") {
		return t("No");
	}

	return t("Not specified");
};

const getEthicalAnswer = (value: unknown, t: T) => {
	if (value === true || value === "true" || value === "yes") {
		return t("Yes");
	}

	if (
		value === false ||
		value === "false" ||
		value === "no" ||
		value === "not_yet" ||
		value === "not_necessary"
	) {
		return t("No");
	}

	return t("Not specified");
};

const getWorkerCommunicationAnswer = (value: unknown, t: T) => {
	if (value === true || value === "true" || value === "yes") {
		return t("Yes");
	}

	if (
		value === false ||
		value === "false" ||
		value === "no" ||
		value === "not_yet" ||
		value === "not_necessary"
	) {
		return t("No");
	}

	return t("Not specified");
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
				{label}
			</p>
			<div className="text-[1.05rem] text-gray-800">{value}</div>
		</div>
	);
}

function SectionCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<h3 className="text-[1.05rem] font-semibold text-gray-800">{title}</h3>
			<div className="rounded-2xl border border-gray-200 bg-[#f7f7fb] px-5 py-5 shadow-sm">
				{children}
			</div>
		</section>
	);
}

const PreviewAllFieldsModal: React.FC<PreviewAllFieldsModalProps> = ({
	isOpen,
	onClose,
	onSubmit,
	data,
	summary,
	existingAttachments = [],
	newAttachments = [],
	removedAttachmentIds = [],
	isSubmitting = false,
}) => {
	const { t } = useTranslation();
	const visibleExistingAttachments = existingAttachments.filter(
		(attachment) => !removedAttachmentIds.includes(attachment.id),
	);
	const removedExistingAttachments = existingAttachments.filter((attachment) =>
		removedAttachmentIds.includes(attachment.id),
	);
	const hasAttachmentInfo =
		visibleExistingAttachments.length > 0 ||
		newAttachments.length > 0 ||
		removedExistingAttachments.length > 0;
	const hasMonitoringDetails =
		getText(data.remediation?.description, t, "") !== "" ||
		getText(data.system_strengthening?.description, t, "") !== "";
	const assignedStaff = Array.isArray(summary?.assignedStaff)
		? summary.assignedStaff.filter((value) => value.trim().length > 0)
		: [];

	return (
		<Dialog.Root onOpenChange={onClose} open={isOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
				<Dialog.Content className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-3xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl md:w-[min(92vw,56rem)]">
					<div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 md:px-6">
						<Dialog.Title className="text-[1.1rem] font-semibold text-gray-900 md:text-[1.2rem]">
							{t("Grievance Details")}
						</Dialog.Title>
						<Dialog.Close asChild>
							<button
								aria-label={t("Close")}
								className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
							>
								<Cross2Icon className="h-5 w-5" />
							</button>
						</Dialog.Close>
					</div>

					<div className="flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
						<div className="space-y-10">
							<SectionCard title={t("FEEDBACK/ISSUE OVERVIEW")}>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field
										label={t("CASE ID")}
										value={summary?.caseId ?? t("Not specified")}
									/>
									<Field
										label={t("DATE RECEIVED")}
										value={summary?.dateReceived || t("Not specified")}
									/>
									<Field
										label={t("ISSUE CATEGORIES")}
										value={summary?.issueCategories || t("Not specified")}
									/>
									<Field
										label={t("AFFECTED WORKERS")}
										value={summary?.affectedWorkers || t("Not specified")}
									/>
									<Field
										label={t("CURRENT STATUS")}
										value={summary?.currentStatus || t("Not specified")}
									/>
									<Field
										label={t("ISSUE DESCRIPTION")}
										value={summary?.issueDescription || t("Not specified")}
									/>
								</div>
							</SectionCard>

							<SectionCard title={t("Information Collection")}>
								<div className="space-y-4">
									<Field
										label={t("CHECKED WITH HR TEAM FOR SIMILAR ISSUES")}
										value={getBooleanAnswer(data.check_with_hr, t)}
									/>
									<Field
										label={t("IS THIS A REPEAT ISSUE")}
										value={getBooleanAnswer(data.repeat_issue, t)}
									/>
									<Field
										label={t("ADDITIONAL NOTES")}
										value={getText(data.information_collection_notes, t)}
									/>
									<Field
										label={t("ADDITIONAL ATTACHMENTS")}
										value={
											hasAttachmentInfo ? (
												<ul className="space-y-2">
													{visibleExistingAttachments.map((attachment) => (
														<li
															className="flex items-center gap-2 text-sm"
															key={`existing-${attachment.id}`}
														>
															<FileTextIcon className="shrink-0 text-[#3f51d6]" />
															{attachment.file_path ? (
																<a
																	className="text-[#3f51d6] hover:underline"
																	href={attachment.file_path}
																	rel="noopener noreferrer"
																	target="_blank"
																>
																	{attachment.name}
																</a>
															) : (
																<span>{attachment.name}</span>
															)}
															{attachment.size && (
																<span className="text-xs text-gray-500">
																	({formatBytes(attachment.size)})
																</span>
															)}
														</li>
													))}
													{newAttachments.map((file, index) => (
														<li
															className="flex items-center gap-2 text-sm"
															key={`new-${file.name}-${index}`}
														>
															<FileTextIcon className="shrink-0 text-emerald-600" />
															<span>{file.name}</span>
															<span className="text-xs text-emerald-600">
																({formatBytes(file.size)}) ·{" "}
																{t("Pending upload")}
															</span>
														</li>
													))}
													{removedExistingAttachments.map((attachment) => (
														<li
															className="flex items-center gap-2 text-sm opacity-60"
															key={`removed-${attachment.id}`}
														>
															<FileTextIcon className="shrink-0 text-gray-400" />
															<span className="line-through">
																{attachment.name}
															</span>
															<span className="text-xs text-rose-500">
																{t("Will be removed")}
															</span>
														</li>
													))}
												</ul>
											) : (
												t("No attachments")
											)
										}
									/>
								</div>
							</SectionCard>

							<SectionCard title={t("Safeguarding Affected Workers")}>
								<div className="space-y-4">
									<Field
										label={t("ZERO TOLERANCE OF RETALIATION BEING FOLLOWED")}
										value={getBooleanAnswer(data.zero_tolerance, t)}
									/>
									<Field
										label={t(
											"REVIEWED INDIVIDUALS AND CONDUCTED RISK ASSESSMENT",
										)}
										value={getBooleanAnswer(data.reviewed_individual, t)}
									/>
									<Field
										label={t(
											"REVIEWED INDIVIDUALS INVOLVED IN GRIEVANCE INVESTIGATION",
										)}
										value={getBooleanAnswer(data.involved_in_grievance, t)}
									/>
									<Field
										label={t("SAFEGUARDING NOTES")}
										value={getText(data.safeguarding_notes, t)}
									/>
								</div>
							</SectionCard>

							<SectionCard title={t("Ensuring an Ethical Investigation")}>
								<div className="space-y-4">
									<Field
										label={t("INVESTIGATION PLAN FOLLOWS ETHICAL GUIDELINES")}
										value={getEthicalAnswer(data.ethical_reviewed?.value, t)}
									/>
									<Field
										label={t("INVESTIGATION CONDUCTED PROFESSIONALLY")}
										value={getEthicalAnswer(
											data.professional_ensured?.value,
											t,
										)}
									/>
									<Field
										label={t("INVESTIGATION IS IMPARTIAL")}
										value={getEthicalAnswer(data.impartial_ensured?.value, t)}
									/>
									<Field
										label={t("INVESTIGATION PROCESS INCLUSIVE AND ACCESSIBLE")}
										value={getEthicalAnswer(
											data.inclusive_and_accessible?.value,
											t,
										)}
									/>
									<Field
										label={t("INVESTIGATION CONDUCTED TIMELY AND EFFECTIVELY")}
										value={getEthicalAnswer(
											data.timely_and_effective?.value,
											t,
										)}
									/>
									<Field
										label={t("INVESTIGATION NOTES")}
										value={getText(data.ethical_investigation_notes, t)}
									/>
								</div>
							</SectionCard>

							<SectionCard
								title={t("Communicating with Workers Reporting Issues")}
							>
								<div className="space-y-4">
									<Field
										label={t(
											"COMMUNICATED WITH AFFECTED WORKERS ABOUT WELLBEING",
										)}
										value={getWorkerCommunicationAnswer(
											data.investigation_their_wellbeing?.value,
											t,
										)}
									/>
									<Field
										label={t("NEED HELP WITH COMPLEX CONSEQUENCES")}
										value={getBooleanAnswer(
											data.need_help_with_complex_consequences,
											t,
										)}
									/>
									<Field
										label={t("COMMUNICATION NOTES")}
										value={getText(data.communication_notes, t)}
									/>
								</div>
							</SectionCard>

							<SectionCard title={t("Monitoring and Communicating Findings")}>
								{hasMonitoringDetails ? (
									<div className="space-y-4">
										<Field
											label={t("REMEDIATION ACTIONS")}
											value={getText(data.remediation?.description, t)}
										/>
										<Field
											label={t("SYSTEM STRENGTHENING MEASURES")}
											value={getText(data.system_strengthening?.description, t)}
										/>
									</div>
								) : (
									<p className="italic text-gray-400">
										{t("No monitoring information available yet.")}
									</p>
								)}
							</SectionCard>

							<SectionCard title={t("Training Requirements")}>
								<div className="space-y-5">
									<Field
										label={t("SELECTED TRAININGS")}
										value={
											Array.isArray(data.trainings) &&
											data.trainings.length > 0 ? (
												<div className="space-y-2">
													{data.trainings.map((training: string) => (
														<div key={training}>{t(training)}</div>
													))}
												</div>
											) : (
												t("None selected")
											)
										}
									/>
									<div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
										<div className="space-y-4">
											<p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
												{t("CURRENT ACTION ITEMS")}
											</p>
											<Field
												label={t("ASSIGNED STAFF")}
												value={
													assignedStaff.length > 0 ? (
														<div className="space-y-1">
															{assignedStaff.map((staff) => (
																<div key={staff}>{staff}</div>
															))}
														</div>
													) : (
														t("Not specified")
													)
												}
											/>
											<Field
												label={t("DEADLINE")}
												value={summary?.deadline || t("Not specified")}
											/>
											<Field
												label={t("NEXT STEPS")}
												value={summary?.nextSteps || t("No next steps defined")}
											/>
										</div>
									</div>
								</div>
							</SectionCard>
						</div>
					</div>
					<div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 md:px-6">
						<Dialog.Close asChild>
							<button
								className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isSubmitting}
							>
								{t("Close")}
							</button>
						</Dialog.Close>
						{onSubmit ? (
							<button
								className="rounded-lg border border-[#67b95a] bg-[#67b95a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5aa54e] disabled:cursor-not-allowed disabled:opacity-60"
								disabled={isSubmitting}
								onClick={onSubmit}
								type="button"
							>
								{isSubmitting ? t("Submitting…") : t("Submit")}
							</button>
						) : null}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default PreviewAllFieldsModal;
