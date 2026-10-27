import { useEffect, useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	NACE_LEVEL,
	type NaceCode,
	useNaceCodes,
} from "$src/queries/naceCodes";
import ProfileMultiSelect from "./ProfileMultiSelect";

const TIER_ONE_LABEL = {
	key: "organizationProfilePage.naceTier1",
	fallback: "Tier 1 — Section",
};

const isSectionCode = (code: string) => /^[A-V]$/.test(code);

/**
 * Convert legacy profiles containing division/group/class codes to their
 * sections and return the sections in the official NACE publication order.
 */
export const getNaceSectionCodes = (
	codes: string[],
	items: NaceCode[],
): string[] => {
	if (items.length === 0) {
		return [...new Set(codes.filter(isSectionCode))];
	}

	const byCode = new Map(items.map((item) => [item.code, item]));
	const selectedSections = new Set(
		codes
			.map((code) => byCode.get(code)?.section_code ?? code)
			.filter(isSectionCode),
	);

	return items
		.filter(
			(item) =>
				item.level === NACE_LEVEL.SECTION && selectedSections.has(item.code),
		)
		.sort((left, right) => left.sort_order - right.sort_order)
		.map((item) => item.code);
};

const formatNace = (item: NaceCode) => `${item.code} — ${item.label}`;

export default function OrganizationNaceFields({
	value,
	onChange,
}: {
	value: string[];
	onChange: (codes: string[]) => void;
}) {
	const { t } = useTranslation();
	const inputId = useId();
	const { data = [], isLoading, error } = useNaceCodes();
	const sections = useMemo(
		() =>
			data
				.filter((item) => item.level === NACE_LEVEL.SECTION)
				.sort((left, right) => left.sort_order - right.sort_order),
		[data],
	);
	const selectedCodes = useMemo(
		() => getNaceSectionCodes(value, data),
		[value, data],
	);

	// Older profiles can contain all four NACE tiers. Normalize those values to
	// unique Tier 1 sections as soon as the reference list is available, so the
	// next save persists only the organization-level classification requested.
	useEffect(() => {
		if (data.length > 0 && selectedCodes.join("|") !== value.join("|")) {
			onChange(selectedCodes);
		}
	}, [data.length, onChange, selectedCodes, value]);

	if (error) {
		return (
			<p className="text-sm text-red-600">{t("naceCodeDropdown.error")}</p>
		);
	}

	return (
		<ProfileMultiSelect
			id={inputId}
			onChange={onChange}
			options={sections.map((item) => ({
				value: item.code,
				label: formatNace(item),
			}))}
			placeholder={
				isLoading
					? t("naceCodeDropdown.loading")
					: t("organizationProfilePage.selectNaceSections", {
							defaultValue: "Select one or more broad sectors (Tier 1)…",
						})
			}
			values={selectedCodes}
		/>
	);
}

export function OrganizationNaceReadView({ value }: { value: string[] }) {
	const { t } = useTranslation();
	const { data = [] } = useNaceCodes();
	const sectionCodes = useMemo(
		() => getNaceSectionCodes(value, data),
		[value, data],
	);
	const byCode = useMemo(
		() => new Map(data.map((item) => [item.code, item])),
		[data],
	);
	const sections = sectionCodes
		.map((code) => byCode.get(code))
		.filter((item): item is NaceCode => Boolean(item));

	if (sections.length === 0) return <p className="text-sm text-gray-700">—</p>;

	return (
		<div className="space-y-3">
			{sections.map((item) => (
				<div
					className="grid grid-cols-[minmax(8rem,10rem)_4rem_minmax(0,1fr)] items-center gap-3"
					key={item.code}
				>
					<p className="text-xs font-bold uppercase tracking-wide text-gray-400">
						{t(TIER_ONE_LABEL.key, {
							defaultValue: TIER_ONE_LABEL.fallback,
						}).replace("—", "·")}
					</p>
					<span className="inline-flex min-h-8 items-center justify-center rounded-md bg-[#9DDED5] px-2 text-sm font-bold text-[#004A60]">
						{item.code}
					</span>
					<p className="text-sm text-gray-700">{item.label}</p>
				</div>
			))}
		</div>
	);
}
