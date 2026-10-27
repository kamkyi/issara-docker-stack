import type React from "react";
import { useId, useMemo, useState } from "react";
import {
	type ExistingAttachment,
	MultiFileDropzone,
	newStagedId,
	type StagedFile,
} from "$src/components/MultiFileDropzone";
import { RichTextEditor } from "$src/components/messageBoard/RichTextEditor";
import { showToast } from "$src/components/toast/toastUtil";
import { useStrategicPartners } from "$src/hooks/useSupplyChain";
import type { PostFormValues } from "$src/queries/useMessageBoardMutations";
import "$src/styles/message-board.css";
import {
	messageHtmlToPlainText,
	sanitizeMessageHtml,
} from "$src/utils/messageBoardRichText";

type PostType = PostFormValues["post_type"];

export interface PostComposerInitial {
	post_type?: PostType;
	title?: string;
	description?: string;
	strategic_partner?: number;
	pinned?: boolean;
	ack_required?: boolean;
	ack_by?: string | null;
	event_starts_at?: string | null;
	event_ends_at?: string | null;
	event_location?: string | null;
	sort_number?: number | null;
	image_url?: string | null;
	existing_attachments?: ExistingAttachment[];
}

interface PostComposerFormProps {
	mode: "create" | "edit";
	initial?: PostComposerInitial;
	submitting?: boolean;
	onSubmit: (values: PostFormValues) => void;
	onCancel: () => void;
}

