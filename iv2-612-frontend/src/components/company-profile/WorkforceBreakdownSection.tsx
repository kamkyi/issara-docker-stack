import { GlobeIcon } from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { inputCls } from "$src/components/company-profile/styles";

export type WorkforceBreakdownField = {
	key: string;
	label: string;
};

type WorkforceBreakdownSectionProps = {
	actionDisabled: boolean;
	editing: boolean;
	fields: WorkforceBreakdownField[];
	onCancel: () => void;
	onNationalityTotalsAdd?: (payload: {
		key: string;
		female: number;
		male: number;
		total: number;
	}) => void;
	onDraftValueChange: (key: string, value: string) => void;
	onSave: () => void;
	saveButtonText: string;
	title: string;
	values: Record<string, string>;
	draftValues: Record<string, string>;
	zeroPlaceholder: string;
};

const toCountNumber = (value: string | undefined) => {
	const parsed = Number(value ?? "");
	return Number.isFinite(parsed) ? parsed : 0;
};

const hasCountValue = (value: string | undefined) => {
	const normalized = (value ?? "").trim();
	return normalized !== "" && normalized !== "0";
};

const getGenderCountKeys = (totalFieldKey: string) => {
	if (
		!totalFieldKey.startsWith("total_num_") ||
		!totalFieldKey.endsWith("_workers") ||
		totalFieldKey === "total_num_workers" ||
		totalFieldKey === "total_num_men_workers" ||
		totalFieldKey === "total_num_women_workers"
	) {
		return null;
	}

	const nationalityKey = totalFieldKey
		.replace(/^total_num_/, "")
		.replace(/_workers$/, "");

	return {
		maleKey: `total_num_${nationalityKey}_men_workers`,
		femaleKey: `total_num_${nationalityKey}_women_workers`,
	};
};

