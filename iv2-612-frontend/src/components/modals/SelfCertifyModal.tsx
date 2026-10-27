import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type SelfCertificationScoreType,
	selfCertificationService,
} from "$src/services/selfCertificationService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".png", ".jpg", ".jpeg"];
const ACCEPT_ATTR = ".pdf,.docx,.png,.jpg,.jpeg";

interface SelfCertifyModalProps {
	item: any | null;
	onClose: () => void;
}

export function SelfCertifyModal({ item, onClose }: SelfCertifyModalProps) {
	const { t } = useTranslation();
	const uid = useId();

	const [completionDate, setCompletionDate] = useState("");
	const [scoreType, setScoreType] =
		useState<SelfCertificationScoreType>("PERCENTAGE");
	const [scoreValue, setScoreValue] = useState("");
	const [proofFile, setProofFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const [keyLearnings, setKeyLearnings] = useState("");
	const [signatoryName, setSignatoryName] = useState("");
	const [signatoryTitle, setSignatoryTitle] = useState("");
	const [certified, setCertified] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setCompletionDate("");
		setScoreType("PERCENTAGE");
		setScoreValue("");
		setProofFile(null);
		setFileError(null);
		setKeyLearnings("");
		setSignatoryName("");
		setSignatoryTitle("");
		setCertified(false);
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	const submitMutation = useMutation({
		mutationFn: () =>
			selfCertificationService.submit(item.id, {
				completion_date: completionDate,
				score_type: scoreType,
				score_value: scoreValue.trim(),
				key_learnings: keyLearnings.trim(),
				signatory_name: signatoryName.trim(),
				signatory_title: signatoryTitle.trim(),
				certified,
				proof_file: proofFile as File,
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
			}),
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(t("cascadeMarketplace.plan.modal.selfCertifySubmitError")),
	});

	const handleFileSelected = (file: File | null) => {
		if (!file) {
			setProofFile(null);
			setFileError(null);
			return;
		}
		const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
		if (!ACCEPTED_EXTENSIONS.includes(extension)) {
			setProofFile(null);
			setFileError(t("cascadeMarketplace.plan.modal.fileTypeError"));
			return;
		}
		if (file.size > MAX_FILE_SIZE_BYTES) {
			setProofFile(null);
			setFileError(t("cascadeMarketplace.plan.modal.fileSizeError"));
			return;
		}
		setProofFile(file);
		setFileError(null);
	};

	const canSubmit =
		!!completionDate &&
		!!scoreValue.trim() &&
		!!proofFile &&
		!fileError &&
		!!keyLearnings.trim() &&
		!!signatoryName.trim() &&
		!!signatoryTitle.trim() &&
		certified;

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="560px">
				<span className="inline-block text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
					{t("cascadeMarketplace.plan.actions.selfCertify")}
				</span>
				<div className="flex items-start justify-between">
					<Dialog.Title>
						{t("cascadeMarketplace.plan.modal.selfCertifyTitle")}
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
				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t("cascadeMarketplace.plan.modal.selfCertifySubmittedTitle")}
						</h4>
						<p className="text-gray-500 text-sm">
							{t("cascadeMarketplace.plan.modal.selfCertifySubmittedMessage")}
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
					<div className="mt-4 px-2 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label
									className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1"
									htmlFor={`${uid}-date`}
								>
									{t("cascadeMarketplace.plan.modal.completionDateLabel")}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-date`}
									max={new Date().toISOString().split("T")[0]}
									onChange={(e) => setCompletionDate(e.target.value)}
									type="date"
									value={completionDate}
								/>
							</div>
							<div>
								<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
									{t("cascadeMarketplace.plan.modal.scoreResultStatusLabel")}{" "}
									<span className="text-[#FB8379]">*</span>
								</p>
								<div className="flex gap-1">
									{(
										[
											"PERCENTAGE",
											"SCORE",
											"OUTCOME",
										] as SelfCertificationScoreType[]
									).map((type) => (
										<button
											className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border transition-colors ${
												scoreType === type
													? "bg-[#004A60] text-white border-[#004A60]"
													: "bg-white text-gray-600 border-gray-200 hover:border-[#148696]/40"
											}`}
											key={type}
											onClick={() => {
												setScoreType(type);
												setScoreValue("");
											}}
											type="button"
										>
											{type === "PERCENTAGE" &&
												t("cascadeMarketplace.plan.modal.scoreTypePercentage")}
											{type === "SCORE" &&
												t("cascadeMarketplace.plan.modal.scoreTypeScore")}
											{type === "OUTCOME" &&
												t("cascadeMarketplace.plan.modal.scoreTypeOutcome")}
										</button>
									))}
								</div>
							</div>
						</div>

						<div>
							{scoreType === "OUTCOME" ? (
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									onChange={(e) => setScoreValue(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.modal.outcomePlaceholder",
									)}
									type="text"
									value={scoreValue}
								/>
							) : (
								<div className="relative">
									<input
										className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
										max={scoreType === "PERCENTAGE" ? 100 : undefined}
										min={0}
										onChange={(e) => setScoreValue(e.target.value)}
										placeholder={
											scoreType === "PERCENTAGE" ? "0 - 100" : "e.g. 85"
										}
										type="number"
										value={scoreValue}
									/>
									{scoreType === "PERCENTAGE" && (
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
											%
										</span>
									)}
								</div>
							)}
						</div>

						<div>
							<label
								className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1"
								htmlFor={`${uid}-proof`}
							>
								{t("cascadeMarketplace.plan.modal.proofOfCompletionLabel")}{" "}
								<span className="text-[#FB8379]">*</span>
							</label>
							<label
								className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer bg-white hover:border-[#148696]/50 transition-colors text-center"
								htmlFor={`${uid}-proof`}
							>
								<Icons.CloudUpload
									className="text-gray-400"
									style={{ fontSize: 28 }}
								/>
								<span className="text-sm text-gray-600">
									{proofFile
										? proofFile.name
										: t(
												"cascadeMarketplace.plan.modal.clickToUploadOrDragDrop",
											)}
								</span>
								<span className="text-xs text-gray-400">
									{t("cascadeMarketplace.plan.modal.proofFileTypeHint")}
								</span>
								<input
									accept={ACCEPT_ATTR}
									className="hidden"
									id={`${uid}-proof`}
									onChange={(e) =>
										handleFileSelected(e.target.files?.[0] ?? null)
									}
									type="file"
								/>
							</label>
							{fileError && (
								<p className="text-xs text-red-500 mt-1">{fileError}</p>
							)}
						</div>

						<div>
							<label
								className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1"
								htmlFor={`${uid}-learnings`}
							>
								{t("cascadeMarketplace.plan.modal.keyLearningsLabel")}{" "}
								<span className="text-[#FB8379]">*</span>
							</label>
							<p className="text-xs text-gray-400 mb-1">
								{t("cascadeMarketplace.plan.modal.keyLearningsHelp")}
							</p>
							<textarea
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696] resize-none"
								id={`${uid}-learnings`}
								onChange={(e) => setKeyLearnings(e.target.value)}
								placeholder={t(
									"cascadeMarketplace.plan.modal.keyLearningsPlaceholder",
								)}
								rows={4}
								value={keyLearnings}
							/>
						</div>

						<div className="border-t border-gray-100 pt-3">
							<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
								{t("cascadeMarketplace.plan.modal.authorisedSignatoryLabel")}
							</p>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="text-sm font-semibold text-gray-700 block mb-1"
										htmlFor={`${uid}-signatory-name`}
									>
										{t("forms.fullName")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
										id={`${uid}-signatory-name`}
										onChange={(e) => setSignatoryName(e.target.value)}
										placeholder={t(
											"cascadeMarketplace.plan.modal.signatoryNamePlaceholder",
										)}
										type="text"
										value={signatoryName}
									/>
								</div>
								<div>
									<label
										className="text-sm font-semibold text-gray-700 block mb-1"
										htmlFor={`${uid}-signatory-title`}
									>
										{t("forms.position")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
										id={`${uid}-signatory-title`}
										onChange={(e) => setSignatoryTitle(e.target.value)}
										placeholder={t(
											"cascadeMarketplace.plan.modal.signatoryTitlePlaceholder",
										)}
										type="text"
										value={signatoryTitle}
									/>
								</div>
							</div>
						</div>

						<label className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer">
							<input
								checked={certified}
								className="mt-0.5 w-4 h-4 accent-[#148696]"
								onChange={(e) => setCertified(e.target.checked)}
								type="checkbox"
							/>
							<span className="text-sm text-gray-600">
								{t("cascadeMarketplace.plan.modal.certificationStatement")}
							</span>
						</label>

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
									{t("cascadeMarketplace.plan.modal.submitCertification")}
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
