import { IdCardIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "$src/components/company-profile/SectionCard";
import { inputCls, textareaCls } from "$src/components/company-profile/styles";
import type {
	OrganizationProfileOptions,
	ProfileOption,
} from "$src/queries/organizationProfile";
import OrganizationNaceFields, {
	OrganizationNaceReadView,
} from "./OrganizationNaceFields";
import ProfileFieldLabel from "./ProfileFieldLabel";
import ProfileMultiSelect from "./ProfileMultiSelect";

export interface OrganizationProfileFormValues {
	name: string;
	description: string;
	website: string;
	organization_type: string;
	countries_of_registration: string[];
	countries_of_operation: string[];
	languages_supported: string[];
	core_focus_areas: string[];
	stakeholder_groups: string[];
	nace_codes: string[];
}

interface Props {
	values: OrganizationProfileFormValues;
	onChange: (values: OrganizationProfileFormValues) => void;
	options?: OrganizationProfileOptions;
	countries: ProfileOption[];
	editing: boolean;
	onEdit: () => void;
	onSave: () => void;
	onCancel: () => void;
	isSaving: boolean;
}

const ReadField = ({
	label,
	children,
	wide = false,
	required = false,
}: {
	label: string;
	children: React.ReactNode;
	wide?: boolean;
	required?: boolean;
}) => (
	<div className={wide ? "md:col-span-2" : ""}>
		<ReadLabel label={label} required={required} />
		<div className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
			{children || "—"}
		</div>
	</div>
);

const ReadLabel = ({
	label,
	required = false,
}: {
	label: string;
	required?: boolean;
}) => (
	<p className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-900">
		{label}
		{required && (
			<span aria-hidden="true" className="ml-1 text-[#FB8379]">
				*
			</span>
		)}
	</p>
);

const Chips = ({ labels }: { labels: string[] }) =>
	labels.length > 0 ? (
		<div className="flex flex-wrap gap-2">
			{labels.map((label, index) => (
				<span
					className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800"
					key={`${label}-${index}`}
				>
					{label}
				</span>
			))}
		</div>
	) : (
		<span>—</span>
	);

export default function OrganizationBasicInformationSection({
	values,
	onChange,
	options,
	countries,
	editing,
	onEdit,
	onSave,
	onCancel,
	isSaving,
}: Props) {
	const { t } = useTranslation();
	const registrationId = useId();
	const operationId = useId();
	const stakeholdersId = useId();
	const languagesId = useId();
	const set = <K extends keyof OrganizationProfileFormValues>(
		field: K,
		value: OrganizationProfileFormValues[K],
	) => onChange({ ...values, [field]: value });
	const optionLabel = (group: string, option: ProfileOption) =>
		t(`organizationProfilePage.${group}.${option.value}`, {
			defaultValue: option.label,
		});
	const labelsFor = (selected: string[], source: ProfileOption[]) => {
		const labels = new Map(source.map((item) => [item.value, item.label]));
		return selected.map((value) => labels.get(value) ?? value);
	};
	const focusOptions = (options?.core_focus_areas ?? []).map((option) => ({
		...option,
		label: optionLabel("focusArea", option),
	}));
	const stakeholderOptions = (options?.stakeholder_groups ?? []).map(
		(option) => ({ ...option, label: optionLabel("stakeholderGroup", option) }),
	);
	const organizationType = options?.organization_types.find(
		(option) => option.value === values.organization_type,
	);

	return (
		<SectionCard
			actionDisabled={isSaving}
			editing={editing}
			icon={<IdCardIcon className="h-5 w-5 text-[#148696]" />}
			onCancel={onCancel}
			onSave={editing ? onSave : onEdit}
			title={t("organizationProfilePage.basicInformation")}
		>
			{editing ? (
				<div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.nameLabel")}
							required
						/>
						<input
							aria-required="true"
							className={inputCls}
							onChange={(event) => set("name", event.target.value)}
							placeholder={t("organizationProfilePage.namePlaceholder")}
							value={values.name}
						/>
					</div>
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.websiteLabel")}
						/>
						<input
							className={inputCls}
							onChange={(event) => set("website", event.target.value)}
							placeholder="https://"
							type="url"
							value={values.website}
						/>
					</div>
					<div className="md:col-span-2">
						<ProfileFieldLabel
							label={t("organizationProfilePage.descriptionLabel")}
						/>
						<p className="text-xs text-gray-500">
							{t("organizationProfilePage.descriptionHelp")}
						</p>
						<textarea
							className={textareaCls}
							onChange={(event) => set("description", event.target.value)}
							placeholder={t("organizationProfilePage.descriptionPlaceholder")}
							rows={4}
							value={values.description}
						/>
					</div>
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.typeLabel")}
							required
						/>
						<select
							aria-required="true"
							className={inputCls}
							onChange={(event) => set("organization_type", event.target.value)}
							value={values.organization_type}
						>
							<option value="">
								{t("organizationProfilePage.typePlaceholder")}
							</option>
							{options?.organization_types.map((option) => (
								<option key={option.value} value={option.value}>
									{optionLabel("organizationType", option)}
								</option>
							))}
						</select>
					</div>
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.registrationCountryLabel")}
						/>
						<ProfileMultiSelect
							id={registrationId}
							onChange={(selected) =>
								set("countries_of_registration", selected)
							}
							options={countries}
							placeholder={t("organizationProfilePage.selectOneOrMore")}
							values={values.countries_of_registration}
						/>
					</div>
					<div className="md:col-span-2">
						<ProfileFieldLabel
							label={t("organizationProfilePage.operationCountryLabel")}
						/>
						<ProfileMultiSelect
							id={operationId}
							onChange={(selected) => set("countries_of_operation", selected)}
							options={countries}
							placeholder={t("organizationProfilePage.selectOneOrMore")}
							values={values.countries_of_operation}
						/>
					</div>
					<div className="md:col-span-2">
						<ProfileFieldLabel
							label={t("organizationProfilePage.focusAreaLabel")}
						/>
						<p className="mb-2 text-xs text-gray-500">
							{t("organizationProfilePage.focusAreaHelp")}
						</p>
						<div className="flex flex-wrap gap-2">
							{focusOptions.map((option) => {
								const checked = values.core_focus_areas.includes(option.value);
								return (
									<label
										className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-[#148696] bg-[#e5f6f9]" : "border-gray-200 bg-white"}`}
										key={option.value}
									>
										<input
											checked={checked}
											className="accent-[#148696]"
											onChange={() =>
												set(
													"core_focus_areas",
													checked
														? values.core_focus_areas.filter(
																(item) => item !== option.value,
															)
														: [...values.core_focus_areas, option.value],
												)
											}
											type="checkbox"
										/>
										{option.label}
									</label>
								);
							})}
						</div>
					</div>
					<div className="md:col-span-2">
						<ProfileFieldLabel
							label={t("organizationProfilePage.sectorLabel")}
							required
							uppercase
						/>
						<p className="mb-3 text-xs text-gray-500">
							{t("organizationProfilePage.sectorTier1Help", {
								defaultValue:
									"Mapped to NACE sections — select one or more broad sectors (Tier 1).",
							})}
						</p>
						<OrganizationNaceFields
							onChange={(codes) => set("nace_codes", codes)}
							value={values.nace_codes}
						/>
					</div>
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.stakeholderGroupLabel")}
						/>
						<ProfileMultiSelect
							id={stakeholdersId}
							onChange={(selected) => set("stakeholder_groups", selected)}
							options={stakeholderOptions}
							placeholder={t("organizationProfilePage.selectGroups")}
							values={values.stakeholder_groups}
						/>
					</div>
					<div>
						<ProfileFieldLabel
							label={t("organizationProfilePage.languagesLabel")}
						/>
						<ProfileMultiSelect
							id={languagesId}
							onChange={(selected) => set("languages_supported", selected)}
							options={options?.languages ?? []}
							placeholder={t("organizationProfilePage.selectLanguages")}
							values={values.languages_supported}
						/>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
					<ReadField label={t("organizationProfilePage.nameLabel")} required>
						{values.name}
					</ReadField>
					<ReadField label={t("organizationProfilePage.websiteLabel")}>
						{values.website ? (
							<a
								className="text-gray-700 hover:text-[#148696] hover:underline"
								href={values.website}
								rel="noreferrer"
								target="_blank"
							>
								{values.website}
							</a>
						) : (
							"—"
						)}
					</ReadField>
					<ReadField label={t("organizationProfilePage.descriptionLabel")} wide>
						{values.description}
					</ReadField>
					<ReadField label={t("organizationProfilePage.typeLabel")} required>
						{organizationType
							? optionLabel("organizationType", organizationType)
							: "—"}
					</ReadField>
					<ReadField
						label={t("organizationProfilePage.registrationCountryLabel")}
					>
						<Chips
							labels={labelsFor(values.countries_of_registration, countries)}
						/>
					</ReadField>
					<ReadField
						label={t("organizationProfilePage.operationCountryLabel")}
						wide
					>
						<Chips
							labels={labelsFor(values.countries_of_operation, countries)}
						/>
					</ReadField>
					<ReadField label={t("organizationProfilePage.focusAreaLabel")} wide>
						<Chips labels={labelsFor(values.core_focus_areas, focusOptions)} />
					</ReadField>
					<div className="md:col-span-2">
						<ReadLabel label={t("organizationProfilePage.sectorLabel")} />
						<OrganizationNaceReadView value={values.nace_codes} />
					</div>
					<ReadField label={t("organizationProfilePage.stakeholderGroupLabel")}>
						<Chips
							labels={labelsFor(values.stakeholder_groups, stakeholderOptions)}
						/>
					</ReadField>
					<ReadField label={t("organizationProfilePage.languagesLabel")}>
						<Chips
							labels={labelsFor(
								values.languages_supported,
								options?.languages ?? [],
							)}
						/>
					</ReadField>
				</div>
			)}
		</SectionCard>
	);
}
