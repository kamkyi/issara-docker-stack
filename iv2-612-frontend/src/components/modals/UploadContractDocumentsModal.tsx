import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type ContractDocumentInputMode,
	contractDocumentsService,
} from "$src/services/contractDocumentsService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

const ACCENT = "#2f6b52";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".xlsx"];
const ACCEPT_ATTR = ".pdf,.docx,.xlsx";

interface DocumentRow {
	documentName: string;
	inputMode: ContractDocumentInputMode;
	linkUrl: string;
	file: File | null;
	fileError: string | null;
}

const emptyRow = (): DocumentRow => ({
	documentName: "",
	inputMode: "FILE",
	linkUrl: "",
	file: null,
	fileError: null,
});

interface UploadContractDocumentsModalProps {
	item: any | null;
	onClose: () => void;
}

export function UploadContractDocumentsModal({
	item,
	onClose,
}: UploadContractDocumentsModalProps) {
	const { t } = useTranslation();
	const uid = useId();

	const [documents, setDocuments] = useState<DocumentRow[]>([emptyRow()]);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setDocuments([emptyRow()]);
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	const submitMutation = useMutation({
		mutationFn: () => {
			const files: Record<number, File> = {};
			documents.forEach((row, index) => {
				if (row.inputMode === "FILE" && row.file) files[index] = row.file;
			});
			const rows = documents.map((row) => ({
				document_name: row.documentName.trim(),
				input_mode: row.inputMode,
				link_url: row.inputMode === "LINK" ? row.linkUrl.trim() : undefined,
			}));
			return contractDocumentsService.submit(item.id, rows, files, {
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
			});
		},
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(
				"Something went wrong submitting your documents. Please try again.",
			),
	});

	const updateRow = (index: number, patch: Partial<DocumentRow>) =>
		setDocuments((prev) =>
			prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);

	const addRow = () => setDocuments((prev) => [...prev, emptyRow()]);
	const removeRow = (index: number) =>
		setDocuments((prev) => prev.filter((_, i) => i !== index));

	const handleFileSelected = (index: number, file: File | null) => {
		if (!file) {
			updateRow(index, { file: null, fileError: null });
			return;
		}
		const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
		if (!ACCEPTED_EXTENSIONS.includes(extension)) {
			updateRow(index, {
				file: null,
				fileError: "Unsupported file type. Please upload a PDF, DOCX, or XLSX.",
			});
			return;
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			updateRow(index, {
				file: null,
				fileError: "File is too large. Maximum size is 20 MB.",
			});
			return;
		}
		updateRow(index, { file, fileError: null });
	};

	const canSubmit =
		documents.length > 0 &&
		documents.every((row) => {
			if (!row.documentName.trim()) return false;
			if (row.inputMode === "LINK") return !!row.linkUrl.trim();
			return !!row.file && !row.fileError;
		});

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="720px">
				<div className="flex items-start justify-between">
					<Dialog.Title>Upload Documents for Review</Dialog.Title>
					<Dialog.Close>
						<button
							aria-label="Close"
							className="text-gray-400 hover:text-gray-600"
							onClick={handleClose}
							type="button"
						>
							<Icons.Close style={{ fontSize: 20 }} />
						</button>
					</Dialog.Close>
				</div>
				<Dialog.Description className="text-sm text-gray-500 mb-2">
					Share your service agreements and contracts for CASCADE team review —
					e.g. MSA contracts, vetting criteria documentation.
				</Dialog.Description>

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t(
								"cascadeMarketplace.plan.modal.uploadDocumentsContractSubmittedTitle",
							)}
						</h4>
						<p className="text-gray-500 text-sm">
							{t(
								"cascadeMarketplace.plan.modal.uploadDocumentsContractSubmittedMessage",
							)}
						</p>
						<Dialog.Close>
							<button
								className="mt-2 text-white px-6 py-2 rounded-lg font-bold text-sm"
								onClick={handleClose}
								style={{ backgroundColor: ACCENT }}
								type="button"
							>
								Done
							</button>
						</Dialog.Close>
					</div>
				) : (
					<div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
						{documents.map((row, index) => (
							<div
								className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50"
								key={`${uid}-document-${index}`}
							>
								<div className="flex items-center justify-between bg-gray-100 px-4 py-2">
									<p className="text-sm font-black text-[#004A60] flex items-center gap-2">
										<span
											className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs"
											style={{ backgroundColor: ACCENT }}
										>
											{index + 1}
										</span>
										Document {index + 1}
									</p>
									{documents.length > 1 && (
										<button
											aria-label="Remove"
											className="text-gray-400 hover:text-red-500"
											onClick={() => removeRow(index)}
											type="button"
										>
											<Icons.Close style={{ fontSize: 18 }} />
										</button>
									)}
								</div>

								<div className="p-4 space-y-3">
									<div>
										<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
											How are you adding it?
										</p>
										<div className="flex gap-2">
											{(["LINK", "FILE"] as ContractDocumentInputMode[]).map(
												(mode) => (
													<button
														className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
															row.inputMode === mode
																? "bg-[#004A60] text-white border-[#004A60]"
																: "bg-white text-gray-600 border-gray-200 hover:border-[#148696]/40"
														}`}
														key={mode}
														onClick={() =>
															updateRow(index, { inputMode: mode })
														}
														type="button"
													>
														{mode === "LINK" && (
															<Icons.Link style={{ fontSize: 16 }} />
														)}
														{mode === "FILE" && (
															<Icons.InsertDriveFile style={{ fontSize: 16 }} />
														)}
														{mode === "LINK" ? "Link" : "File"}
													</button>
												),
											)}
										</div>
									</div>

									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-docname-${index}`}
										>
											Document Name <span className="text-[#FB8379]">*</span>
										</label>
										<input
											className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
											id={`${uid}-docname-${index}`}
											onChange={(e) =>
												updateRow(index, { documentName: e.target.value })
											}
											placeholder="e.g. Master Service Agreement – Supplier Onboarding 2024"
											type="text"
											value={row.documentName}
										/>
									</div>

									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-linkurl-${index}`}
										>
											Document File <span className="text-[#FB8379]">*</span>
										</label>
										{row.inputMode === "LINK" && (
											<input
												className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
												id={`${uid}-linkurl-${index}`}
												onChange={(e) =>
													updateRow(index, { linkUrl: e.target.value })
												}
												placeholder="https://..."
												type="url"
												value={row.linkUrl}
											/>
										)}
										{row.inputMode === "FILE" && (
											<label
												className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer bg-white hover:border-[#148696]/50 transition-colors text-center"
												htmlFor={`${uid}-file-${index}`}
											>
												<Icons.CloudUpload
													className="text-gray-400"
													style={{ fontSize: 28 }}
												/>
												<span className="text-sm text-gray-600">
													{row.file ? (
														row.file.name
													) : (
														<>
															Click to upload{" "}
															<strong>or drag &amp; drop</strong>
														</>
													)}
												</span>
												<span className="text-xs text-gray-400">
													PDF, DOCX, XLSX — up to 20 MB
												</span>
												<input
													accept={ACCEPT_ATTR}
													className="hidden"
													id={`${uid}-file-${index}`}
													onChange={(e) =>
														handleFileSelected(
															index,
															e.target.files?.[0] ?? null,
														)
													}
													type="file"
												/>
											</label>
										)}
										{row.fileError && (
											<p className="text-xs text-red-500 mt-1">
												{row.fileError}
											</p>
										)}
									</div>
								</div>
							</div>
						))}

						<button
							className="flex items-center gap-2 text-sm font-bold hover:opacity-80"
							onClick={addRow}
							style={{ color: ACCENT }}
							type="button"
						>
							<Icons.AddCircleOutline style={{ fontSize: 20 }} />
							Add Another Document
						</button>

						<div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
							{submitError && (
								<p className="text-sm text-red-500 text-right">{submitError}</p>
							)}
							<div className="flex gap-3 justify-end">
								<Dialog.Close>
									<button
										className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50"
										onClick={handleClose}
										type="button"
									>
										Cancel
									</button>
								</Dialog.Close>
								<button
									className="text-white px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									disabled={!canSubmit || submitMutation.isPending}
									onClick={() => submitMutation.mutate()}
									style={{ backgroundColor: ACCENT }}
									type="button"
								>
									{submitMutation.isPending && (
										<Icons.HourglassTop style={{ fontSize: 14 }} />
									)}
									Submit for Review
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