// Convert an ISO datetime string into the value accepted by
// <input type="datetime-local">.
const toDatetimeLocal = (iso: string | null | undefined): string => {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocal = (s: string): string | null => {
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const PostComposerForm: React.FC<PostComposerFormProps> = ({
	mode,
	initial,
	submitting,
	onSubmit,
	onCancel,
}) => {
	const { data: spData, isLoading: spLoading } = useStrategicPartners();
	const partners = useMemo(
		() => (Array.isArray(spData) ? spData : []),
		[spData],
	);

	const partnerInputId = useId();
	const titleInputId = useId();
	const bodyInputId = useId();
	const ackByInputId = useId();
	const eventStartInputId = useId();
	const eventEndInputId = useId();
	const eventWhereInputId = useId();
	const sortInputId = useId();

	const [postType, setPostType] = useState<PostType>(
		initial?.post_type ?? "announcement",
	);
	const [title, setTitle] = useState(initial?.title ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [partnerId, setPartnerId] = useState<number | "" | "all">(
		initial?.strategic_partner ?? "",
	);
	const [pinned, setPinned] = useState(!!initial?.pinned);
	const [ackRequired, setAckRequired] = useState(!!initial?.ack_required);
	const [ackBy, setAckBy] = useState(initial?.ack_by ?? "");
	const [eventStarts, setEventStarts] = useState(
		toDatetimeLocal(initial?.event_starts_at),
	);
	const [eventEnds, setEventEnds] = useState(
		toDatetimeLocal(initial?.event_ends_at),
	);
	const [eventLocation, setEventLocation] = useState(
		initial?.event_location ?? "",
	);
	const [sortNumber, setSortNumber] = useState<string>(
		initial?.sort_number != null ? String(initial.sort_number) : "",
	);
	const [image, setImage] = useState<File | null>(null);
	const [removeImage, setRemoveImage] = useState(false);
	const [stagedAttachments, setStagedAttachments] = useState<StagedFile[]>([]);
	const [existingAttachments, setExistingAttachments] = useState<
		ExistingAttachment[]
	>(initial?.existing_attachments ?? []);
	const [removedExistingIds, setRemovedExistingIds] = useState<number[]>([]);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) {
			showToast.warning("Please add a title.");
			return;
		}
		if (!messageHtmlToPlainText(description)) {
			showToast.warning("Please add some body text.");
			return;
		}
		if (!partnerId) {
			showToast.warning("Choose a strategic partner (or select All).");
			return;
		}
		if (postType === "event" && !eventStarts) {
			showToast.warning("Events need a start date / time.");
			return;
		}
		if (ackRequired && !ackBy) {
			showToast.warning("Provide an acknowledgement deadline.");
			return;
		}

		const attachmentIdsChanged = removedExistingIds.length > 0;
		const values: PostFormValues = {
			post_type: postType,
			title: title.trim(),
			description: sanitizeMessageHtml(description),
			name: title.trim(),
			strategic_partner: partnerId === "all" ? null : Number(partnerId),
			strategic_partner_all: partnerId === "all" ? true : undefined,
			pinned,
			ack_required: ackRequired,
			ack_by: ackRequired ? ackBy : null,
			event_starts_at:
				postType === "event" ? fromDatetimeLocal(eventStarts) : null,
			event_ends_at: postType === "event" ? fromDatetimeLocal(eventEnds) : null,
			event_location: postType === "event" ? eventLocation.trim() : null,
			sort_number: sortNumber === "" ? null : Number(sortNumber),
			image,
			removeImage: removeImage && !image,
			attachment_files: stagedAttachments.map((s) => s.file),
			attachment_ids: attachmentIdsChanged
				? existingAttachments.map((a) => a.id)
				: undefined,
		};
		onSubmit(values);
	};

	const inputCls =
		"w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#148696]";
	const labelCls = "block text-sm font-semibold text-gray-800 mb-1";

	return (
		<form className="mb-root mx-auto max-w-3xl space-y-6 p-6" onSubmit={submit}>
			<h1 className="text-2xl font-bold">
				{mode === "create" ? "New message board post" : "Edit post"}
			</h1>

			{/* Post type */}
			<div>
				<span className={labelCls}>Post type</span>
				<div className="flex gap-2">
					{(["announcement", "report", "event"] as PostType[]).map((t) => (
						<button
							className={`px-4 py-2 rounded-lg border ${
								postType === t
									? "bg-[#148696] text-white border-[#148696]"
									: "bg-white text-gray-700 border-gray-300 hover:border-[#148696]"
							}`}
							key={t}
							onClick={() => setPostType(t)}
							type="button"
						>
							{t[0].toUpperCase()}
							{t.slice(1)}
						</button>
					))}
				</div>
			</div>

			{/* Audience */}
			<div>
				<label className={labelCls} htmlFor={partnerInputId}>
					Strategic partner audience
				</label>
				<select
					className={inputCls}
					disabled={spLoading}
					id={partnerInputId}
					onChange={(e) => {
						const v = e.target.value;
						if (v === "") setPartnerId("");
						else if (v === "all") setPartnerId("all");
						else setPartnerId(Number(v));
					}}
					value={partnerId}
				>
					<option value="">— select partner —</option>
					<option value="all">— All strategic partners —</option>
					{partners.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
			</div>

			{/* Title */}
			<div>
				<label className={labelCls} htmlFor={titleInputId}>
					Title
				</label>
				<input
					className={inputCls}
					id={titleInputId}
					maxLength={1024}
					onChange={(e) => setTitle(e.target.value)}
					value={title}
				/>
			</div>

			{/* Body */}
			<div>
				<label className={labelCls} htmlFor={bodyInputId}>
					Body
				</label>
				<RichTextEditor
					id={bodyInputId}
					onChange={setDescription}
					placeholder="Write your message to strategic partners…"
					value={description}
				/>
			</div>

			{/* Flags */}
			<div className="flex flex-wrap gap-x-6 gap-y-3">
				<label className="inline-flex items-center gap-2">
					<input
						checked={pinned}
						onChange={(e) => setPinned(e.target.checked)}
						type="checkbox"
					/>
					<span className="text-sm text-gray-800">Pin to top</span>
				</label>
				<label className="inline-flex items-center gap-2">
					<input
						checked={ackRequired}
						onChange={(e) => setAckRequired(e.target.checked)}
						type="checkbox"
					/>
					<span className="text-sm text-gray-800">
						Require partners to acknowledge
					</span>
				</label>
			</div>

			{ackRequired && (
				<div>
					<label className={labelCls} htmlFor={ackByInputId}>
						Acknowledgement deadline
					</label>
					<input
						className={`${inputCls} max-w-[20rem]`}
						id={ackByInputId}
						onChange={(e) => setAckBy(e.target.value)}
						type="date"
						value={ackBy}
					/>
				</div>
			)}

			{postType === "event" && (
				<div className="space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className={labelCls} htmlFor={eventStartInputId}>
								Starts at
							</label>
							<input
								className={inputCls}
								id={eventStartInputId}
								onChange={(e) => setEventStarts(e.target.value)}
								type="datetime-local"
								value={eventStarts}
							/>
						</div>
						<div>
							<label className={labelCls} htmlFor={eventEndInputId}>
								Ends at (optional)
							</label>
							<input
								className={inputCls}
								id={eventEndInputId}
								onChange={(e) => setEventEnds(e.target.value)}
								type="datetime-local"
								value={eventEnds}
							/>
						</div>
					</div>
					<div>
						<label className={labelCls} htmlFor={eventWhereInputId}>
							Location
						</label>
						<input
							className={inputCls}
							id={eventWhereInputId}
							onChange={(e) => setEventLocation(e.target.value)}
							placeholder="Virtual · Microsoft Teams"
							value={eventLocation}
						/>
					</div>
				</div>
			)}

			{/* Banner image */}
			<div>
				<span className={labelCls}>Banner image (optional)</span>
				{initial?.image_url && !image && !removeImage && (
					<div className="mb-2 flex items-center gap-3">
						<img
							alt="Current banner"
							className="h-20 w-32 object-cover rounded-lg border"
							src={initial.image_url}
						/>
						<button
							className="text-sm text-red-600 hover:underline"
							onClick={() => setRemoveImage(true)}
							type="button"
						>
							Remove current banner
						</button>
					</div>
				)}
				<input
					accept="image/*"
					onChange={(e) => {
						const f = e.target.files?.[0] ?? null;
						setImage(f);
						if (f) setRemoveImage(false);
					}}
					type="file"
				/>
				{image && (
					<p className="mt-1 text-xs text-gray-600">Selected: {image.name}</p>
				)}
			</div>

			{/* Attachments */}
			<div>
				<span className={labelCls}>Attachments</span>
				<MultiFileDropzone
					existing={existingAttachments}
					onAddFiles={(files) =>
						setStagedAttachments((prev) => [
							...prev,
							...files.map((f) => ({ id: newStagedId(), file: f })),
						])
					}
					onRemoveExisting={(id) => {
						setExistingAttachments((prev) => prev.filter((a) => a.id !== id));
						setRemovedExistingIds((prev) =>
							prev.includes(id) ? prev : [...prev, id],
						);
					}}
					onRemoveStaged={(id) =>
						setStagedAttachments((prev) => prev.filter((s) => s.id !== id))
					}
					staged={stagedAttachments}
				/>
			</div>

			{/* Sort */}
			<div>
				<label className={labelCls} htmlFor={sortInputId}>
					Sort order (lower = higher in list)
				</label>
				<input
					className={`${inputCls} max-w-[140px]`}
					id={sortInputId}
					onChange={(e) =>
						setSortNumber(e.target.value.replace(/[^0-9-]/g, ""))
					}
					placeholder="e.g. 10"
					value={sortNumber}
				/>
			</div>

			{/* Submit */}
			<div className="flex items-center justify-end gap-3 pt-2">
				<button
					className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
					disabled={submitting}
					onClick={onCancel}
					type="button"
				>
					Cancel
				</button>
				<button
					className="rounded-lg bg-[#148696] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f6f7d] disabled:opacity-60"
					disabled={submitting}
					type="submit"
				>
					{submitting
						? "Saving…"
						: mode === "create"
							? "Publish post"
							: "Save changes"}
				</button>
			</div>
		</form>
	);
};
