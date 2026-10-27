import { useEffect, useId, useMemo, useState } from "react";
import type { BoardDoc, PostType } from "$src/assets/mock/message-board";
import {
	type ExistingAttachment,
	MultiFileDropzone,
	newStagedId,
	type StagedFile,
} from "$src/components/MultiFileDropzone";
import { RichTextEditor } from "$src/components/messageBoard/RichTextEditor";
import { showToast } from "$src/components/toast/toastUtil";
import { useStrategicPartners } from "$src/hooks/useStrategicPartner";
import type { PostFormValues } from "$src/queries/useMessageBoardMutations";
import {
	messageHtmlToPlainText,
	sanitizeMessageHtml,
} from "$src/utils/messageBoardRichText";
import {
	AudienceSelector,
	type AudienceValue,
	audienceLabel,
} from "./AudienceSelector";
import { ComposerPreview, type PreviewData } from "./ComposerPreview";
import { I } from "./icons";

export interface ComposerInitial {
	post_type?: PostType;
	title?: string;
	description?: string;
	strategic_partner?: number | null;
	audience_all?: boolean;
	audience_grouping?: string | null;
	audience_partner_ids?: number[] | null;
	pinned?: boolean;
	ack_required?: boolean;
	ack_by?: string | null;
	event_starts_at?: string | null;
	event_location?: string | null;
	image_url?: string | null;
	existing_attachments?: ExistingAttachment[];
}

interface ComposerModalProps {
	open: boolean;
	mode: "create" | "edit";
	initial?: ComposerInitial;
	onClose: () => void;
	onPublish: (values: PostFormValues) => void;
	onSaveDraft: (values: PostFormValues) => void;
	submitting?: boolean;
}

const TYPES: Array<{ key: PostType; label: string; icon: keyof typeof I }> = [
	{ key: "announcement", label: "Announcement", icon: "bell" },
	{ key: "report", label: "Document", icon: "doc" },
	{ key: "event", label: "Event", icon: "cal" },
];

// Create-mode drafts are mirrored to localStorage so a stray backdrop click or
// a page reload no longer wipes an in-progress message (the reported bug).
const DRAFT_KEY = "mb-composer-draft-v1";

interface PersistedDraft {
	postType: PostType;
	title: string;
	description: string;
	audienceVal: AudienceValue;
	pinned: boolean;
	ackRequired: boolean;
	ackBy: string;
	evDate: string;
	evTime: string;
	eventLocation: string;
}

const readStoredDraft = (): PersistedDraft | null => {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		return raw ? (JSON.parse(raw) as PersistedDraft) : null;
	} catch {
		return null;
	}
};

const writeStoredDraft = (draft: PersistedDraft) => {
	try {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	} catch {
		// Best-effort; a full/blocked localStorage must not break composing.
	}
};

const clearStoredDraft = () => {
	try {
		localStorage.removeItem(DRAFT_KEY);
	} catch {
		// ignore
	}
};

