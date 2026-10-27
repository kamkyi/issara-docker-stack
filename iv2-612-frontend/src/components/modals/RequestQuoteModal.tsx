import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguages } from "$hooks/useLanguages";
import { useNationalities } from "$src/queries/nationalities";
import { quoteRequestService } from "$src/services/quoteRequestService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

interface ChipInputProps {
	values: string[];
	onChange: (values: string[]) => void;
	suggestions?: string[];
	placeholder?: string;
	inputId: string;
}

function ChipInput({
	values,
	onChange,
	suggestions = [],
	placeholder,
	inputId,
}: ChipInputProps) {
	const [draft, setDraft] = useState("");

	const filteredSuggestions = useMemo(() => {
		if (!draft.trim()) return [];
		const lower = draft.trim().toLowerCase();
		return suggestions
			.filter((s) => s.toLowerCase().includes(lower) && !values.includes(s))
			.slice(0, 6);
	}, [draft, suggestions, values]);

	const addValue = (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed || values.includes(trimmed)) {
			setDraft("");
			return;
		}
		onChange([...values, trimmed]);
		setDraft("");
	};

	const removeValue = (value: string) =>
		onChange(values.filter((v) => v !== value));

	return (
		<div>
			<div className="flex flex-wrap gap-1.5 mb-1.5">
				{values.map((value) => (
					<span
						className="inline-flex items-center gap-1 bg-[rgba(20,134,150,0.1)] text-[#148696] border border-[#148696]/30 rounded-md px-2 py-0.5 text-xs font-semibold"
						key={value}
					>
						{value}
						<button
							aria-label={`Remove ${value}`}
							className="hover:text-red-500"
							onClick={() => removeValue(value)}
							type="button"
						>
							<Icons.Close style={{ fontSize: 12 }} />
						</button>
					</span>
				))}
			</div>
			<div className="relative">
				<input
					className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
					id={inputId}
					onBlur={() => addValue(draft)}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							addValue(draft);
						}
					}}
					placeholder={placeholder}
					type="text"
					value={draft}
				/>
				{filteredSuggestions.length > 0 && (
					<div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
						{filteredSuggestions.map((s) => (
							<button
								className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
								key={s}
								onClick={() => addValue(s)}
								onMouseDown={(e) => e.preventDefault()}
								type="button"
							>
								{s}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface RequestQuoteModalProps {
	item: any | null;
	onClose: () => void;
}

export function RequestQuoteModal({ item, onClose }: RequestQuoteModalProps) {
	const { t } = useTranslation();
	const uid = useId();
	const { data: nationalitiesData } = useNationalities();
	const nationalityOptions = nationalitiesData?.results ?? [];
	const { data: languagesData = [] } = useLanguages();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [nationalities, setNationalities] = useState<string[]>([]);
	const [languages, setLanguages] = useState<string[]>([]);
	const [showOthers, setShowOthers] = useState(false);
	const [totalWorkers, setTotalWorkers] = useState("");
	const [notes, setNotes] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setFullName("");
		setEmail("");
		setCompany("");
		setNationalities([]);
		setLanguages([]);
		setShowOthers(false);
		setTotalWorkers("");
		setNotes("");
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	const submitMutation = useMutation({
		mutationFn: () =>
			quoteRequestService.submit({
				solution_id: item.id,
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
				full_name: fullName.trim(),
				email: email.trim(),
				company: company.trim() || undefined,
				worker_nationalities: nationalities,
				languages_spoken: languages,
				total_workers: Number(totalWorkers),
				notes: notes.trim(),
			}),
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(
				t("cascadeMarketplace.plan.modal.requestQuoteSubmitError"),
			),
	});

	const canSubmit =
		fullName.trim() &&
		email.trim() &&
		nationalities.length > 0 &&
		languages.length > 0 &&
		totalWorkers.trim() &&
		notes.trim();

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="640px">
				<div className="flex items-start justify-between">
					<Dialog.Title>
						{t("cascadeMarketplace.plan.modal.requestQuoteTitle")}
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
				{item && (
					<Dialog.Description className="text-sm text-gray-500 mb-2">
						{t("cascadeMarketplace.plan.modal.requestQuoteDescription")}{" "}
						<strong>{item.title}</strong>
					</Dialog.Description>
				)}

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t("cascadeMarketplace.plan.modal.quoteRequested")}
						</h4>
						<p className="text-gray-500 text-sm">
							{t("cascadeMarketplace.plan.modal.requestQuoteSubmittedMessage")}
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
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-name`}
								>
									{t("forms.fullName")}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-name`}
									onChange={(e) => setFullName(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.modal.namePlaceholder",
									)}
									type="text"
									value={fullName}
								/>
							</div>
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-email`}
								>
									{t("common.email")} <span className="text-[#FB8379]">*</span>
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-email`}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your@email.com"
									type="email"
									value={email}
								/>
							</div>
						</div>
						<div>
							<label
								className="text-sm font-bold text-gray-700 block mb-1"
								htmlFor={`${uid}-company`}
							>
								{t("forms.company")}
							</label>
							<input
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
								id={`${uid}-company`}
								onChange={(e) => setCompany(e.target.value)}
								placeholder={t(
									"cascadeMarketplace.plan.modal.companyPlaceholder",
								)}
								type="text"
								value={company}
							/>
						</div>

						<div className="border-t border-gray-100 pt-3">
							<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
								{t("cascadeMarketplace.plan.modal.workerDetails")}
							</p>

							<div className="grid grid-cols-2 gap-3 mb-2">
								<div>
									<label
										className="text-sm font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-nationalities`}
									>
										{t(
											"cascadeMarketplace.plan.modal.workerNationalitiesLabel",
										)}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<p className="text-xs text-gray-400 mb-1">
										{t("cascadeMarketplace.plan.modal.workerNationalitiesHelp")}
									</p>
									<ChipInput
										inputId={`${uid}-nationalities`}
										onChange={setNationalities}
										placeholder={t(
											"cascadeMarketplace.plan.modal.workerNationalitiesPlaceholder",
										)}
										suggestions={nationalityOptions.map((n) => n.name)}
										values={nationalities}
									/>
								</div>

								<div>
									<label
										className="text-sm font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-languages`}
									>
										{t("cascadeMarketplace.plan.modal.languagesSpokenLabel")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<p className="text-xs text-gray-400 mb-1">
										{t("cascadeMarketplace.plan.modal.languagesSpokenHelp")}
									</p>
									<ChipInput
										inputId={`${uid}-languages`}
										onChange={setLanguages}
										placeholder={t(
											"cascadeMarketplace.plan.modal.languagesSpokenPlaceholder",
										)}
										suggestions={languagesData.map((l) => l.name)}
										values={languages}
									/>
								</div>
							</div>

							{showOthers ? (
								<div className="mt-2">
									<label
										className="text-xs font-semibold text-gray-500 block mb-1"
										htmlFor={`${uid}-others`}
									>
										{t("cascadeMarketplace.plan.modal.othersLanguagesLabel")}
									</label>
									<ChipInput
										inputId={`${uid}-others`}
										onChange={(others) =>
											setLanguages((prev) =>
												Array.from(new Set([...prev, ...others])),
											)
										}
										placeholder={t(
											"cascadeMarketplace.plan.modal.othersLanguagesPlaceholder",
										)}
										values={[]}
									/>
								</div>
							) : (
								<button
									className="flex items-center gap-1 text-sm font-bold text-[#148696] hover:text-[#0f6672] mt-1"
									onClick={() => setShowOthers(true)}
									type="button"
								>
									<Icons.AddCircleOutline style={{ fontSize: 16 }} />
									{t("cascadeMarketplace.plan.modal.othersLanguagesToggle")}
								</button>
							)}

							<div className="mt-3">
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-workers`}
								>
									{t("cascadeMarketplace.plan.modal.totalWorkersLabel")}{" "}
									<span className="text-[#FB8379]">*</span>
								</label>
								<p className="text-xs text-gray-400 mb-1">
									{t("cascadeMarketplace.plan.modal.totalWorkersHelp")}
								</p>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-workers`}
									min={0}
									onChange={(e) => setTotalWorkers(e.target.value)}
									placeholder={t(
										"cascadeMarketplace.plan.modal.totalWorkersPlaceholder",
									)}
									type="number"
									value={totalWorkers}
								/>
							</div>
						</div>

						<div>
							<label
								className="text-sm font-bold text-gray-700 block mb-1"
								htmlFor={`${uid}-notes`}
							>
								{t("cascadeMarketplace.plan.modal.describeNeeds")}{" "}
								<span className="text-[#FB8379]">*</span>
							</label>
							<textarea
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696] resize-none"
								id={`${uid}-notes`}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={t(
									"cascadeMarketplace.plan.modal.describeNeedsPlaceholder",
								)}
								rows={3}
								value={notes}
							/>
						</div>

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
									{t("cascadeMarketplace.plan.modal.submitRequest")}
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
