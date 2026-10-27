import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type PolicyDocumentInputMode,
	policyDocumentsService,
} from "$src/services/policyDocumentsService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

const CATEGORY_OPTIONS = [
	"Human rights",
	"Forced labor",
	"Ethical / responsible recruitment",
	"Responsible sourcing",
	"Gender",
	"Living wage",
	"Climate resilience",
	"Child labor",
	"Freedom of association",
	"Health & safety",
];

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".xlsx"];
const ACCEPT_ATTR = ".pdf,.docx,.xlsx";

interface PolicyRow {
	policyName: string;
	inputMode: PolicyDocumentInputMode;
	linkUrl: string;
	file: File | null;
	fileError: string | null;
	categories: string[];
}

const emptyRow = (): PolicyRow => ({
	policyName: "",
	inputMode: "FILE",
	linkUrl: "",
	file: null,
	fileError: null,
	categories: [],
});

interface UploadPolicyDocumentsModalProps {
	item: any | null;
	onClose: () => void;
}

export function UploadPolicyDocumentsModal({
	item,
	onClose,
}: UploadPolicyDocumentsModalProps) {
	const { t } = useTranslation();
	const uid = useId();

	const [policies, setPolicies] = useState<PolicyRow[]>([emptyRow()]);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setPolicies([emptyRow()]);
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
			policies.forEach((row, index) => {
				if (row.inputMode === "FILE" && row.file) files[index] = row.file;
			});
			const rows = policies.map((row) => ({
				policy_name: row.policyName.trim(),
				input_mode: row.inputMode,
				link_url: row.inputMode === "LINK" ? row.linkUrl.trim() : undefined,
				categories: row.categories,
			}));
			return policyDocumentsService.submit(item.id, rows, files, {
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
			});
		},
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(
				t("cascadeMarketplace.plan.modal.uploadPolicyDocumentsSubmitError"),
			),
	});

	const updateRow = (index: number, patch: Partial<PolicyRow>) =>
		setPolicies((prev) =>
			prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);

	const addRow = () => setPolicies((prev) => [...prev, emptyRow()]);
	const removeRow = (index: number) =>
		setPolicies((prev) => prev.filter((_, i) => i !== index));

	const toggleCategory = (index: number, category: string) =>
		setPolicies((prev) =>
			prev.map((row, i) => {
				if (i !== index) return row;
				const has = row.categories.includes(category);
				return {
					...row,
					categories: has
						? row.categories.filter((c) => c !== category)
						: [...row.categories, category],
				};
			}),
		);

	const handleFileSelected = (index: number, file: File | null) => {
		if (!file) {
			updateRow(index, { file: null, fileError: null });
			return;
		}
		const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
		if (!ACCEPTED_EXTENSIONS.includes(extension)) {
			updateRow(index, {
				file: null,
				fileError: t("cascadeMarketplace.plan.modal.fileTypeError"),
			});
			return;
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			updateRow(index, {
				file: null,
				fileError: t("cascadeMarketplace.plan.modal.fileSizeError"),
			});
			return;
		}
		updateRow(index, { file, fileError: null });
	};

	const canSubmit =
		policies.length > 0 &&
		policies.every((row) => {
			if (!row.policyName.trim()) return false;
			if (row.inputMode === "LINK") return !!row.linkUrl.trim();
			return !!row.file && !row.fileError;
		});

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="720px">
				<div className="flex items-start justify-between">
					<Dialog.Title>
						{t("cascadeMarketplace.plan.modal.uploadPolicyDocumentsTitle")}
					</Dialog.Title>
					<Dialog.Close>
						<button
							aria-label={t("common.close")}
							className="text-gray-400 hover:text-gray-600"
							onClick={handleClose}
							type="button"
						>
							<Icons.Close style={{ fontSize: 20 }} />
						</button>
					</Dialog.Close>
				</div>
				<Dialog.Description className="text-sm text-gray-500 mb-2">
					{t("cascadeMarketplace.plan.modal.uploadPolicyDocumentsSubtitle")}
				</Dialog.Description>

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t(
								"cascadeMarketplace.plan.modal.uploadPolicyDocumentsSubmittedTitle",
							)}
						</h4>
						<p className="text-gray-500 text-sm">
							{t(
								"cascadeMarketplace.plan.modal.uploadPolicyDocumentsSubmittedMessage",
							)}
						</p>
						<Dialog.Close>
							<button
								className="mt-2 bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672]"
								onClick={handleClose}
								type="button"
							>
								{t("common.close")}
							</button>
						</Dialog.Close>
					</div>
				) : (
					<div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
						{policies.map((row, index) => (
							<div
								className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50"
								key={`${uid}-policy-${index}`}
							>
								<div className="flex items-center justify-between bg-gray-100 px-4 py-2">
									<p className="text-sm font-black text-[#004A60]">
										{t("cascadeMarketplace.plan.modal.policyLabel", {
											n: index + 1,
										})}
									</p>
									{policies.length > 1 && (
										<button
											aria-label={t("common.remove")}
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
											{t("cascadeMarketplace.plan.modal.howAreYouAddingIt")}
										</p>
										<div className="flex gap-2">
											{(["LINK", "FILE"] as PolicyDocumentInputMode[]).map(
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
														{t(
															`cascadeMarketplace.plan.modal.mode${mode.charAt(0)}${mode.slice(1).toLowerCase()}`,
														)}
													</button>
												),
											)}
										</div>
									</div>

									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-policyname-${index}`}
										>
											{t("cascadeMarketplace.plan.modal.policyNameLabel")}{" "}
											<span className="text-[#FB8379]">*</span>
										</label>
										<input
											className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
											id={`${uid}-policyname-${index}`}
											onChange={(e) =>
												updateRow(index, { policyName: e.target.value })
											}
											placeholder={t(
												"cascadeMarketplace.plan.modal.policyNamePlaceholder",
											)}
											type="text"
											value={row.policyName}
										/>
									</div>

									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-linkurl-${index}`}
										>
											{t("cascadeMarketplace.plan.modal.policyDocumentLabel")}{" "}
											<span className="text-[#FB8379]">*</span>
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
													{row.file
														? row.file.name
														: t(
																"cascadeMarketplace.plan.modal.clickToUploadOrDragDrop",
															)}
												</span>
												<span className="text-xs text-gray-400">
													{t("cascadeMarketplace.plan.modal.fileTypeHint")}
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

									<div>
										<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
											{t("cascadeMarketplace.plan.modal.whichCategoriesLabel")}
										</p>
										<p className="text-xs text-gray-400 mb-2">
											{t("cascadeMarketplace.plan.modal.categoriesHelp")}
										</p>
										<div className="flex flex-wrap gap-2">
											{CATEGORY_OPTIONS.map((category) => {
												const checked = row.categories.includes(category);
												return (
													<button
														className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
															checked
																? "bg-[rgba(20,134,150,0.1)] text-[#148696] border-[#148696]"
																: "bg-white text-gray-600 border-gray-200 hover:border-[#148696]/40"
														}`}
														key={category}
														onClick={() => toggleCategory(index, category)}
														type="button"
													>
														{category}
													</button>
												);
											})}
										</div>
									</div>
								</div>
							</div>
						))}

						<button
							className="flex items-center gap-2 text-sm font-bold text-[#148696] hover:text-[#0f6672]"
							onClick={addRow}
							type="button"
						>
							<Icons.AddCircleOutline style={{ fontSize: 20 }} />
							{t("cascadeMarketplace.plan.modal.addAnotherPolicy")}
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
										{t("common.cancel")}
									</button>
								</Dialog.Close>
								<button
									className="bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
									disabled={!canSubmit || submitMutation.isPending}
									onClick={() => submitMutation.mutate()}
									type="button"
								>
									{submitMutation.isPending && (
										<Icons.HourglassTop style={{ fontSize: 14 }} />
									)}
									{t("cascadeMarketplace.plan.modal.submitForReview")}
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
