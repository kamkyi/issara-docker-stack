import { Cross1Icon, FileTextIcon } from "@radix-ui/react-icons";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Box, Text, TextArea } from "@radix-ui/themes";
import type React from "react";
import { useRef } from "react";
import type { ServerAttachment } from "$src/services/workerFeedbackGrievanceService";
import PrevTextDataComponent from "../PrevTextDataComponent";
import "../tabStyles.css";
import type { GrievanceData } from "../../GrievanceForm";

interface InformationCollectionProps {
	context: { t: (key: string, options?: Record<string, unknown>) => string };
	data: GrievanceData;
	onDataChange: (update: Record<string, unknown>) => void;
	existingAttachments?: ServerAttachment[];
	newAttachments?: File[];
	removedAttachmentIds?: number[];
	onAddFiles?: (files: File[]) => void;
	onRemoveExistingAttachment?: (id: number) => void;
	onRemoveNewAttachment?: (index: number) => void;
	attachmentsDisabled?: boolean;
}

const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg";

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

const InformationCollection: React.FC<InformationCollectionProps> = ({
	context,
	data,
	onDataChange,
	existingAttachments = [],
	newAttachments = [],
	removedAttachmentIds = [],
	onAddFiles,
	onRemoveExistingAttachment,
	onRemoveNewAttachment,
	attachmentsDisabled = false,
}) => {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const attachmentsEnabled = Boolean(
		onAddFiles && onRemoveExistingAttachment && onRemoveNewAttachment,
	);

	const handleChange = (name: string, value: string) => {
		if (name === "information_collection_notes") {
			onDataChange({ [name]: { value } });
		} else {
			onDataChange({ [name]: value });
		}
	};

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0 || !onAddFiles) return;
		onAddFiles(Array.from(files));
		event.target.value = "";
	};

	const renderYesNoGroup = (name: string, value: string, className = "") => (
		<div className={`mb-4 ${className}`}>
			<RadioGroup.Root
				className="flex flex-col gap-2 mt-2"
				onValueChange={(val) => handleChange(name, val)}
				value={value || ""}
			>
				{[
					{
						value: "true",
						label: context.t("workerFeedbackGrievance.common.yes"),
					},
					{
						value: "false",
						label: context.t("workerFeedbackGrievance.common.no"),
					},
				].map((option) => (
					<label
						className="flex items-center gap-2 cursor-pointer"
						htmlFor={`${name}-${option.value}`}
						key={option.value}
					>
						<RadioGroup.Item
							className="w-4 h-4 rounded-full border border-[#148696] data-[state=checked]:bg-teal-500 data-[state=checked]:border-[#148696] flex items-center justify-center standard-input-size"
							id={`${name}-${option.value}`}
							value={option.value}
						>
							<span className="block w-2 h-2 rounded-full bg-white data-[state=checked]:bg-green-500"></span>
						</RadioGroup.Item>
						<span>{option.label}</span>
					</label>
				))}
			</RadioGroup.Root>
		</div>
	);

	return (
		<Box className="space-y-6">
			<Text className="intro_text" size="2">
				{context.t("workerFeedbackGrievance.informationCollection.description")}
			</Text>
			<Text as="label" className="question block mb-2" weight="bold">
				{context.t("workerFeedbackGrievance.informationCollection.checkWithHr")}
			</Text>
			{renderYesNoGroup("check_with_hr", String(data.check_with_hr))}

			<Text
				as="label"
				className="question next_question block mb-2"
				weight="bold"
			>
				{context.t("workerFeedbackGrievance.informationCollection.repeatIssue")}
			</Text>
			{renderYesNoGroup("repeat_issue", String(data.repeat_issue))}

			<Text
				as="label"
				className="question next_question block mb-2"
				weight="bold"
			>
				{context.t(
					"workerFeedbackGrievance.informationCollection.additionalNotes",
				)}
			</Text>
			<TextArea
				className="w-full mt-2"
				name="information_collection_notes"
				onChange={(e) =>
					handleChange("information_collection_notes", e.target.value)
				}
				placeholder={context.t(
					"workerFeedbackGrievance.informationCollection.notesPlaceholder",
				)}
				rows={3}
				value={
					data.information_collection_notes
						? (data.information_collection_notes as { value: string }).value
						: ""
				}
			/>
			<PrevTextDataComponent
				context={context}
				data={
					data.list_of_text_fields
						? (data.list_of_text_fields as any).information_collection_notes
						: []
				}
				is_notes={true}
				text_header_1={context.t("workerFeedbackGrievance.common.notePrefix")}
				text_header_2={""}
			/>

			{attachmentsEnabled && (
				<div className="next_question">
					<Text as="label" className="question block mb-2" weight="bold">
						{context.t(
							"workerFeedbackGrievance.informationCollection.additionalAttachments",
						)}
					</Text>
					<Text className="block text-gray-600 mb-2" size="2">
						{context.t(
							"workerFeedbackGrievance.informationCollection.attachmentsDescription",
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
						<FileTextIcon />
						{context.t(
							"workerFeedbackGrievance.informationCollection.browseFiles",
						)}
					</button>
					<Text className="block text-gray-500 mt-1" size="1">
						{context.t(
							"workerFeedbackGrievance.informationCollection.fileTypes",
						)}
					</Text>

					{(existingAttachments.length > 0 || newAttachments.length > 0) && (
						<ul className="mt-3 flex flex-col gap-2">
							{existingAttachments.map((attachment) => {
								const isRemoved = removedAttachmentIds.includes(attachment.id);
								return (
									<li
										className={`flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ${
											isRemoved ? "opacity-50 line-through" : ""
										}`}
										key={`existing-${attachment.id}`}
									>
										<a
											className="flex items-center gap-2 text-[#3f51d6] hover:underline"
											href={attachment.file_path}
											rel="noopener noreferrer"
											target="_blank"
										>
											<FileTextIcon />
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
													? context.t(
															"workerFeedbackGrievance.informationCollection.undoRemove",
														)
													: context.t(
															"workerFeedbackGrievance.informationCollection.removeAttachment",
														)
											}
											className="text-gray-400 hover:text-rose-500"
											onClick={() =>
												onRemoveExistingAttachment?.(attachment.id)
											}
											type="button"
										>
											{isRemoved ? (
												context.t(
													"workerFeedbackGrievance.informationCollection.undo",
												)
											) : (
												<Cross1Icon />
											)}
										</button>
									</li>
								);
							})}
							{newAttachments.map((file, index) => (
								<li
									className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"
									key={`new-${file.name}-${index}`}
								>
									<div className="flex items-center gap-2 text-emerald-700">
										<FileTextIcon />
										<span className="truncate max-w-[280px]">{file.name}</span>
										<span className="text-xs text-emerald-600">
											({formatBytes(file.size)}) ·{" "}
											{context.t(
												"workerFeedbackGrievance.informationCollection.willUploadOnSave",
											)}
										</span>
									</div>
									<button
										aria-label={context.t(
											"workerFeedbackGrievance.informationCollection.removeFile",
										)}
										className="text-emerald-600 hover:text-rose-500"
										onClick={() => onRemoveNewAttachment?.(index)}
										type="button"
									>
										<Cross1Icon />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</Box>
	);
};

export default InformationCollection;