export default function WorkforceBreakdownSection({
	actionDisabled,
	editing,
	fields,
	onCancel,
	onNationalityTotalsAdd,
	onDraftValueChange,
	onSave,
	saveButtonText,
	title,
	values,
	draftValues,
	zeroPlaceholder,
}: WorkforceBreakdownSectionProps) {
	const [showAddPanel, setShowAddPanel] = useState(false);
	const [newNationalityKey, setNewNationalityKey] = useState("");
	const [newNationalityMaleCount, setNewNationalityMaleCount] = useState("");
	const [newNationalityFemaleCount, setNewNationalityFemaleCount] =
		useState("");

	const summaryFields = fields.slice(0, 3);
	const nationalityFields = fields.slice(3);
	const activeValues = editing ? draftValues : values;

	const getNationalityCounts = (
		fieldKey: string,
		sourceValues: Record<string, string>,
	) => {
		const genderKeys = getGenderCountKeys(fieldKey);
		const maleCount = toCountNumber(
			genderKeys ? sourceValues[genderKeys.maleKey] : undefined,
		);
		const femaleCount = toCountNumber(
			genderKeys ? sourceValues[genderKeys.femaleKey] : undefined,
		);
		const directTotal = toCountNumber(sourceValues[fieldKey]);
		const derivedTotal = maleCount + femaleCount;
		const totalCount = directTotal > 0 ? directTotal : derivedTotal;

		return {
			femaleCount,
			maleCount,
			totalCount,
			hasAnyCount:
				hasCountValue(sourceValues[fieldKey]) ||
				maleCount > 0 ||
				femaleCount > 0,
		};
	};

	const populatedNationalityFields = useMemo(
		() =>
			nationalityFields.filter(
				(field) => getNationalityCounts(field.key, activeValues).hasAnyCount,
			),
		[nationalityFields, activeValues],
	);

	const availableNationalityFields = useMemo(
		() =>
			nationalityFields.filter(
				(field) => !getNationalityCounts(field.key, draftValues).hasAnyCount,
			),
		[nationalityFields, draftValues],
	);

	const selectedNationalityKey =
		newNationalityKey || availableNationalityFields[0]?.key || "";

	const selectedNationalityLabel =
		availableNationalityFields.find(
			(field) => field.key === selectedNationalityKey,
		)?.label ?? "";

	const resetAddPanel = () => {
		setShowAddPanel(false);
		setNewNationalityKey("");
		setNewNationalityMaleCount("");
		setNewNationalityFemaleCount("");
	};

	const handleAddNationality = () => {
		if (!selectedNationalityKey) return;
		const male = toCountNumber(newNationalityMaleCount);
		const female = toCountNumber(newNationalityFemaleCount);
		const totalWorkers = male + female;
		onDraftValueChange(selectedNationalityKey, String(totalWorkers));
		onNationalityTotalsAdd?.({
			key: selectedNationalityKey,
			female,
			male,
			total: totalWorkers,
		});
		resetAddPanel();
	};

	const newNationalityTotal =
		toCountNumber(newNationalityMaleCount) +
		toCountNumber(newNationalityFemaleCount);

	return (
		<SectionCard
			actionDisabled={actionDisabled}
			editing={editing}
			icon={<GlobeIcon className="text-[#148696] w-5 h-5" />}
			onCancel={onCancel}
			onSave={onSave}
			saveButtonText={saveButtonText}
			title={title}
		>
			<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
				{summaryFields.map((field) => (
					<div key={field.key}>
						<p className="text-sm font-bold uppercase tracking-wide">
							{field.label}
						</p>
						{editing ? (
							<input
								className={inputCls}
								inputMode="numeric"
								onChange={(event) =>
									onDraftValueChange(field.key, event.target.value)
								}
								placeholder={zeroPlaceholder}
								type="number"
								value={draftValues[field.key] ?? ""}
							/>
						) : (
							<div className="rounded-xl mt-1 border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
								{Number(values[field.key]).toLocaleString() || "-"}
							</div>
						)}
					</div>
				))}
			</div>

			<div className="border border-gray-100 rounded-xl bg-linear-to-b from-amber-50/30 to-amber-50/10 p-4 my-5">
				<div className="flex flex-wrap items-center justify-between gap-4 ">
					<Flex align="start" direction="column" gap="1" wrap="wrap">
						<span className="text-xs font-bold tracking-wide uppercase text-gray-800">
							Nationality breakdown
						</span>
						<p className="text-xs text-gray-500">
							Optional · {populatedNationalityFields.length} added · add detail
							where you have it
						</p>
					</Flex>

					{editing &&
						availableNationalityFields.length > 0 &&
						!showAddPanel && (
							<button
								className="rounded-full border-2 border-[#004A60] px-5 py-2 text-sm font-semibold text-[#004A60] transition-colors hover:bg-[#e8f5f8]"
								onClick={() => setShowAddPanel(true)}
								type="button"
							>
								+ Add More
							</button>
						)}
				</div>

				{populatedNationalityFields.length > 0 ? (
					<div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
						{populatedNationalityFields.map((field) => (
							<div
								className="relative rounded-2xl border border-gray-200 bg-white p-4"
								key={field.key}
							>
								{(() => {
									const { femaleCount, maleCount, totalCount } =
										getNationalityCounts(field.key, activeValues);

									return (
										<>
											{editing && (
												<button
													aria-label={`Remove ${field.label}`}
													className="absolute top-3 right-3 text-xl leading-none text-gray-400 hover:text-gray-600"
													onClick={() => onDraftValueChange(field.key, "")}
													type="button"
												>
													x
												</button>
											)}
											<p className="text-sm font-bold uppercase tracking-wide">
												{field.label}
											</p>
											<p className="mt-2 leading-none text-[#111827]">
												{totalCount.toLocaleString()}
											</p>
											<p className="mt-3 text-sm text-gray-500">
												{maleCount} Male {femaleCount} Female
											</p>
										</>
									);
								})()}
							</div>
						))}
					</div>
				) : (
					<p className="mt-4 text-sm text-gray-500">
						No nationality details added yet.
					</p>
				)}

				{editing && showAddPanel && (
					<div className="relative mt-6 rounded-lg border border-gray-200 p-5 bg-white">
						<button
							aria-label="Close add nationality form"
							className="absolute top-3 right-3 text-2xl leading-none text-gray-500 hover:text-gray-700"
							onClick={resetAddPanel}
							type="button"
						>
							x
						</button>
						<h4 className="text-xl font-heading font-semibold text-[#111827]">
							Add a nationality
						</h4>
						<div className="mt-4 grid grid-cols-1 items-end gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
							<div>
								<p className="text-sm font-bold uppercase tracking-wide">
									Nationality
								</p>
								<select
									className={inputCls}
									onChange={(event) => setNewNationalityKey(event.target.value)}
									value={selectedNationalityKey}
								>
									{availableNationalityFields.map((field) => (
										<option key={field.key} value={field.key}>
											{field.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<p className="text-sm font-bold uppercase tracking-wide">
									Total Male workers
								</p>
								<input
									className={inputCls}
									inputMode="numeric"
									onChange={(event) =>
										setNewNationalityMaleCount(event.target.value)
									}
									placeholder={zeroPlaceholder}
									type="number"
									value={newNationalityMaleCount}
								/>
							</div>
							<div>
								<p className="text-sm font-bold uppercase tracking-wide">
									Total Female workers
								</p>
								<input
									className={inputCls}
									inputMode="numeric"
									onChange={(event) =>
										setNewNationalityFemaleCount(event.target.value)
									}
									placeholder={zeroPlaceholder}
									type="number"
									value={newNationalityFemaleCount}
								/>
							</div>
							<div>
								<p className="text-sm font-bold uppercase tracking-wide">
									Total
								</p>
								<p className="text-4xl leading-none font-semibold text-[#004A60]">
									{newNationalityTotal}
								</p>
							</div>
							<button
								className="cursor-pointer rounded-xl bg-[#004A60] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[#003f53]"
								disabled={newNationalityTotal <= 0}
								onClick={handleAddNationality}
								type="button"
							>
								+ Add
							</button>
						</div>
						{selectedNationalityLabel && (
							<p className="mt-3 text-sm text-gray-500">
								Adding: {selectedNationalityLabel}
							</p>
						)}
					</div>
				)}
			</div>
		</SectionCard>
	);
}
