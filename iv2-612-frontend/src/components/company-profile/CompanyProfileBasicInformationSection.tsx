import { ReaderIcon } from "@radix-ui/react-icons";
import { useId } from "react";
import { MultiSelectDropdown } from "$src/components/business/MultiSelectDropdown";
import { FieldLabel } from "$src/components/company-profile/FieldLabel";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { inputCls, textareaCls } from "$src/components/company-profile/styles";
import { TagChips } from "$src/components/company-profile/TagChips";
import Selector from "$src/components/inputs/selector";
import { useTranslation } from "$src/hooks/useTranslation";

interface OptionItem {
	id: number;
	name: string;
}

interface CompanyProfileBasicInformationSectionProps {
	actionDisabled: boolean;
	basicEditing: boolean;
	companyDescription: string;
	companyName: string;
	displayIndustries: string[];
	displayProductCats: string[];
	draftAddress: string;
	draftDescription: string;
	draftIndustryIds: number[];
	draftLocationId: string;
	draftName: string;
	draftProductCatIds: number[];
	draftHumanRightsOfficerConfirmed: boolean;
	draftHumanRightsOfficerName: string;
	hqAddress: string;
	hqLocationId: string;
	hqLocationLabel: string;
	industryItems: OptionItem[];
	onCancel: () => void;
	onDraftAddressChange: (value: string) => void;
	onDraftDescriptionChange: (value: string) => void;
	onDraftIndustryIdsChange: (selected: number[]) => void;
	onDraftLocationIdChange: (value: string) => void;
	onDraftNameChange: (value: string) => void;
	onDraftProductCatIdsChange: (selected: number[]) => void;
	onDraftHumanRightsOfficerConfirmedChange: (value: boolean) => void;
	onDraftHumanRightsOfficerNameChange: (value: string) => void;
	onSave: () => void;
	productCategoryItems: OptionItem[];
	countryOptions: Array<{ value: string; label: string }>;
	isSavingProfile: boolean;
}

const MultiSelectField = ({
	count,
	displayItems,
	dropdownItems,
	editing,
	label,
	onChange,
	placeholder,
	selectedIds,
}: {
	count: number;
	displayItems: string[];
	dropdownItems: OptionItem[];
	editing: boolean;
	label: string;
	onChange: (selected: number[]) => void;
	placeholder: string;
	selectedIds: number[];
}) => (
	<div>
		<FieldLabel label={`${label} (${count})`} />
		{editing ? (
			<MultiSelectDropdown
				items={dropdownItems}
				onChange={onChange}
				placeholder={placeholder}
				selectedIds={selectedIds}
			/>
		) : (
			<TagChips editing={false} items={displayItems} onRemove={() => {}} />
		)}
	</div>
);

