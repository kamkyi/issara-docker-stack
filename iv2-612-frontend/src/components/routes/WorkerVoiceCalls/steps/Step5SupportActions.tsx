import { FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCsoAudience } from "$src/hooks/useCsoAudience";
import { useCaseStatuses, useReferralOrgs } from "$src/queries/caseLookups";
import { useReferralActions } from "$src/queries/referralActions";
import { useUsers } from "$src/queries/users";
import type { RiskLevel, YesNo } from "$src/services/workerVoiceCaseService";
import { RISK_LABEL_KEYS } from "../callFormatting";
import {
	ChoiceGroup,
	DateInput,
	Field,
	LookupSelect,
	TextArea,
} from "../fields";
import { REFERRAL_TO_PARTNER_ORG_ACTION_ID } from "../formModel";
import { errorFor, type StepProps, StepShell } from "./StepShell";

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const formatBytes = (bytes: number) =>
	bytes >= 1024 * 1024
		? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
		: `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** `SharedFile.size` is stored as a string of bytes, and may be empty. */
const savedFileSize = (size: string) => {
	const bytes = Number(size);
	return Number.isFinite(bytes) && bytes > 0 ? formatBytes(bytes) : "";
};

const Step5SupportActions: React.FC<StepProps> = ({
	formData,
	update,
	missing,
}) => {
	const { t } = useTranslation();
	const uploadId = useId();
	const [isDragging, setIsDragging] = useState(false);
	const { data: caseStatuses = [] } = useCaseStatuses();
	const { data: referralActions } = useReferralActions("en", { csoOnly: true });
	const { data: referralOrgs = [] } = useReferralOrgs();
	// Same people-picker as step 1, and it follows the same view: the officers
	// of the signed-in account's own organization when the CSO UI is on screen.
	const csoOnly = useCsoAudience();
	const { data: users } = useUsers({ csoOnly });

	const isPartnerReferral =
		formData.referralActionId === REFERRAL_TO_PARTNER_ORG_ACTION_ID;

	const toOptions = (response: unknown) => {
		const results = (
			response as { results?: Array<{ id: number; name: string }> }
		)?.results;
		if (Array.isArray(results)) {
			return results;
		}
		return Array.isArray(response)
			? (response as Array<{ id: number; name: string }>)
			: [];
	};

	const officerOptions = toOptions(users).map((user) => {
		const named = user as unknown as {
			id: number;
			first_name?: string;
			last_name?: string;
			username?: string;
			email?: string;
		};
		const fullName = [named.first_name, named.last_name]
			.filter(Boolean)
			.join(" ")
			.trim();
		return {
			id: named.id,
			name: fullName || named.username || named.email || String(named.id),
		};
	});

	const yesNoOptions: Array<{ value: YesNo; label: string }> = [
		{ value: "Yes", label: t("workerVoiceForm.options.yesNo.yes") },
		{ value: "No", label: t("workerVoiceForm.options.yesNo.no") },
	];

	// The worker's *personal* risk level, which is the Low/Medium/High scale
	// ILM-fronted's risk bar writes and the one this column has always held.
	//
	// "Early warning" and "Forced labor risk" are deliberately not offered:
	// they classify the issue, not the person, and the table derives them from
	// the levels of the KPIs picked on step 4. A call already saved with one of
	// them still round-trips through here untouched -- the note below says what
	// is recorded -- and the column still accepts them, so nothing written
	// before this change was lost.
	const riskOptions: Array<{ value: RiskLevel; label: string }> = [
		{ value: "LOW", label: t("workerVoiceForm.options.risk.low") },
		{ value: "MEDIUM", label: t("workerVoiceForm.options.risk.medium") },
		{ value: "HIGH", label: t("workerVoiceForm.options.risk.high") },
	];

	// A call saved on a value this form no longer offers would otherwise show
	// every pill unselected, reading as "nothing recorded" when something is.
	// Say what is there; the value stays unless the officer picks one above.
	const legacyRisk =
		formData.riskLevel &&
		!riskOptions.some((option) => option.value === formData.riskLevel)
			? formData.riskLevel
			: null;

	const addFiles = (fileList: FileList | null) => {
		if (!fileList) {
			return;
		}
		const accepted = Array.from(fileList).filter((file) => {
			const name = file.name.toLowerCase();
			return (
				ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension)) &&
				file.size <= MAX_ATTACHMENT_BYTES
			);
		});
		update("attachments", [...formData.attachments, ...accepted]);
	};

	// Files already saved against the call, less the ones removed in this
	// sitting -- the removal only reaches the server when the form is saved.
	const savedAttachments = formData.existingAttachments.filter(
		(attachment) => !formData.removedAttachmentIds.includes(attachment.id),
	);

	return (
		<StepShell title={t("workerVoiceForm.steps.supportActions")}>
			<Field label={t("workerVoiceForm.fields.urgentNeeds.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("urgentNeeds", value)}
						placeholder={t("workerVoiceForm.fields.urgentNeeds.placeholder")}
						rows={3}
						value={formData.urgentNeeds}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.shareInfoConsent.label")}>
				{() => (
					<ChoiceGroup
						name="shareInfoConsent"
						onChange={(value) => update("shareInfoConsent", value)}
						options={yesNoOptions}
						value={formData.shareInfoConsent}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.discussAnonymously.label")}>
				{() => (
					<ChoiceGroup
						name="discussAnonymouslyConsent"
						onChange={(value) => update("discussAnonymouslyConsent", value)}
						options={yesNoOptions}
						value={formData.discussAnonymouslyConsent}
					/>
				)}
			</Field>

			<Field
				hint={
					legacyRisk
						? t("workerVoiceForm.fields.riskLevel.legacyHint", {
								level: t(RISK_LABEL_KEYS[legacyRisk]),
							})
						: undefined
				}
				label={t("workerVoiceForm.fields.riskLevel.label")}
			>
				{() => (
					<ChoiceGroup
						name="riskLevel"
						onChange={(value) => update("riskLevel", value)}
						options={riskOptions}
						value={formData.riskLevel}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.caseStatus.label")}>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("caseStatusId", value)}
						options={caseStatuses}
						placeholder={t("workerVoiceForm.fields.caseStatus.placeholder")}
						value={formData.caseStatusId}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.referralAction.label")}>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => {
							update("referralActionId", value);
							// The organization only belongs to the partner referral, so
							// moving off that action drops it rather than leaving a stale
							// one to be saved -- it is what routes the case to that org.
							if (value !== REFERRAL_TO_PARTNER_ORG_ACTION_ID) {
								update("referToOrgId", null);
							}
						}}
						options={toOptions(referralActions)}
						placeholder={t("workerVoiceForm.fields.referralAction.placeholder")}
						value={formData.referralActionId}
					/>
				)}
			</Field>

			{/* Which partner organization the referral went to. Hidden until the
			    action that names one is chosen, and required from then on: it is
			    the receiving organization's only route to seeing the case. */}
			{isPartnerReferral && (
				<Field
					error={errorFor(
						missing,
						"workerVoiceForm.fields.referralOrg.label",
						t("workerVoiceForm.validation.required"),
					)}
					hint={t("workerVoiceForm.fields.referralOrg.hint")}
					label={t("workerVoiceForm.fields.referralOrg.label")}
					required
				>
					{(controlId) => (
						<LookupSelect
							controlId={controlId}
							invalid={missing.includes(
								"workerVoiceForm.fields.referralOrg.label",
							)}
							onChange={(value) => update("referToOrgId", value)}
							options={referralOrgs}
							placeholder={t("workerVoiceForm.fields.referralOrg.placeholder")}
							value={formData.referToOrgId}
						/>
					)}
				</Field>
			)}

			<Field label={t("workerVoiceForm.fields.nextSteps.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("nextSteps", value)}
						placeholder={t("workerVoiceForm.fields.nextSteps.placeholder")}
						rows={3}
						value={formData.nextSteps}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.nextStepsOfficer.label")}>
				{(controlId) => (
					<LookupSelect
						controlId={controlId}
						onChange={(value) => update("nextStepsOfficerId", value)}
						options={officerOptions}
						placeholder={t(
							"workerVoiceForm.fields.nextStepsOfficer.placeholder",
						)}
						value={formData.nextStepsOfficerId}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.deadline.label")}>
				{(controlId) => (
					<DateInput
						controlId={controlId}
						onChange={(value) => update("deadlineDate", value)}
						placeholder={t(
							"workerFeedbackForm.requiredStep.placeholders.interactionDate",
						)}
						value={formData.deadlineDate}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.finalRemarks.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("finalRemarks", value)}
						placeholder={t("workerVoiceForm.fields.finalRemarks.placeholder")}
						rows={3}
						value={formData.finalRemarks}
					/>
				)}
			</Field>

			<Field label={t("workerVoiceForm.fields.safeguardsRemarks.label")}>
				{(controlId) => (
					<TextArea
						controlId={controlId}
						onChange={(value) => update("safeguardsRemarks", value)}
						placeholder={t(
							"workerVoiceForm.fields.safeguardsRemarks.placeholder",
						)}
						rows={3}
						value={formData.safeguardsRemarks}
					/>
				)}
			</Field>

			<div className="flex flex-col gap-2">
				<span className="mb-0_5 text-sm font-bold">
					{t("workerVoiceForm.attachments.label")}
				</span>

				{/* The zone is the label, so a click or a keyboard focus opens the
				    file dialog natively -- no click handler on a plain div. */}
				<label
					className="wv-dropzone"
					data-dragging={isDragging}
					htmlFor={uploadId}
					onDragLeave={() => setIsDragging(false)}
					onDragOver={(event) => {
						event.preventDefault();
						setIsDragging(true);
					}}
					onDrop={(event) => {
						event.preventDefault();
						setIsDragging(false);
						addFiles(event.dataTransfer.files);
					}}
				>
					<span className="wv-dropzone-icon">
						<UploadIcon />
					</span>
					<span className="wv-dropzone-title">
						{t("workerVoiceForm.attachments.description")}
					</span>
					<span className="wv-dropzone-hint">
						{t("workerVoiceForm.attachments.supportedFormats")}
					</span>
					<input
						accept={ACCEPTED_EXTENSIONS.join(",")}
						aria-label={t("workerVoiceForm.attachments.label")}
						className="sr-only"
						id={uploadId}
						multiple
						onChange={(event) => {
							addFiles(event.target.files);
							// Let the same file be re-picked after it is removed.
							event.target.value = "";
						}}
						type="file"
					/>
				</label>

				{savedAttachments.length > 0 && (
					<ul className="flex flex-col gap-1.5">
						{savedAttachments.map((attachment) => {
							const size = savedFileSize(attachment.size);
							const label = (
								<>
									<FileTextIcon className="wv-file-icon shrink-0" />
									<span className="truncate">{attachment.name}</span>
									{size && (
										<span className="wv-file-size shrink-0">{size}</span>
									)}
								</>
							);

							return (
								<li className="wv-file-row" key={attachment.id}>
									{attachment.file_path ? (
										<a
											className="flex min-w-0 items-center gap-2 hover:underline"
											href={attachment.file_path}
											rel="noreferrer"
											target="_blank"
										>
											{label}
										</a>
									) : (
										<span className="flex min-w-0 items-center gap-2">
											{label}
										</span>
									)}
									<button
										className="wv-file-remove"
										onClick={() =>
											update("removedAttachmentIds", [
												...formData.removedAttachmentIds,
												attachment.id,
											])
										}
										type="button"
									>
										{t("workerVoiceForm.attachments.remove")}
									</button>
								</li>
							);
						})}
					</ul>
				)}

				{formData.attachments.length > 0 && (
					<ul className="flex flex-col gap-1.5">
						{formData.attachments.map((file, index) => (
							<li
								className="wv-file-row"
								key={`${file.name}-${file.lastModified}`}
							>
								<span className="flex min-w-0 items-center gap-2">
									<FileTextIcon className="wv-file-icon shrink-0" />
									<span className="truncate">{file.name}</span>
									<span className="wv-file-size shrink-0">
										{formatBytes(file.size)}
									</span>
								</span>
								<button
									className="wv-file-remove"
									onClick={() =>
										update(
											"attachments",
											formData.attachments.filter(
												(_, fileIndex) => fileIndex !== index,
											),
										)
									}
									type="button"
								>
									{t("workerVoiceForm.attachments.remove")}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</StepShell>
	);
};

export default Step5SupportActions;