const splitDateTime = (iso: string | null | undefined) => {
	if (!iso) return { date: "", time: "" };
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return { date: "", time: "" };
	const pad = (n: number) => String(n).padStart(2, "0");
	return {
		date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
		time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
	};
};

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const docKindFromName = (name: string): "pdf" | "xls" | "other" => {
	const n = name.toLowerCase();
	if (n.endsWith(".pdf")) return "pdf";
	if (n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv"))
		return "xls";
	return "other";
};

export function ComposerModal({
	open,
	mode,
	initial,
	onClose,
	onPublish,
	onSaveDraft,
	submitting,
}: ComposerModalProps) {
	const { data: spData, isLoading: spLoading } = useStrategicPartners();
	const partners = useMemo(
		() => (Array.isArray(spData) ? spData : []),
		[spData],
	);

	const titleInputId = useId();
	const bodyInputId = useId();
	const ackByInputId = useId();
	const imageInputId = useId();
	const attachInputId = useId();
	const evDateInputId = useId();
	const evTimeInputId = useId();
	const evWhereInputId = useId();

	const [postType, setPostType] = useState<PostType>("announcement");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [audienceVal, setAudienceVal] = useState<AudienceValue>({
		kind: "all",
	});
	const [pinned, setPinned] = useState(false);
	const [ackRequired, setAckRequired] = useState(false);
	const [ackBy, setAckBy] = useState("");
	const [evDate, setEvDate] = useState("");
	const [evTime, setEvTime] = useState("");
	const [eventLocation, setEventLocation] = useState("");
	const [image, setImage] = useState<File | null>(null);
	const [removeImage, setRemoveImage] = useState(false);
	const [stagedAttachments, setStagedAttachments] = useState<StagedFile[]>([]);
	const [existingAttachments, setExistingAttachments] = useState<
		ExistingAttachment[]
	>([]);
	const [removedExistingIds, setRemovedExistingIds] = useState<number[]>([]);
	// Which footer button kicked off the in-flight save, so the spinner sits on
	// the button the user actually clicked (Save draft vs Publish).
	const [pendingAction, setPendingAction] = useState<
		"draft" | "publish" | null
	>(null);
	const [fullscreen, setFullscreen] = useState(false);

	// Clear the pending marker once the request settles. On success the modal
	// closes; on error it stays open and the buttons become clickable again.
	useEffect(() => {
		if (!submitting) setPendingAction(null);
	}, [submitting]);

	useEffect(() => {
		if (!open) setFullscreen(false);
	}, [open]);

	// (Re)seed the form whenever the modal opens (create ⇒ blank, edit ⇒ initial).
	useEffect(() => {
		if (!open) return;
		const { date, time } = splitDateTime(initial?.event_starts_at);
		setPostType(initial?.post_type ?? "announcement");
		setTitle(initial?.title ?? "");
		setDescription(initial?.description ?? "");
		if (initial?.audience_grouping) {
			setAudienceVal({
				kind: "group",
				grouping: initial.audience_grouping,
				partnerIds: initial.audience_partner_ids ?? null,
			});
		} else if (
			initial?.audience_partner_ids &&
			initial.audience_partner_ids.length > 0
		) {
			// Custom multi-select (individual partners, no grouping): restore the
			// exact hand-picked ids so editing a saved draft never silently reverts
			// to a broadcast.
			setAudienceVal({
				kind: "custom",
				partnerIds: initial.audience_partner_ids,
			});
		} else if (initial?.audience_all) {
			setAudienceVal({ kind: "all" });
		} else if (initial?.strategic_partner) {
			setAudienceVal({
				kind: "custom",
				partnerIds: [initial.strategic_partner],
			});
		} else {
			setAudienceVal({ kind: "all" });
		}
		setPinned(!!initial?.pinned);
		setAckRequired(!!initial?.ack_required);
		setAckBy(initial?.ack_by ?? "");
		setEvDate(date);
		setEvTime(time);
		setEventLocation(initial?.event_location ?? "");
		setImage(null);
		setRemoveImage(false);
		setStagedAttachments([]);
		setExistingAttachments(initial?.existing_attachments ?? []);
		setRemovedExistingIds([]);

		// Restore an unsaved create-mode draft (text fields only; files can't be
		// persisted). This overrides the blank defaults above.
		if (mode === "create") {
			const draft = readStoredDraft();
			if (draft) {
				setPostType(draft.postType);
				setTitle(draft.title);
				setDescription(draft.description);
				setAudienceVal(draft.audienceVal);
				setPinned(draft.pinned);
				setAckRequired(draft.ackRequired);
				setAckBy(draft.ackBy);
				setEvDate(draft.evDate);
				setEvTime(draft.evTime);
				setEventLocation(draft.eventLocation);
			}
		}
	}, [open, mode]);

	// Debounced mirror of the create-mode draft to localStorage.
	useEffect(() => {
		if (!open || mode !== "create") return;
		const t = setTimeout(() => {
			writeStoredDraft({
				postType,
				title,
				description,
				audienceVal,
				pinned,
				ackRequired,
				ackBy,
				evDate,
				evTime,
				eventLocation,
			});
		}, 400);
		return () => clearTimeout(t);
	}, [
		open,
		mode,
		postType,
		title,
		description,
		audienceVal,
		pinned,
		ackRequired,
		ackBy,
		evDate,
		evTime,
		eventLocation,
	]);

	const collectValues = (status: "draft" | "published"): PostFormValues => {
		const startIso =
			postType === "event" && evDate
				? new Date(`${evDate}T${evTime || "00:00"}`).toISOString()
				: null;
		const attachmentIdsChanged = removedExistingIds.length > 0;
		// Resolve a grouping selection to its concrete partner ids so the audience
		// is always stored explicitly (a snapshot). A whole-group selection
		// (partnerIds === null) is expanded to every partner currently in that
		// grouping; this keeps ack_total / roster / visibility correct even though
		// the partner list and Django live in different databases.
		const groupPartnerIds = (grouping: string, picked: number[] | null) =>
			picked ??
			partners
				.filter((p) => p.strategic_partner_grouping === grouping)
				.map((p) => p.id);
		const audienceFields: Pick<
			import("$src/queries/useMessageBoardMutations").PostFormValues,
			| "strategic_partner"
			| "strategic_partner_all"
			| "audience_grouping"
			| "audience_partner_ids"
		> =
			audienceVal.kind === "all"
				? { strategic_partner_all: true }
				: audienceVal.kind === "group"
					? {
							audience_grouping: audienceVal.grouping,
							audience_partner_ids: groupPartnerIds(
								audienceVal.grouping,
								audienceVal.partnerIds,
							),
						}
					: audienceVal.partnerIds.length === 1
						? { strategic_partner: audienceVal.partnerIds[0] }
						: {
								audience_grouping: null,
								audience_partner_ids: audienceVal.partnerIds,
							};
		return {
			post_type: postType,
			title: title.trim(),
			description: sanitizeMessageHtml(description),
			name: title.trim(),
			status,
			...audienceFields,
			pinned,
			ack_required: ackRequired,
			ack_by: ackRequired ? ackBy || null : null,
			event_starts_at: startIso,
			event_ends_at: null,
			event_location: postType === "event" ? eventLocation.trim() : null,
			image,
			removeImage: removeImage && !image,
			attachment_files: stagedAttachments.map((s) => s.file),
			attachment_ids: attachmentIdsChanged
				? existingAttachments.map((a) => a.id)
				: undefined,
		};
	};

	const publish = () => {
		if (!title.trim()) return showToast.warning("Please add a title.");
		if (!messageHtmlToPlainText(description))
			return showToast.warning("Please add some body text.");
		if (audienceVal.kind === "custom" && audienceVal.partnerIds.length === 0)
			return showToast.warning("Choose at least one strategic partner.");
		if (audienceVal.kind === "group") {
			const count =
				audienceVal.partnerIds?.length ??
				partners.filter(
					(p) => p.strategic_partner_grouping === audienceVal.grouping,
				).length;
			if (count === 0)
				return showToast.warning(
					"No strategic partners are in this grouping yet.",
				);
		}
		if (postType === "event" && !evDate)
			return showToast.warning("Events need a date.");
		if (ackRequired && !ackBy)
			return showToast.warning("Provide an acknowledgement deadline.");
		// Broadcasting to every partner is high-stakes and was previously easy to
		// trigger accidentally (a wiped draft reset the audience to "all"). Require
		// a deliberate confirmation.
		if (
			audienceVal.kind === "all" &&
			!window.confirm(
				"This message will be sent to ALL partners (current, past, and prospective). Send to everyone?",
			)
		) {
			return;
		}
		clearStoredDraft();
		setPendingAction("publish");
		onPublish(collectValues("published"));
	};

	const saveDraft = () => {
		if (!title.trim())
			return showToast.warning("Add a title before saving a draft.");
		clearStoredDraft();
		setPendingAction("draft");
		onSaveDraft(collectValues("draft"));
	};

	const previewDoc =
		stagedAttachments[0]?.file.name ?? existingAttachments[0]?.name ?? "";

	// Attachments as the preview should render them: the ones already saved on
	// the post (real file URLs) followed by the files just picked, exposed via
	// object URLs so staff can open a document before publishing — not only read
	// its name. Object URLs are revoked when the staged set changes or the modal
	// unmounts so they don't leak.
	const previewDocs: BoardDoc[] = useMemo(
		() => [
			...existingAttachments.map((a) => ({
				id: a.id,
				name: a.name,
				size: "Document attached",
				kind: docKindFromName(a.name),
				url: a.url ?? null,
			})),
			...stagedAttachments.map((s) => ({
				name: s.file.name,
				size: formatFileSize(s.file.size),
				kind: docKindFromName(s.file.name),
				url: URL.createObjectURL(s.file),
			})),
		],
		[existingAttachments, stagedAttachments],
	);
	useEffect(() => {
		return () => {
			for (const d of previewDocs) {
				if (d.url?.startsWith("blob:")) URL.revokeObjectURL(d.url);
			}
		};
	}, [previewDocs]);

	// Resolved banner src: object URL for a freshly picked file, else the
	// existing banner when editing. Drives both the live preview and the edit
	// thumbnail. Revoked on change so picked-file object URLs don't leak.
	const imageUrl = useMemo(() => {
		if (image) return URL.createObjectURL(image);
		if (initial?.image_url && !removeImage) return initial.image_url;
		return "";
	}, [image, initial?.image_url, removeImage]);
	useEffect(() => {
		return () => {
			if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	const preview: PreviewData = useMemo(() => {
		const start = evDate ? new Date(`${evDate}T${evTime || "00:00"}`) : null;
		return {
			type: postType,
			title,
			body: description,
			pinned,
			ackRequired,
			image: postType === "announcement" ? imageUrl : "",
			docName: previewDoc,
			docKind: docKindFromName(previewDoc),
			docs: previewDocs,
			evMonth: start
				? start.toLocaleString("en-US", { month: "short" }).toUpperCase()
				: "—",
			evDay: start ? String(start.getDate()) : "",
			evWhen: start
				? `${start.toLocaleDateString("en-US", {
						weekday: "long",
						month: "long",
						day: "numeric",
					})}${evTime ? ` · ${evTime}` : ""}`
				: "",
			evWhere: eventLocation,
		};
	}, [
		postType,
		title,
		description,
		pinned,
		ackRequired,
		imageUrl,
		previewDoc,
		previewDocs,
		evDate,
		evTime,
		eventLocation,
	]);

	const audienceNote = useMemo(() => {
		const lab = audienceLabel(audienceVal, partners);
		if (lab.empty) return "No audience selected";
		return `Visible to ${lab.main.toLowerCase()}`;
	}, [audienceVal, partners]);

	const hasPreviewContent = title.trim() || messageHtmlToPlainText(description);

	// Don't let a backdrop click / Escape / X interrupt an in-flight save, and
	// don't let one silently discard an in-progress message. Confirm first when
	// there's unsaved content; on discard, drop the persisted draft too.
	const requestClose = () => {
		if (submitting) return;
		if (
			hasPreviewContent &&
			!window.confirm(
				"Discard this message? Any text you've written will be lost.",
			)
		) {
			return;
		}
		clearStoredDraft();
		onClose();
	};

	return (
		<div
			className={`cmp-back${open ? " show" : ""}`}
			onClick={requestClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") requestClose();
			}}
		>
			<div
				className={`cmp preview${fullscreen ? " fullscreen" : ""}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{submitting && (
					<div className="cmp-overlay">
						<div className="cmp-overlay-card">
							<I.spinner />
							<span>
								{pendingAction === "draft"
									? "Saving draft…"
									: mode === "edit"
										? "Saving changes…"
										: "Publishing post…"}
							</span>
						</div>
					</div>
				)}
				<div className="cmp-head">
					<h3>{mode === "edit" ? "Edit post" : "New post"}</h3>
					<button
						aria-label={fullscreen ? "Exit full screen" : "Full screen"}
						className="x"
						disabled={submitting}
						onClick={() => setFullscreen((value) => !value)}
						type="button"
					>
						{fullscreen ? <I.minimize /> : <I.maximize />}
					</button>
					<button
						className="x"
						disabled={submitting}
						onClick={requestClose}
						type="button"
					>
						<I.x />
					</button>
				</div>

				<div className="cmp-body">
					<div className="cmp-form">
						<div className="typesel">
							{TYPES.map((t) => {
								const Ic = I[t.icon];
								return (
									<button
										className={`typeopt${postType === t.key ? " on" : ""}`}
										key={t.key}
										onClick={() => setPostType(t.key)}
										type="button"
									>
										<Ic />
										<span className="tname">{t.label}</span>
									</button>
								);
							})}
						</div>

						<div className="field">
							{/* biome-ignore lint/a11y/noLabelWithoutControl: label for the composite AudienceSelector widget */}
							<label>Audience</label>
							{spLoading ? (
								<div className="aud-loading">Loading partners…</div>
							) : (
								<AudienceSelector
									onChange={setAudienceVal}
									partners={partners}
									value={audienceVal}
								/>
							)}
							<div className="help">
								Start with a grouping — All, Current, or Prospective — then
								narrow to specific organisations if needed.
							</div>
						</div>

						<div className="field">
							<label htmlFor={titleInputId}>Title</label>
							<input
								id={titleInputId}
								maxLength={1024}
								onChange={(e) => setTitle(e.target.value)}
								placeholder={
									postType === "event"
										? "e.g. Strategic Partner Roundtable"
										: postType === "report"
											? "e.g. Q3 2026 Coverage Report"
											: "e.g. Updated escalation protocol"
								}
								type="text"
								value={title}
							/>
						</div>

						<div className="field">
							<label htmlFor={bodyInputId}>
								{postType === "event" ? "Description" : "Message"}
							</label>
							<RichTextEditor
								id={bodyInputId}
								onChange={setDescription}
								placeholder="Write your message to strategic partners…"
								value={description}
							/>
						</div>

						{postType === "announcement" && (
							<div className="field">
								<label htmlFor={imageInputId}>
									Image <span className="opt">· optional</span>
								</label>
								{imageUrl && (
									<div className="cmp-image-current">
										<img alt="Current banner" src={imageUrl} />
										<button
											onClick={() => {
												setImage(null);
												setRemoveImage(true);
											}}
											type="button"
										>
											<I.x /> Remove
										</button>
									</div>
								)}
								<input
									accept="image/*"
									id={imageInputId}
									onChange={(e) => {
										const f = e.target.files?.[0] ?? null;
										setImage(f);
										if (f) setRemoveImage(false);
									}}
									type="file"
								/>
								{image && <div className="help">Selected: {image.name}</div>}
							</div>
						)}

						<div className="field">
							<label htmlFor={attachInputId}>
								Attachments{" "}
								{postType !== "report" && (
									<span className="opt">· optional</span>
								)}
							</label>
							<MultiFileDropzone
								existing={existingAttachments}
								onAddFiles={(files) =>
									setStagedAttachments((prev) => [
										...prev,
										...files.map((f) => ({ id: newStagedId(), file: f })),
									])
								}
								onRemoveExisting={(id) => {
									setExistingAttachments((prev) =>
										prev.filter((a) => a.id !== id),
									);
									setRemovedExistingIds((prev) =>
										prev.includes(id) ? prev : [...prev, id],
									);
								}}
								onRemoveStaged={(id) =>
									setStagedAttachments((prev) =>
										prev.filter((s) => s.id !== id),
									)
								}
								staged={stagedAttachments}
							/>
						</div>

						{postType === "event" && (
							<div className="field-row3">
								<div className="field" style={{ margin: 0 }}>
									<label htmlFor={evDateInputId}>Date</label>
									<input
										id={evDateInputId}
										onChange={(e) => setEvDate(e.target.value)}
										type="date"
										value={evDate}
									/>
								</div>
								<div className="field" style={{ margin: 0 }}>
									<label htmlFor={evTimeInputId}>Time</label>
									<input
										id={evTimeInputId}
										onChange={(e) => setEvTime(e.target.value)}
										type="time"
										value={evTime}
									/>
								</div>
								<div className="field" style={{ margin: 0 }}>
									<label htmlFor={evWhereInputId}>Location</label>
									<input
										id={evWhereInputId}
										onChange={(e) => setEventLocation(e.target.value)}
										placeholder="Virtual · Teams"
										type="text"
										value={eventLocation}
									/>
								</div>
							</div>
						)}

						{(postType === "announcement" || postType === "report") && (
							<div className="toggle-field">
								<div className="tf-txt">
									<div className="tf-t">Request acknowledgement</div>
									<div className="tf-s">
										Partners must confirm receipt — tracked for compliance
									</div>
								</div>
								<button
									aria-pressed={ackRequired}
									className={`switch${ackRequired ? " on" : ""}`}
									onClick={() => setAckRequired((v) => !v)}
									type="button"
								>
									<i />
								</button>
							</div>
						)}
						{ackRequired && (
							<div className="field">
								<label htmlFor={ackByInputId}>
									Acknowledge by <span className="opt">· deadline</span>
								</label>
								<input
									id={ackByInputId}
									onChange={(e) => setAckBy(e.target.value)}
									style={{ maxWidth: 220 }}
									type="date"
									value={ackBy}
								/>
							</div>
						)}

						<div className="toggle-field">
							<div className="tf-txt">
								<div className="tf-t">Pin to top of board</div>
								<div className="tf-s">
									Keep this post above others for all partners
								</div>
							</div>
							<button
								aria-pressed={pinned}
								className={`switch${pinned ? " on" : ""}`}
								onClick={() => setPinned((v) => !v)}
								type="button"
							>
								<i />
							</button>
						</div>
					</div>

					<div className="cmp-preview">
						<div className="pvlabel">
							<I.eye /> Partner preview
						</div>
						{hasPreviewContent ? (
							<ComposerPreview d={preview} />
						) : (
							<div className="pv-empty">
								<I.eye />
								<div className="pv-empty-text">
									Start typing to see how partners will see this post
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="cmp-foot">
					<span className="audience">
						<I.user /> {audienceNote}
					</span>
					<div className="ff">
						<button
							className="btn-draft"
							disabled={submitting}
							onClick={saveDraft}
							type="button"
						>
							{pendingAction === "draft" ? (
								<>
									<I.spinner /> Saving…
								</>
							) : (
								"Save draft"
							)}
						</button>
						<button
							className="btn-publish"
							disabled={submitting}
							onClick={publish}
							type="button"
						>
							{pendingAction === "publish" ? (
								<>
									<I.spinner /> {mode === "edit" ? "Saving…" : "Publishing…"}
								</>
							) : (
								<>
									<I.send2 /> {mode === "edit" ? "Save & publish" : "Publish"}
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
