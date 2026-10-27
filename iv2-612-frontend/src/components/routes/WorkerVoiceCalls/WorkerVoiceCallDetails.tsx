/**
 * Read-only view of one logged call, opened from the eye icon on the calls
 * table.
 *
 * It walks the same five steps in the same order as the entry form, so an
 * officer reading a call back recognises the shape of the form they filled in.
 * A field the officer left blank is left out rather than shown as a dash: a
 * call answers a handful of the ~40 questions, and a wall of placeholders
 * buries the few that were answered.
 *
 * Labels arrive resolved from the API as `*_name`: reading them here would
 * mean a request per lookup table, and the geography ones are parameterized by
 * their parent.
 *
 * It also opens the calls another organization referred here. Those read the
 * same way -- that is the point of the referral -- but the panel says whose
 * record it is, because the reader cannot change it.
 */
import { Cross2Icon, FileTextIcon } from "@radix-ui/react-icons";
import {
	Badge,
	Button,
	Dialog,
	Flex,
	IconButton,
	Text,
} from "@radix-ui/themes";
import type React from "react";
import { useTranslation } from "react-i18next";
import { useWorkerVoiceCase } from "$src/queries/workerVoiceCalls";
import type { WorkerVoiceCaseRecord } from "$src/services/workerVoiceCaseService";
import { formatCallDate, RISK_COLORS, RISK_LABEL_KEYS } from "./callFormatting";
import { clientTypeLabel } from "./clientTypeLabels";

interface WorkerVoiceCallDetailsProps {
	/** The call to show. `null` keeps the dialog closed. */
	callId: number | null;
	/** A call already loaded by a selected-organization adapter. */
	callOverride?: WorkerVoiceCaseRecord;
	onClose: () => void;
}

interface DetailRow {
	label: string;
	value: React.ReactNode;
	/** Free text and lists span both columns; a lookup label sits in one. */
	wide?: boolean;
}

/** A field with nothing recorded contributes no row. */
const text = (
	label: string,
	value: string | number | null | undefined,
	wide = false,
): DetailRow[] => {
	if (value === null || value === undefined || String(value).trim() === "") {
		return [];
	}
	return [{ label, value: String(value), wide }];
};

/** The same, for a value that is already rendered. */
const node = (
	label: string,
	value: React.ReactNode | null,
	wide = true,
): DetailRow[] => (value ? [{ label, value, wide }] : []);

