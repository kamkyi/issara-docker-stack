import * as Icons from "@mui/icons-material";
import { Card, Checkbox, Dialog } from "@radix-ui/themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Fragment, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguages } from "$hooks/useLanguages";
import CascadeButton from "$src/components/button/button";
import { AgencyDisclosureModal } from "$src/components/modals/AgencyDisclosureModal";
import { RequestQuoteModal } from "$src/components/modals/RequestQuoteModal";
import { RequestWageQuoteModal } from "$src/components/modals/RequestWageQuoteModal";
import { ScheduleModal } from "$src/components/modals/ScheduleModal";
import { SelfCertifyModal } from "$src/components/modals/SelfCertifyModal";
import { UploadContractDocumentsModal } from "$src/components/modals/UploadContractDocumentsModal";
import { UploadPolicyDocumentsModal } from "$src/components/modals/UploadPolicyDocumentsModal";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import { useTranslateBatch } from "$src/queries/useTranslateBatch";
import {
	marketplaceService,
	type PendingSolution,
} from "$src/services/marketplaceService";
import { trainingService } from "$src/services/trainingService";
import { useNotificationStore } from "$src/store/notificationStore";
import { useViewModeStore } from "$src/store/viewModeStore";
import {
	getActiveSupplierId,
	getNotificationParams,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";
import { ensureArray } from "$src/utils/ensureArray";

const SolutionActionName = {
	ScheduleKickoff: "schedule-kickoff",
	Register: "register",
	RequestQuote: "request-quote",
	RequestQuoteWages: "request-quote-wages",
	RegisterForTraining: "register-for-training",
	SelfCertify: "self-certify",
	NotifySuppliers: "notify-suppliers",
	AgencyDisclosure: "enter-here",
	UploadDocuments: "upload-documents",
	Schedule: "schedule",
	UploadContractDocuments: "upload-documents-contract",
} as const;

type SolutionActionName =
	(typeof SolutionActionName)[keyof typeof SolutionActionName];
type ModalType = SolutionActionName | null;

interface FormState {
	name: string;
	email: string;
	company: string;
	preferredDate: string;
	notes: string;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const PAID_BUYERS_FUNDED = "Paid (Buyers-Funded)";

const getCostLabel = (t: TranslateFn, cost?: string | null): string => {
	if (!cost) return "";
	if (cost.startsWith("Free")) return t("cascadeMarketplace.shared.cost.free");
	if (cost.startsWith("Paid Training")) {
		return t("cascadeMarketplace.shared.cost.training");
	}
	if (cost.includes("Service")) {
		return t("cascadeMarketplace.shared.cost.service");
	}
	if (cost.startsWith("Investment")) {
		return t("cascadeMarketplace.shared.cost.investment");
	}
	if (cost === "Subscription") {
		return t("cascadeMarketplace.shared.cost.subscription");
	}
	if (cost === "Paid") return t("cascadeMarketplace.shared.cost.paid");
	return cost;
};

interface IssaraAcademyForm {
	country: string;
	organization: string;
	position: string;
	firstName: string;
	lastName: string;
	email: string;
	attendedBefore: "yes" | "no" | "";
}

function IssaraAcademyModalContent({
	item,
	onClose,
}: {
	item: any;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const uid = useId();
	const { data: languages = [] } = useLanguages();
	const { data: countriesData } = useCascadeCountries();
	const countries: { id: number; name: string }[] = Array.isArray(countriesData)
		? countriesData
		: (countriesData?.results ?? countriesData?.data ?? []);

	const solutionLanguages: {
		language: { id: number; name: string };
		training_dates?: { id: number; training_date: string }[];
	}[] = item.solution_languages ?? item.languages ?? [];

	const [selectedByLang, setSelectedByLang] = useState<
		Record<number, number[]>
	>({});
	const [form, setForm] = useState<IssaraAcademyForm>({
		country: "",
		organization: "",
		position: "",
		firstName: "",
		lastName: "",
		email: "",
		attendedBefore: "",
	});
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const registrationMutation = useMutation({
		mutationFn: () =>
			trainingService.registerAcademy({
				solution_id: item.id,
				language_training: Object.entries(selectedByLang)
					.filter(([, tdIds]) => tdIds.length > 0)
					.map(([lang, tdIds]) => {
						const entry = solutionLanguages.find(
							(sl) => sl.language.id === Number(lang),
						);
						return {
							language: Number(lang),
							training_dates: tdIds.map(
								(tdId) =>
									entry?.training_dates?.find((td) => td.id === tdId)
										?.training_date ?? "",
							),
						};
					}),
				country: form.country,
				organization: form.organization,
				position: form.position,
				first_name: form.firstName,
				last_name: form.lastName,
				email: form.email,
				attended_before: form.attendedBefore === "yes",
				submitted_by_user_id: getSubmittedByUserId(),
			}),
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(t("cascadeMarketplace.plan.academy.submitError")),
	});

	const toggleDate = (langId: number, tdId: number) =>
		setSelectedByLang((prev) => {
			const current = prev[langId] ?? [];
			const next = current.includes(tdId)
				? current.filter((id) => id !== tdId)
				: [...current, tdId];
			if (next.length === 0) {
				const updated = { ...prev };
				delete updated[langId];
				return updated;
			}
			return { ...prev, [langId]: next };
		});

	const canSubmit =
		Object.values(selectedByLang).some((d) => d.length > 0) &&
		form.country &&
		form.organization &&
		form.firstName &&
		form.lastName &&
		form.email &&
		form.attendedBefore;

	if (submitted) {
		return (
			<div className="py-8 text-center space-y-4">
				<Icons.CheckCircle
					className="text-green-500 mx-auto"
					style={{ fontSize: 56 }}
				/>
				<h4 className="font-bold text-[#004A60] text-lg">
					{t("cascadeMarketplace.plan.academy.submittedTitle")}
				</h4>
				<p className="text-gray-500 text-sm">
					{t("cascadeMarketplace.plan.academy.submittedBody")}
				</p>
				<Dialog.Close>
					<button
						className="mt-2 bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672]"
						onClick={onClose}
						type="button"
					>
						{t("common.close")}
					</button>
				</Dialog.Close>
			</div>
		);
	}

	return (
		<div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
			{/* Languages */}
			{solutionLanguages.length > 0 && (
				<div>
					<p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
						{t("cascadeMarketplace.plan.academy.availableLanguages")}
					</p>
					<div className="flex flex-wrap gap-2">
						{solutionLanguages.map((langId) => {
							const lang = languages.find((l) => l.id === langId.language.id);
							return langId.training_dates
								? langId.training_dates.map((td) => {
										const isChecked = Boolean(
											selectedByLang[langId.language.id]?.includes(td.id),
										);
										const handleToggle = () =>
											toggleDate(langId.language.id, td.id);
										return (
											<div
												className={`bg-white w-full border rounded-md px-3 py-2 flex items-center gap-2 text-sm justify-between cursor-pointer transition-colors ${
													isChecked
														? "border-[#148696] bg-[rgba(20,134,150,0.06)]"
														: "border-gray-200 hover:border-[#148696]/40"
												}`}
												key={td.id}
												onClick={handleToggle}
											>
												<div className="flex items-center gap-2">
													<Checkbox
														checked={isChecked}
														className="accent-[#148696]"
														onCheckedChange={handleToggle}
														tabIndex={-1}
													/>
													{lang?.name ?? `Language ${langId.language.name}`}
												</div>
												<div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-sm bg-[#e8f7f9] text-[#148696] border border-[#b8e8ef]">
													{td.training_date}
												</div>
											</div>
										);
									})
								: null;
						})}
					</div>
				</div>
			)}

			{/* Details form */}
			<div className="border-t border-gray-100 pt-4">
				<p className="text-md font-black text-gray-500 mb-4">
					{t("cascadeMarketplace.plan.academy.addYourDetails")}
				</p>
				<div className="space-y-3">
					{/* First + Last name */}
					<div className="grid grid-cols-2 gap-3">
						<div>
							<label
								className="text-sm font-semibold text-gray-700 block mb-1"
								htmlFor={`${uid}-fn`}
							>
								{t("forms.firstName")} *
							</label>
							<input
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
								id={`${uid}-fn`}
								onChange={(e) =>
									setForm((f) => ({ ...f, firstName: e.target.value }))
								}
								placeholder={t(
									"cascadeMarketplace.plan.academy.firstNamePlaceholder",
								)}
								type="text"
								value={form.firstName}
							/>
						</div>
						<div>
							<label
								className="text-sm font-semibold text-gray-700 block mb-1"
								htmlFor={`${uid}-ln`}
							>
								{t("forms.lastName")} *
							</label>
							<input
								className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
								id={`${uid}-ln`}
								onChange={(e) =>
									setForm((f) => ({ ...f, lastName: e.target.value }))
								}
								placeholder={t(
									"cascadeMarketplace.plan.academy.lastNamePlaceholder",
								)}
								type="text"
								value={form.lastName}
							/>
						</div>
					</div>

					{/* Email */}
					<div>
						<label
							className="text-sm font-semibold text-gray-700 block mb-1"
							htmlFor={`${uid}-email`}
						>
							{t("common.email")} *
						</label>
						<input
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
							id={`${uid}-email`}
							onChange={(e) =>
								setForm((f) => ({ ...f, email: e.target.value }))
							}
							placeholder="your@email.com"
							type="email"
							value={form.email}
						/>
					</div>

					{/* Country */}
					<div>
						<label
							className="text-sm font-semibold text-gray-700 block mb-1"
							htmlFor={`${uid}-country`}
						>
							{t("common.country")} *
						</label>
						<select
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696] bg-white"
							id={`${uid}-country`}
							onChange={(e) =>
								setForm((f) => ({ ...f, country: e.target.value }))
							}
							value={form.country}
						>
							<option value="">
								{t("cascadeMarketplace.plan.academy.selectCountry")}
							</option>
							{countries.map((c) => (
								<option key={c.id} value={String(c.id)}>
									{c.name}
								</option>
							))}
						</select>
					</div>

					{/* Organization */}
					<div>
						<label
							className="text-sm font-semibold text-gray-700 block mb-1"
							htmlFor={`${uid}-org`}
						>
							{t("cascadeMarketplace.plan.academy.organizationCompany")} *
						</label>
						<input
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
							id={`${uid}-org`}
							onChange={(e) =>
								setForm((f) => ({ ...f, organization: e.target.value }))
							}
							placeholder={t(
								"cascadeMarketplace.plan.academy.organizationPlaceholder",
							)}
							type="text"
							value={form.organization}
						/>
					</div>

					{/* Position */}
					<div>
						<label
							className="text-sm font-semibold text-gray-700 block mb-1"
							htmlFor={`${uid}-pos`}
						>
							{t("forms.position")}
						</label>
						<p className="text-xs text-gray-400 mb-1">
							{t("cascadeMarketplace.plan.academy.positionHelp")}
						</p>
						<textarea
							className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696] resize-none"
							id={`${uid}-pos`}
							onChange={(e) =>
								setForm((f) => ({ ...f, position: e.target.value }))
							}
							placeholder={t(
								"cascadeMarketplace.plan.academy.positionPlaceholder",
							)}
							rows={2}
							value={form.position}
						/>
					</div>

					{/* Attended before */}
					<div>
						<p className="text-sm font-semibold text-gray-700 mb-2">
							{t("cascadeMarketplace.plan.academy.attendedBeforeQuestion")}*
						</p>
						<div className="flex gap-6">
							{(["yes", "no"] as const).map((val) => (
								<label
									className="flex items-center gap-2 cursor-pointer"
									key={val}
								>
									<input
										aria-label={
											val === "yes" ? t("common.yes") : t("common.no")
										}
										checked={form.attendedBefore === val}
										className="w-4 h-4 accent-[#148696]"
										name={`${uid}-attended`}
										onChange={() =>
											setForm((f) => ({ ...f, attendedBefore: val }))
										}
										type="radio"
										value={val}
									/>
									<span className="text-sm text-gray-700">
										{val === "yes" ? t("common.yes") : t("common.no")}
									</span>
								</label>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
				{submitError && (
					<p className="text-sm text-red-500 text-right">{submitError}</p>
				)}
				<div className="flex gap-3 justify-end">
					<Dialog.Close>
						<button
							className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50"
							type="button"
						>
							{t("common.cancel")}
						</button>
					</Dialog.Close>
					<button
						className="bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						disabled={!canSubmit || registrationMutation.isPending}
						onClick={() => registrationMutation.mutate()}
						type="button"
					>
						{registrationMutation.isPending && (
							<Icons.HourglassTop style={{ fontSize: 14 }} />
						)}
						{t("cascadeMarketplace.plan.academy.submitRegistration")}
					</button>
				</div>
			</div>
		</div>
	);
}

interface PlanViewProps {
	planItems: any[];
	onBrowse: () => void;
	onRemove: (id: number) => void;
}

interface ActionRequiredSectionProps {
	items: PendingSolution[];
	isLoading: boolean;
	onAccept: (id: number) => void;
	onDecline: (id: number) => void;
	pendingId: number | null;
	translations: Record<string, string>;
}

const ActionRequiredSection = ({
	items,
	isLoading,
	onAccept,
	onDecline,
	pendingId,
	translations,
}: ActionRequiredSectionProps) => {
	const { t } = useTranslation();
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";
	if (!isLoading && items.length === 0) return null;
	return (
		<div className="p-6 rounded-3xl border-2 border-dashed border-orange-200 bg-orange-50/40">
			<div className="flex items-center gap-2 mb-4">
				<Icons.PriorityHigh className="text-orange-500" />
				<h3 className="text-xl font-black text-[#004A60]">
					{t("cascadeMarketplace.plan.actionRequired.title")}
				</h3>
				<span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
					{t("cascadeMarketplace.plan.actionRequired.pending", {
						count: items.length,
					})}
				</span>
			</div>
			{isLoading ? (
				<div className="text-sm text-gray-500 py-4">
					{t("cascadeMarketplace.plan.actionRequired.loading")}
				</div>
			) : (
				<div className="space-y-3">
					{items.map((row) => {
						const isSponsored = row.type === "SPONSORED";
						const isPending = pendingId === row.id;
						return (
							<Card
								className="bg-white shadow-sm rounded-2xl border border-gray-100"
								key={row.id}
							>
								<div className="p-5 flex items-start gap-4">
									<div
										className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${
											isSponsored
												? "bg-green-50 text-green-700"
												: "bg-blue-50 text-blue-700"
										}`}
									>
										{isSponsored ? <Icons.Paid /> : <Icons.Recommend />}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span
												className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
													isSponsored
														? "bg-green-100 text-green-700"
														: "bg-blue-100 text-blue-700"
												}`}
											>
												{isSponsored ? "Sponsored" : "Recommended"}
												{isSponsored
													? t(
															"cascadeMarketplace.plan.actionRequired.sponsored",
														)
													: t(
															"cascadeMarketplace.plan.actionRequired.recommended",
														)}
											</span>
											<span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
												{(row as any).buyer?.name ||
													(String(row.buyer_id ?? "").startsWith("user_")
														? t(
																"cascadeMarketplace.plan.actionRequired.strategicPartner",
															)
														: t(
																"cascadeMarketplace.plan.actionRequired.fromBuyer",
																{
																	id: row.buyer_id,
																},
															))}
											</span>
										</div>
										<h5 className="text-base font-black text-[#004A60] leading-snug">
											{row.solution?.title
												? translateValue(row.solution.title)
												: `Solution #${row.solution_id}`}
										</h5>
										{row.solution?.description && (
											<p
												className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2"
												dangerouslySetInnerHTML={{
													__html: translateValue(row.solution.description),
												}}
											/>
										)}
										<div className="mt-3 flex items-center gap-2 flex-wrap">
											{row.solution?.impact != null && (
												<span className="inline-flex items-center gap-1 bg-[#e6f8f4] text-[#148696] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
													<Icons.TrendingUp style={{ fontSize: 12 }} />+
													{row.solution.impact} pts
												</span>
											)}
											{row.solution?.price != null && (
												<span className="inline-flex items-center bg-[#f5f3ff] text-[#523bae] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
													${row.solution.price.toLocaleString()}
												</span>
											)}
										</div>
									</div>
									<div className="flex flex-col gap-2 shrink-0">
										<CascadeButton
											buttonText={
												isPending
													? t("cascadeMarketplace.plan.actionRequired.saving")
													: t(
															"cascadeMarketplace.plan.actionRequired.acceptAdd",
														)
											}
											className="rounded-lg bg-green-600 text-white shrink-0"
											handleOnClick={() => !isPending && onAccept(row.id)}
											iconLeft={<Icons.Check style={{ fontSize: 16 }} />}
											size="2"
										/>
										<CascadeButton
											buttonText={t(
												"cascadeMarketplace.plan.actionRequired.decline",
											)}
											className="rounded-lg border border-red-200 text-red-600 shrink-0"
											handleOnClick={() => !isPending && onDecline(row.id)}
											iconLeft={<Icons.Close style={{ fontSize: 16 }} />}
											size="2"
											variant="outline"
										/>
									</div>
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
};

export const PlanView = ({
	planItems,
	onBrowse,
	onRemove,
	onClearAll,
	onAdd,
}: PlanViewProps & {
	onClearAll?: () => void;
	onAdd?: (solution: any, meta?: any) => void;
}) => {
	const { t } = useTranslation();
	const [modalType, setModalType] = useState<ModalType>(null);
	const [selectedItem, setSelectedItem] = useState<any>(null);
	const [agencyDisclosureItem, setAgencyDisclosureItem] = useState<any>(null);
	const [uploadDocsItem, setUploadDocsItem] = useState<any>(null);
	const [quoteRequestItem, setQuoteRequestItem] = useState<any>(null);
	const [wageQuoteItem, setWageQuoteItem] = useState<any>(null);
	const [selfCertifyItem, setSelfCertifyItem] = useState<any>(null);
	const [scheduleItem, setScheduleItem] = useState<any>(null);
	const [uploadContractDocsItem, setUploadContractDocsItem] =
		useState<any>(null);
	const [form, setForm] = useState<FormState>({
		name: "",
		email: "",
		company: "",
		preferredDate: "",
		notes: "",
	});
	const [submitted, setSubmitted] = useState(false);
	const [notifyStatus, setNotifyStatus] = useState<
		Record<number, "idle" | "pending" | "success" | "error">
	>({});
	const uid = useId();
	const queryClient = useQueryClient();
	const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
	const viewMode = useViewModeStore((s) => s.viewMode);
	const isSupplierView = viewMode === "supplier-view";

	const pendingQuery = useQuery({
		queryKey: ["marketplace-pending"],
		queryFn: () => {
			const supplierId = getActiveSupplierId();
			return marketplaceService.listPending(supplierId || undefined);
		},
		enabled: isSupplierView,
		refetchInterval: 60000,
	});

	const planTexts = useMemo(() => {
		const values: string[] = [];

		for (const item of ensureArray(planItems)) {
			values.push(item.title, item.description, item.category, item.type);
			ensureArray(item.thematic_tags).forEach((tag: string) => {
				if (typeof tag === "string") values.push(tag);
			});
			ensureArray(item.partners).forEach((partner: any) => {
				if (typeof partner === "string") {
					values.push(partner);
					return;
				}
				if (partner?.name) values.push(partner.name);
				if (partner?.code) values.push(partner.code);
			});
		}

		for (const row of ensureArray(pendingQuery.data)) {
			if (row.solution?.title) values.push(row.solution.title);
			if (row.solution?.description) values.push(row.solution.description);
			const buyerName = (row as any).buyer?.name;
			if (buyerName) values.push(buyerName);
		}

		if (selectedItem?.title) values.push(selectedItem.title);

		return values;
	}, [planItems, pendingQuery.data, selectedItem]);

	const { translations } = useTranslateBatch(planTexts);
	const translateValue = (text?: string | null) =>
		text ? (translations[text] ?? text) : "";

	const respondMutation = useMutation({
		mutationFn: ({
			id,
			action,
			supplierId,
		}: {
			id: number;
			action: "ACCEPT" | "DECLINE";
			supplierId?: string | number;
		}) => marketplaceService.respondToSolution(id, action, supplierId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["marketplace-pending"] });
			fetchNotifications(getNotificationParams());
			// if this was an accept action, add the solution to the plan view via callback
			try {
				const vars = (respondMutation as any).variables;
				if (vars?.action === "ACCEPT" && typeof onAdd === "function") {
					const pending = pendingQuery.data ?? [];
					const row = pending.find((r: any) => r.id === vars.id);
					if (row?.solution) {
						onAdd(row.solution, {
							action: "self",
							partners: (row as any).partners ?? [],
						});
					}
				}
			} catch {
				// swallow errors — non-fatal
			}
		},
	});
	if (planItems.length === 0) {
		return (
			<div className="space-y-8 pb-12">
				{isSupplierView && (
					<ActionRequiredSection
						isLoading={pendingQuery.isLoading}
						items={pendingQuery.data ?? []}
						onAccept={(id) =>
							respondMutation.mutate({
								id,
								action: "ACCEPT",
								supplierId: getActiveSupplierId() || undefined,
							})
						}
						onDecline={(id) =>
							respondMutation.mutate({
								id,
								action: "DECLINE",
								supplierId: getActiveSupplierId() || undefined,
							})
						}
						pendingId={
							respondMutation.isPending
								? (respondMutation.variables?.id ?? null)
								: null
						}
						translations={translations}
					/>
				)}
				<div className="p-16 border-none bg-white shadow-sm rounded-3xl flex flex-col items-center text-center">
					<div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8">
						<Icons.ShoppingBagOutlined className="text-gray-300 text-5xl" />
					</div>
					<h3 className="text-2xl font-black text-[#004A60] mb-4">
						{t("cascadeMarketplace.plan.empty.title")}
					</h3>
					<p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
						{t("cascadeMarketplace.plan.empty.body")}
					</p>
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.empty.button")}
						className="rounded-xl px-12 bg-[#004A60]"
						handleOnClick={onBrowse}
						iconRight={<Icons.ArrowForward className="ml-2" />}
						size="3"
					/>
				</div>
			</div>
		);
	}

	const totalImpact = Math.min(
		ensureArray(planItems).reduce((sum, item) => sum + item.impact, 0),
		20,
	);

	// Split items by action so we can highlight sponsoring/recommend sections
	const sponsorItems = ensureArray(planItems).filter(
		(it) => it.action === "sponsor",
	);
	const recommendItems = ensureArray(planItems).filter(
		(it) => it.action === "recommend",
	);
	const selfItems = ensureArray(planItems).filter(
		(it) => !it.action || it.action === "self",
	);

	// Group self items by category
	const groupedSelfItems = selfItems.reduce(
		(acc, item) => {
			const type = item.category || "Other";
			if (!acc[type]) acc[type] = [];
			acc[type].push(item);
			return acc;
		},
		{} as Record<string, any[]>,
	);

	const renderPlanItem = (item: any, i: number) => {
		const IconComponent = (Icons as any)[item.icon] || Icons.Help;

		const isSponsor = item.action === "sponsor";
		const isRecommend = item.action === "recommend";
		const isSupplierAction = isSponsor || isRecommend;

		const partners: any[] = ensureArray(item.partners);
		const supplierChips = partners.map((p: any) => ({
			name:
				typeof p === "string"
					? translateValue(p)
					: p.name ||
						translateValue(p.code) ||
						(p.id ? `S-${String(p.id).padStart(3, "0")}` : ""),
			code:
				typeof p === "string"
					? translateValue(p)
					: p.code || (p.id ? `S-${String(p.id).padStart(3, "0")}` : ""),
			initials:
				typeof p === "string"
					? p.slice(0, 2).toUpperCase()
					: (p.name || p.code || "?")
							.split(/[\s(]/)
							.filter(Boolean)
							.slice(0, 2)
							.map((w: string) => w[0])
							.join("")
							.toUpperCase(),
		}));

		return (
			<Fragment key={item.id}>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: i * 0.1 }}
				>
					<Card className="bg-white shadow-sm hover:shadow-md transition-all rounded-2xl border border-gray-100">
						<div className="p-5">
							{/* Header row */}
							<div className="flex items-start gap-4">
								<div className="w-11 h-11 bg-[#e6f6f8] text-[#148696] rounded-xl shrink-0 flex items-center justify-center">
									<IconComponent fontSize="small" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2">
										<h5 className="text-base font-black text-[#004A60] leading-snug">
											{translateValue(item.title)}
										</h5>
										<button
											className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
											onClick={() => onRemove(item.id)}
										>
											<Icons.Close style={{ fontSize: 14 }} />
										</button>
									</div>
									<p
										className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2"
										dangerouslySetInnerHTML={{
											__html: translateValue(item.description),
										}}
									/>
								</div>
							</div>

							{/* Supplier chips row */}
							{isSupplierAction && supplierChips.length > 0 && (
								<div className="mt-3 pl-15 flex flex-wrap gap-1.5 ml-[60px]">
									{supplierChips.slice(0, 5).map((s) => (
										<div className="relative group" key={s.code}>
											<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border cursor-default bg-gray-100 border-gray-200">
												<span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 bg-gray-400 text-white">
													{s.initials.slice(0, 2)}
												</span>
												<span className="max-w-[120px] truncate text-gray-600">
													{s.name}
												</span>
												<span className="text-gray-400 shrink-0">{s.code}</span>
											</div>
											<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
												<div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
													{s.name}{" "}
													<span className="opacity-60">({s.code})</span>
												</div>
												<div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
											</div>
										</div>
									))}
									{supplierChips.length > 5 && (
										<div className="relative group cursor-default">
											<div className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
												+{supplierChips.length - 5} more
											</div>
											<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
												<div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
													{supplierChips.slice(5).map((s) => (
														<div className="py-0.5" key={s.code}>
															{s.name}{" "}
															<span className="opacity-60">({s.code})</span>
														</div>
													))}
												</div>
												<div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
											</div>
										</div>
									)}
								</div>
							)}

							{/* Policy tags for self items */}
							{!isSupplierAction &&
								item.type === "Policy" &&
								ensureArray(item.thematic_tags).length > 0 && (
									<div className="mt-3 ml-[60px] flex flex-wrap gap-1.5">
										{ensureArray(item.thematic_tags).map((tag: string) => (
											<div
												className="bg-[#f3f0ff] text-[#523bae] px-2 py-1 rounded-md text-[10px] font-black uppercase"
												key={tag}
											>
												{translateValue(tag)}
											</div>
										))}
									</div>
								)}

							{/* Footer row: badges + action button */}
							<div className="mt-4 ml-[60px] flex items-center justify-between gap-3">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="inline-flex items-center gap-1 bg-[#e6f8f4] text-[#148696] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
										<Icons.TrendingUp style={{ fontSize: 12 }} />
										{isSupplierAction
											? t("cascadeMarketplace.plan.item.pointsPerSupplier", {
													count: item.impact,
												})
											: t("cascadeMarketplace.plan.item.points", {
													count: item.impact,
												})}
									</span>
									<span className="inline-flex items-center bg-[#f5f3ff] text-[#523bae] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide">
										{item.cost === PAID_BUYERS_FUNDED ? (
											<>
												<span style={{ textDecoration: "line-through" }}>
													{t("cascadeMarketplace.shared.cost.paidWithStruck")}
												</span>
												<span>
													{" "}
													{t("cascadeMarketplace.shared.cost.free")}
													{" ("}
													{t("cascadeMarketplace.shared.cost.paidWithSuffix")}
													{")"}
												</span>
											</>
										) : (
											getCostLabel(t, item.cost)
										)}
									</span>
								</div>
								{item.action === "self" ? (
									item.actions?.length > 0 ? (
										<div className="shrink-0">{renderActionButton(item)}</div>
									) : (
										<span className="text-sm text-orange-500">
											{t("cascadeMarketplace.plan.item.noActionAssigned")}
										</span>
									)
								) : null}
							</div>
						</div>
					</Card>
				</motion.div>

				{/* {(item.cost === "Subscription" ||
					item.cost === "Paid" ||
					item.cost === PAID_BUYERS_FUNDED) && (
					<div className="p-6 border border-dashed bg-[#f5f3ff] rounded-3xl flex items-center justify-between">
						<div className="flex flex-col">
							<span className="text-[10px] font-black text-[#523bae] uppercase tracking-widest block mb-1">
								{t("cascadeMarketplace.plan.item.totalCost")}
							</span>
							{typeof item.price === "number" ? (
								<>
									<div className="text-xs text-gray-500 mb-1">
										{t("cascadeMarketplace.plan.item.priceLabel", {
											price: `$${item.price.toLocaleString()}`,
										})}
										{(item.action === "sponsor" ||
											item.action === "recommend") &&
										(item.partners || []).length > 0
											? ` × ${(item.partners || []).length}`
											: ""}
									</div>
									<span className="text-2xl font-black text-[#004A60]">
										$
										{(item.action === "sponsor" &&
										(item.partners || []).length > 0
											? item.price * (item.partners || []).length
											: item.price
										).toLocaleString()}
									</span>
								</>
							) : (
								<span className="text-2xl font-black text-[#004A60]">
									{item.price ? `$${String(item.price)}` : item.cost}
								</span>
							)}
						</div>
						<CascadeButton
							buttonText={
								item.action === "sponsor"
									? t("cascadeMarketplace.plan.item.payNotify")
									: t("cascadeMarketplace.plan.item.subscribeDownload")
							}
							className={
								item.action === "sponsor"
									? "rounded-xl px-8 bg-green-600"
									: "rounded-xl px-8 bg-[#523bae]"
							}
							handleOnClick={() =>
								item.action === "sponsor"
									? payAndNotify(item)
									: handleSubscribeDownload(item)
							}
							size="3"
						/>
					</div>
				)} */}
			</Fragment>
		);
	};

	const openModal = (type: ModalType, item: any) => {
		setModalType(type);
		setSelectedItem(item);
		setSubmitted(false);
		setForm({ name: "", email: "", company: "", preferredDate: "", notes: "" });
	};

	const handleSubmit = () => setSubmitted(true);

	const buildNotifyItems = (items: any[]) =>
		items.flatMap((it) => {
			const partners = ensureArray(it.partners);
			const type: "SPONSORED" | "RECOMMENDED" =
				it.action === "sponsor" ? "SPONSORED" : "RECOMMENDED";
			return partners
				.map((p) => ({
					supplier_id: typeof p === "object" ? Number(p.id) : Number(p),
					solution_id: Number(it.id),
					type,
				}))
				.filter(
					(row) =>
						Number.isFinite(row.supplier_id) &&
						Number.isFinite(row.solution_id),
				);
		});

	const notifySuppliers = async (item: any) => {
		const partners = ensureArray(item.partners);
		if (partners.length === 0) return;
		const payload = buildNotifyItems([item]);
		if (payload.length === 0) return;

		const spId = getPartnerId();

		setNotifyStatus((s) => ({ ...s, [item.id]: "pending" }));
		try {
			await marketplaceService.notifySuppliers(
				payload,
				spId || undefined,
				getSubmittedByUserId(),
			);
			setNotifyStatus((s) => ({ ...s, [item.id]: "success" }));
			fetchNotifications(getNotificationParams());
		} catch (err) {
			console.error("notifySuppliers failed", err);
			setNotifyStatus((s) => ({ ...s, [item.id]: "error" }));
		}
	};

	// const handleSubscribeDownload = (item: any) => {
	// 	console.log("Subscribe & Download for", item.id);
	// };

	// const payAndNotify = async (item: any) => {
	// 	await notifySuppliers(item);
	// };

	const payAndNotifyAll = async (items: any[]) => {
		const payload = buildNotifyItems(items);
		if (payload.length === 0) return;

		const spId = getPartnerId();

		const ids = items.map((it) => it.id);
		setNotifyStatus((s) => {
			const next = { ...s };
			for (const id of ids) next[id] = "pending";
			return next;
		});
		try {
			await marketplaceService.notifySuppliers(
				payload,
				spId || undefined,
				getSubmittedByUserId(),
			);
			setNotifyStatus((s) => {
				const next = { ...s };
				for (const id of ids) next[id] = "success";
				return next;
			});
			fetchNotifications(getNotificationParams());
		} catch (err) {
			console.error("payAndNotifyAll failed", err);
			setNotifyStatus((s) => {
				const next = { ...s };
				for (const id of ids) next[id] = "error";
				return next;
			});
		}
	};

	const renderActionButton = (item: any) => {
		const action = item.actions?.[0];
		// Standardized check: prefer slug if available, fallback to name for backward compatibility
		const actionSlug = (action?.slug || action?.name) as
			| SolutionActionName
			| undefined;

		switch (actionSlug) {
			case SolutionActionName.SelfCertify:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.selfCertify")}
						className="rounded-lg bg-green-600 text-white shrink-0"
						handleOnClick={() => setSelfCertifyItem(item)}
						iconLeft={<Icons.Download style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.ScheduleKickoff:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.scheduleKickoff")}
						className="rounded-lg bg-[#523bae] text-white shrink-0"
						handleOnClick={() =>
							openModal(SolutionActionName.ScheduleKickoff, item)
						}
						iconLeft={<Icons.CalendarMonth style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.Register:
				return (
					<CascadeButton
						buttonText={t("common.register")}
						className="rounded-lg bg-[#523bae] text-white shrink-0"
						handleOnClick={() => openModal(SolutionActionName.Register, item)}
						iconLeft={<Icons.CalendarMonth style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.RequestQuote:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.requestQuote")}
						className="rounded-lg bg-blue-600 text-white shrink-0"
						handleOnClick={() => setQuoteRequestItem(item)}
						iconLeft={<Icons.RequestQuote style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.RequestQuoteWages:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.requestQuoteWages")}
						className="rounded-lg bg-blue-600 text-white shrink-0"
						handleOnClick={() => setWageQuoteItem(item)}
						iconLeft={<Icons.RequestQuote style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.RegisterForTraining:
				return (
					<CascadeButton
						buttonText={t(
							"cascadeMarketplace.plan.actions.registerForTraining",
						)}
						className="rounded-lg bg-[#523bae] text-white shrink-0"
						handleOnClick={() =>
							openModal(SolutionActionName.RegisterForTraining, item)
						}
						iconLeft={<Icons.EditDocument style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.NotifySuppliers:
				// For sponsor/recommend items we use section-level aggregate CTAs.
				if (item.action === "sponsor" || item.action === "recommend")
					return null;
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.notifySuppliers")}
						className="rounded-lg bg-[#1f6ed4] text-white shrink-0"
						handleOnClick={() => notifySuppliers(item)}
						iconLeft={<Icons.Send style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.AgencyDisclosure:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.enterHere")}
						className="rounded-lg bg-[#523bae] text-white shrink-0"
						handleOnClick={() => setAgencyDisclosureItem(item)}
						iconLeft={<Icons.EditDocument style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.UploadDocuments:
				return (
					<CascadeButton
						buttonText={t("cascadeMarketplace.plan.actions.uploadDocuments")}
						className="rounded-lg bg-blue-600 text-white shrink-0"
						handleOnClick={() => setUploadDocsItem(item)}
						iconLeft={<Icons.CloudUpload style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.Schedule:
				return (
					<CascadeButton
						buttonText="Schedule"
						className="rounded-lg bg-[#2f6b52] text-white shrink-0"
						handleOnClick={() => setScheduleItem(item)}
						iconLeft={<Icons.Schedule style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			case SolutionActionName.UploadContractDocuments:
				return (
					<CascadeButton
						buttonText="Upload Documents"
						className="rounded-lg bg-[#2f6b52] text-white shrink-0"
						handleOnClick={() => setUploadContractDocsItem(item)}
						iconLeft={<Icons.CloudUpload style={{ fontSize: 16 }} />}
						size="2"
					/>
				);
			default:
				return null;
		}
	};

	const isSchedule = modalType === SolutionActionName.ScheduleKickoff;
	const isIssaraAcademy =
		modalType === SolutionActionName.Register ||
		modalType === SolutionActionName.RegisterForTraining;

	return (
		<div className="space-y-8 pb-12">
			{isSupplierView && (
				<ActionRequiredSection
					isLoading={pendingQuery.isLoading}
					items={pendingQuery.data ?? []}
					onAccept={(id) =>
						respondMutation.mutate({
							id,
							action: "ACCEPT",
							supplierId: getActiveSupplierId() || undefined,
						})
					}
					onDecline={(id) =>
						respondMutation.mutate({
							id,
							action: "DECLINE",
							supplierId: getActiveSupplierId() || undefined,
						})
					}
					pendingId={
						respondMutation.isPending
							? (respondMutation.variables?.id ?? null)
							: null
					}
					translations={translations}
				/>
			)}

			<div className="flex justify-between items-end">
				<div>
					<h2 className="text-3xl font-black text-[#004A60] mb-2">
						{t("cascadeMarketplace.plan.overview.title")}
					</h2>
					<p className="text-gray-500">
						{t("cascadeMarketplace.plan.overview.subtitle")}
					</p>
				</div>
				<CascadeButton
					buttonText={t("cascadeMarketplace.plan.overview.clearAll")}
					className="rounded-lg font-bold border-gray-200 text-gray-500"
					handleOnClick={onClearAll || (() => {})}
					size="2"
					variant="outline"
				/>
			</div>

			{/* Summary Card */}
			<div className="p-8 border-none bg-[#e6f6f4] rounded-3xl flex items-center justify-between">
				<div className="flex items-center gap-6">
					<div className="w-16 h-16 bg-[#148696] rounded-full flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
						<Icons.TrendingUp className="text-3xl" />
					</div>
					<div>
						<span className="text-[10px] font-black text-[#148696] uppercase tracking-widest block mb-1">
							{t("cascadeMarketplace.plan.overview.totalProjectedImpact")}
						</span>
						<div className="flex items-baseline gap-2">
							<span className="text-4xl font-black text-[#148696]">
								{t("cascadeMarketplace.plan.item.points", {
									count: totalImpact,
								})}
							</span>
							<span className="text-sm font-bold text-[#148696] opacity-70">
								{t("cascadeMarketplace.plan.overview.itemsInPlan", {
									count: planItems.length,
								})}
							</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 text-right">
						{t("cascadeMarketplace.plan.overview.estimatedTime")}
					</span>
					<span className="text-xl font-black text-[#004A60]">
						{t("cascadeMarketplace.plan.overview.estimatedTimeValue")}
					</span>
				</div>
			</div>

			{/* Sponsor / Recommend sections (highlighted) */}
			<div className="space-y-8">
				{sponsorItems.length > 0 && (
					<div>
						<div className="flex items-center gap-2">
							<Icons.Apartment className="text-[#148696] text-sm" />
							<h4 className="font-black text-[#148696] tracking-tight">
								{t("cascadeMarketplace.plan.sections.sponsoringForSuppliers", {
									count: sponsorItems.length,
								})}
							</h4>
							<span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
								{t("cascadeMarketplace.plan.sections.youPay")}
							</span>
						</div>
						<div className="space-y-4 mt-3">
							{sponsorItems.map((item, i) => renderPlanItem(item, i))}
						</div>

						{(() => {
							const totalSponsoringCost = sponsorItems.reduce((sum, it) => {
								const partnersCount = ensureArray(it.partners).length || 1;
								return (
									sum +
									(typeof it.price === "number" ? it.price * partnersCount : 0)
								);
							}, 0);
							const totalSuppliers = sponsorItems.reduce(
								(sum, it) => sum + ensureArray(it.partners).length,
								0,
							);
							const allPaid = sponsorItems.every(
								(it) => notifyStatus[it.id] === "success",
							);
							const anyPending = sponsorItems.some(
								(it) => notifyStatus[it.id] === "pending",
							);
							return (
								<div className="mt-6 p-6 rounded-3xl bg-linear-to-r from-[#ecfbf8] to-white border border-green-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
									<div>
										<span className="text-[10px] font-black text-[#148696] uppercase tracking-widest block mb-1">
											{t(
												"cascadeMarketplace.plan.sections.totalSponsoringCost",
											)}
										</span>
										<div className="flex items-baseline gap-2">
											<span className="text-3xl font-black text-[#148696]">
												${totalSponsoringCost.toLocaleString()}
											</span>
											<span className="text-sm font-bold text-[#148696]/70">
												{sponsorItems.length} item
												{t("cascadeMarketplace.plan.sections.items", {
													count: sponsorItems.length,
												})}{" "}
												·{" "}
												{t("cascadeMarketplace.plan.sections.suppliers", {
													count: totalSuppliers,
												})}
											</span>
										</div>
									</div>
									<CascadeButton
										buttonText={
											allPaid
												? t(
														"cascadeMarketplace.plan.sections.suppliersNotified",
													)
												: anyPending
													? t("cascadeMarketplace.plan.sections.processing")
													: t(
															"cascadeMarketplace.plan.sections.payNotifySuppliers",
														)
										}
										className={`rounded-xl px-8 ${
											allPaid ? "bg-gray-400" : "bg-green-600"
										}`}
										handleOnClick={() => {
											if (!allPaid && !anyPending)
												payAndNotifyAll(sponsorItems);
										}}
										iconLeft={<Icons.Send style={{ fontSize: 16 }} />}
										size="3"
									/>
								</div>
							);
						})()}

						<div className="p-4 border rounded-lg mt-4 bg-[#ecfbf8] border-green-100 text-[#148696]">
							<div className="font-semibold mb-1">
								{t("cascadeMarketplace.plan.sections.sponsorHelpTitle")}
							</div>
							<div className="text-sm text-gray-600">
								{t("cascadeMarketplace.plan.sections.sponsorHelpBody")}
							</div>
						</div>
					</div>
				)}

				{recommendItems.length > 0 && (
					<div>
						<div className="flex items-center gap-2">
							<Icons.Send className="text-[#1f6ed4] text-sm" />
							<h4 className="font-black text-[#1f6ed4] tracking-tight">
								{t("cascadeMarketplace.plan.sections.recommendedToSuppliers", {
									count: recommendItems.length,
								})}
							</h4>
							<span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
								{t("cascadeMarketplace.plan.sections.theyPay")}
							</span>
						</div>
						<div className="space-y-4 mt-3">
							{recommendItems.map((item, i) => renderPlanItem(item, i))}
						</div>
						{(() => {
							const totalRecommendCost = recommendItems.reduce((sum, it) => {
								const partnersCount = ensureArray(it.partners).length || 1;
								return (
									sum +
									(typeof it.price === "number" ? it.price * partnersCount : 0)
								);
							}, 0);
							const totalSuppliers = recommendItems.reduce(
								(sum, it) => sum + ensureArray(it.partners).length,
								0,
							);
							const allNotified = recommendItems.every(
								(it) => notifyStatus[it.id] === "success",
							);
							const anyPending = recommendItems.some(
								(it) => notifyStatus[it.id] === "pending",
							);
							return (
								<div className="mt-6 p-6 rounded-3xl bg-linear-to-r from-[#eff6ff] to-white border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
									<div>
										<span className="text-[10px] font-black text-[#1f6ed4] uppercase tracking-widest block mb-1">
											{t(
												"cascadeMarketplace.plan.sections.notificationSummary",
											)}
										</span>
										<div className="flex items-baseline gap-2">
											<span className="text-3xl font-black text-[#1f6ed4]">
												${totalRecommendCost.toLocaleString()}
											</span>
											<span className="text-sm font-bold text-[#1f6ed4]/70">
												{t("cascadeMarketplace.plan.sections.items", {
													count: recommendItems.length,
												})}{" "}
												·{" "}
												{t("cascadeMarketplace.plan.sections.suppliers", {
													count: totalSuppliers,
												})}
											</span>
										</div>
									</div>
									<CascadeButton
										buttonText={
											allNotified
												? t(
														"cascadeMarketplace.plan.sections.suppliersNotified",
													)
												: anyPending
													? t("cascadeMarketplace.plan.sections.processing")
													: t(
															"cascadeMarketplace.plan.sections.notifySuppliers",
														)
										}
										className={`rounded-xl px-8 ${allNotified ? "bg-gray-400" : "bg-[#1f6ed4]"}`}
										handleOnClick={() => {
											if (!allNotified && !anyPending)
												payAndNotifyAll(recommendItems);
										}}
										iconLeft={<Icons.Send style={{ fontSize: 16 }} />}
										size="3"
									/>
								</div>
							);
						})()}
						<div className="p-4 border rounded-lg mt-4 bg-[#eff6ff] border-blue-100 text-[#1f6ed4]">
							<div className="font-semibold mb-1">
								{t("cascadeMarketplace.plan.sections.recommendHelpTitle")}
							</div>
							<div className="text-sm text-gray-600">
								{t("cascadeMarketplace.plan.sections.recommendHelpBody")}
							</div>
						</div>
					</div>
				)}

				{/* Remaining grouped self items */}
				{(Object.entries(groupedSelfItems) as [string, any[]][]).map(
					([type, items]) => (
						<div className="space-y-4" key={type}>
							<div className="flex items-center gap-2">
								<Icons.CalendarToday className="text-[#523bae] text-sm" />
								<h4 className="font-black text-[#004A60] tracking-tight">
									{translateValue(type)} ({items.length})
								</h4>
							</div>
							<div className="space-y-4">
								{items.map((item: any, i: number) => renderPlanItem(item, i))}
							</div>
						</div>
					),
				)}
			</div>

			{/* Next Steps */}
			<Card className="p-8 border-none bg-blue-50/20 rounded-3xl">
				<h4 className="font-black text-[#004A60] mb-6">
					{t("cascadeMarketplace.plan.nextSteps.title")}
				</h4>
				<div className="space-y-4">
					{[
						t("cascadeMarketplace.plan.nextSteps.step1"),
						t("cascadeMarketplace.plan.nextSteps.step2"),
						t("cascadeMarketplace.plan.nextSteps.step3"),
						t("cascadeMarketplace.plan.nextSteps.step4"),
					].map((step, i) => (
						<div className="flex gap-4 text-sm text-gray-600" key={i}>
							<span className="font-black text-blue-500">{i + 1}.</span>
							{step}
						</div>
					))}
				</div>
			</Card>

			{/* Schedule / Request Quote / Issara Academy Modal */}
			<Dialog.Root
				onOpenChange={(open) => !open && setModalType(null)}
				open={!!modalType}
			>
				<Dialog.Content
					className="rounded-2xl"
					maxWidth={isIssaraAcademy ? "640px" : "480px"}
				>
					<Dialog.Title>
						{isIssaraAcademy
							? t("cascadeMarketplace.plan.modal.registerForTrainingTitle")
							: isSchedule
								? t("cascadeMarketplace.plan.modal.scheduleKickoffTitle")
								: t("cascadeMarketplace.plan.modal.requestQuoteTitle")}
					</Dialog.Title>
					{selectedItem && (
						<Dialog.Description className="text-sm text-gray-500 mb-2">
							{isIssaraAcademy
								? t(
										"cascadeMarketplace.plan.modal.registerForTrainingDescription",
									)
								: isSchedule
									? t(
											"cascadeMarketplace.plan.modal.scheduleKickoffDescription",
										)
									: t(
											"cascadeMarketplace.plan.modal.requestQuoteDescription",
										)}{" "}
							<strong>{translateValue(selectedItem.title)}</strong>
						</Dialog.Description>
					)}

					{isIssaraAcademy && selectedItem ? (
						<IssaraAcademyModalContent
							item={selectedItem}
							onClose={() => setModalType(null)}
						/>
					) : submitted ? (
						<div className="py-8 text-center space-y-4">
							<Icons.CheckCircle
								className="text-green-500 mx-auto"
								style={{ fontSize: 56 }}
							/>
							<h4 className="font-bold text-[#004A60] text-lg">
								{isSchedule
									? t("cascadeMarketplace.plan.modal.kickoffRequested")
									: t("cascadeMarketplace.plan.modal.quoteRequested")}
							</h4>
							<p className="text-gray-500 text-sm">
								{t("cascadeMarketplace.plan.modal.followUp")}
							</p>
							<Dialog.Close>
								<button
									className="mt-2 bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672]"
									onClick={() => setModalType(null)}
								>
									{t("common.close")}
								</button>
							</Dialog.Close>
						</div>
					) : (
						<div className="space-y-4 mt-4">
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-name`}
								>
									{t("forms.fullName")} *
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-name`}
									onChange={(e) =>
										setForm((f) => ({ ...f, name: e.target.value }))
									}
									placeholder={t(
										"cascadeMarketplace.plan.modal.namePlaceholder",
									)}
									type="text"
									value={form.name}
								/>
							</div>
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-email`}
								>
									{t("common.email")} *
								</label>
								<input
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
									id={`${uid}-email`}
									onChange={(e) =>
										setForm((f) => ({ ...f, email: e.target.value }))
									}
									placeholder="your@email.com"
									type="email"
									value={form.email}
								/>
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
									onChange={(e) =>
										setForm((f) => ({ ...f, company: e.target.value }))
									}
									placeholder={t(
										"cascadeMarketplace.plan.modal.companyPlaceholder",
									)}
									type="text"
									value={form.company}
								/>
							</div>
							{isSchedule && (
								<div>
									<label
										className="text-sm font-bold text-gray-700 block mb-1"
										htmlFor={`${uid}-date`}
									>
										{t("cascadeMarketplace.plan.modal.preferredDate")}
									</label>
									<input
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696]"
										id={`${uid}-date`}
										min={new Date().toISOString().split("T")[0]}
										onChange={(e) =>
											setForm((f) => ({ ...f, preferredDate: e.target.value }))
										}
										type="date"
										value={form.preferredDate}
									/>
								</div>
							)}
							<div>
								<label
									className="text-sm font-bold text-gray-700 block mb-1"
									htmlFor={`${uid}-notes`}
								>
									{isSchedule
										? t("cascadeMarketplace.plan.modal.additionalNotes")
										: t("cascadeMarketplace.plan.modal.describeNeeds")}
								</label>
								<textarea
									className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#148696] resize-none"
									id={`${uid}-notes`}
									onChange={(e) =>
										setForm((f) => ({ ...f, notes: e.target.value }))
									}
									placeholder={
										isSchedule
											? t(
													"cascadeMarketplace.plan.modal.additionalNotesPlaceholder",
												)
											: t(
													"cascadeMarketplace.plan.modal.describeNeedsPlaceholder",
												)
									}
									rows={3}
									value={form.notes}
								/>
							</div>
							<div className="flex gap-3 justify-end pt-2">
								<Dialog.Close>
									<button className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50">
										{t("common.cancel")}
									</button>
								</Dialog.Close>
								<button
									className="bg-[#148696] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#0f6672] disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={!form.name || !form.email}
									onClick={handleSubmit}
								>
									{isSchedule
										? t("cascadeMarketplace.plan.modal.requestKickoff")
										: t("cascadeMarketplace.plan.modal.submitRequest")}
								</button>
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Root>

			<AgencyDisclosureModal
				item={agencyDisclosureItem}
				onClose={() => setAgencyDisclosureItem(null)}
			/>
			<UploadPolicyDocumentsModal
				item={uploadDocsItem}
				onClose={() => setUploadDocsItem(null)}
			/>
			<RequestQuoteModal
				item={quoteRequestItem}
				onClose={() => setQuoteRequestItem(null)}
			/>
			<RequestWageQuoteModal
				item={wageQuoteItem}
				onClose={() => setWageQuoteItem(null)}
			/>
			<SelfCertifyModal
				item={selfCertifyItem}
				onClose={() => setSelfCertifyItem(null)}
			/>
			<ScheduleModal
				item={scheduleItem}
				onClose={() => setScheduleItem(null)}
			/>
			<UploadContractDocumentsModal
				item={uploadContractDocsItem}
				onClose={() => setUploadContractDocsItem(null)}
			/>
		</div>
	);
};