export default function CompanyProfileBasicInformationSection({
	actionDisabled,
	basicEditing,
	companyDescription,
	companyName,
	displayIndustries,
	displayProductCats,
	draftAddress,
	draftDescription,
	draftIndustryIds,
	draftLocationId,
	draftName,
	draftProductCatIds,
	draftHumanRightsOfficerConfirmed,
	draftHumanRightsOfficerName,
	hqAddress,
	hqLocationId,
	hqLocationLabel,
	industryItems,
	onCancel,
	onDraftAddressChange,
	onDraftDescriptionChange,
	onDraftIndustryIdsChange,
	onDraftLocationIdChange,
	onDraftNameChange,
	onDraftProductCatIdsChange,
	onDraftHumanRightsOfficerConfirmedChange,
	onDraftHumanRightsOfficerNameChange,
	onSave,
	productCategoryItems,
	countryOptions,
	isSavingProfile,
}: CompanyProfileBasicInformationSectionProps) {
	const { t } = useTranslation();
	const hqLocationSelectorId = useId();
	const hrOfficerCheckboxId = useId();
	const hrOfficerNameId = useId();
	const saveButtonText = isSavingProfile
		? t("companyProfilePage.actions.saving")
		: t("companyProfilePage.actions.save");

	return (
		<SectionCard
			actionDisabled={actionDisabled}
			editing={basicEditing}
			icon={<ReaderIcon className="text-[#148696] w-5 h-5" />}
			onCancel={onCancel}
			onSave={onSave}
			saveButtonText={saveButtonText}
			title={t("companyProfilePage.sections.basicInformation")}
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div>
					<FieldLabel
						isPublic
						label={t("companyProfilePage.fields.companyName")}
					/>
					{basicEditing ? (
						<input
							className={inputCls}
							onChange={(e) => onDraftNameChange(e.target.value)}
							type="text"
							value={draftName}
						/>
					) : (
						<p className="text-sm text-gray-800">{companyName}</p>
					)}
				</div>

				<div>
					<FieldLabel label={t("companyProfilePage.fields.hqLocation")} />
					{basicEditing ? (
						<Selector
							fullWidth
							id={hqLocationSelectorId}
							onChange={(value) => onDraftLocationIdChange(String(value))}
							options={countryOptions}
							placeholder={t("companyProfilePage.placeholders.selectCountry")}
							value={draftLocationId || hqLocationId}
						/>
					) : (
						<p className="text-sm text-gray-800">{hqLocationLabel}</p>
					)}
				</div>

				<div className="md:col-span-2">
					<FieldLabel
						label={t("companyProfilePage.fields.headquartersAddress")}
					/>
					{basicEditing ? (
						<input
							className={inputCls}
							onChange={(e) => onDraftAddressChange(e.target.value)}
							type="text"
							value={draftAddress}
						/>
					) : (
						<p className="text-sm text-gray-800">{hqAddress}</p>
					)}
				</div>

				<div className="md:col-span-2">
					<FieldLabel
						isPublic
						label={t("companyProfilePage.fields.companyDescription")}
					/>
					{basicEditing ? (
						<textarea
							className={textareaCls}
							onChange={(e) => onDraftDescriptionChange(e.target.value)}
							rows={3}
							value={draftDescription}
						/>
					) : (
						<p className="text-sm text-gray-800">{companyDescription}</p>
					)}
				</div>

				<MultiSelectField
					count={draftIndustryIds.length}
					displayItems={displayIndustries}
					dropdownItems={industryItems}
					editing={basicEditing}
					label={t("companyProfilePage.fields.industries")}
					onChange={onDraftIndustryIdsChange}
					placeholder={t("companyProfilePage.placeholders.selectIndustries")}
					selectedIds={draftIndustryIds}
				/>

				{productCategoryItems.length > 0 ? (
					<MultiSelectField
						count={draftProductCatIds.length}
						displayItems={displayProductCats}
						dropdownItems={productCategoryItems}
						editing={basicEditing}
						label={t("companyProfilePage.fields.productCategories")}
						onChange={onDraftProductCatIdsChange}
						placeholder={t(
							"companyProfilePage.placeholders.selectProductCategories",
						)}
						selectedIds={draftProductCatIds}
					/>
				) : null}

				{/* Human rights officer (LkSG) */}
				<div className="md:col-span-2">
					<FieldLabel label="Human rights officer" />
					{basicEditing ? (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<label
								className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer"
								htmlFor={hrOfficerCheckboxId}
							>
								<input
									checked={draftHumanRightsOfficerConfirmed}
									className="h-4 w-4 accent-[#148696]"
									id={hrOfficerCheckboxId}
									onChange={(e) =>
										onDraftHumanRightsOfficerConfirmedChange(e.target.checked)
									}
									type="checkbox"
								/>
								A human rights officer has been appointed
							</label>
							<div className="sm:flex-1">
								<label className="sr-only" htmlFor={hrOfficerNameId}>
									Human rights officer name
								</label>
								<input
									className={inputCls}
									disabled={!draftHumanRightsOfficerConfirmed}
									id={hrOfficerNameId}
									onChange={(e) =>
										onDraftHumanRightsOfficerNameChange(e.target.value)
									}
									placeholder="Name (optional)"
									type="text"
									value={draftHumanRightsOfficerName}
								/>
							</div>
						</div>
					) : (
						<p className="text-sm text-gray-800">
							{draftHumanRightsOfficerConfirmed
								? draftHumanRightsOfficerName || "Appointed"
								: "Not specified"}
						</p>
					)}
				</div>
			</div>
		</SectionCard>
	);
}
