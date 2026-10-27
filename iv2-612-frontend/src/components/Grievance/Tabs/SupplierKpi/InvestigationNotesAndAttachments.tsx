import { Box, Text, TextArea } from "@radix-ui/themes";
import { FileText, X } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { showToast } from "$src/components/toast/toastUtil";
import {
	ATTACHMENT_VISIBILITY,
	type AttachmentVisibility,
	type PendingGrievanceAttachment,
} from "$src/services/supplierKpiGrievanceService";
import type { ServerAttachment } from "$src/services/workerFeedbackGrievanceService";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface InvestigationNotesAndAttachmentsProps {
	context: { t: (x: string) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	existingAttachments?: ServerAttachment[];
	newAttachments?: PendingGrievanceAttachment[];
	removedAttachmentIds?: number[];
	onAddFiles?: (files: File[]) => void;
	onRemoveExistingAttachment?: (id: number) => void;
	onRemoveNewAttachment?: (index: number) => void;
	onChangeExistingAttachmentPermission?: (
		id: number,
		permission: AttachmentVisibility,
	) => void;
	onChangeNewAttachmentPermission?: (
		index: number,
		permission: AttachmentVisibility,
	) => void;
	attachmentsDisabled?: boolean;
}

const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const VISIBILITY_OPTIONS: Array<{
	value: AttachmentVisibility;
	label: string;
}> = [
	{
		value: ATTACHMENT_VISIBILITY.INTERNAL_ONLY,
		label: "Internal Only",
	},
	{
		value: ATTACHMENT_VISIBILITY.INTERNAL_AND_ISSARA,
		label: "Internal Only + Issara",
	},
	{
		value: ATTACHMENT_VISIBILITY.INTERNAL_ISSARA_AND_CUSTOMERS,
		label: "Internal Only + Issara + Your Customers",
	},
];

const normalizeVisibility = (permission?: string): AttachmentVisibility => {
	if (
		permission === ATTACHMENT_VISIBILITY.INTERNAL_AND_ISSARA ||
		permission === ATTACHMENT_VISIBILITY.INTERNAL_ISSARA_AND_CUSTOMERS
	) {
		return permission;
	}
	return ATTACHMENT_VISIBILITY.INTERNAL_ONLY;
};

function VisibilityOptions({
	value,
	onChange,
}: {
	value: AttachmentVisibility;
	onChange: (value: AttachmentVisibility) => void;
}) {
	return (
		<div className="mt-2 flex flex-wrap items-center gap-1.5">
			<span className="text-[11px] font-medium text-gray-500">Visible to:</span>
			{VISIBILITY_OPTIONS.map((option) => {
				const selected = value === option.value;
				return (
					// Toggle buttons, not hidden <input type="radio">. An sr-only radio is
					// positioned off its visible pill, so clicking it made the browser
					// scroll the expanded row's overflow container to that hidden input —
					// the "table jumps / white space / lost focus" behaviour. A visible,
					// in-flow button that's already on screen never triggers that scroll.
					// Font-weight and border-width stay constant across states so the pill
					// never changes size either; only colors change.
					<button
						aria-pressed={selected}
						className={`cursor-pointer rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
							selected
								? "border-[#148696] bg-[#A6DFDD]/30 text-[#0f6b78]"
								: "border-gray-200 text-gray-500 hover:border-gray-300"
						}`}
						key={option.value}
						onClick={() => onChange(option.value)}
						type="button"
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
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

const InvestigationNotesAndAttachments: React.FC<
	InvestigationNotesAndAttachmentsProps
> = ({
	context,
	data,
	onDataChange,
	existingAttachments = [],
	newAttachments = [],
	removedAttachmentIds = [],
	onAddFiles,
	onRemoveExistingAttachment,
	onRemoveNewAttachment,
	onChangeExistingAttachmentPermission,
	onChangeNewAttachmentPermission,
	attachmentsDisabled = false,
}) => {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const attachmentsEnabled = Boolean(
		onAddFiles && onRemoveExistingAttachment && onRemoveNewAttachment,
	);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0 || !onAddFiles) return;
		const selectedFiles = Array.from(files);
		const validFiles = selectedFiles.filter(
			(file) =>
				file.size <= MAX_ATTACHMENT_BYTES &&
				/\.(pdf|png|jpe?g)$/i.test(file.name),
		);
		if (validFiles.length !== selectedFiles.length) {
			showToast.error(
				context.t(
					"Each attachment must be a PDF, PNG or JPG no larger than 10 MB.",
				),
			);
		}
		if (validFiles.length > 0) onAddFiles(validFiles);
		event.target.value = "";
	};

	// A single visible notes field replaces the two legacy ones
	// (information_collection_notes / ethical_investigation_notes). Both
	// underlying fields are kept in sync so either name still round-trips
	// through the API regardless of which one the backend actually reads.
	const notesValue =
		data.information_collection_notes?.value ||
		data.ethical_investigation_notes?.value ||
		"";

	const handleNotesChange = (value: string) => {
		onDataChange({
			information_collection_notes: { value },
			ethical_investigation_notes: { value },
		});
	};

	return (
		<Box className="space-y-6 px-4 pt-1 md:px-8 md:pt-3">
			<div>
				<Text as="label" className="question block mb-2" weight="bold">
					{context.t("Additional Notes (Internal Only)")}
				</Text>
				<TextArea
					className="w-full mt-2"
					onChange={(e) => handleNotesChange(e.target.value)}
					rows={3}
					value={notesValue}
				/>
			</div>

			{attachmentsEnabled && (
				<div className="next_question">
					<Text as="label" className="question block mb-2" weight="bold">
						{context.t("Additional Attachments")}
					</Text>
					<Text className="block text-gray-600 mb-2" size="2">
						{context.t(
							"Upload supporting documents or images. For each file, choose who can see it.",
						)}
					</Text>

					<input
						accept={ACCEPTED_FILE_TYPES}
						className="hidden"
						multiple
						onChange={handleFileSelect}
						ref={fileInputRef}
						type="file"
					/>
					<button
						className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#4c5bd4] px-4 py-2 text-sm font-medium text-[#4c5bd4] hover:bg-[#4c5bd4]/5 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={attachmentsDisabled}
						onClick={() => fileInputRef.current?.click()}
						type="button"
					>
						<FileText size={13} />
						{context.t("Browse files")}
					</button>
					<Text className="block text-gray-500 mt-1" size="1">
						{context.t("PDF, PNG, JPG — up to 10 MB each")}
					</Text>

					{(existingAttachments.length > 0 || newAttachments.length > 0) && (
						<ul className="mt-3 flex flex-col gap-2">
							{existingAttachments.map((attachment) => {
								const isRemoved = removedAttachmentIds.includes(attachment.id);
								return (
									<li
										className={`rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ${
											isRemoved ? "opacity-50 line-through" : ""
										}`}
										key={`existing-${attachment.id}`}
									>
										<div className="flex items-center justify-between gap-2">
											<a
												className="flex items-center gap-2 text-[#3f51d6] hover:underline"
												href={attachment.file_path}
												rel="noopener noreferrer"
												target="_blank"
											>
												<FileText size={13} />
												<span className="truncate max-w-[280px]">
													{attachment.name}
												</span>
												{attachment.size && (
													<span className="text-xs text-gray-500">
														({formatBytes(attachment.size)})
													</span>
												)}
											</a>
											<button
												aria-label={
													isRemoved
														? context.t("Undo remove")
														: context.t("Remove attachment")
												}
												className="text-gray-400 hover:text-rose-500"
												onClick={() =>
													onRemoveExistingAttachment?.(attachment.id)
												}
												type="button"
											>
												{isRemoved ? context.t("Undo") : <X size={13} />}
											</button>
										</div>
										{!isRemoved && (
											<VisibilityOptions
												onChange={(permission) =>
													onChangeExistingAttachmentPermission?.(
														attachment.id,
														permission,
													)
												}
												value={normalizeVisibility(attachment.permission)}
											/>
										)}
									</li>
								);
							})}
							{newAttachments.map((attachment, index) => (
								<li
									className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
									key={`new-${attachment.file.name}-${index}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-emerald-700">
											<FileText size={13} />
											<span className="truncate max-w-[280px]">
												{attachment.file.name}
											</span>
											<span className="text-xs text-emerald-600">
												({formatBytes(attachment.file.size)}) ·{" "}
												{context.t("Uploads when you save")}
											</span>
										</div>
										<button
											aria-label={context.t("Remove file")}
											className="text-emerald-600 hover:text-rose-500"
											onClick={() => onRemoveNewAttachment?.(index)}
											type="button"
										>
											<X size={13} />
										</button>
									</div>
									<VisibilityOptions
										onChange={(permission) =>
											onChangeNewAttachmentPermission?.(index, permission)
										}
										value={attachment.permission}
									/>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</Box>
	);
};

export default InvestigationNotesAndAttachments;
