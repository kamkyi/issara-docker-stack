import { Cross2Icon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useRef, useState } from "react";

const DEFAULT_ACCEPT =
	".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif";
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

export interface StagedFile {
	id: string;
	file: File;
}

export interface ExistingAttachment {
	id: number;
	name: string;
	// Stored file URL, when the caller has one. Present ⇒ the chip's file name
	// becomes a link so an already-uploaded document can be reopened.
	url?: string | null;
}

interface MultiFileDropzoneProps {
	staged: StagedFile[];
	existing: ExistingAttachment[];
	onAddFiles: (files: File[]) => void;
	onRemoveStaged: (id: string) => void;
	onRemoveExisting: (id: number) => void;
	accept?: string;
	maxBytes?: number;
	helperText?: string;
}

const newStagedId = (): string =>
	`f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const MultiFileDropzone: React.FC<MultiFileDropzoneProps> = ({
	staged,
	existing,
	onAddFiles,
	onRemoveStaged,
	onRemoveExisting,
	accept = DEFAULT_ACCEPT,
	maxBytes = DEFAULT_MAX_BYTES,
	helperText,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const accepting = (incoming: FileList | File[] | null) => {
		if (!incoming) return;
		const arr = Array.from(incoming);
		const tooBig = arr.find((f) => f.size > maxBytes);
		if (tooBig) {
			setError(
				`${tooBig.name} is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
			);
			return;
		}
		setError(null);
		onAddFiles(arr);
	};

	const acceptHint =
		helperText ??
		`${accept.replace(/\./g, "").toUpperCase()} · up to ${Math.round(maxBytes / 1024 / 1024)} MB each`;

	return (
		<div>
			<button
				className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 bg-white transition-colors ${
					dragOver
						? "border-[#148696] bg-[#e4f4f3]"
						: "border-gray-200 hover:border-[#148696]"
				}`}
				onClick={() => inputRef.current?.click()}
				onDragLeave={(e) => {
					e.preventDefault();
					setDragOver(false);
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDrop={(e) => {
					e.preventDefault();
					setDragOver(false);
					accepting(e.dataTransfer.files);
				}}
				type="button"
			>
				<span className="dropzone-upload-icon w-10 h-10 rounded-lg bg-[#A6DFDD] text-[#00516A] inline-flex items-center justify-center shrink-0">
					<UploadIcon className="block w-5 h-5" />
				</span>
				<span className="text-left">
					<span className="block text-sm font-semibold text-gray-900">
						Click to upload or drag &amp; drop
					</span>
					<span className="block text-xs text-gray-500">{acceptHint}</span>
				</span>
			</button>
			<input
				accept={accept}
				className="hidden"
				multiple
				onChange={(e) => {
					accepting(e.target.files);
					if (inputRef.current) inputRef.current.value = "";
				}}
				ref={inputRef}
				type="file"
			/>
			{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
			{(existing.length > 0 || staged.length > 0) && (
				<div className="flex flex-wrap gap-2 mt-3">
					{existing.map((a) => (
						<span
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e4f4f3] text-[#004A60] text-sm font-semibold"
							key={`existing-${a.id}`}
						>
							<FileTextIcon className="w-4 h-4" />
							{a.url ? (
								<a
									className="underline underline-offset-2"
									href={a.url}
									rel="noopener noreferrer"
									target="_blank"
									title={`Open ${a.name}`}
								>
									{a.name}
								</a>
							) : (
								a.name
							)}
							<button
								aria-label={`Remove ${a.name}`}
								className="opacity-70 hover:opacity-100"
								onClick={() => onRemoveExisting(a.id)}
								type="button"
							>
								<Cross2Icon className="w-3 h-3" />
							</button>
						</span>
					))}
					{staged.map((s) => (
						<span
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#fff7e6] text-[#7a4a00] text-sm font-semibold"
							key={s.id}
						>
							<FileTextIcon className="w-4 h-4" />
							{s.file.name}
							<button
								aria-label={`Remove ${s.file.name}`}
								className="opacity-70 hover:opacity-100"
								onClick={() => onRemoveStaged(s.id)}
								type="button"
							>
								<Cross2Icon className="w-3 h-3" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
};

export { newStagedId };