/** One step of the form, read back. Renders nothing if the step was skipped. */
const Section: React.FC<{ rows: DetailRow[]; title: string }> = ({
	rows,
	title,
}) => {
	if (rows.length === 0) {
		return null;
	}

	return (
		<section
			className="rounded-xl border border-border p-l"
			style={{ backgroundColor: "var(--color-surface)" }}
		>
			<h3 className="mb-m font-bold text-base text-primary">{title}</h3>
			<dl className="grid grid-cols-1 gap-x-xl gap-y-m sm:grid-cols-2">
				{rows.map((row) => (
					<div
						className={row.wide ? "sm:col-span-2" : undefined}
						key={row.label}
					>
						<dt className="mb-1 font-semibold text-caption text-xs uppercase tracking-wide">
							{row.label}
						</dt>
						<dd className="whitespace-pre-wrap text-ink text-sm leading-relaxed">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
};

/** `client_origin_*` and `client_crossing_*` read as one place, not three. */
const joinPlace = (parts: Array<string | null>): string =>
	parts.filter((part): part is string => Boolean(part?.trim())).join(", ");

const WorkerVoiceCallDetails: React.FC<WorkerVoiceCallDetailsProps> = ({
	callId,
	callOverride,
	onClose,
}) => {
	const { t, i18n } = useTranslation();
	const {
		data: queriedCall,
		isLoading,
		isError,
	} = useWorkerVoiceCase(callOverride ? undefined : (callId ?? undefined));
	const call = callOverride ?? queriedCall;

	const asDate = (value: string | null) =>
		value ? formatCallDate(value, i18n.language) : null;
	const label = (key: string) => t(`workerVoicePage.view.details.${key}`);

	/** The eight contact columns, listed only where the officer filled one in. */
	const contactList = (record: WorkerVoiceCaseRecord) => {
		const filled = (
			[
				["phone", record.client_phonenumber],
				["whatsapp", record.client_whatsapp_account],
				["viber", record.client_viber_account],
				["telegram", record.client_telegram_account],
				["facebook", record.client_facebook_account],
				["line", record.client_line_account],
				["zalo", record.client_zalo_account],
				["other", record.client_other_account],
			] as const
		).filter(([, value]) => (value ?? "").trim() !== "");

		if (filled.length === 0) {
			return null;
		}

		return (
			<Flex gap="5" wrap="wrap">
				{filled.map(([channel, value]) => (
					<span key={channel}>
						<span className="mr-1 text-caption text-xs">
							{t(`workerVoiceForm.fields.contact.${channel}`)}
						</span>
						{value}
					</span>
				))}
			</Flex>
		);
	};

	/** Step 4's selections, grouped back under the tabs they were picked on. */
	const kpiList = (record: WorkerVoiceCaseRecord) => {
		if (record.kpi_details.length === 0) {
			return null;
		}

		const byCategory = new Map<string, string[]>();
		for (const kpi of record.kpi_details) {
			const category = kpi.category ?? label("uncategorizedKpis");
			byCategory.set(category, [
				...(byCategory.get(category) ?? []),
				kpi.description,
			]);
		}

		return (
			<Flex direction="column" gap="4">
				{[...byCategory].map(([category, descriptions]) => (
					<div key={category}>
						<p className="mb-1 font-semibold text-caption text-xs">
							{category}
						</p>
						<Flex gap="2" wrap="wrap">
							{descriptions.map((description) => (
								<Badge color="teal" key={description} variant="soft">
									{description}
								</Badge>
							))}
						</Flex>
					</div>
				))}
			</Flex>
		);
	};

	const attachmentList = (record: WorkerVoiceCaseRecord) => {
		if (record.attachments.length === 0) {
			return null;
		}

		return (
			<Flex direction="column" gap="2">
				{record.attachments.map((attachment) => (
					<a
						className="flex items-center gap-2 text-secondary hover:underline"
						href={attachment.file_path ?? undefined}
						key={attachment.id}
						rel="noreferrer"
						target="_blank"
					>
						<FileTextIcon className="shrink-0" />
						<span className="truncate">{attachment.name}</span>
					</a>
				))}
			</Flex>
		);
	};

	return (
		<Dialog.Root
			onOpenChange={(open) => !open && onClose()}
			open={callId !== null}
		>
			<Dialog.Content
				maxWidth="900px"
				style={{
					padding: 0,
					maxHeight: "88vh",
					display: "flex",
					flexDirection: "column",
					backgroundColor: "var(--color-bg)",
				}}
			>
				{/* Header, footer and body are laid out here rather than left to the
				    dialog's own padding so the title and Close stay put while a long
				    call scrolls between them. */}
				<div
					className="flex items-start justify-between gap-m border-border border-b px-l py-m"
					style={{ backgroundColor: "var(--color-surface)" }}
				>
					<div>
						<Dialog.Title className="mb-1 text-primary" size="5" weight="bold">
							{t("workerVoicePage.view.details.title", { id: callId })}
						</Dialog.Title>
						<Dialog.Description className="text-body" size="2">
							{call?.organization_name
								? t(
										call.shared_with_my_organization
											? "workerVoicePage.view.details.referredBy"
											: "workerVoicePage.view.details.loggedBy",
										{
											organization: call.organization_name,
											date: asDate(call.created),
										},
									)
								: t("workerVoicePage.view.details.loggedOn", {
										date: asDate(call?.created ?? null),
									})}
						</Dialog.Description>
						{call && (
							<Flex className="mt-s" gap="2" wrap="wrap">
								{/* A call another organization referred here reads the same as
							    any other, so the panel has to say whose record it is: the
							    reader can act on it but cannot change it. */}
								{call.shared_with_my_organization && (
									<Badge color="purple" variant="soft">
										{call.organization_name
											? t("workerVoicePage.view.details.sharedBy", {
													organization: call.organization_name,
												})
											: t("workerVoicePage.view.sharedBadge")}
									</Badge>
								)}
								{call.case_status_name && (
									<Badge color="teal" variant="soft">
										{call.case_status_name}
									</Badge>
								)}
								{call.worker_identification_risk_level && (
									<Badge
										color={RISK_COLORS[call.worker_identification_risk_level]}
										variant="soft"
									>
										{t(RISK_LABEL_KEYS[call.worker_identification_risk_level])}
									</Badge>
								)}
							</Flex>
						)}
					</div>
					<Dialog.Close>
						<IconButton
							aria-label={t("workerVoicePage.view.details.close")}
							color="gray"
							size="2"
							variant="ghost"
						>
							<Cross2Icon />
						</IconButton>
					</Dialog.Close>
				</div>

				<div className="flex-1 overflow-y-auto px-l py-l">
					{isLoading && (
						<Text as="p" className="text-body" size="2">
							{t("workerVoiceForm.feedback.loading")}
						</Text>
					)}

					{isError && (
						<Text as="p" className="text-red-600" role="alert" size="2">
							{t("workerVoicePage.view.details.error")}
						</Text>
					)}

					{call && (
						// Radix's gap scale is "0".."9" -- a Tailwind spacing token
						// here renders no class at all, and the cards touch.
						<Flex direction="column" gap="5">
							<Section
								rows={[
									...text(label("interactionDate"), asDate(call.interacted)),
									...text(label("nationality"), call.client_nationality_name),
									...text(label("reason"), call.interaction_reason_name),
									...text(label("officer"), call.interaction_issara_staff_name),
									...text(label("channel"), call.interaction_channel_name),
									...text(
										label("firstContact"),
										call.first_time_contacting_issara,
									),
									...text(
										label("workerType"),
										clientTypeLabel(call.client_type_name),
									),
									...text(label("summary"), call.interaction_summary, true),
								]}
								title={t("workerVoiceForm.steps.keyData")}
							/>

							<Section
								rows={[
									...text(label("workerName"), call.client_nickname),
									...text(label("gender"), call.client_gender_name),
									...text(
										label("origin"),
										joinPlace([
											call.client_origin_district_name,
											call.client_origin_province_name,
											call.client_origin_country_name,
										]),
									),
									...text(
										label("crossing"),
										joinPlace([
											call.client_crossing_district_name,
											call.client_crossing_province_name,
											call.client_crossing_country_name,
										]),
									),
									...text(label("workerInformation"), call.description, true),
									...node(label("contact"), contactList(call)),
								]}
								title={t("workerVoiceForm.steps.workerInfo")}
							/>

							<Section
								rows={[
									...text(label("monthsAtWorkplace"), call.client_time_at_job),
									...text(
										label("contractType"),
										call.client_contract_type_name,
									),
									...text(
										label("documentType"),
										call.client_document_type_name,
									),
									...text(label("employerDebtBondage"), call.debt_bondage),
									...text(
										label("employerDebtBondageDetail"),
										call.debt_bondage === "Yes"
											? call.debt_bondage_detail
											: null,
										true,
									),
									...text(label("brokerDebtBondage"), call.debt_bondage_broker),
									...text(
										label("brokerDebtBondageDetail"),
										call.debt_bondage_broker === "Yes"
											? call.debt_bondage_detail_broker
											: null,
										true,
									),
								]}
								title={t("workerVoiceForm.steps.recruitmentInfo")}
							/>

							<Section
								rows={[
									...text(
										label("workersAffected"),
										call.issue_workers_affected,
									),
									...text(
										label("situationImproving"),
										call.issue_getting_better,
									),
									...text(
										label("issueDescription"),
										call.issue_description,
										true,
									),
									...text(
										label("situationImprovingDescription"),
										call.issue_getting_better_description,
										true,
									),
									...node(label("issueCategories"), kpiList(call)),
								]}
								title={t("workerVoiceForm.steps.issueDetails")}
							/>

							<Section
								rows={[
									...text(
										label("shareInfoConsent"),
										call.client_share_info_consent,
									),
									...text(
										label("discussAnonymously"),
										call.consent_to_discuss_with_employer_anonymously === null
											? null
											: t(
													call.consent_to_discuss_with_employer_anonymously
														? "workerVoiceForm.options.yesNo.yes"
														: "workerVoiceForm.options.yesNo.no",
												),
									),
									// Shown as a badge in the header too, but only there it has no
									// label saying which question it answers -- and the header
									// badge is easy to miss above a long panel.
									...text(
										label("riskLevel"),
										call.worker_identification_risk_level
											? t(
													RISK_LABEL_KEYS[
														call.worker_identification_risk_level
													],
												)
											: null,
									),
									...text(label("referralAction"), call.referral_action_name),
									// Only set under the partner-referral action, and `text`
									// drops an empty row, so it shows on exactly those calls.
									...text(label("referralOrg"), call.refer_to_org_name),
									...text(
										label("nextStepsOfficer"),
										call.next_steps_issara_staff_name,
									),
									...text(label("deadline"), asDate(call.dead_line_date)),
									...text(label("urgentNeeds"), call.vot_needs, true),
									...text(label("nextSteps"), call.next_steps, true),
									...text(label("finalRemarks"), call.final_remarks, true),
									...text(
										label("safeguardsRemarks"),
										call.safeguards_remarks,
										true,
									),
									...node(label("attachments"), attachmentList(call)),
								]}
								title={t("workerVoiceForm.steps.supportActions")}
							/>
						</Flex>
					)}
				</div>

				<Flex
					className="border-border border-t px-l py-m"
					justify="end"
					style={{ backgroundColor: "var(--color-surface)" }}
				>
					<Dialog.Close>
						<Button color="gray" variant="soft">
							{t("workerVoicePage.view.details.close")}
						</Button>
					</Dialog.Close>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};

export default WorkerVoiceCallDetails;
