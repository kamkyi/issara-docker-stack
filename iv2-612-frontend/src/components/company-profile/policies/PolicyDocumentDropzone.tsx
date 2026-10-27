import { Cross2Icon, FileTextIcon, UploadIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "$src/hooks/useTranslation";
import { POLICY_FILE_ACCEPT, POLICY_FILE_MAX_BYTES } from "$src/types/policies";

interface PolicyDocumentDropzoneProps {
	existingFileName: string | null;
	stagedFile: File | null;
	onFileChange: (file: File | null) => void;
	onRemoveExisting?: () => void;
}

const ALLOWED_MIME = new Set([
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const isAllowed = (file: File): boolean => {
	if (file.size > POLICY_FILE_MAX_BYTES) return false;
	if (file.type && !ALLOWED_MIME.has(file.type)) {
		const lower = file.name.toLowerCase();
		if (
			!lower.endsWith(".pdf") &&
			!lower.endsWith(".doc") &&
			!lower.endsWith(".docx")
		) {
			return false;
		}
	}
	return true;
};

export const PolicyDocumentDropzone: React.FC<PolicyDocumentDropzoneProps> = ({
	existingFileName,
	stagedFile,
	onFileChange,
	onRemoveExisting,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const { t } = useTranslation();
	const [error, setError] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const accept = (file: File | undefined | null) => {
		if (!file) return;
		if (!isAllowed(file)) {
			setError("File must be PDF, DOC or DOCX and 10 MB or smaller.");
			return;
		}
		setError(null);
		onFileChange(file);
	};

	const shown = stagedFile?.name ?? existingFileName;

	if (shown) {
		return (
			<div className="flex items-center gap-2">
				<span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#e4f4f3] text-[#004A60] text-sm font-semibold">
					<FileTextIcon className="w-4 h-4" />
					{shown}
					<button
						aria-label="Remove file"
						className="opacity-70 hover:opacity-100"
						onClick={() => {
							onFileChange(null);
							onRemoveExisting?.();
							if (inputRef.current) inputRef.current.value = "";
						}}
						type="button"
					>
						<Cross2Icon className="w-3 h-3" />
					</button>
				</span>
				{error && <span className="text-xs text-red-500">{error}</span>}
			</div>
		);
	}

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
					accept(e.dataTransfer.files?.[0]);
				}}
				type="button"
			>
				<span className="w-10 h-10 rounded-lg bg-[#A6DFDD] text-[#004A60] grid place-items-center shrink-0">
					<UploadIcon className="w-5 h-5" />
				</span>
				<span className="text-left">
					<span className="block text-sm font-semibold text-gray-900">
						{t("companyProfilePage.policies.clickToUpload")}
					</span>
					<span className="block text-xs text-gray-500">
						PDF, DOC or DOCX · up to 10 MB
					</span>
				</span>
			</button>
			<input
				accept={POLICY_FILE_ACCEPT}
				className="hidden"
				onChange={(e) => accept(e.target.files?.[0] ?? null)}
				ref={inputRef}
				type="file"
			/>
			{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
		</div>
	);
};
