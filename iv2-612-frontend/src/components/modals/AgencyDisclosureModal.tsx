import * as Icons from "@mui/icons-material";
import { Dialog } from "@radix-ui/themes";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCascadeCountries } from "$src/hooks/useCommonData";
import {
	type AgencyDisclosureEntryPayload,
	agencyDisclosureService,
} from "$src/services/agencyDisclosureService";
import {
	getActiveSupplierId,
	getPartnerId,
	getSubmittedByUserId,
} from "$src/utils/auth-utils";

interface AgencyRow {
	agencyName: string;
	originCountryId: string;
	originCountryName: string;
	destinationCountryId: string;
	destinationCountryName: string;
}

const emptyRow = (): AgencyRow => ({
	agencyName: "",
	originCountryId: "",
	originCountryName: "",
	destinationCountryId: "",
	destinationCountryName: "",
});

interface AgencyDisclosureModalProps {
	item: any | null;
	onClose: () => void;
}

export function AgencyDisclosureModal({
	item,
	onClose,
}: AgencyDisclosureModalProps) {
	const { t } = useTranslation();
	const uid = useId();
	const { data: countriesData } = useCascadeCountries();
	const countries: { id: number; name: string }[] = Array.isArray(countriesData)
		? countriesData
		: (countriesData?.results ?? countriesData?.data ?? []);

	const [agencies, setAgencies] = useState<AgencyRow[]>([emptyRow()]);
	const [submitted, setSubmitted] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const reset = () => {
		setAgencies([emptyRow()]);
		setSubmitted(false);
		setSubmitError(null);
	};

	const handleClose = () => {
		onClose();
		reset();
	};

	const submitMutation = useMutation({
		mutationFn: () => {
			const agenciesPayload: AgencyDisclosureEntryPayload[] = agencies.map(
				(row) => ({
					agency_name: row.agencyName.trim(),
					origin_country: row.originCountryName.trim() || null,
					destination_countries: row.destinationCountryName.trim(),
				}),
			);
			return agencyDisclosureService.submit({
				solution_id: item.id,
				supplier_id: getActiveSupplierId(),
				partner_id: getPartnerId(),
				submitted_by_user_id: getSubmittedByUserId(),
				agencies: agenciesPayload,
			});
		},
		onSuccess: () => setSubmitted(true),
		onError: () =>
			setSubmitError(
				t("cascadeMarketplace.plan.modal.agencyDisclosureSubmitError"),
			),
	});

	const updateRow = (index: number, patch: Partial<AgencyRow>) =>
		setAgencies((prev) =>
			prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);

	const addRow = () => setAgencies((prev) => [...prev, emptyRow()]);
	const removeRow = (index: number) =>
		setAgencies((prev) => prev.filter((_, i) => i !== index));

	const canSubmit =
		agencies.length > 0 &&
		agencies.every(
			(row) => row.agencyName.trim() && row.destinationCountryName.trim(),
		);
	const lastRow = agencies[agencies.length - 1];
	const canAddMore =
		!lastRow ||
		Boolean(lastRow.agencyName.trim() && lastRow.destinationCountryName.trim());

	return (
		<Dialog.Root onOpenChange={(open) => !open && handleClose()} open={!!item}>
			<Dialog.Content className="rounded-2xl" maxWidth="640px">
				<div className="flex items-start justify-between">
					<Dialog.Title>
						{t("cascadeMarketplace.plan.modal.agencyDisclosureTitle")}
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
					{t("cascadeMarketplace.plan.modal.agencyDisclosureSubtitle")}
				</Dialog.Description>

				{submitted ? (
					<div className="py-8 text-center space-y-4">
						<Icons.CheckCircle
							className="text-green-500 mx-auto"
							style={{ fontSize: 56 }}
						/>
						<h4 className="font-bold text-[#004A60] text-lg">
							{t(
								"cascadeMarketplace.plan.modal.agencyDisclosureSubmittedTitle",
							)}
						</h4>
						<p className="text-gray-500 text-sm">
							{t(
								"cascadeMarketplace.plan.modal.agencyDisclosureSubmittedMessage",
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
						{agencies.map((row, index) => (
							<div
								className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50"
								key={`${uid}-agency-${index}`}
							>
								<div className="flex items-center justify-between">
									<p className="text-xs font-black text-gray-500 uppercase tracking-widest">
										{t("cascadeMarketplace.plan.modal.agencyLabel", {
											n: index + 1,
										})}
									</p>
									{agencies.length > 1 && (
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

								<div>
									<label
										className="text-sm font-semibold text-gray-700 block mb-1"
										htmlFor={`${uid}-name-${index}`}
									>
										{t("cascadeMarketplace.plan.modal.agencyNameLabel")}{" "}
										<span className="text-[#FB8379]">*</span>
									</label>
									<input
										className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
										id={`${uid}-name-${index}`}
										onChange={(e) =>
											updateRow(index, { agencyName: e.target.value })
										}
										placeholder={t(
											"cascadeMarketplace.plan.modal.agencyNamePlaceholder",
										)}
										type="text"
										value={row.agencyName}
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-origin-${index}`}
										>
											{t("cascadeMarketplace.plan.modal.originCountryLabel")}{" "}
											<span className="text-gray-400 font-normal">
												({t("common.optional")})
											</span>
										</label>
										<select
											className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
											id={`${uid}-origin-${index}`}
											onChange={(e) => {
												const selected = countries.find(
													(c) => String(c.id) === e.target.value,
												);
												updateRow(index, {
													originCountryId: e.target.value,
													originCountryName: selected?.name ?? "",
												});
											}}
											value={row.originCountryId}
										>
											<option value="">
												{t(
													"cascadeMarketplace.plan.modal.selectCountryPlaceholder",
												)}
											</option>
											{countries.map((c) => (
												<option key={c.id} value={String(c.id)}>
													{c.name}
												</option>
											))}
										</select>
									</div>
									<div>
										<label
											className="text-sm font-semibold text-gray-700 block mb-1"
											htmlFor={`${uid}-dest-${index}`}
										>
											{t(
												"cascadeMarketplace.plan.modal.destinationCountriesLabel",
											)}{" "}
											<span className="text-[#FB8379]">*</span>
										</label>
										<select
											className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#148696]"
											id={`${uid}-dest-${index}`}
											onChange={(e) => {
												const selected = countries.find(
													(c) => String(c.id) === e.target.value,
												);
												updateRow(index, {
													destinationCountryId: e.target.value,
													destinationCountryName: selected?.name ?? "",
												});
											}}
											value={row.destinationCountryId}
										>
											<option value="">
												{t(
													"cascadeMarketplace.plan.modal.selectCountryPlaceholder",
												)}
											</option>
											{countries.map((c) => (
												<option key={c.id} value={String(c.id)}>
													{c.name}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>
						))}

						<button
							className="flex items-center gap-2 text-sm font-bold text-[#148696] hover:text-[#0f6672] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[#148696]"
							disabled={!canAddMore}
							onClick={addRow}
							type="button"
						>
							<Icons.AddCircleOutline style={{ fontSize: 20 }} />
							{t("cascadeMarketplace.plan.modal.addMoreAgency")}
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
									{t("common.submit")}
								</button>
							</div>
						</div>
					</div>
				)}
			</Dialog.Content>
		</Dialog.Root>
	);
}
